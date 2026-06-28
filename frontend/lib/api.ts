import {
  ApiError,
  type RegisterInput,
  type RegisterResponse,
  type SearchParams,
  type SearchResponse,
} from "./types";

// El cliente SIEMPRE llama a las rutas internas de Next (/api/*), que actúan de
// proxy server-side hacia la API real. Así la API_KEY nunca llega al navegador.
// Patrón adaptado de Shippear (lib/api.ts): FormData + manejo de errores tipado.

/** Extrae un mensaje de error legible de una respuesta no-OK. */
async function readError(response: Response): Promise<never> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  throw new ApiError(body.message ?? `HTTP ${response.status}`, response.status);
}

/**
 * Envía una foto + parámetros al proxy interno /api/search.
 * Devuelve las posibles coincidencias rankeadas por similitud.
 */
export async function searchFace(
  photo: File,
  params: SearchParams,
): Promise<SearchResponse> {
  const formData = new FormData();
  formData.append("photo", photo);
  formData.append("threshold", String(params.threshold));
  formData.append("top_k", String(params.topK));

  let response: Response;
  try {
    response = await fetch("/api/search", { method: "POST", body: formData });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisá tu conexión.", 0);
  }

  if (!response.ok) await readError(response);
  return (await response.json()) as SearchResponse;
}

/**
 * Registra una persona (alta individual) vía el proxy interno /api/register.
 */
export async function registerPerson(
  photo: File,
  input: RegisterInput,
): Promise<RegisterResponse> {
  const formData = new FormData();
  formData.append("photo", photo);
  formData.append("name", input.name);
  formData.append("status", input.status);
  if (input.contact) formData.append("contact", input.contact);
  if (input.location) formData.append("location", input.location);

  let response: Response;
  try {
    response = await fetch("/api/register", { method: "POST", body: formData });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor. Revisá tu conexión.", 0);
  }

  if (!response.ok) await readError(response);
  return (await response.json()) as RegisterResponse;
}

/** Convierte cualquier error en un mensaje legible para la UI. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Ocurrió un error inesperado.";
}
