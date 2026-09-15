from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


class CameraStatusEnum(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    WARNING = "warning"


class DeviceTypeEnum(str, Enum):
    DESKTOP = "desktop"
    LAPTOP = "laptop"
    CCTV = "cctv"
    EDGE_DEVICE = "edge_device"
    TABLET = "tablet"
    MOBILE = "mobile"


class SecurityEventTypeEnum(str, Enum):
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


class SecurityEventSeverityEnum(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CameraBase(BaseModel):
    camera_id: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    location_id: Optional[int] = None
    assigned_zone: Optional[str] = None
    stream_url: Optional[str] = None
    device_id: Optional[int] = None


class CameraResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    camera_id: str
    name: str
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    status: str
    last_heartbeat: Optional[datetime] = None
    fps: Optional[float] = None
    resolution: Optional[str] = None
    assigned_zone: Optional[str] = None
    created_at: datetime


class CameraHeartbeat(BaseModel):
    camera_id: str
    fps: Optional[float] = None
    resolution: Optional[str] = None
    status: Optional[str] = None


class DeviceBase(BaseModel):
    device_id: str = Field(..., min_length=2, max_length=100)
    name: str = Field(..., min_length=2, max_length=100)
    device_type: DeviceTypeEnum
    location_id: Optional[int] = None
    mac_address: Optional[str] = None
    allowed_for_attendance: Optional[bool] = False


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    name: str
    device_type: str
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    is_registered: bool
    allowed_for_attendance: bool
    ip_address: Optional[str] = None
    last_seen: Optional[datetime] = None
    created_at: datetime


class LocationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    organization_id: int
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius_meters: Optional[float] = None


class LocationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    organization_id: int
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius_meters: Optional[float] = None
    is_active: bool
    created_at: datetime


class SecurityEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    severity: str
    description: Optional[str] = None
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    camera_id: Optional[int] = None
    camera_name: Optional[str] = None
    location_id: Optional[int] = None
    location_name: Optional[str] = None
    ip_address: Optional[str] = None
    is_resolved: bool
    resolved_by: Optional[int] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime


class SecurityEventQueryParams(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    event_type: Optional[SecurityEventTypeEnum] = None
    severity: Optional[SecurityEventSeverityEnum] = None
    is_resolved: Optional[bool] = None
    location_id: Optional[int] = None


class SecurityEventListResponse(BaseModel):
    total: int
    events: List[SecurityEventResponse]
    page: int
    page_size: int


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: int
    actor_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    ip_address: Optional[str] = None
    created_at: datetime


class AuditLogQueryParams(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    actor_id: Optional[int] = None
    entity_type: Optional[str] = None
    action: Optional[str] = None


class AuditLogListResponse(BaseModel):
    total: int
    logs: List[AuditLogResponse]
    page: int
    page_size: int


class AIInsightItem(BaseModel):
    insight_type: str
    title: str
    description: str
    severity: str
    data: Optional[Dict[str, Any]] = None


class ModelPerformanceMetrics(BaseModel):
    recognition_accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    false_acceptance_rate: Optional[float] = None
    false_rejection_rate: Optional[float] = None
    liveness_accuracy: Optional[float] = None
    average_inference_latency_ms: Optional[float] = None
    total_verifications: int = 0
    successful_verifications: int = 0
    failed_verifications: int = 0
    period: str


class SecurityEventTrendItem(BaseModel):
    date: str
    spoof_attempts: int
    unknown_faces: int
    failed_recognitions: int
