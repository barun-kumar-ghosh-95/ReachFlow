import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

engine = None
SessionLocal = None
USING_SQLITE = False


def _setup_sqlite():
    global engine, SessionLocal, USING_SQLITE
    sqlite_url = settings.SQLITE_URL
    logger.warning(f"PostgreSQL unavailable. Falling back to SQLite: {sqlite_url}")
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    USING_SQLITE = True


def _setup_postgres():
    global engine, SessionLocal
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        connect_args={"connect_timeout": 3},
    )
    with engine.connect() as conn:
        conn.execute("SELECT 1")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


try:
    if settings.USE_SQLITE_FALLBACK:
        try:
            _setup_postgres()
            logger.info("Connected to PostgreSQL successfully")
        except (SQLAlchemyError, Exception) as e:
            logger.info(f"PostgreSQL connection failed ({e}); using SQLite fallback")
            _setup_sqlite()
    else:
        _setup_postgres()
        logger.info("Connected to PostgreSQL successfully")
except Exception as e:
    logger.warning(f"All database connections failed. Attempting SQLite as last resort: {e}")
    try:
        _setup_sqlite()
    except Exception as e2:
        logger.critical(f"FATAL: Could not initialize any database: {e2}")
        raise


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
