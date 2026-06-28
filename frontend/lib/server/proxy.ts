import { NextResponse } from "next/server";

// Helpers SOLO para server-side (Route Handlers). Leen variables de entorno
// privadas (NO NEXT_PUBLIC) para no exponer la API_KEY al navegador.

interface ProxyConfig {
  apiUrl: string;
  apiKey: string;
}

/** Lee y valida la config del entorno del servidor. */
function getConfig(): ProxyConfig | null {
  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;
  if (!apiUrl || !apiKey) return null;
  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey };
}

/**
 * Reenvía un FormData entrante a `${API_URL}${path}` agregando el header
 * `x-api-key`. Devuelve la respuesta JSON del backend tal cual, o un error
 * normalizado `{ message }` con el status adecuado.
 */
export async function proxyFormData(
  path: string,
  formData: FormData,
): Promise<NextResponse> {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { message: "El servidor no está configurado (faltan API_URL o API_KEY)." },
      { status: 500 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${config.apiUrl}${path}`, {
      method: "POST",
      headers: { "x-api-key": config.apiKey },
      body: formData,
    });
  } catch {
    return NextResponse.json(
      { message: "No se pudo contactar con la API de reconocimiento." },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || `HTTP ${upstream.status}` };
  }

  if (!upstream.ok) {
    const message =
      (data as { detail?: string; message?: string }).message ??
      (data as { detail?: string }).detail ??
      `Error del servidor (HTTP ${upstream.status}).`;
    return NextResponse.json({ message }, { status: upstream.status });
  }

  return NextResponse.json(data, { status: upstream.status });
}
