from __future__ import annotations

import io
import base64
import numpy as np
from typing import Optional, List, Tuple
import logging
from app.cv.face_pipeline import (
    FaceDetector,
    FaceEmbedder,
    FaceAligner,
    FaceQualityChecker,
    LivenessDetector,
    EmbeddingStore,
    DetectedFace,
)

logger = logging.getLogger(__name__)


def bytes_to_ndarray(data: bytes) -> Optional[np.ndarray]:
    try:
        import cv2

        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.warning(f"Failed to decode image bytes: {e}")
        return None


def base64_to_ndarray(b64: str) -> Optional[np.ndarray]:
    try:
        if b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]
        raw = base64.b64decode(b64)
        return bytes_to_ndarray(raw)
    except Exception as e:
        logger.warning(f"Failed to decode base64 image: {e}")
        return None


class FaceRecognitionPipeline:
    """High-level orchestrator for the complete CV pipeline."""

    def __init__(
        self,
        recognition_threshold: float = 0.65,
        liveness_threshold: float = 0.70,
        min_face_size: int = 60,
    ):
        self.detector = FaceDetector(min_face_size=min_face_size)
        self.aligner = FaceAligner()
        self.embedder = FaceEmbedder()
        self.quality_checker = FaceQualityChecker(min_face_size=min_face_size)
        self.liveness_detector = LivenessDetector(threshold=liveness_threshold)
        self.recognition_threshold = recognition_threshold
        self.liveness_threshold = liveness_threshold

    def detect_and_align(
        self, frame: np.ndarray, require_single: bool = True
    ) -> Tuple[List[DetectedFace], Optional[DetectedFace], List[str]]:
        warnings: List[str] = []
        faces = self.detector.detect_faces(frame)
        if not faces:
            warnings.append("No face detected in frame")
            return faces, None, warnings
        if require_single and len(faces) > 1:
            warnings.append(f"Multiple faces detected ({len(faces)}) - registration requires single face")
        primary = max(faces, key=lambda f: f.confidence)
        aligned = self.aligner.align(frame, primary)
        primary.aligned_face = aligned
        return faces, primary, warnings

    def extract_embedding(self, face_img: np.ndarray) -> Optional[np.ndarray]:
        return self.embedder.get_embedding(face_img)

    def quality_check(self, face_img: np.ndarray, bbox: Optional[List[int]] = None):
        return self.quality_checker.check(face_img, bbox)

    def liveness_check(
        self,
        face_img: np.ndarray,
        bbox: Optional[List[int]] = None,
        session_id: Optional[str] = None,
        challenges: Optional[List[str]] = None,
    ):
        return self.liveness_detector.check(face_img, bbox, session_id, challenges)

    def match_embedding(
        self,
        query_emb: np.ndarray,
        candidates: List[Tuple[int, np.ndarray]],
    ) -> Tuple[Optional[int], float]:
        return EmbeddingStore.match(query_emb, candidates, self.recognition_threshold)

    def register_face(
        self,
        frame: np.ndarray,
    ) -> Tuple[bool, str, dict]:
        faces, primary, warnings = self.detect_and_align(frame, require_single=True)
        if primary is None or primary.aligned_face is None:
            return False, "No face detected", {"warnings": warnings}
        if len(faces) > 1:
            return False, "Multiple faces detected", {"warnings": warnings}
        quality = self.quality_checker.check(primary.aligned_face, primary.bbox)
        if not quality.passed:
            return False, f"Face quality insufficient: {'; '.join(quality.reasons)}", {
                "quality_score": quality.score,
                "reasons": quality.reasons,
            }
        embedding = self.embedder.get_embedding(primary.aligned_face)
        if embedding is None:
            return False, "Failed to extract face features", {"quality_score": quality.score}
        encoded = EmbeddingStore.encode(embedding)
        return True, "Face registered successfully", {
            "embedding": encoded,
            "quality_score": quality.score,
            "bbox": primary.bbox,
        }

    def verify_face(
        self,
        frame: np.ndarray,
        candidates: List[Tuple[int, np.ndarray]],
        require_liveness: bool = True,
    ) -> dict:
        faces, primary, warnings = self.detect_and_align(frame, require_single=True)
        result = {
            "detected": False,
            "faces_count": len(faces),
            "bbox": None,
            "recognized": False,
            "employee_id": None,
            "recognition_confidence": 0.0,
            "liveness_passed": False,
            "liveness_score": 0.0,
            "quality_score": 0.0,
            "warnings": warnings,
        }
        if primary is None or primary.aligned_face is None:
            return result
        result["detected"] = True
        result["bbox"] = primary.bbox
        quality = self.quality_checker.check(primary.aligned_face, primary.bbox)
        result["quality_score"] = quality.score
        embedding = self.embedder.get_embedding(primary.aligned_face)
        if embedding is not None:
            emp_id, score = self.match_embedding(embedding, candidates)
            result["employee_id"] = emp_id
            result["recognition_confidence"] = score
            result["recognized"] = emp_id is not None
        if require_liveness:
            liveness = self.liveness_detector.check(primary.aligned_face, primary.bbox)
            result["liveness_score"] = liveness.score
            result["liveness_passed"] = liveness.passed
            result["liveness_details"] = liveness.details
        else:
            result["liveness_passed"] = True
            result["liveness_score"] = 1.0
        return result
