// Contrato de la API de reconocimiento facial (backend FastAPI).
// Estos tipos son compartidos por el cliente y por los Route Handlers proxy.

/** Estado declarado de una persona registrada por la familia. */
export type PersonStatus = "desaparecido" | "buscando" | "encontrado";

/** Una posible coincidencia devuelta por POST /search. */
export interface Match {
  person_id: string;
  name: string;
  /** Similitud coseno normalizada en 0..1 (1 = idéntico). */
  similarity: number;
  /** Distancia cruda (menor = más parecido). */
  distance: number;
  /** Ruta/URL de la imagen indexada en el backend. */
  image_path: string;
  contact?: string | null;
  location?: string | null;
}

/** Respuesta de POST /search. */
export interface SearchResponse {
  query_id: string;
  matches: Match[];
  /** Texto legal/ético devuelto por el backend; se muestra siempre. */
  disclaimer: string;
}

/** Parámetros de la búsqueda (además de la foto). */
export interface SearchParams {
  /** Umbral de similitud mínima 0..1. */
  threshold: number;
  /** Máximo de coincidencias a devolver. */
  topK: number;
}

/** Respuesta de POST /register. */
export interface RegisterResponse {
  person_id: string;
  name: string;
  message: string;
}

/** Datos del formulario de registro (además de la foto). */
export interface RegisterInput {
  name: string;
  status: PersonStatus;
  contact?: string;
  location?: string;
}

/** Respuesta de GET /health. */
export interface HealthResponse {
  status: string;
  [key: string]: unknown;
}

/** Forma del error normalizado que devuelven los Route Handlers internos. */
export interface ApiErrorBody {
  message: string;
}

/** Error tipado lanzado por el cliente API. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
