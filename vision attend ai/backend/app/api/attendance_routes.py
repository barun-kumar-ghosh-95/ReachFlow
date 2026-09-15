from __future__ import annotations

import io
import logging
from datetime import date, datetime
from typing import List, Optional

import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, cast, Date as SQLDate

from app.core.database import get_db
from app.core.security import get_current_user, has_role, RoleEnum, get_current_active_user
from app.core.config import settings
from app.models.user import User, Department
from app.models.employee import Employee, FaceEmbedding
from app.models.attendance import (
    AttendanceRecord,
    AttendanceStatus,
    VerificationMethod,
)
from app.models.infrastructure import (
    Camera,
    Device,
    Location,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
)
from app.schemas.attendance import (
    FaceVerificationResult,
    AttendanceRecordResponse,
    AttendanceListResponse,
    ManualAttendanceRequest,
    DashboardStatsResponse,
    AttendanceStatusEnum,
)
from app.services.attendance_service import AttendanceDecisionEngine, CandidateLoader
from app.services.analytics_service import (
    AnalyticsService,
    SecurityEventService,
    AuditLogService,
)
from app.cv.recognition_service import (
    FaceRecognitionPipeline,
    bytes_to_ndarray,
    base64_to_ndarray,
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])
logger = logging.getLogger(__name__)


def _pipeline() -> FaceRecognitionPipeline:
    return FaceRecognitionPipeline(
        recognition_threshold=settings.FACE_RECOGNITION_THRESHOLD,
        liveness_threshold=settings.LIVENESS_THRESHOLD,
        min_face_size=settings.MIN_BOX_SIZE,
    )


@router.post("/verify", response_model=FaceVerificationResult)
async def verify_face_frame(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    face_base64: Optional[str] = Form(default=None),
    camera_id: Optional[int] = Form(default=None),
    device_id: Optional[int] = Form(default=None),
    location_id: Optional[int] = Form(default=None),
    ip_address: Optional[str] = Form(default=None),
    require_liveness: bool = Form(default=True),
    auto_check_in: bool = Form(default=True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if file:
        img_bytes = await file.read()
        frame = bytes_to_ndarray(img_bytes)
    elif face_base64:
        frame = base64_to_ndarray(face_base64)
    else:
        raise HTTPException(status_code=400, detail="Either file or face_base64 required")
    if frame is None:
        raise HTTPException(status_code=400, detail="Failed to decode image")

    pipeline = _pipeline()
    candidates = CandidateLoader(db).load_all_candidates()
    result = pipeline.verify_face(frame, candidates, require_liveness=require_liveness)

    faces_count = result.get("faces_count", 0)
    if faces_count > 1:
        SecurityEventService(db).log_event(
            SecurityEventType.MULTIPLE_FACES,
            SecurityEventSeverity.MEDIUM,
            description=f"{faces_count} faces detected simultaneously",
            camera_id=camera_id,
            location_id=location_id,
            device_id=device_id,
            ip_address=ip_address,
        )

    if not result.get("detected"):
        return FaceVerificationResult(
            recognized=False,
            attendance_message="No face detected in frame",
            face_box=None,
        )

    if not result.get("recognized"):
        SecurityEventService(db).log_event(
            SecurityEventType.UNKNOWN_FACE,
            SecurityEventSeverity.HIGH,
            description="Unknown face detected - identity could not be verified",
            camera_id=camera_id,
            location_id=location_id,
            device_id=device_id,
            ip_address=ip_address,
        )
        return FaceVerificationResult(
            recognized=False,
            recognition_confidence=result.get("recognition_confidence"),
            liveness_score=result.get("liveness_score"),
            liveness_passed=result.get("liveness_passed"),
            face_quality_score=result.get("quality_score"),
            attendance_message="Identity could not be confidently verified",
            face_box=result.get("bbox"),
        )

    employee_id = result.get("employee_id")
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return FaceVerificationResult(
            recognized=False,
            attendance_message="Employee record missing",
        )
    dept = db.query(Department).filter(Department.id == emp.department_id).first()

    rec_conf = result.get("recognition_confidence", 0.0)
    live_score = result.get("liveness_score", 0.0)
    quality = result.get("quality_score", 0.0)

    if require_liveness and not result.get("liveness_passed", False):
        SecurityEventService(db).log_event(
            SecurityEventType.SPOOF_ATTEMPT,
            SecurityEventSeverity.CRITICAL,
            description=f"Possible spoof attempt for {emp.employee_id} - liveness failed ({live_score:.2%})",
            employee_id=emp.id,
            camera_id=camera_id,
            location_id=location_id,
            device_id=device_id,
            ip_address=ip_address,
            metadata={"liveness_score": live_score},
        )
        return FaceVerificationResult(
            recognized=True,
            employee_id=emp.id,
            employee_employee_id=emp.employee_id,
            employee_name=emp.full_name,
            department=dept.name if dept else None,
            recognition_confidence=rec_conf,
            liveness_score=live_score,
            liveness_passed=False,
            face_quality_score=quality,
            attendance_status="REJECTED",
            attendance_message=f"Liveness check failed ({live_score:.1%})",
            face_box=result.get("bbox"),
        )

    if rec_conf < settings.FACE_RECOGNITION_THRESHOLD:
        SecurityEventService(db).log_event(
            SecurityEventType.FAILED_RECOGNITION,
            SecurityEventSeverity.MEDIUM,
            description=f"Low recognition confidence for {emp.employee_id}: {rec_conf:.2%}",
            employee_id=emp.id,
            camera_id=camera_id,
            device_id=device_id,
        )
        return FaceVerificationResult(
            recognized=False,
            employee_id=emp.id,
            recognition_confidence=rec_conf,
            attendance_message=f"Recognition confidence too low ({rec_conf:.1%})",
            face_box=result.get("bbox"),
        )

    engine = AttendanceDecisionEngine(
        db,
        recognition_threshold=settings.FACE_RECOGNITION_THRESHOLD,
        liveness_threshold=settings.LIVENESS_THRESHOLD,
        quality_threshold=settings.FACE_QUALITY_THRESHOLD,
    )

    ok, message, ctx = engine.evaluate_check_in(
        emp,
        recognition_confidence=rec_conf,
        liveness_score=live_score,
        quality_score=quality,
        device_id=device_id,
        location_id=location_id,
        camera_id=camera_id,
        ip_address=ip_address,
        require_liveness=require_liveness,
    )

    status_val = (ctx.get("status").value if hasattr(ctx.get("status"), "value") else str(ctx.get("status"))) if ctx.get("status") else None
    late_min = ctx.get("late_minutes", 0)
    is_dup = ctx.get("is_duplicate", False)

    if not ok:
        if ctx.get("is_duplicate"):
            return FaceVerificationResult(
                recognized=True,
                employee_id=emp.id,
                employee_employee_id=emp.employee_id,
                employee_name=emp.full_name,
                department=dept.name if dept else None,
                recognition_confidence=rec_conf,
                liveness_score=live_score,
                liveness_passed=result.get("liveness_passed", True),
                face_quality_score=quality,
                attendance_status="DUPLICATE",
                attendance_message="Attendance already recorded for today",
                is_duplicate=True,
                face_box=result.get("bbox"),
            )
        if not emp.is_active:
            SecurityEventService(db).log_event(
                SecurityEventType.UNAUTHORIZED_DEVICE,
                SecurityEventSeverity.HIGH,
                description=f"Inactive employee attempt: {emp.employee_id}",
                employee_id=emp.id,
            )
        return FaceVerificationResult(
            recognized=True,
            employee_id=emp.id,
            employee_employee_id=emp.employee_id,
            employee_name=emp.full_name,
            department=dept.name if dept else None,
            recognition_confidence=rec_conf,
            liveness_score=live_score,
            liveness_passed=result.get("liveness_passed", True),
            face_quality_score=quality,
            attendance_status="REJECTED",
            attendance_message=message,
            face_box=result.get("bbox"),
        )

    if auto_check_in:
        existing = engine.get_today_record(emp.id)
        now = datetime.now()
        if existing is None:
            rec = AttendanceRecord(
                employee_id=emp.id,
                check_in_time=now,
                date=now,
                status=ctx.get("status", AttendanceStatus.CHECKED_IN),
                verification_method=VerificationMethod.FACE_RECOGNITION,
                recognition_confidence=rec_conf,
                liveness_score=live_score,
                face_quality_score=quality,
                camera_id=camera_id,
                device_id=device_id,
                location_id=location_id,
                ip_address=ip_address,
            )
            db.add(rec)
            db.commit()
            db.refresh(rec)
            check_in_time = rec.check_in_time
        else:
            check_in_time = existing.check_in_time
            status_val = existing.status.value if hasattr(existing.status, "value") else str(existing.status)

        attend_msg = f"CHECK-IN SUCCESSFUL"
        if late_min and late_min > 0:
            attend_msg = f"Late by {late_min} minutes"
        db.commit()
        background_tasks.add_task(SecurityEventService(db).detect_suspicious_patterns)
    else:
        check_in_time = None
        attend_msg = "Verified - no check-in requested"

    return FaceVerificationResult(
        recognized=True,
        employee_id=emp.id,
        employee_employee_id=emp.employee_id,
        employee_name=emp.full_name,
        department=dept.name if dept else None,
        recognition_confidence=rec_conf,
        liveness_score=live_score,
        liveness_passed=result.get("liveness_passed", True),
        face_quality_score=quality,
        attendance_status=status_val or "CHECKED_IN",
        attendance_message=attend_msg,
        check_in_time=check_in_time,
        is_duplicate=False,
        face_box=result.get("bbox"),
    )


@router.post("/check-in")
async def manual_check_in_trigger(
    background_tasks: BackgroundTasks,
    file: Optional[UploadFile] = File(default=None),
    face_base64: Optional[str] = Form(default=None),
    camera_id: Optional[int] = Form(default=None),
    device_id: Optional[int] = Form(default=None),
    location_id: Optional[int] = Form(default=None),
    ip_address: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return await verify_face_frame(
        background_tasks=background_tasks,
        file=file,
        face_base64=face_base64,
        camera_id=camera_id,
        device_id=device_id,
        location_id=location_id,
        ip_address=ip_address,
        require_liveness=True,
        auto_check_in=True,
        current_user=current_user,
        db=db,
    )


@router.post("/check-out")
async def check_out(
    file: Optional[UploadFile] = File(default=None),
    face_base64: Optional[str] = Form(default=None),
    camera_id: Optional[int] = Form(default=None),
    device_id: Optional[int] = Form(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if file:
        img_bytes = await file.read()
        frame = bytes_to_ndarray(img_bytes)
    elif face_base64:
        frame = base64_to_ndarray(face_base64)
    else:
        raise HTTPException(status_code=400, detail="Frame required")
    if frame is None:
        raise HTTPException(status_code=400, detail="Failed to decode frame")

    pipeline = _pipeline()
    candidates = CandidateLoader(db).load_all_candidates()
    result = pipeline.verify_face(frame, candidates, require_liveness=True)
    if not result.get("recognized"):
        raise HTTPException(status_code=404, detail="Face not recognized for check-out")

    emp_id = result.get("employee_id")
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    engine = AttendanceDecisionEngine(db)
    ok, msg, ctx = engine.evaluate_check_out(
        emp,
        recognition_confidence=result.get("recognition_confidence", 0),
        liveness_score=result.get("liveness_score", 0),
        device_id=device_id,
    )
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    existing = db.query(AttendanceRecord).filter(AttendanceRecord.id == ctx["existing_record_id"]).first()
    existing.check_out_time = datetime.now()
    new_status = ctx.get("status", AttendanceStatus.CHECKED_OUT)
    if existing.status in (AttendanceStatus.LATE, AttendanceStatus.CHECKED_IN):
        existing.status = new_status
    db.commit()
    db.refresh(existing)

    early = ctx.get("early_minutes", 0)
    msg_out = "CHECK-OUT SUCCESSFUL"
    if early and early > 0:
        msg_out = f"Early departure by {early} minutes"
    return {"message": msg_out, "record_id": existing.id, "check_out_time": existing.check_out_time, "early_minutes": early}


@router.post("/manual", response_model=AttendanceRecordResponse)
def manual_attendance(
    data: ManualAttendanceRequest,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    existing = (
        db.query(AttendanceRecord)
        .filter(
            AttendanceRecord.employee_id == data.employee_id,
            cast(AttendanceRecord.date, SQLDate) == data.check_in_time.date(),
        )
        .first()
    )
    if existing:
        existing.check_in_time = data.check_in_time
        existing.check_out_time = data.check_out_time
        existing.status = AttendanceStatus.MANUAL_CORRECTION
        existing.verification_method = VerificationMethod.MANUAL
        existing.notes = data.reason
        db.commit()
        db.refresh(existing)
    else:
        rec = AttendanceRecord(
            employee_id=data.employee_id,
            check_in_time=data.check_in_time,
            check_out_time=data.check_out_time,
            date=data.check_in_time,
            status=AttendanceStatus.MANUAL_CORRECTION,
            verification_method=VerificationMethod.MANUAL,
            notes=data.reason,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        existing = rec
    AuditLogService(db).log(
        actor_id=current_user.id,
        action="attendance.manual_correction",
        entity_type="attendance_record",
        entity_id=existing.id,
        new_values={
            "check_in": data.check_in_time.isoformat(),
            "check_out": data.check_out_time.isoformat() if data.check_out_time else None,
            "reason": data.reason,
        },
    )
    db.commit()
    dept = db.query(Department).filter(Department.id == emp.department_id).first()
    loc = db.query(Location).filter(Location.id == existing.location_id).first() if existing.location_id else None
    return AttendanceRecordResponse(
        id=existing.id,
        employee_id=emp.id,
        employee_name=emp.full_name,
        employee_employee_id=emp.employee_id,
        check_in_time=existing.check_in_time,
        check_out_time=existing.check_out_time,
        date=existing.date,
        status=existing.status.value if hasattr(existing.status, "value") else str(existing.status),
        recognition_confidence=existing.recognition_confidence,
        liveness_score=existing.liveness_score,
        camera_id=existing.camera_id,
        location_name=loc.name if loc else None,
        ip_address=existing.ip_address,
        created_at=existing.created_at,
    )


@router.get("", response_model=AttendanceListResponse)
def list_attendance(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    employee_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status: Optional[AttendanceStatusEnum] = None,
    location_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = (
        db.query(AttendanceRecord, Employee, Department, Location)
        .join(Employee, Employee.id == AttendanceRecord.employee_id)
        .outerjoin(Department, Department.id == Employee.department_id)
        .outerjoin(Location, Location.id == AttendanceRecord.location_id)
    )
    role = db.query(__import__("app.models.user", fromlist=["Role"]).Role).filter_by(id=current_user.role_id).first()
    if role and role.name == RoleEnum.EMPLOYEE.value:
        own_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if own_emp:
            q = q.filter(Employee.id == own_emp.id)

    if date_from:
        q = q.filter(cast(AttendanceRecord.date, SQLDate) >= date_from)
    if date_to:
        q = q.filter(cast(AttendanceRecord.date, SQLDate) <= date_to)
    if employee_id:
        q = q.filter(AttendanceRecord.employee_id == employee_id)
    if department_id:
        q = q.filter(Employee.department_id == department_id)
    if status:
        q = q.filter(AttendanceRecord.status == status.value)
    if location_id:
        q = q.filter(AttendanceRecord.location_id == location_id)

    total = q.count()
    rows = q.order_by(AttendanceRecord.check_in_time.desc()).offset((page - 1) * page_size).limit(page_size).all()
    records = []
    for ar, emp, dept, loc in rows:
        records.append(
            AttendanceRecordResponse(
                id=ar.id,
                employee_id=emp.id,
                employee_name=emp.full_name,
                employee_employee_id=emp.employee_id,
                check_in_time=ar.check_in_time,
                check_out_time=ar.check_out_time,
                date=ar.date,
                status=ar.status.value if hasattr(ar.status, "value") else str(ar.status),
                recognition_confidence=ar.recognition_confidence,
                liveness_score=ar.liveness_score,
                camera_id=ar.camera_id,
                location_name=loc.name if loc else None,
                ip_address=ar.ip_address,
                created_at=ar.created_at,
            )
        )
    return AttendanceListResponse(total=total, records=records, page=page, page_size=page_size)


@router.get("/today/recent", response_model=List[AttendanceRecordResponse])
def recent_today(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    rows = (
        db.query(AttendanceRecord, Employee, Location)
        .join(Employee, Employee.id == AttendanceRecord.employee_id)
        .outerjoin(Location, Location.id == AttendanceRecord.location_id)
        .filter(cast(AttendanceRecord.date, SQLDate) == today)
        .filter(AttendanceRecord.check_in_time.isnot(None))
        .order_by(AttendanceRecord.check_in_time.desc())
        .limit(limit)
        .all()
    )
    result = []
    for ar, emp, loc in rows:
        result.append(
            AttendanceRecordResponse(
                id=ar.id,
                employee_id=emp.id,
                employee_name=emp.full_name,
                employee_employee_id=emp.employee_id,
                check_in_time=ar.check_in_time,
                check_out_time=ar.check_out_time,
                date=ar.date,
                status=ar.status.value if hasattr(ar.status, "value") else str(ar.status),
                recognition_confidence=ar.recognition_confidence,
                liveness_score=ar.liveness_score,
                camera_id=ar.camera_id,
                location_name=loc.name if loc else None,
                ip_address=ar.ip_address,
                created_at=ar.created_at,
            )
        )
    return result
