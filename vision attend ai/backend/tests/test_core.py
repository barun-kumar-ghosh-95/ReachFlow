import pytest
import numpy as np
from datetime import date, datetime, timedelta

from app.cv.face_pipeline import (
    FaceDetector, FaceAligner, FaceQualityChecker,
    LivenessDetector, EmbeddingStore,
)
from app.cv.recognition_service import FaceRecognitionPipeline
from app.services.attendance_service import AttendanceDecisionEngine
from app.services.anomaly_service import AnomalyDetectionService
from app.core.security import (
    verify_password, get_password_hash, create_access_token, RoleEnum,
)


# ---------- Security & Security (unit tests ----------


def test_password_hashing_and_verify():
    pw = "Secure@12345"
    h = get_password_hash(pw)
    assert h != pw
    assert verify_password(pw, h) is True
    assert verify_password("wrong", h) is False


def test_jwt_token_round_trip():
    token = create_access_token(subject="42")
    assert isinstance(token, str) and len(token) > 10


# ---------- Embedding serialization & matching ----------


def test_embedding_encode_decode_matches():
    rng = np.random.RandomState(0)
    a = rng.randn(512).astype(np.float32)
    a = a / np.linalg.norm(a)
    b = a + rng.randn(512).astype(np.float32) * 0.05
    b = b / np.linalg.norm(b)
    c = rng.randn(512).astype(np.float32)
    c = c / np.linalg.norm(c)

    enc_a = EmbeddingStore.encode(a)
    enc_b = EmbeddingStore.encode(b)
    dec_a = EmbeddingStore.decode(enc_a)
    dec_b = EmbeddingStore.decode(enc_b)
    assert dec_a.shape == (512,)
    s_ab = EmbeddingStore.cosine_similarity(dec_a, dec_b)
    s_ac = EmbeddingStore.cosine_similarity(dec_a, c)
    assert s_ab > 0.9  # close vectors should match
    assert s_ab > s_ac  # dissimilar vector should be higher

    candidates = [(1, dec_a), (2, c)]
    match_id, score = EmbeddingStore.match(dec_b, candidates, threshold=0.7)
    assert match_id == 1 and score >= 0.7


# ---------- Quality & Liveness ----------


def test_quality_check_rejects_uniform_image():
    blank = np.zeros((200, 200, 3), dtype=np.uint8)
    checker = FaceQualityChecker()
    res = checker.check(blank)
    assert res.passed is False or res.score < 0.5


def test_liveness_returns_score_between_zero_one():
    img = np.random.RandomState(7).randint(0, 255, (112, 112, 3), dtype=np.uint8)
    live = LivenessDetector(threshold=0.5)
    r = live.check(img)
    assert 0.0 <= r.score <= 1.0
    assert isinstance(r.passed, bool)
    assert isinstance(r.details, dict)


# ---------- Decision Engine ----------


class _FakeSession:
    """Minimal stand-in so DecisionEngine unit tests can exercise pure logic without DB.
    We only use for a no-op context that only holds state. Replace with real SQLAlchemy session for full tests.
    """
    def __init__(self, rows=None, policies=None):
        self._rows = rows or []
        self._policies = policies or []

    def query(self, *a, **kw):
        return _Q(self._rows, self._policies)


class _Q:
    def __init__(self, rows, policies=None):
        self._rows = rows
        self._policies = policies

    def filter(self, *args, **kwargs):
        return self
    def first(self):
        return self._rows[0] if self._rows else None
    def join(self, *a, **kw): return self
    def all(self): return self._rows


_attendance_row_template = {
    "id": 1,
}


def test_decision_engine_late_detection():
    today = date.today()
    # Create a synthetic in the check-in time 25 minutes past 09:30 should produce LATE.
    db = _FakeSession(rows=[])  # no rows (no duplicate)
    eng = AttendanceDecisionEngine(db=db)
    t = datetime.combine(today, datetime.min.time()) + timedelta(hours=9, minutes=55)
    # monkey-patch datetime.now() so we can mock time for the decision engine's _now
    import app.services.attendance_service as svc
    orig = svc.datetime
    class FakeDT:
        @staticmethod
        def now(): return t
        @staticmethod
        def utcnow(): return t
    svc.datetime = FakeDT
    try:
        class FakeEmp:
            id = 1; is_active = True
            working_hours_start = "09:30"
            working_hours_end = "18:00"
            organization_id = None
        ok, msg, ctx = eng.evaluate_check_in(
            FakeEmp(), recognition_confidence=0.92, liveness_score=0.9,
            quality_score=0.9,
        )
        assert ok is True
        assert ctx.get("late_minutes") >= 9  # 9:55 - threshold = 10 min late

        assert ctx["status"].value == "late"
    finally:
        svc.datetime = orig
