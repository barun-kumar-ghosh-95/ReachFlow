from __future__ import annotations

"""Demo-mode seeder: roles, permissions, users, departments, 5 demo employees with synthetic embeddings,
   a default organization, policy, location, device, and camera. Works without a real webcam.
"""

import json
import logging
import random as pyrandom
from datetime import datetime, date, timedelta
from typing import List, Tuple

import numpy as np

from app.core.database import SessionLocal, Base, engine
from app.core.security import RoleEnum, get_password_hash
from app.models.user import User, Role, Permission, RolePermission, Organization, Department
from app.models.employee import Employee, FaceEmbedding
from app.models.attendance import (
    AttendanceRecord,
    AttendanceStatus,
    AttendancePolicy,
    VerificationMethod,
)
from app.models.infrastructure import (
    Camera,
    CameraStatus,
    Device,
    DeviceType,
    Location,
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    AuditLog,
)
from app.cv.face_pipeline import EmbeddingStore

logger = logging.getLogger(__name__)


DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@visionattend.ai",
        "password": "Admin@123",
        "full_name": "Aarav Sharma",
        "role": RoleEnum.ADMIN,
        "phone": "+91-9800000001",
    },
    {
        "username": "hr_manager",
        "email": "hr@visionattend.ai",
        "password": "HR@12345",
        "full_name": "Priya Nair",
        "role": RoleEnum.HR,
        "phone": "+91-9800000002",
    },
    {
        "username": "security",
        "email": "security@visionattend.ai",
        "password": "Security@123",
        "full_name": "Vikram Singh",
        "role": RoleEnum.SECURITY,
        "phone": "+91-9800000003",
    },
    {
        "username": "employee1",
        "email": "rahul.sharma@visionattend.ai",
        "password": "Employee@123",
        "full_name": "Rahul Sharma",
        "role": RoleEnum.EMPLOYEE,
        "phone": "+91-9800000010",
    },
]


DEMO_EMPLOYEES = [
    {
        "employee_id": "EMP001",
        "first_name": "Rahul",
        "last_name": "Sharma",
        "email": "rahul.sharma@visionattend.ai",
        "phone": "+91-9800000010",
        "designation": "Senior Software Engineer",
        "department": "Engineering",
        "username_binding": "employee1",
        "color_seed": 1,
    },
    {
        "employee_id": "EMP002",
        "first_name": "Ananya",
        "last_name": "Verma",
        "email": "ananya.verma@visionattend.ai",
        "phone": "+91-9800000011",
        "designation": "Product Manager",
        "department": "Product",
        "username_binding": None,
        "color_seed": 2,
    },
    {
        "employee_id": "EMP003",
        "first_name": "Karan",
        "last_name": "Kapoor",
        "email": "karan.kapoor@visionattend.ai",
        "phone": "+91-9800000012",
        "designation": "HR Executive",
        "department": "Human Resources",
        "username_binding": None,
        "color_seed": 3,
    },
    {
        "employee_id": "EMP004",
        "first_name": "Sneha",
        "last_name": "Iyer",
        "email": "sneha.iyer@visionattend.ai",
        "phone": "+91-9800000013",
        "designation": "Security Officer",
        "department": "Security",
        "username_binding": None,
        "color_seed": 4,
    },
    {
        "employee_id": "EMP005",
        "first_name": "Arjun",
        "last_name": "Patel",
        "email": "arjun.patel@visionattend.ai",
        "phone": "+91-9800000014",
        "designation": "Operations Analyst",
        "department": "Operations",
        "username_binding": None,
        "color_seed": 5,
    },
]


PERMISSIONS = [
    # Employees / HR
    ("employee.view", "View employee records"),
    ("employee.create", "Create employees"),
    ("employee.update", "Update employees"),
    ("employee.delete", "Delete employees"),
    ("employee.face_register", "Register faces"),
    # Attendance
    ("attendance.view", "View attendance records"),
    ("attendance.checkin", "Mark check-in/check-out"),
    ("attendance.correct", "Manually correct attendance"),
    # Reports & analytics
    ("analytics.view", "View analytics dashboard"),
    ("reports.export", "Export attendance reports"),
    # Security
    ("security.view", "View security events"),
    ("security.resolve", "Resolve security events"),
    # Infrastructure
    ("infrastructure.view", "View cameras, devices, locations"),
    ("infrastructure.manage", "Manage cameras, devices, locations"),
    # Admin
    ("audit.view", "View audit logs"),
    ("settings.manage", "Manage organization settings"),
    ("roles.manage", "Manage roles and permissions"),
]


DEMO_DEPARTMENTS = ["Engineering", "Product", "Human Resources", "Security", "Operations", "Finance"]


def _deterministic_embedding(seed: int, variation: int = 0) -> str:
    rng = np.random.RandomState(seed * 7 + variation * 31 + 13)
    emb = rng.randn(EmbeddingStore.EMBEDDING_DIM).astype(np.float32)
    emb = emb / (np.linalg.norm(emb) + 1e-9)
    return EmbeddingStore.encode(emb)


def ensure_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seeded = False
        if db.query(Role).count() == 0:
            _seed_roles_and_permissions(db)
            seeded = True
        if db.query(Organization).count() == 0:
            _seed_org_policy_and_locations(db)
            seeded = True
        if db.query(User).count() == 0:
            _seed_users(db)
            seeded = True
        if db.query(Department).count() == 0:
            _seed_departments(db)
            seeded = True
        if db.query(Employee).count() == 0:
            _seed_employees_and_faces(db)
            seeded = True
        if db.query(Camera).count() == 0:
            _seed_cameras_and_devices(db)
            seeded = True
        if db.query(AttendanceRecord).count() == 0:
            _seed_attendance_history(db)
            seeded = True
        if db.query(SecurityEvent).count() == 0:
            _seed_security_events(db)
            seeded = True
        if seeded:
            logger.info("Demo data seed complete")
        else:
            logger.info("Tables already populated; skipping demo data seed")
    finally:
        db.close()


def _seed_roles_and_permissions(db):
    perms_map = {}
    for name, desc in PERMISSIONS:
        p = Permission(name=name, description=desc)
        db.add(p)
        db.flush()
        perms_map[name] = p.id

    role_specs = {
        RoleEnum.ADMIN: list(perms_map.keys()),
        RoleEnum.HR: [
            "employee.view", "employee.create", "employee.update", "employee.face_register",
            "attendance.view", "attendance.correct",
            "analytics.view", "reports.export",
            "security.view",
        ],
        RoleEnum.SECURITY: [
            "employee.view",
            "attendance.view",
            "analytics.view",
            "security.view", "security.resolve",
            "infrastructure.view",
        ],
        RoleEnum.EMPLOYEE: [
            "employee.view",
            "attendance.view",
            "attendance.checkin",
        ],
    }

    for r_enum, perm_names in role_specs.items():
        role = Role(name=r_enum.value, description=f"{r_enum.value.title()} role")
        db.add(role)
        db.flush()
        for pname in perm_names:
            if pname in perms_map:
                db.add(RolePermission(role_id=role.id, permission_id=perms_map[pname]))
    db.commit()


def _seed_org_policy_and_locations(db):
    org = Organization(
        name="VisionAttend HQ",
        address="100 AI Park, Bengaluru, Karnataka, India",
        contact_email="contact@visionattend.ai",
        contact_phone="+91-80-00000000",
        settings=json.dumps({"timezone": "Asia/Kolkata"}),
    )
    db.add(org)
    db.flush()

    policy = AttendancePolicy(
        name="HQ Default Policy",
        organization_id=org.id,
        work_start_time="09:30",
        work_end_time="18:00",
        late_threshold_minutes=15,
        early_leave_threshold_minutes=15,
        lunch_break_minutes=60,
        working_days="1,2,3,4,5",
        face_recognition_threshold=0.65,
        liveness_threshold=0.70,
        require_liveness=True,
        restrict_by_device=False,
        restrict_by_location=False,
        restrict_by_ip=False,
        is_active=True,
    )
    db.add(policy)

    loc = Location(
        name="Main Entrance",
        organization_id=org.id,
        address="100 AI Park, Main Gate",
        latitude=12.9716,
        longitude=77.5946,
        geofence_radius_meters=100,
        is_active=True,
    )
    db.add(loc)
    loc2 = Location(
        name="Factory Zone B",
        organization_id=org.id,
        address="100 AI Park, Factory B",
        latitude=12.9722,
        longitude=77.5950,
        geofence_radius_meters=80,
        is_active=True,
    )
    db.add(loc2)
    db.commit()


def _seed_users(db):
    role_by_name = {r.name: r.id for r in db.query(Role).all()}
    for ud in DEMO_USERS:
        u = User(
            username=ud["username"],
            email=ud["email"],
            password_hash=get_password_hash(ud["password"]),
            full_name=ud["full_name"],
            phone=ud["phone"],
            role_id=role_by_name[ud["role"].value],
            is_active=True,
            last_login=datetime.utcnow(),
        )
        db.add(u)
    db.commit()


def _seed_departments(db):
    for name in DEMO_DEPARTMENTS:
        db.add(Department(name=name, description=f"{name} team"))
    db.commit()


def _seed_employees_and_faces(db):
    depts = {d.name: d.id for d in db.query(Department).all()}
    user_by_username = {u.username: u for u in db.query(User).all()}
    for idx, ed in enumerate(DEMO_EMPLOYEES, start=1):
        emp = Employee(
            employee_id=ed["employee_id"],
            first_name=ed["first_name"],
            last_name=ed["last_name"],
            email=ed["email"],
            phone=ed["phone"],
            designation=ed["designation"],
            department_id=depts.get(ed["department"]),
            organization_id=1,
            user_id=user_by_username[ed["username_binding"]].id if ed["username_binding"] in user_by_username else None,
            joining_date=date(2024, 1, idx + 1),
            is_active=True,
            working_hours_start="09:30",
            working_hours_end="18:00",
        )
        db.add(emp)
        db.flush()
        for v in range(3):
            emb = _deterministic_embedding(ed["color_seed"], v)
            db.add(
                FaceEmbedding(
                    employee_id=emp.id,
                    embedding=emb,
                    quality_score=0.92 - v * 0.05,
                    is_primary=(v == 0),
                )
            )
    db.commit()


def _seed_cameras_and_devices(db):
    org_id = 1
    loc_map = {l.name: l.id for l in db.query(Location).all()}
    dev = Device(
        device_id="ADMIN-PC-01",
        name="Admin Workstation",
        device_type=DeviceType.DESKTOP,
        location_id=loc_map.get("Main Entrance"),
        is_registered=True,
        allowed_for_attendance=True,
        mac_address="00:1A:2B:3C:4D:5E",
        ip_address="192.168.1.10",
        last_seen=datetime.utcnow(),
    )
    db.add(dev)
    db.flush()
    dev2 = Device(
        device_id="CAM-STATION-04",
        name="Main Entrance CCTV Station",
        device_type=DeviceType.CCTV,
        location_id=loc_map.get("Main Entrance"),
        is_registered=True,
        allowed_for_attendance=True,
        mac_address="00:1A:2B:3C:4D:AA",
        ip_address="192.168.1.14",
        last_seen=datetime.utcnow(),
    )
    db.add(dev2)
    db.flush()
    cam = Camera(
        camera_id="CAM-01",
        name="Main Entrance Camera",
        location_id=loc_map.get("Main Entrance"),
        status=CameraStatus.ONLINE,
        last_heartbeat=datetime.utcnow(),
        fps=30.0,
        resolution="1920x1080",
        assigned_zone="Lobby-1",
        stream_url="rtsp://192.168.1.100/cam01",
        device_id=dev2.id,
    )
    db.add(cam)
    cam2 = Camera(
        camera_id="CAM-04",
        name="Factory Zone B Camera",
        location_id=loc_map.get("Factory Zone B"),
        status=CameraStatus.ONLINE,
        last_heartbeat=datetime.utcnow(),
        fps=25.0,
        resolution="1280x720",
        assigned_zone="Factory-B",
        stream_url="rtsp://192.168.1.104/cam04",
        device_id=dev2.id,
    )
    db.add(cam2)
    db.commit()


def _seed_attendance_history(db):
    emps = db.query(Employee).all()
    locs = db.query(Location).all()
    loc_id = locs[0].id if locs else None
    end = date.today()
    start = end - timedelta(days=29)
    d = start
    rng = np.random.RandomState(42)
    while d <= end:
        weekday = d.isoweekday()
        if weekday > 5:
            d += timedelta(days=1)
            continue
        for emp in emps:
            if rng.random() < 0.08:
                continue
            base = datetime.combine(d, datetime.min.time())
            arrival_minute_base = rng.normal(loc=555, scale=10)  # 9:15 mean
            if rng.random() < 0.15:
                arrival_minute_base += 30
            arrival_minute_base = max(7 * 60, min(arrival_minute_base, 11 * 60))
            checkin = base + timedelta(minutes=int(arrival_minute_base))
            departure_minute_base = rng.normal(loc=18 * 60 + 10, scale=15)
            departure_minute_base = max(15 * 60, min(departure_minute_base, 20 * 60))
            checkout = base + timedelta(minutes=int(departure_minute_base))
            status = AttendanceStatus.PRESENT
            work_start_h, work_start_m = 9, 30
            late_threshold = 15
            diff_min = (checkin - (base + timedelta(hours=work_start_h, minutes=work_start_m))).total_seconds() / 60
            if diff_min > late_threshold:
                status = AttendanceStatus.LATE
            elif checkout < (base + timedelta(hours=17, minutes=45)):
                status = AttendanceStatus.EARLY_DEPARTURE
            rec = AttendanceRecord(
                employee_id=emp.id,
                check_in_time=checkin,
                check_out_time=checkout,
                date=checkin,
                status=status,
                verification_method=VerificationMethod.FACE_RECOGNITION,
                recognition_confidence=float(0.88 + rng.random() * 0.11),
                liveness_score=float(0.82 + rng.random() * 0.17),
                face_quality_score=float(0.78 + rng.random() * 0.2),
                camera_id=1,
                location_id=loc_id,
                ip_address=f"192.168.1.{100 + emp.id}",
                is_duplicate=False,
            )
            db.add(rec)
        d += timedelta(days=1)
    db.commit()


def _seed_security_events(db):
    emps = db.query(Employee).all()
    cams = db.query(Camera).all()
    locs = db.query(Location).all()
    rng = np.random.RandomState(7)
    today = date.today()
    for i in range(12):
        d = datetime.combine(today, datetime.min.time()) + timedelta(
            hours=int(7 + rng.random() * 12), minutes=int(rng.random() * 60)
        )
        ev_type = pyrandom.choice(
            [
                SecurityEventType.UNKNOWN_FACE,
                SecurityEventType.SPOOF_ATTEMPT,
                SecurityEventType.FAILED_RECOGNITION,
                SecurityEventType.MULTIPLE_FACES,
            ]
        )
        sev = SecurityEventSeverity.MEDIUM
        if ev_type == SecurityEventType.SPOOF_ATTEMPT:
            sev = SecurityEventSeverity.HIGH if rng.random() < 0.3 else SecurityEventSeverity.CRITICAL
        elif ev_type == SecurityEventType.UNKNOWN_FACE:
            sev = SecurityEventSeverity.HIGH
        se = SecurityEvent(
            event_type=ev_type,
            severity=sev,
            description=f"Event {i + 1}: {ev_type.value} detected by automated pipeline.",
            employee_id=emps[i % len(emps)].id if rng.random() < 0.4 else None,
            camera_id=cams[i % len(cams)].id if cams else None,
            location_id=locs[i % len(locs)].id if locs else None,
            ip_address=f"192.168.1.{10 + i}",
            meta_data=json.dumps({"detection_source": "demo_seed", "score": float(0.5 + rng.random() * 0.5)}),
            is_resolved=(i % 3 == 0),
            created_at=d,
        )
        db.add(se)

    users = db.query(User).all()
    if users:
        actor = users[0]
        db.add(
            AuditLog(
                actor_id=actor.id,
                action="attendance_policy.updated",
                entity_type="attendance_policy",
                entity_id=1,
                old_values=json.dumps({"late_threshold_minutes": 10}),
                new_values=json.dumps({"late_threshold_minutes": 15}),
                ip_address="192.168.1.10",
                created_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=9, minutes=31),
            )
        )
        db.add(
            AuditLog(
                actor_id=actor.id,
                action="attendance.manual_correction",
                entity_type="attendance_record",
                entity_id=1,
                old_values=json.dumps({"status": "absent"}),
                new_values=json.dumps({"status": "manual_correction", "reason": "Camera failure"}),
                ip_address="192.168.1.10",
                created_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=11, minutes=10),
            )
        )
    db.commit()
