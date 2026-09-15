from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class AttendanceStatusEnum(str, Enum):
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    LATE = "late"
    EARLY_DEPARTURE = "early_departure"
    PRESENT = "present"
    ABSENT = "absent"
    HALF_DAY = "half_day"
    ON_LEAVE = "on_leave"
    MANUAL_CORRECTION = "manual_correction"
    REJECTED = "rejected"
    SUSPICIOUS = "suspicious"


class VerificationMethodEnum(str, Enum):
    FACE_RECOGNITION = "face_recognition"
    MANUAL = "manual"
    RFID = "rfid"
    QR_CODE = "qr_code"


class FaceVerificationRequest(BaseModel):
    camera_id: Optional[int] = None
    device_id: Optional[int] = None
    location_id: Optional[int] = None
    ip_address: Optional[str] = None


class FaceVerificationResult(BaseModel):
    recognized: bool
    employee_id: Optional[int] = None
    employee_employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    recognition_confidence: Optional[float] = None
    liveness_score: Optional[float] = None
    liveness_passed: Optional[bool] = None
    face_quality_score: Optional[float] = None
    attendance_status: Optional[str] = None
    attendance_message: Optional[str] = None
    check_in_time: Optional[datetime] = None
    is_duplicate: Optional[bool] = False
    face_box: Optional[List[int]] = None
    challenges_completed: Optional[List[str]] = None
    challenges_required: Optional[List[str]] = None


class AttendanceRecordBase(BaseModel):
    employee_id: int
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    status: AttendanceStatusEnum = AttendanceStatusEnum.PRESENT
    camera_id: Optional[int] = None
    device_id: Optional[int] = None
    location_id: Optional[int] = None
    notes: Optional[str] = None


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_employee_id: Optional[str] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    date: datetime
    status: str
    recognition_confidence: Optional[float] = None
    liveness_score: Optional[float] = None
    camera_id: Optional[int] = None
    location_name: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime


class AttendanceCheckInRequest(BaseModel):
    camera_id: Optional[int] = None
    device_id: Optional[int] = None
    location_id: Optional[int] = None


class AttendanceCheckOutRequest(BaseModel):
    camera_id: Optional[int] = None
    device_id: Optional[int] = None
    location_id: Optional[int] = None


class ManualAttendanceRequest(BaseModel):
    employee_id: int
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    reason: str = Field(..., min_length=10)


class AttendanceQueryParams(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    employee_id: Optional[int] = None
    department_id: Optional[int] = None
    status: Optional[AttendanceStatusEnum] = None
    location_id: Optional[int] = None


class AttendanceListResponse(BaseModel):
    total: int
    records: List[AttendanceRecordResponse]
    page: int
    page_size: int


class DashboardStatsResponse(BaseModel):
    total_employees: int
    present_today: int
    absent_today: int
    late_today: int
    check_ins_last_hour: int
    failed_verifications_today: int
    spoof_attempts_today: int
    unknown_faces_today: int
    attendance_rate: Optional[float] = None
    average_check_in_time: Optional[str] = None


class DailyAttendanceChartItem(BaseModel):
    date: str
    present: int
    absent: int
    late: int


class DepartmentAttendanceItem(BaseModel):
    department: str
    total: int
    present: int
    attendance_rate: float


class LeaveRecordBase(BaseModel):
    employee_id: int
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None


class LeaveRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    reason: Optional[str] = None
    status: str
    created_at: datetime
