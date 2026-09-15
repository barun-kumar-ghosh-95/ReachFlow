from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class CameraStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    WARNING = "warning"


class DeviceType(str, enum.Enum):
    DESKTOP = "desktop"
    LAPTOP = "laptop"
    CCTV = "cctv"
    EDGE_DEVICE = "edge_device"
    TABLET = "tablet"
    MOBILE = "mobile"


class SecurityEventType(str, enum.Enum):
    UNKNOWN_FACE = "unknown_face"
    SPOOF_ATTEMPT = "spoof_attempt"
    MULTIPLE_FACES = "multiple_faces"
    FAILED_RECOGNITION = "failed_recognition"
    UNAUTHORIZED_DEVICE = "unauthorized_device"
    UNAUTHORIZED_LOCATION = "unauthorized_location"
    OUTSIDE_HOURS = "outside_hours"
    DUPLICATE_ATTEMPT = "duplicate_attempt"
    SUSPICIOUS_PATTERN = "suspicious_pattern"
    CAMERA_OFFLINE = "camera_offline"


class SecurityEventSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    status = Column(SQLEnum(CameraStatus), default=CameraStatus.OFFLINE, nullable=False)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)
    fps = Column(Float, nullable=True)
    resolution = Column(String(20), nullable=True)
    assigned_zone = Column(String(100), nullable=True)
    stream_url = Column(String(500), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    location = relationship("Location", back_populates="cameras")
    device = relationship("Device", back_populates="cameras")
    attendance_records = relationship("AttendanceRecord", back_populates="camera")
    security_events = relationship("SecurityEvent", back_populates="camera")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    device_type = Column(SQLEnum(DeviceType), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    is_registered = Column(Boolean, default=False)
    allowed_for_attendance = Column(Boolean, default=False)
    mac_address = Column(String(50), nullable=True)
    ip_address = Column(String(50), nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    location = relationship("Location", back_populates="devices")
    cameras = relationship("Camera", back_populates="device")
    attendance_records = relationship("AttendanceRecord", back_populates="device")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geofence_radius_meters = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", back_populates="locations")
    cameras = relationship("Camera", back_populates="location")
    devices = relationship("Device", back_populates="location")
    attendance_records = relationship("AttendanceRecord", back_populates="location")
    security_events = relationship("SecurityEvent", back_populates="location")


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(SQLEnum(SecurityEventType), nullable=False)
    severity = Column(SQLEnum(SecurityEventSeverity), default=SecurityEventSeverity.MEDIUM, nullable=False)
    description = Column(Text, nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"), nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    ip_address = Column(String(50), nullable=True)
    meta_data = Column(Text, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    camera = relationship("Camera", back_populates="security_events")
    location = relationship("Location", back_populates="security_events")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    old_values = Column(Text, nullable=True)
    new_values = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    actor = relationship("User", foreign_keys=[actor_id], back_populates="created_audit_logs")


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SLACK = "slack"
    WHATSAPP = "whatsapp"
    WEB = "web"
    SMS = "sms"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    channel = Column(SQLEnum(NotificationChannel), default=NotificationChannel.WEB, nullable=False)
    status = Column(SQLEnum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False)
    related_event_id = Column(Integer, nullable=True)
    related_entity_type = Column(String(50), nullable=True)
    meta_data = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
