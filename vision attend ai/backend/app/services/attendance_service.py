from __future__ import annotations

import json
import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc, cast, Date as SQLDate

from app.models.attendance import (
    AttendanceRecord,
    AttendanceStatus,
    AttendancePolicy,
    VerificationMethod,
)
from app.models.user import Department
from app.models.employee import Employee, FaceEmbedding
from app.models.infrastructure import (
    Camera,
    Device,
    Location,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    AuditLog,
)
from app.core.database import Base
from app.cv.face_pipeline import EmbeddingStore

logger = logging.getLogger(__name__)


class AttendanceDecisionEngine:
    """Enterprise attendance decision engine with configurable policies."""

    def __init__(
        self,
        db: Session,
        recognition_threshold: float = 0.65,
        liveness_threshold: float = 0.70,
        quality_threshold: float = 0.50,
    ):
        self.db = db
        self.recognition_threshold = recognition_threshold
        self.liveness_threshold = liveness_threshold
        self.quality_threshold = quality_threshold
        self._policy_cache: Dict[int, AttendancePolicy] = {}

    def _get_active_policy(self, organization_id: Optional[int]) -> AttendancePolicy:
        key = organization_id or 0
        if key in self._policy_cache:
            return self._policy_cache[key]
        q = self.db.query(AttendancePolicy).filter(AttendancePolicy.is_active == True)
        if organization_id:
            q = q.filter(AttendancePolicy.organization_id == organization_id)
        policy = q.first()
        if policy is None:
            policy = AttendancePolicy(
                name="Default Policy",
                organization_id=organization_id or 1,
                face_recognition_threshold=self.recognition_threshold,
                liveness_threshold=self.liveness_threshold,
            )
        self._policy_cache[key] = policy
        return policy

    def is_duplicate_check_in(self, employee_id: int, check_date: date) -> bool:
        existing = (
            self.db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.employee_id == employee_id,
                cast(AttendanceRecord.date, SQLDate) == check_date,
                AttendanceRecord.check_in_time.isnot(None),
            )
            .first()
        )
        return existing is not None

    def get_today_record(self, employee_id: int) -> Optional[AttendanceRecord]:
        today = date.today()
        return (
            self.db.query(AttendanceRecord)
            .filter(
                AttendanceRecord.employee_id == employee_id,
                cast(AttendanceRecord.date, SQLDate) == today,
            )
            .first()
        )

    def evaluate_check_in(
        self,
        employee: Employee,
        recognition_confidence: float,
        liveness_score: float,
        quality_score: float,
        device_id: Optional[int] = None,
        location_id: Optional[int] = None,
        camera_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        require_liveness: bool = True,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        reasons: List[str] = []
        passed = True
        context: Dict[str, Any] = {}
        policy = self._get_active_policy(employee.organization_id)

        if not employee.is_active:
            reasons.append("Employee account is inactive")
            passed = False
        else:
            context["employee_active"] = True

        rec_threshold = policy.face_recognition_threshold
        if recognition_confidence < rec_threshold:
            reasons.append(
                f"Recognition confidence {recognition_confidence:.2%} below threshold {rec_threshold:.2%}"
            )
            passed = False
        else:
            context["recognition_ok"] = True

        if require_liveness and policy.require_liveness:
            live_threshold = policy.liveness_threshold
            if liveness_score < live_threshold:
                reasons.append(
                    f"Liveness score {liveness_score:.2%} below threshold {live_threshold:.2%}"
                )
                passed = False
            else:
                context["liveness_ok"] = True
        else:
            context["liveness_skipped"] = True

        if quality_score < self.quality_threshold:
            reasons.append(f"Face quality {quality_score:.2%} below threshold")
            passed = False

        if policy.restrict_by_device and device_id is not None:
            device = self.db.query(Device).filter(Device.id == device_id).first()
            if device is None or not device.allowed_for_attendance:
                reasons.append("Attendance not permitted from this device")
                passed = False
            else:
                context["device_ok"] = True

        if policy.restrict_by_location and location_id is not None:
            loc = self.db.query(Location).filter(Location.id == location_id).first()
            if loc is None or not loc.is_active:
                reasons.append("Attendance not permitted from this location")
                passed = False
            else:
                context["location_ok"] = True

        today = date.today()
        if self.is_duplicate_check_in(employee.id, today):
            context["is_duplicate"] = True
            reasons.append("Attendance already recorded for today")
            passed = False

        start_time = employee.working_hours_start or policy.work_start_time or "09:30"
        status, late_minutes = self._determine_check_in_status(
            datetime.now(), start_time, policy.late_threshold_minutes
        )
        context["status"] = status
        context["late_minutes"] = late_minutes

        message = "OK" if passed else "; ".join(reasons)
        return passed, message, context

    def _determine_check_in_status(
        self,
        check_in_time: datetime,
        work_start_str: str,
        late_threshold_minutes: int = 15,
    ) -> Tuple[AttendanceStatus, int]:
        try:
            hh, mm = map(int, work_start_str.split(":"))
        except Exception:
            hh, mm = 9, 30
        work_start = check_in_time.replace(hour=hh, minute=mm, second=0, microsecond=0)
        diff = (check_in_time - work_start).total_seconds() / 60.0
        if diff > late_threshold_minutes:
            return AttendanceStatus.LATE, int(diff)
        return AttendanceStatus.CHECKED_IN, 0

    def evaluate_check_out(
        self,
        employee: Employee,
        recognition_confidence: float,
        liveness_score: float,
        device_id: Optional[int] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        reasons = []
        passed = True
        context: Dict[str, Any] = {}
        policy = self._get_active_policy(employee.organization_id)

        if recognition_confidence < policy.face_recognition_threshold:
            reasons.append("Recognition confidence too low for check-out")
            passed = False

        if policy.require_liveness and liveness_score < policy.liveness_threshold:
            reasons.append("Liveness check failed for check-out")
            passed = False

        today_record = self.get_today_record(employee.id)
        if today_record is None:
            reasons.append("No check-in found for today; cannot check out")
            passed = False
        elif today_record.check_out_time is not None:
            context["already_checked_out"] = True
            reasons.append("Already checked out for today")
            passed = False
        else:
            context["existing_record_id"] = today_record.id

        end_time = employee.working_hours_end or policy.work_end_time or "18:00"
        status, early_minutes = self._determine_check_out_status(
            datetime.now(), end_time, policy.early_leave_threshold_minutes
        )
        context["status"] = status
        context["early_minutes"] = early_minutes

        message = "OK" if passed else "; ".join(reasons)
        return passed, message, context

    def _determine_check_out_status(
        self,
        check_out_time: datetime,
        work_end_str: str,
        early_threshold_minutes: int = 15,
    ) -> Tuple[AttendanceStatus, int]:
        try:
            hh, mm = map(int, work_end_str.split(":"))
        except Exception:
            hh, mm = 18, 0
        work_end = check_out_time.replace(hour=hh, minute=mm, second=0, microsecond=0)
        diff = (work_end - check_out_time).total_seconds() / 60.0
        if diff > early_threshold_minutes:
            return AttendanceStatus.EARLY_DEPARTURE, int(diff)
        return AttendanceStatus.CHECKED_OUT, 0


class CandidateLoader:
    """Loads face embeddings from the DB into memory for fast matching."""

    def __init__(self, db: Session):
        self.db = db

    def load_all_candidates(self) -> List[Tuple[int, np.ndarray]]:
        from app.cv.face_pipeline import EmbeddingStore
        import numpy as np

        rows = (
            self.db.query(FaceEmbedding.employee_id, FaceEmbedding.embedding)
            .join(Employee, Employee.id == FaceEmbedding.employee_id)
            .filter(Employee.is_active == True)
            .all()
        )
        result: List[Tuple[int, np.ndarray]] = []
        for emp_id, emb_str in rows:
            try:
                emb = EmbeddingStore.decode(emb_str)
                result.append((emp_id, emb))
            except Exception as e:
                logger.warning(f"Failed to decode embedding for emp {emp_id}: {e}")
        return result

    def load_candidate_map(self) -> Dict[int, List[np.ndarray]]:
        import numpy as np

        mp: Dict[int, List[np.ndarray]] = {}
        rows = (
            self.db.query(FaceEmbedding.employee_id, FaceEmbedding.embedding)
            .join(Employee, Employee.id == FaceEmbedding.employee_id)
            .filter(Employee.is_active == True)
            .all()
        )
        for emp_id, emb_str in rows:
            try:
                emb = EmbeddingStore.decode(emb_str)
                mp.setdefault(emp_id, []).append(emb)
            except Exception:
                continue
        return mp
