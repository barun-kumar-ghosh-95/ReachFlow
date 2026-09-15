from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, has_role, RoleEnum
from app.models.user import User
from app.models.infrastructure import (
    Camera,
    CameraStatus,
    Device,
    DeviceType,
    Location,
)
from app.models.user import Organization
from app.schemas.infrastructure import (
    CameraBase,
    CameraResponse,
    CameraHeartbeat,
    DeviceBase,
    DeviceResponse,
    LocationBase,
    LocationResponse,
)

router = APIRouter(prefix="/infrastructure", tags=["Cameras, Devices & Locations"])
logger = logging.getLogger(__name__)


@router.get("/cameras", response_model=List[CameraResponse])
def list_cameras(
    status: Optional[str] = None,
    location_id: Optional[int] = None,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.SECURITY)),
    db: Session = Depends(get_db),
):
    from app.models.infrastructure import Location as Loc

    q = db.query(Camera).outerjoin(Loc, Loc.id == Camera.location_id)
    if status:
        q = q.filter(Camera.status == status)
    if location_id:
        q = q.filter(Camera.location_id == location_id)
    cams = q.order_by(Camera.name).all()
    loc_ids = [c.location_id for c in cams if c.location_id]
    locs = {l.id: l.name for l in db.query(Loc).filter(Loc.id.in_(loc_ids)).all()} if loc_ids else {}
    return [
        CameraResponse(
            id=c.id,
            camera_id=c.camera_id,
            name=c.name,
            location_id=c.location_id,
            location_name=locs.get(c.location_id) if c.location_id else None,
            status=c.status.value if hasattr(c.status, "value") else str(c.status),
            last_heartbeat=c.last_heartbeat,
            fps=c.fps,
            resolution=c.resolution,
            assigned_zone=c.assigned_zone,
            created_at=c.created_at,
        )
        for c in cams
    ]


@router.post("/cameras", response_model=CameraResponse)
def create_camera(
    data: CameraBase,
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    existing = db.query(Camera).filter(Camera.camera_id == data.camera_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Camera ID already exists")
    cam = Camera(
        **data.model_dump(exclude_unset=True),
        status=CameraStatus.OFFLINE,
    )
    db.add(cam)
    db.commit()
    db.refresh(cam)
    loc = db.query(Location).filter(Location.id == cam.location_id).first() if cam.location_id else None
    return CameraResponse(
        id=cam.id,
        camera_id=cam.camera_id,
        name=cam.name,
        location_id=cam.location_id,
        location_name=loc.name if loc else None,
        status=cam.status.value,
        last_heartbeat=cam.last_heartbeat,
        fps=cam.fps,
        resolution=cam.resolution,
        assigned_zone=cam.assigned_zone,
        created_at=cam.created_at,
    )


@router.get("/cameras/{camera_id}", response_model=CameraResponse)
def get_camera(
    camera_id: int,
    current_user: User = Depends(has_role(RoleEnum.ADMIN, RoleEnum.SECURITY)),
    db: Session = Depends(get_db),
):
    cam = db.query(Camera).filter(Camera.id == camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    loc = db.query(Location).filter(Location.id == cam.location_id).first() if cam.location_id else None
    return CameraResponse(
        id=cam.id,
        camera_id=cam.camera_id,
        name=cam.name,
        location_id=cam.location_id,
        location_name=loc.name if loc else None,
        status=cam.status.value if hasattr(cam.status, "value") else str(cam.status),
        last_heartbeat=cam.last_heartbeat,
        fps=cam.fps,
        resolution=cam.resolution,
        assigned_zone=cam.assigned_zone,
        created_at=cam.created_at,
    )


@router.post("/cameras/heartbeat")
def camera_heartbeat(
    data: CameraHeartbeat,
    db: Session = Depends(get_db),
):
    cam = db.query(Camera).filter(Camera.camera_id == data.camera_id).first()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not registered")
    now = datetime.utcnow()
    cam.last_heartbeat = now
    if data.fps is not None:
        cam.fps = data.fps
    if data.resolution is not None:
        cam.resolution = data.resolution
    try:
        if data.status:
            cam.status = CameraStatus(data.status)
        else:
            cam.status = CameraStatus.ONLINE
    except Exception:
        cam.status = CameraStatus.ONLINE
    db.commit()
    from app.models.infrastructure import SecurityEvent, SecurityEventType, SecurityEventSeverity

    offline = (
        db.query(Camera)
        .filter(Camera.status == CameraStatus.ONLINE)
        .filter(Camera.last_heartbeat < now - __import__("datetime").timedelta(minutes=5))
        .all()
    )
    for c in offline:
        c.status = CameraStatus.OFFLINE
        try:
            se = SecurityEvent(
                event_type=SecurityEventType.CAMERA_OFFLINE,
                severity=SecurityEventSeverity.MEDIUM,
                description=f"Camera {c.camera_id} ({c.name}) appears offline",
                camera_id=c.id,
                location_id=c.location_id,
            )
            db.add(se)
        except Exception:
            pass
    db.commit()
    return {"received": True, "camera_id": cam.camera_id, "timestamp": now}


@router.get("/devices", response_model=List[DeviceResponse])
def list_devices(
    device_type: Optional[str] = None,
    location_id: Optional[int] = None,
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    from app.models.infrastructure import Location as Loc

    q = db.query(Device).outerjoin(Loc, Loc.id == Device.location_id)
    if device_type:
        q = q.filter(Device.device_type == device_type)
    if location_id:
        q = q.filter(Device.location_id == location_id)
    devs = q.order_by(Device.name).all()
    loc_ids = [d.location_id for d in devs if d.location_id]
    locs = {l.id: l.name for l in db.query(Loc).filter(Loc.id.in_(loc_ids)).all()} if loc_ids else {}
    return [
        DeviceResponse(
            id=d.id,
            device_id=d.device_id,
            name=d.name,
            device_type=d.device_type.value if hasattr(d.device_type, "value") else str(d.device_type),
            location_id=d.location_id,
            location_name=locs.get(d.location_id) if d.location_id else None,
            is_registered=d.is_registered,
            allowed_for_attendance=d.allowed_for_attendance,
            ip_address=d.ip_address,
            last_seen=d.last_seen,
            created_at=d.created_at,
        )
        for d in devs
    ]


@router.post("/devices", response_model=DeviceResponse)
def create_device(
    data: DeviceBase,
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    existing = db.query(Device).filter(Device.device_id == data.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already exists")
    try:
        dt_enum = DeviceType(data.device_type.value if hasattr(data.device_type, "value") else data.device_type)
    except Exception:
        dt_enum = DeviceType.DESKTOP
    dev = Device(
        device_id=data.device_id,
        name=data.name,
        device_type=dt_enum,
        location_id=data.location_id,
        mac_address=data.mac_address,
        allowed_for_attendance=data.allowed_for_attendance,
        is_registered=True,
    )
    db.add(dev)
    db.commit()
    db.refresh(dev)
    loc = db.query(Location).filter(Location.id == dev.location_id).first() if dev.location_id else None
    return DeviceResponse(
        id=dev.id,
        device_id=dev.device_id,
        name=dev.name,
        device_type=dev.device_type.value,
        location_id=dev.location_id,
        location_name=loc.name if loc else None,
        is_registered=dev.is_registered,
        allowed_for_attendance=dev.allowed_for_attendance,
        ip_address=dev.ip_address,
        last_seen=dev.last_seen,
        created_at=dev.created_at,
    )


@router.get("/locations", response_model=List[LocationResponse])
def list_locations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    locs = db.query(Location).order_by(Location.name).all()
    return [
        LocationResponse(
            id=l.id,
            name=l.name,
            organization_id=l.organization_id,
            address=l.address,
            latitude=l.latitude,
            longitude=l.longitude,
            geofence_radius_meters=l.geofence_radius_meters,
            is_active=l.is_active,
            created_at=l.created_at,
        )
        for l in locs
    ]


@router.post("/locations", response_model=LocationResponse)
def create_location(
    data: LocationBase,
    current_user: User = Depends(has_role(RoleEnum.ADMIN)),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == data.organization_id).first()
    if not org:
        org = Organization(
            id=data.organization_id, name=f"Organization {data.organization_id}", settings="{}"
        )
        db.add(org)
        db.flush()
    loc = Location(**data.model_dump(exclude_unset=True))
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return LocationResponse(
        id=loc.id,
        name=loc.name,
        organization_id=loc.organization_id,
        address=loc.address,
        latitude=loc.latitude,
        longitude=loc.longitude,
        geofence_radius_meters=loc.geofence_radius_meters,
        is_active=loc.is_active,
        created_at=loc.created_at,
    )
