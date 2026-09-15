from __future__ import annotations

import io
import logging
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, has_role, RoleEnum
from app.models.user import User
from app.models.employee import Employee
from app.schemas.attendance import (
    DashboardStatsResponse,
    DailyAttendanceChartItem,
    DepartmentAttendanceItem,
)
from app.schemas.infrastructure import (
    SecurityEventListResponse,
    SecurityEventResponse,
    SecurityEventQueryParams,
    AuditLogListResponse,
    AuditLogResponse,
    AuditLogQueryParams,
    AIInsightItem,
    ModelPerformanceMetrics,
    SecurityEventTrendItem,
)
from app.services.analytics_service import AnalyticsService, SecurityEventService, AuditLogService
from app.services.anomaly_service import AnomalyDetectionService
from app.services.report_service import ReportService

router = APIRouter(prefix="/analytics", tags=["Analytics & Insights"])
logger = logging.getLogger(__name__)


@router.get("/dashboard", response_model=DashboardStatsResponse)
def dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return DashboardStatsResponse(**AnalyticsService(db).dashboard_stats())


@router.get("/attendance/daily", response_model=List[DailyAttendanceChartItem])
def daily_attendance_trend(
    days: int = Query(14, ge=7, le=90),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = AnalyticsService(db).daily_attendance_trend(days=days)
    return [DailyAttendanceChartItem(**r) for r in rows]


@router.get("/attendance/departments", response_model=List[DepartmentAttendanceItem])
def department_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = AnalyticsService(db).department_breakdown()
    return [DepartmentAttendanceItem(**r) for r in rows]


@router.get("/security/trends", response_model=List[SecurityEventTrendItem])
def security_event_trends(
    days: int = Query(14, ge=7, le=90),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.SECURITY, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    rows = AnalyticsService(db).security_event_trend(days=days)
    return [SecurityEventTrendItem(**r) for r in rows]


@router.get("/security/events", response_model=SecurityEventListResponse)
def list_security_events(
    query: SecurityEventQueryParams = Depends(),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.SECURITY, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    from app.models.infrastructure import SecurityEvent, Camera, Location
    from app.models.employee import Employee

    q = (
        db.query(SecurityEvent, Employee, Camera, Location)
        .outerjoin(Employee, Employee.id == SecurityEvent.employee_id)
        .outerjoin(Camera, Camera.id == SecurityEvent.camera_id)
        .outerjoin(Location, Location.id == SecurityEvent.location_id)
    )
    from sqlalchemy import cast, Date as SQLDate

    if query.date_from:
        q = q.filter(cast(SecurityEvent.created_at, SQLDate) >= query.date_from)
    if query.date_to:
        q = q.filter(cast(SecurityEvent.created_at, SQLDate) <= query.date_to)
    if query.event_type:
        q = q.filter(SecurityEvent.event_type == query.event_type.value)
    if query.severity:
        q = q.filter(SecurityEvent.severity == query.severity.value)
    if query.is_resolved is not None:
        q = q.filter(SecurityEvent.is_resolved == query.is_resolved)
    if query.location_id:
        q = q.filter(SecurityEvent.location_id == query.location_id)

    total = q.count()
    rows = q.order_by(SecurityEvent.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    events = []
    for se, emp, cam, loc in rows:
        events.append(
            SecurityEventResponse(
                id=se.id,
                event_type=se.event_type.value if hasattr(se.event_type, "value") else str(se.event_type),
                severity=se.severity.value if hasattr(se.severity, "value") else str(se.severity),
                description=se.description,
                employee_id=se.employee_id,
                employee_name=emp.full_name if emp else None,
                camera_id=se.camera_id,
                camera_name=cam.name if cam else None,
                location_id=se.location_id,
                location_name=loc.name if loc else None,
                ip_address=se.ip_address,
                is_resolved=se.is_resolved,
                resolved_by=se.resolved_by,
                resolved_at=se.resolved_at,
                created_at=se.created_at,
            )
        )
    return SecurityEventListResponse(total=total, events=events, page=page, page_size=page_size)


@router.post("/security/events/{event_id}/resolve")
def resolve_security_event(
    event_id: int,
    resolution_notes: str,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.SECURITY)),
    db: Session = Depends(get_db),
):
    from app.models.infrastructure import SecurityEvent

    ev = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    ev.is_resolved = True
    ev.resolved_by = current_user.id
    ev.resolved_at = datetime.utcnow()
    ev.resolution_notes = resolution_notes
    db.commit()
    return {"message": "Security event resolved"}


@router.get("/audit-logs", response_model=AuditLogListResponse)
def list_audit_logs(
    query: AuditLogQueryParams = Depends(),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    from app.models.infrastructure import AuditLog
    from app.models.user import User
    from sqlalchemy import cast, Date as SQLDate

    q = db.query(AuditLog, User).outerjoin(User, User.id == AuditLog.actor_id)
    if query.date_from:
        q = q.filter(cast(AuditLog.created_at, SQLDate) >= query.date_from)
    if query.date_to:
        q = q.filter(cast(AuditLog.created_at, SQLDate) <= query.date_to)
    if query.actor_id:
        q = q.filter(AuditLog.actor_id == query.actor_id)
    if query.entity_type:
        q = q.filter(AuditLog.entity_type == query.entity_type)
    if query.action:
        q = q.filter(AuditLog.action.ilike(f"%{query.action}%"))

    total = q.count()
    rows = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    logs = []
    for al, u in rows:
        logs.append(
            AuditLogResponse(
                id=al.id,
                actor_id=al.actor_id,
                actor_name=u.full_name if u else None,
                action=al.action,
                entity_type=al.entity_type,
                entity_id=al.entity_id,
                ip_address=al.ip_address,
                created_at=al.created_at,
            )
        )
    return AuditLogListResponse(total=total, logs=logs, page=page, page_size=page_size)


@router.get("/ai-insights", response_model=List[AIInsightItem])
def ai_insights(
    days: int = Query(30, ge=7, le=180),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    items = AnomalyDetectionService(db).generate_ai_insights(days=days)
    return [AIInsightItem(**it) for it in items]


@router.get("/anomalies")
def attendance_anomalies(
    days: int = Query(30, ge=14, le=180),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    results = AnomalyDetectionService(db).detect_isolation_forest_style(days=days)
    return {
        "count": len(results),
        "disclaimer": "AI-generated anomaly — requires human review. Never automatically punish based only on anomaly detection.",
        "results": results,
    }


@router.get("/model-performance", response_model=ModelPerformanceMetrics)
def model_performance(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    return ModelPerformanceMetrics(**AnalyticsService(db).model_performance_metrics(days=days))


@router.get("/reports/daily-attendance")
def download_daily_report(
    target_date: date = Query(default_factory=date.today),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    data = ReportService(db).generate_daily_attendance_csv(target_date)
    filename = f"daily_attendance_{target_date.isoformat()}.csv"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/reports/monthly-attendance")
def download_monthly_report(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    data = ReportService(db).generate_monthly_attendance_csv(year, month)
    filename = f"monthly_attendance_{year}_{month:02d}.csv"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/reports/security-events")
def download_security_report(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR, RoleEnum.SECURITY)),
    db: Session = Depends(get_db),
):
    data = ReportService(db).generate_security_events_csv(date_from, date_to)
    suffix = f"_{date_from.isoformat()}_{date_to.isoformat()}" if date_from and date_to else ""
    filename = f"security_events{suffix}.csv"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
