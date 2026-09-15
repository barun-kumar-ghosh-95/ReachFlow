from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    designation = Column(String(100), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, unique=True)
    profile_photo = Column(String(500), nullable=True)
    joining_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    working_hours_start = Column(String(20), default="09:30")
    working_hours_end = Column(String(20), default="18:00")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="employee")
    department = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    organization = relationship("Organization", back_populates="employees")
    face_embeddings = relationship("FaceEmbedding", back_populates="employee", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="employee", cascade="all, delete-orphan")
    leave_records = relationship("LeaveRecord", back_populates="employee", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    embedding = Column(Text, nullable=False)
    embedding_vector = None
    image_reference = Column(String(500), nullable=True)
    quality_score = Column(Float, nullable=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    employee = relationship("Employee", back_populates="face_embeddings")
