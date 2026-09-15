import sys
from app.seed_data import ensure_demo_data
ensure_demo_data()
print("SEEDING SUCCESS")
from app.core.database import SessionLocal
from app.models.user import User, Role
from app.models.employee import Employee
from app.core.security import verify_password
db = SessionLocal()
print(f"Users: {db.query(User).count()}")
print(f"Employees: {db.query(Employee).count()}")
print(f"Roles: {db.query(Role).count()}")
admin = db.query(User).filter(User.username == "admin").first()
print(f"Admin found: {admin is not None}")
if admin:
    ok = verify_password("Admin@123", admin.password_hash)
    print(f"Password verify: {ok}")
db.close()
