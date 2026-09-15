from __future__ import annotations

import io
import csv
import logging
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date as SQLDate

from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.user import Department
from app.models.employee import Employee
from app.models.infrastructure import SecurityEvent

logger = logging.getLogger(__name__)


class ReportService:
    """CSV/Excel/PDF report generation for attendance and security data."""

    def __init__(self, db: Session):
        self.db = db

    def generate_daily_attendance_csv(self, target_date: date) -> bytes:
        recs = (
            self.db.query(AttendanceRecord, Employee, Department)
            .join(Employee, Employee.id == AttendanceRecord.employee_id)
            .outerjoin(Department, Department.id == Employee.department_id)
            .filter(cast(AttendanceRecord.date, SQLDate) == target_date)
            .order_by(AttendanceRecord.check_in_time.asc())
            .all()
        )
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "Employee ID",
                "Name",
                "Department",
                "Designation",
                "Check-In",
                "Check-Out",
                "Status",
                "Recognition Confidence",
                "Liveness Score",
                "Camera ID",
                "IP Address",
            ]
        )
        for ar, emp, dept in recs:
            writer.writerow(
                [
                    emp.employee_id,
                    emp.full_name,
                    dept.name if dept else "",
                    emp.designation or "",
                    ar.check_in_time.isoformat() if ar.check_in_time else "",
                    ar.check_out_time.isoformat() if ar.check_out_time else "",
                    ar.status.value if hasattr(ar.status, "value") else str(ar.status),
                    f"{(ar.recognition_confidence or 0):.3f}",
                    f"{(ar.liveness_score or 0):.3f}",
                    ar.camera_id or "",
                    ar.ip_address or "",
                ]
            )
        return buf.getvalue().encode("utf-8-sig")

    def generate_monthly_attendance_csv(self, year: int, month: int) -> bytes:
        from calendar import monthrange

        _, days_in_month = monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, days_in_month)
        recs = (
            self.db.query(AttendanceRecord, Employee, Department)
            .join(Employee, Employee.id == AttendanceRecord.employee_id)
            .outerjoin(Department, Department.id == Employee.department_id)
            .filter(cast(AttendanceRecord.date, SQLDate) >= start)
            .filter(cast(AttendanceRecord.date, SQLDate) <= end)
            .order_by(Employee.employee_id, AttendanceRecord.date)
            .all()
        )
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "Date",
                "Employee ID",
                "Name",
                "Department",
                "Check-In",
                "Check-Out",
                "Status",
            ]
        )
        for ar, emp, dept in recs:
            writer.writerow(
                [
                    str(ar.date.date()),
                    emp.employee_id,
                    emp.full_name,
                    dept.name if dept else "",
                    ar.check_in_time.strftime("%H:%M:%S") if ar.check_in_time else "",
                    ar.check_out_time.strftime("%H:%M:%S") if ar.check_out_time else "",
                    ar.status.value if hasattr(ar.status, "value") else str(ar.status),
                ]
            )
        return buf.getvalue().encode("utf-8-sig")

    def generate_security_events_csv(
        self, date_from: Optional[date] = None, date_to: Optional[date] = None
    ) -> bytes:
        q = self.db.query(SecurityEvent).order_by(SecurityEvent.created_at.desc())
        if date_from:
            q = q.filter(cast(SecurityEvent.created_at, SQLDate) >= date_from)
        if date_to:
            q = q.filter(cast(SecurityEvent.created_at, SQLDate) <= date_to)
        events = q.all()
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "ID",
                "Type",
                "Severity",
                "Description",
                "Camera ID",
                "Location ID",
                "IP Address",
                "Resolved",
                "Created At",
            ]
        )
        for e in events:
            writer.writerow(
                [
                    e.id,
                    e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type),
                    e.severity.value if hasattr(e.severity, "value") else str(e.severity),
                    e.description or "",
                    e.camera_id or "",
                    e.location_id or "",
                    e.ip_address or "",
                    "YES" if e.is_resolved else "NO",
                    e.created_at.isoformat(),
                ]
            )
        return buf.getvalue().encode("utf-8-sig")

    def employee_attendance_summary(self, employee_id: int, days: int = 30) -> Dict[str, Any]:
        start = date.today() - timedelta(days=days - 1)
        recs = (
            self.db.query(AttendanceRecord)
            .filter(AttendanceRecord.employee_id == employee_id)
            .filter(cast(AttendanceRecord.date, SQLDate) >= start)
            .all()
        )
        present = sum(1 for r in recs if r.check_in_time is not None and r.status not in (AttendanceStatus.ABSENT, AttendanceStatus.ON_LEAVE))
        absent = days - present
        late = sum(1 for r in recs if r.status == AttendanceStatus.LATE)
        early = sum(1 for r in recs if r.status == AttendanceStatus.EARLY_DEPARTURE)
        half_day = sum(1 for r in recs if r.status == AttendanceStatus.HALF_DAY)
        on_leave = sum(1 for r in recs if r.status == AttendanceStatus.ON_LEAVE)
        rate = (present / days * 100) if days else 0.0
        return {
            "employee_id": employee_id,
            "period_days": days,
            "total_present": present,
            "total_absent": absent,
            "late_arrivals": late,
            "early_departures": early,
            "half_days": half_day,
            "on_leave": on_leave,
            "attendance_rate": round(rate, 2),
        }
