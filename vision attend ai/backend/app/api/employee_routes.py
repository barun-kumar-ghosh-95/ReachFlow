from __future__ import annotations

import io
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, has_role, RoleEnum, has_permission
from app.models.user import User, Department
from app.models.employee import Employee, FaceEmbedding
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeWithStats,
    EmployeeListResponse,
    FaceRegistrationResponse,
    DepartmentCreate,
    DepartmentResponse,
)
from app.services.report_service import ReportService
from app.cv.recognition_service import FaceRecognitionPipeline, base64_to_ndarray, bytes_to_ndarray
from app.core.config import settings

router = APIRouter(prefix="/employees", tags=["Employees"])
logger = logging.getLogger(__name__)


def _pipeline() -> FaceRecognitionPipeline:
    return FaceRecognitionPipeline(
        recognition_threshold=settings.FACE_RECOGNITION_THRESHOLD,
        liveness_threshold=settings.LIVENESS_THRESHOLD,
        min_face_size=settings.MIN_BOX_SIZE,
    )


@router.get("", response_model=EmployeeListResponse)
def list_employees(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR, RoleEnum.SECURITY, RoleEnum.EMPLOYEE)),
    db: Session = Depends(get_db),
):
    q = db.query(Employee)
    if search:
        term = f"%{search}%"
        q = q.filter(
            (Employee.employee_id.ilike(term))
            | (Employee.first_name.ilike(term))
            | (Employee.last_name.ilike(term))
            | (Employee.email.ilike(term))
        )
    if department_id is not None:
        q = q.filter(Employee.department_id == department_id)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)

    role = db.query(__import__("app.models.user", fromlist=["Role"]).Role).filter_by(id=current_user.role_id).first()
    if role and role.name == RoleEnum.EMPLOYEE.value:
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if emp:
            q = q.filter(Employee.id == emp.id)

    total = q.count()
    employees = q.order_by(Employee.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return EmployeeListResponse(
        total=total,
        employees=[EmployeeResponse.model_validate(e) for e in employees],
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=EmployeeResponse)
def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    existing = db.query(Employee).filter(
        (Employee.employee_id == data.employee_id) | (Employee.email == data.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee with this ID or email already exists")
    emp = Employee(**data.model_dump(exclude_unset=True))
    db.add(emp)
    db.commit()
    db.refresh(emp)
    try:
        from app.services.analytics_service import AuditLogService
        AuditLogService(db).log(
            actor_id=current_user.id,
            action="employee.create",
            entity_type="employee",
            entity_id=emp.id,
            new_values={"employee_id": emp.employee_id, "name": emp.full_name},
        )
        db.commit()
    except Exception as e:
        logger.warning(f"audit log failed: {e}")
    return EmployeeResponse.model_validate(emp)


@router.get("/{employee_id}", response_model=EmployeeWithStats)
def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    role = db.query(__import__("app.models.user", fromlist=["Role"]).Role).filter_by(id=current_user.role_id).first()
    if role and role.name == RoleEnum.EMPLOYEE.value:
        own_emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if not own_emp or own_emp.id != emp.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    stats = ReportService(db).employee_attendance_summary(emp.id, days=30)
    return EmployeeWithStats(
        **EmployeeResponse.model_validate(emp).model_dump(),
        attendance_rate=stats["attendance_rate"],
        total_present=stats["total_present"],
        total_absent=stats["total_absent"],
        late_arrivals=stats["late_arrivals"],
    )


@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    old_values = {
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "email": emp.email,
        "designation": emp.designation,
        "department_id": emp.department_id,
        "is_active": emp.is_active,
    }
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(emp, key, val)
    db.commit()
    db.refresh(emp)
    try:
        from app.services.analytics_service import AuditLogService
        AuditLogService(db).log(
            actor_id=current_user.id,
            action="employee.update",
            entity_type="employee",
            entity_id=emp.id,
            old_values=old_values,
            new_values=data.model_dump(exclude_unset=True),
        )
        db.commit()
    except Exception as e:
        logger.warning(f"audit log failed: {e}")
    return EmployeeResponse.model_validate(emp)


@router.delete("/{employee_id}")
def delete_employee(
    employee_id: int,
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp.is_active = False
    db.commit()
    try:
        from app.services.analytics_service import AuditLogService
        AuditLogService(db).log(
            actor_id=current_user.id,
            action="employee.delete",
            entity_type="employee",
            entity_id=emp.id,
            old_values={"employee_id": emp.employee_id, "name": emp.full_name},
        )
        db.commit()
    except Exception:
        pass
    return {"message": "Employee deactivated"}


@router.post("/{employee_id}/face", response_model=FaceRegistrationResponse)
async def register_face(
    employee_id: int,
    file: Optional[UploadFile] = File(default=None),
    face_base64: Optional[str] = Form(default=None),
    is_primary: bool = Form(default=False),
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

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
    success, message, info = pipeline.register_face(frame)
    if not success:
        return FaceRegistrationResponse(success=False, message=message)

    emb = info["embedding"]
    quality = info["quality_score"]

    if is_primary:
        db.query(FaceEmbedding).filter(
            FaceEmbedding.employee_id == employee_id
        ).update({"is_primary": False})
        db.flush()

    fe = FaceEmbedding(
        employee_id=employee_id,
        embedding=emb,
        quality_score=quality,
        is_primary=is_primary,
    )
    db.add(fe)
    db.commit()
    db.refresh(fe)
    return FaceRegistrationResponse(
        success=True,
        message=message,
        embedding_id=fe.id,
        quality_score=quality,
    )


@router.get("/{employee_id}/faces")
def list_face_embeddings(
    employee_id: int,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR, RoleEnum.SECURITY)),
    db: Session = Depends(get_db),
):
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    embs = db.query(FaceEmbedding).filter(FaceEmbedding.employee_id == employee_id).all()
    return [
        {
            "id": e.id,
            "employee_id": e.employee_id,
            "quality_score": e.quality_score,
            "is_primary": e.is_primary,
            "created_at": e.created_at,
        }
        for e in embs
    ]


@router.delete("/{employee_id}/faces/{embedding_id}")
def delete_face_embedding(
    employee_id: int,
    embedding_id: int,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    fe = db.query(FaceEmbedding).filter(
        FaceEmbedding.id == embedding_id, FaceEmbedding.employee_id == employee_id
    ).first()
    if not fe:
        raise HTTPException(status_code=404, detail="Face embedding not found")
    db.delete(fe)
    db.commit()
    return {"message": "Face embedding removed"}


@router.get("/departments/list", response_model=List[DepartmentResponse])
def list_departments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    depts = db.query(Department).order_by(Department.name).all()
    return [DepartmentResponse.model_validate(d) for d in depts]


@router.post("/departments", response_model=DepartmentResponse)
def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.HR)),
    db: Session = Depends(get_db),
):
    existing = db.query(Department).filter(Department.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    dept = Department(**data.model_dump(exclude_unset=True))
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return DepartmentResponse.model_validate(dept)
