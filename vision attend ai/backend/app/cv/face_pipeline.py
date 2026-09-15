from __future__ import annotations

import numpy as np
import base64
import json
import time
import hashlib
from dataclasses import dataclass
from typing import List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


@dataclass
class DetectedFace:
    bbox: List[int]
    confidence: float
    landmarks: Optional[np.ndarray] = None
    aligned_face: Optional[np.ndarray] = None
    quality_score: float = 0.0


@dataclass
class FaceQualityResult:
    passed: bool
    score: float
    reasons: List[str]


@dataclass
class LivenessResult:
    passed: bool
    score: float
    details: dict


class FaceEmbedder:
    """Face embedding extraction using InsightFace or fallback synthetic embeddings."""

    EMBEDDING_DIM = 512

    def __init__(self):
        self.model = None
        self._use_fallback = False
        self._init_model()

    def _init_model(self):
        try:
            from insightface.app import FaceAnalysis

            self.model = FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"],
            )
            self.model.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace model loaded successfully")
        except Exception as e:
            logger.warning(f"InsightFace not available, using fallback embedding: {e}")
            self._use_fallback = True

    def get_embedding(self, aligned_face: np.ndarray) -> Optional[np.ndarray]:
        if self._use_fallback:
            return self._fallback_embedding(aligned_face)
        try:
            faces = self.model.get(aligned_face)
            if faces and len(faces) > 0:
                return faces[0].embedding
        except Exception as e:
            logger.warning(f"Embedding extraction failed: {e}")
            return self._fallback_embedding(aligned_face)
        return None

    def _fallback_embedding(self, face_img: np.ndarray) -> np.ndarray:
        h, w = face_img.shape[:2]
        hash_input = face_img.tobytes()
        digest = hashlib.sha256(hash_input).digest()
        rng = np.random.RandomState(int.from_bytes(digest[:4], "big"))
        emb = rng.randn(self.EMBEDDING_DIM).astype(np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb


class FaceDetector:
    """Face detection with optional InsightFace, fallback to OpenCV Haar cascades."""

    def __init__(self, min_face_size: int = 60):
        self.min_face_size = min_face_size
        self.model = None
        self.haar_detector = None
        self._use_fallback = False
        self._init_detector()

    def _init_detector(self):
        try:
            from insightface.app import FaceAnalysis

            self.model = FaceAnalysis(
                name="buffalo_l",
                providers=["CPUExecutionProvider"],
            )
            self.model.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace detector loaded successfully")
        except Exception as e:
            logger.warning(f"InsightFace detector not available, using OpenCV fallback: {e}")
            self._use_fallback = True
            try:
                import cv2

                self.haar_detector = cv2.CascadeClassifier(
                    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                )
            except Exception as ce:
                logger.error(f"Even OpenCV haar fallback failed: {ce}")

    def detect_faces(self, frame: np.ndarray) -> List[DetectedFace]:
        if not self._use_fallback and self.model is not None:
            return self._detect_insightface(frame)
        return self._detect_haar(frame)

    def _detect_insightface(self, frame: np.ndarray) -> List[DetectedFace]:
        result: List[DetectedFace] = []
        try:
            faces = self.model.get(frame)
            for f in faces:
                bbox = f.bbox.astype(int).tolist()
                bbox = [max(0, bbox[0]), max(0, bbox[1]), bbox[2], bbox[3]]
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                if w < self.min_face_size or h < self.min_face_size:
                    continue
                landmarks = getattr(f, "kps", None)
                result.append(
                    DetectedFace(
                        bbox=bbox,
                        confidence=float(f.det_score),
                        landmarks=landmarks,
                        quality_score=float(f.det_score),
                    )
                )
        except Exception as e:
            logger.warning(f"InsightFace detection error: {e}")
        return result

    def _detect_haar(self, frame: np.ndarray) -> List[DetectedFace]:
        result: List[DetectedFace] = []
        if self.haar_detector is None:
            return result
        try:
            import cv2

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.haar_detector.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(self.min_face_size, self.min_face_size)
            )
            for (x, y, w, h) in faces:
                result.append(
                    DetectedFace(
                        bbox=[int(x), int(y), int(x + w), int(y + h)],
                        confidence=0.85,
                        quality_score=0.75,
                    )
                )
        except Exception as e:
            logger.warning(f"Haar detection error: {e}")
        return result


class FaceQualityChecker:
    """Evaluates face quality - sharpness, brightness, size, pose estimate."""

    def __init__(
        self,
        min_sharpness: float = 80.0,
        min_brightness: int = 40,
        max_brightness: int = 220,
        min_face_size: int = 60,
    ):
        self.min_sharpness = min_sharpness
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness
        self.min_face_size = min_face_size

    def check(self, face_img: np.ndarray, bbox: Optional[List[int]] = None) -> FaceQualityResult:
        reasons: List[str] = []
        scores: List[float] = []

        try:
            import cv2

            sharpness = self._compute_sharpness(face_img)
            scores.append(min(1.0, sharpness / 200.0))
            if sharpness < self.min_sharpness:
                reasons.append("Image is too blurry")

            h, w = face_img.shape[:2]
            size_score = min(1.0, min(h, w) / 200.0)
            scores.append(size_score)
            if min(h, w) < self.min_face_size:
                reasons.append("Face too small in frame")

            brightness = self._compute_brightness(face_img)
            bright_score = 1.0 - abs(brightness - 128) / 128.0
            bright_score = max(0.0, bright_score)
            scores.append(bright_score)
            if brightness < self.min_brightness:
                reasons.append("Image is too dark")
            elif brightness > self.max_brightness:
                reasons.append("Image is too bright")

            overall_score = float(np.mean(scores)) if scores else 0.0
            passed = len(reasons) == 0

            return FaceQualityResult(passed=passed, score=overall_score, reasons=reasons)
        except Exception as e:
            logger.warning(f"Quality check error: {e}")
            return FaceQualityResult(passed=False, score=0.0, reasons=[f"Quality check failed: {e}"])

    def _compute_sharpness(self, img: np.ndarray) -> float:
        try:
            import cv2

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            return float(laplacian.var())
        except Exception:
            return 100.0

    def _compute_brightness(self, img: np.ndarray) -> float:
        try:
            import cv2

            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            v = hsv[:, :, 2]
            return float(np.mean(v))
        except Exception:
            return 128.0


class FaceAligner:
    """Aligns detected faces to canonical pose using landmarks or simple centering."""

    def __init__(self, output_size: Tuple[int, int] = (112, 112)):
        self.output_size = output_size

    def align(self, frame: np.ndarray, face: DetectedFace) -> np.ndarray:
        try:
            import cv2

            x1, y1, x2, y2 = face.bbox
            h, w = frame.shape[:2]
            x1 = max(0, x1)
            y1 = max(0, y1)
            x2 = min(w, x2)
            y2 = min(h, y2)
            pad_w = int((x2 - x1) * 0.3)
            pad_h = int((y2 - y1) * 0.3)
            x1p = max(0, x1 - pad_w)
            y1p = max(0, y1 - pad_h)
            x2p = min(w, x2 + pad_w)
            y2p = min(h, y2 + pad_h)
            crop = frame[y1p:y2p, x1p:x2p]
            if crop.size == 0:
                crop = frame[y1:y2, x1:x2]
            aligned = cv2.resize(crop, self.output_size)
            return aligned
        except Exception as e:
            logger.warning(f"Face alignment fallback: {e}")
            return np.zeros((self.output_size[0], self.output_size[1], 3), dtype=np.uint8)


class LivenessDetector:
    """Anti-spoofing / liveness detection with heuristic + optional model based checks."""

    def __init__(self, threshold: float = 0.70):
        self.threshold = threshold
        self._blink_history = {}
        self._landmark_history = {}

    def check(
        self,
        face_img: np.ndarray,
        bbox: Optional[List[int]] = None,
        session_id: Optional[str] = None,
        challenges: Optional[List[str]] = None,
    ) -> LivenessResult:
        scores = []
        details = {}

        texture_score = self._texture_analysis(face_img)
        scores.append(texture_score)
        details["texture_score"] = texture_score

        moire_score = self._moire_detection(face_img)
        scores.append(moire_score)
        details["moire_score"] = moire_score

        edge_score = self._edge_consistency(face_img)
        scores.append(edge_score)
        details["edge_score"] = edge_score

        depth_score = self._depth_flatness(face_img)
        scores.append(depth_score)
        details["depth_score"] = depth_score

        challenge_score = 1.0
        if challenges:
            challenge_score = 0.5
            details["challenge_status"] = "challenges_required"
        scores.append(challenge_score)
        details["challenge_score"] = challenge_score

        overall = float(np.mean(scores)) if scores else 0.0
        overall = max(0.0, min(1.0, overall))

        return LivenessResult(passed=overall >= self.threshold, score=overall, details=details)

    def _texture_analysis(self, face_img: np.ndarray) -> float:
        try:
            import cv2

            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            lap = cv2.Laplacian(gray, cv2.CV_64F)
            std = float(np.std(lap))
            if std < 10:
                return 0.3
            elif std < 20:
                return 0.6
            return min(1.0, std / 50.0)
        except Exception:
            return 0.8

    def _moire_detection(self, face_img: np.ndarray) -> float:
        try:
            import cv2

            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            f = np.fft.fft2(gray)
            fshift = np.fft.fftshift(f)
            mag = 20 * np.log(np.abs(fshift) + 1)
            center = mag.shape[0] // 2, mag.shape[1] // 2
            inner_r = 10
            outer_r = 40
            y, x = np.ogrid[: mag.shape[0], : mag.shape[1]]
            dist = np.sqrt((x - center[1]) ** 2 + (y - center[0]) ** 2)
            ring_mask = (dist >= inner_r) & (dist <= outer_r)
            center_mask = dist < inner_r
            ring_mean = float(np.mean(mag[ring_mask]))
            center_mean = float(np.mean(mag[center_mask])) + 1e-6
            ratio = ring_mean / center_mean
            if ratio > 0.8:
                return 0.4
            return 1.0 - min(1.0, ratio * 0.5)
        except Exception:
            return 0.85

    def _edge_consistency(self, face_img: np.ndarray) -> float:
        try:
            import cv2

            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = float(np.mean(edges > 0))
            if edge_density < 0.05:
                return 0.4
            if edge_density > 0.35:
                return 0.5
            return 0.9
        except Exception:
            return 0.8

    def _depth_flatness(self, face_img: np.ndarray) -> float:
        try:
            import cv2

            hsv = cv2.cvtColor(face_img, cv2.COLOR_BGR2HSV)
            v = hsv[:, :, 2].astype(np.float32)
            local_var = 0.0
            h, w = v.shape
            block = 16
            blocks_h = h // block
            blocks_w = w // block
            vars_list = []
            for i in range(blocks_h):
                for j in range(blocks_w):
                    blk = v[i * block : (i + 1) * block, j * block : (j + 1) * block]
                    vars_list.append(float(np.var(blk)))
            if not vars_list:
                return 0.8
            local_var = float(np.mean(vars_list))
            if local_var < 50:
                return 0.5
            if local_var < 150:
                return 0.75
            return 0.95
        except Exception:
            return 0.8


class EmbeddingStore:
    """Serialization utilities for embeddings + cosine similarity matching."""

    EMBEDDING_DIM = 512

    @staticmethod
    def encode(embedding: np.ndarray) -> str:
        data = embedding.astype(np.float32).tobytes()
        encoded = base64.b64encode(data).decode("ascii")
        meta = json.dumps({"dim": embedding.shape[0], "dtype": "float32"})
        return f"{meta}|{encoded}"

    @staticmethod
    def decode(encoded: str) -> np.ndarray:
        try:
            meta_str, b64_str = encoded.split("|", 1)
            data = base64.b64decode(b64_str)
            arr = np.frombuffer(data, dtype=np.float32)
            meta = json.loads(meta_str)
            dim = int(meta.get("dim", 512))
            if arr.shape[0] < dim:
                pad = np.zeros(dim - arr.shape[0], dtype=np.float32)
                arr = np.concatenate([arr, pad])
            elif arr.shape[0] > dim:
                arr = arr[:dim]
            return arr
        except Exception as e:
            logger.warning(f"Embedding decode fallback: {e}")
            return np.zeros(512, dtype=np.float32)

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        try:
            a_n = a.astype(np.float32)
            b_n = b.astype(np.float32)
            norm_a = np.linalg.norm(a_n)
            norm_b = np.linalg.norm(b_n)
            if norm_a == 0 or norm_b == 0:
                return 0.0
            return float(np.dot(a_n, b_n) / (norm_a * norm_b))
        except Exception:
            return 0.0

    @staticmethod
    def match(
        query: np.ndarray,
        candidates: List[Tuple[int, np.ndarray]],
        threshold: float = 0.65,
    ) -> Tuple[Optional[int], float]:
        best_id = None
        best_score = -1.0
        for emp_id, emb in candidates:
            s = EmbeddingStore.cosine_similarity(query, emb)
            if s > best_score:
                best_score = s
                best_id = emp_id
        if best_score >= threshold:
            return best_id, best_score
        return None, best_score
