from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AttendanceStatus(str, enum.Enum):
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


class VerificationMethod(str, enum.Enum):
    FACE_RECOGNITION = "face_recognition"
    MANUAL = "manual"
    RFID = "rfid"
    QR_CODE = "qr_code"


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    check_in_time = Column(DateTime(timezone=True), nullable=True)
    check_out_time = Column(DateTime(timezone=True), nullable=True)
    date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(AttendanceStatus), default=AttendanceStatus.PRESENT, nullable=False)
    verification_method = Column(SQLEnum(VerificationMethod), default=VerificationMethod.FACE_RECOGNITION, nullable=False)
    recognition_confidence = Column(Float, nullable=True)
    liveness_score = Column(Float, nullable=True)
    face_quality_score = Column(Float, nullable=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    ip_address = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    is_duplicate = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee = relationship("Employee", back_populates="attendance_records")
    camera = relationship("Camera", back_populates="attendance_records")
    device = relationship("Device", back_populates="attendance_records")
    location = relationship("Location", back_populates="attendance_records")


class AttendancePolicy(Base):
    __tablename__ = "attendance_policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    work_start_time = Column(String(20), default="09:30")
    work_end_time = Column(String(20), default="18:00")
    late_threshold_minutes = Column(Integer, default=15)
    early_leave_threshold_minutes = Column(Integer, default=15)
    lunch_break_minutes = Column(Integer, default=60)
    working_days = Column(String(50), default="1,2,3,4,5")
    face_recognition_threshold = Column(Float, default=0.65)
    liveness_threshold = Column(Float, default=0.70)
    require_liveness = Column(Boolean, default=True)
    restrict_by_device = Column(Boolean, default=False)
    restrict_by_location = Column(Boolean, default=False)
    restrict_by_ip = Column(Boolean, default=False)
    allowed_ip_ranges = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", back_populates="attendance_policies")


class LeaveType(str, enum.Enum):
    SICK = "sick"
    CASUAL = "casual"
    ANNUAL = "annual"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    UNPAID = "unpaid"
    OTHER = "other"


class LeaveStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LeaveRecord(Base):
    __tablename__ = "leave_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    leave_type = Column(SQLEnum(LeaveType), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    status = Column(SQLEnum(LeaveStatus), default=LeaveStatus.PENDING, nullable=False)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="leave_records")
