from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date as SQLDate
import numpy as np

from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.user import Department
from app.models.employee import Employee

logger = logging.getLogger(__name__)


class AnomalyDetectionService:
    """Lightweight unsupervised anomaly detection for attendance behavior."""

    def __init__(self, db: Session):
        self.db = db

    def _build_features(self, days: int = 30) -> List[Dict[str, Any]]:
        start_date = date.today() - timedelta(days=days - 1)
        emps = self.db.query(Employee).filter(Employee.is_active == True).all()
        records: List[Dict[str, Any]] = []

        for emp in emps:
            recs = (
                self.db.query(AttendanceRecord)
                .filter(AttendanceRecord.employee_id == emp.id)
                .filter(cast(AttendanceRecord.date, SQLDate) >= start_date)
                .filter(AttendanceRecord.check_in_time.isnot(None))
                .all()
            )
            if len(recs) < 5:
                continue
            checkin_minutes = []
            checkout_minutes = []
            attendance_count = 0
            late_count = 0
            for r in recs:
                attendance_count += 1
                if r.status == AttendanceStatus.LATE:
                    late_count += 1
                if r.check_in_time:
                    checkin_minutes.append(r.check_in_time.hour * 60 + r.check_in_time.minute)
                if r.check_out_time:
                    checkout_minutes.append(r.check_out_time.hour * 60 + r.check_out_time.minute)

            feature = {
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "employee_code": emp.employee_id,
                "department_id": emp.department_id,
                "avg_checkin": float(np.mean(checkin_minutes)) if checkin_minutes else None,
                "std_checkin": float(np.std(checkin_minutes)) if len(checkin_minutes) > 1 else None,
                "avg_checkout": float(np.mean(checkout_minutes)) if checkout_minutes else None,
                "attendance_ratio": attendance_count / float(days),
                "late_ratio": late_count / max(1, attendance_count),
                "sample_size": len(recs),
            }
            records.append(feature)
        return records

    def detect_isolation_forest_style(self, days: int = 30) -> List[Dict[str, Any]]:
        """Z-score + ensemble anomaly scoring (no sklearn required)."""
        features = self._build_features(days)
        if not features:
            return []

        numeric_keys = ["avg_checkin", "std_checkin", "avg_checkout", "attendance_ratio", "late_ratio"]
        per_key_values = {k: [] for k in numeric_keys}
        for f in features:
            for k in numeric_keys:
                v = f.get(k)
                if v is not None and not (isinstance(v, float) and np.isnan(v)):
                    per_key_values[k].append(v)

        per_key_stats = {}
        for k, vals in per_key_values.items():
            if len(vals) < 3:
                continue
            mu = float(np.mean(vals))
            sd = float(np.std(vals)) + 1e-6
            per_key_stats[k] = (mu, sd)

        anomalies: List[Dict[str, Any]] = []
        for f in features:
            scores = []
            contributions = {}
            for k, (mu, sd) in per_key_stats.items():
                v = f.get(k)
                if v is None:
                    continue
                z = abs((v - mu) / sd)
                scores.append(z)
                contributions[k] = round(z, 2)
            if not scores:
                continue
            anomaly_score = float(np.mean(scores))
            if anomaly_score >= 2.0 or (len(scores) >= 2 and any(s >= 3.0 for s in scores)):
                anomalies.append(
                    {
                        "employee_id": f["employee_id"],
                        "employee_name": f["employee_name"],
                        "employee_code": f["employee_code"],
                        "anomaly_score": round(anomaly_score, 2),
                        "contributions": contributions,
                        "requires_human_review": True,
                        "sample_size": f["sample_size"],
                    }
                )
        anomalies.sort(key=lambda x: x["anomaly_score"], reverse=True)
        return anomalies[:20]

    def generate_ai_insights(self, days: int = 30) -> List[Dict[str, Any]]:
        """Statistically-grounded, non-fabricated insights."""
        insights: List[Dict[str, Any]] = []
        start_date = date.today() - timedelta(days=days - 1)
        today = date.today()
        prev_start = start_date - timedelta(days=days)

        def present_count(sd, ed):
            return (
                self.db.query(func.count(func.distinct(AttendanceRecord.employee_id)))
                .filter(cast(AttendanceRecord.date, SQLDate) >= sd)
                .filter(cast(AttendanceRecord.date, SQLDate) <= ed)
                .filter(AttendanceRecord.check_in_time.isnot(None))
                .scalar() or 0
            )

        total_emps = self.db.query(func.count(Employee.id)).filter(Employee.is_active == True).scalar() or 1

        current_present = present_count(start_date, today)
        prev_present = present_count(prev_start, start_date - timedelta(days=1))

        total_emp_days_current = total_emps * max(1, (today - start_date).days + 1)
        total_emp_days_prev = total_emps * days
        current_rate = current_present / max(1, total_emp_days_current) * 100
        prev_rate = prev_present / max(1, total_emp_days_prev) * 100

        diff = current_rate - prev_rate
        if abs(diff) >= 3:
            insights.append(
                {
                    "insight_type": "attendance_trend",
                    "title": f"Overall attendance {'decreased' if diff < 0 else 'increased'} {abs(diff):.1f}% this month",
                    "description": f"Attendance rate moved from {prev_rate:.1f}% to {current_rate:.1f}% compared to the previous {days}-day window.",
                    "severity": "high" if abs(diff) >= 10 else "medium",
                    "data": {"previous_rate": round(prev_rate, 2), "current_rate": round(current_rate, 2), "delta_pct": round(diff, 2)},
                }
            )

        day_rows = (
            self.db.query(
                func.extract("isodow", AttendanceRecord.date).label("dow"),
                AttendanceRecord.status,
                func.count(func.distinct(AttendanceRecord.employee_id)),
            )
            .filter(cast(AttendanceRecord.date, SQLDate) >= start_date)
            .filter(AttendanceRecord.status == AttendanceStatus.LATE)
            .group_by("dow", AttendanceRecord.status)
            .all()
        )
        dow_names = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday"}
        if day_rows:
            worst_dow, _, worst_count = max(day_rows, key=lambda r: r[2])
            day_total_rows = (
                self.db.query(
                    func.extract("isodow", AttendanceRecord.date).label("dow"),
                    func.count(func.distinct(AttendanceRecord.employee_id)),
                )
                .filter(cast(AttendanceRecord.date, SQLDate) >= start_date)
                .filter(AttendanceRecord.check_in_time.isnot(None))
                .group_by("dow")
                .all()
            )
            dt_map = {int(d): int(c) for d, c in day_total_rows}
            total_on_worst = dt_map.get(int(worst_dow), 0)
            ratio = (worst_count / total_on_worst * 100) if total_on_worst else 0.0
            if ratio >= 8:
                insights.append(
                    {
                        "insight_type": "late_by_day",
                        "title": f"{dow_names.get(int(worst_dow), 'Weekday')} has the highest late-arrival rate ({ratio:.1f}%)",
                        "description": f"On {dow_names.get(int(worst_dow), 'weekdays')} there were {int(worst_count)} late arrivals across {total_on_worst} total check-ins in the window.",
                        "severity": "medium",
                        "data": {"day": dow_names.get(int(worst_dow)), "late_count": int(worst_count), "total_checkins": total_on_worst, "rate_pct": round(ratio, 2)},
                    }
                )

        dept_rows = (
            self.db.query(
                Department.name,
                func.count(func.distinct(SecurityEvent.id)),
            )
            .outerjoin(Employee, Employee.department_id == Department.id)
            .outerjoin(
                SecurityEvent,
                (SecurityEvent.employee_id == Employee.id)
                & (cast(SecurityEvent.created_at, SQLDate) >= start_date)
                & (SecurityEvent.event_type == "failed_recognition"),
            )
            .group_by(Department.name)
            .all()
        )
        if dept_rows:
            dept_rows_sorted = sorted(dept_rows, key=lambda r: (r[1] or 0), reverse=True)
            worst_dept, worst_failures = dept_rows_sorted[0]
            if (worst_failures or 0) >= 10:
                insights.append(
                    {
                        "insight_type": "dept_verification",
                        "title": f"{worst_dept} has unusually high failed verification attempts ({worst_failures})",
                        "description": f"Investigate camera quality, lighting, or enrollment coverage in {worst_dept}.",
                        "severity": "medium",
                        "data": {"department": worst_dept, "failed_verifications": int(worst_failures or 0)},
                    }
                )

        late_emp_rows = (
            self.db.query(
                Employee.id,
                Employee.first_name,
                Employee.last_name,
                func.count(AttendanceRecord.id).label("c"),
            )
            .join(AttendanceRecord, AttendanceRecord.employee_id == Employee.id)
            .filter(cast(AttendanceRecord.date, SQLDate) >= start_date)
            .filter(AttendanceRecord.status == AttendanceStatus.LATE)
            .group_by(Employee.id, Employee.first_name, Employee.last_name)
            .having(func.count(AttendanceRecord.id) >= 3)
            .order_by(func.count(AttendanceRecord.id).desc())
            .limit(5)
            .all()
        )
        if late_emp_rows:
            names = [f"{r[1]} {r[2]}" for r in late_emp_rows]
            insights.append(
                {
                    "insight_type": "repeated_lateness",
                    "title": f"{len(names)} employees show repeated late-arrival patterns",
                    "description": ", ".join(names),
                    "severity": "low",
                    "data": {"employees": [{"id": r[0], "name": f"{r[1]} {r[2]}", "late_count": int(r[3])} for r in late_emp_rows]},
                }
            )

        return insights
