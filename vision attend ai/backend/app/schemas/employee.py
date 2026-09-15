from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, date


class EmployeeBase(BaseModel):
    employee_id: str = Field(..., min_length=2, max_length=50)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[int] = None
    organization_id: Optional[int] = None
    joining_date: Optional[date] = None
    working_hours_start: Optional[str] = "09:30"
    working_hours_end: Optional[str] = "18:00"


class EmployeeCreate(EmployeeBase):
    user_id: Optional[int] = None


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    working_hours_start: Optional[str] = None
    working_hours_end: Optional[str] = None


class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    profile_photo: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class EmployeeWithStats(EmployeeResponse):
    attendance_rate: Optional[float] = None
    total_present: Optional[int] = None
    total_absent: Optional[int] = None
    late_arrivals: Optional[int] = None


class FaceRegistrationResponse(BaseModel):
    success: bool
    message: str
    embedding_id: Optional[int] = None
    quality_score: Optional[float] = None


class FaceCaptureRequest(BaseModel):
    employee_id: int
    is_primary: Optional[bool] = False


class EmployeeListResponse(BaseModel):
    total: int
    employees: List[EmployeeResponse]
    page: int
    page_size: int


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    manager_id: Optional[int] = None


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentResponse(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
