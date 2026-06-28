"""
Face Matching Engine — Reencuentros Venezuela 2026

Pipeline:
  1. Detect face in image (MTCNN)
  2. Extract facial embedding (InceptionResnetV1, pretrained VGGFace2)
  3. Compare embeddings via cosine similarity

No entrenamos sobre las víctimas. Usamos un modelo pre-entrenado que ya
sabe extraer features faciales universales. El matching es pura comparación
de vectores: si dos embeddings tienen alta similitud coseno, es la misma persona.
"""

import cv2
import torch
import numpy as np
from PIL import Image
from typing import Optional, Tuple, List
from dataclasses import dataclass
from facenet_pytorch import MTCNN, InceptionResnetV1


@dataclass
class FaceMatch:
    """Resultado de un match entre dos caras."""
    person_id: str
    name: str
    similarity: float       # 0..1 — cosine similarity
    distance: float         # 0..2 — cosine distance (menor = más parecido)
    matched_image: str      # path de la imagen matcheada


class FaceMatcher:
    """
    Motor de matching facial.

    Uso:
        matcher = FaceMatcher()
        embedding = matcher.extract_embedding("foto_encontrado.jpg")
        matches = matcher.find_matches(embedding, database_embeddings, threshold=0.75)
    """

    def __init__(self, device: Optional[str] = None):
        self.device = torch.device(device or ("cuda" if torch.cuda.is_available() else "cpu"))
        
        # MTCNN: detector de caras. Busca la cara más grande en la imagen,
        # la recorta y la alinea a 160x160.
        self.detector = MTCNN(
            image_size=160,
            margin=20,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            keep_all=False,         # solo la cara más grande/principal
            device=self.device,
        )
        
        # InceptionResnetV1: extractor de embeddings.
        # Pre-entrenado en VGGFace2 (3.3M+ caras de 9K+ identidades).
        # Produce vectores de 512 dimensiones.
        self.encoder = InceptionResnetV1(
            pretrained='vggface2',
            classify=False,          # no clasificamos, solo extraemos features
        ).eval().to(self.device)

    def extract_embedding(self, image: str | Image.Image | np.ndarray) -> Optional[np.ndarray]:
        """
        Extrae el embedding facial de una imagen.

        Args:
            image: path a archivo, PIL Image, o numpy array (BGR o RGB).

        Returns:
            Vector numpy de 512 dimensiones, o None si no se detectó cara.
        """
        # Cargar imagen si es un path
        if isinstance(image, str):
            image = Image.open(image).convert('RGB')
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB) 
                                     if image.shape[-1] == 3 else image)

        # Detectar y alinear cara
        face = self.detector(image)
        if face is None:
            return None

        # Extraer embedding
        with torch.no_grad():
            face_tensor = face.unsqueeze(0).to(self.device)
            embedding = self.encoder(face_tensor)
            
        return embedding.cpu().numpy().flatten()

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Similitud coseno entre dos embeddings. 1.0 = idéntico, 0.0 = ortogonal."""
        a_norm = a / (np.linalg.norm(a) + 1e-8)
        b_norm = b / (np.linalg.norm(b) + 1e-8)
        return float(np.dot(a_norm, b_norm))

    def find_matches(
        self,
        query_embedding: np.ndarray,
        database: List[dict],
        threshold: float = 0.75,
        top_k: int = 5,
    ) -> List[FaceMatch]:
        """
        Busca los matches más cercanos en la base de datos.

        Args:
            query_embedding: embedding de la cara a buscar.
            database: lista de dicts con {'id', 'name', 'embedding', 'image_path'}.
            threshold: similitud mínima (0..1) para considerar un match.
            top_k: máximo de resultados a devolver.

        Returns:
            Lista de FaceMatch ordenados por similitud descendente.
        """
        matches = []
        
        for record in database:
            sim = self.cosine_similarity(query_embedding, record['embedding'])
            if sim >= threshold:
                matches.append(FaceMatch(
                    person_id=record['id'],
                    name=record['name'],
                    similarity=sim,
                    distance=1.0 - sim,
                    matched_image=record['image_path'],
                ))
        
        matches.sort(key=lambda m: m.similarity, reverse=True)
        return matches[:top_k]

    def compare_two_faces(
        self, image_path_a: str, image_path_b: str
    ) -> Tuple[bool, float]:
        """
        Compara dos imágenes y determina si son la misma persona.

        Returns:
            (is_match, similarity_score)
        """
        emb_a = self.extract_embedding(image_path_a)
        emb_b = self.extract_embedding(image_path_b)

        if emb_a is None or emb_b is None:
            return False, 0.0

        sim = self.cosine_similarity(emb_a, emb_b)
        return sim >= 0.75, sim
