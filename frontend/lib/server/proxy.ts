import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Helpers SOLO para server-side (Route Handlers). Leen variables de entorno
// privadas (NO NEXT_PUBLIC) para no exponer la API_KEY al navegador.

interface ProxyConfig {
  apiUrl: string;
  apiKey: string;
}

/** Lee frontend/.env.local (prioridad sobre env del sistema si el archivo existe). */
function loadEnvLocal(): void {
  const candidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), "frontend", ".env.local"),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key === "API_URL") process.env.API_URL = val;
      if (key === "API_KEY") process.env.API_KEY = val;
    }
    return;
  }
}

/** Lee y valida la config del entorno del servidor. */
function getConfig(): ProxyConfig | null {
  loadEnvLocal();
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

/**
 * Reenvía la foto registrada de una persona desde `${API_URL}/people/{id}/photo`,
 * agregando el header `x-api-key`. Devuelve los bytes de la imagen tal cual (la API key
 * nunca llega al navegador). Si no hay foto, propaga el status (típicamente 404) para que
 * el `<img>` dispare su fallback.
 */
export async function proxyPersonPhoto(personId: string): Promise<NextResponse> {
  const config = getConfig();
  if (!config) {
    return NextResponse.json(
      { message: "El servidor no está configurado (faltan API_URL o API_KEY)." },
      { status: 500 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${config.apiUrl}/people/${encodeURIComponent(personId)}/photo`,
      { headers: { "x-api-key": config.apiKey } },
    );
  } catch {
    return NextResponse.json(
      { message: "No se pudo contactar con la API de reconocimiento." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { message: "Foto no disponible." },
      { status: upstream.status },
    );
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=300" },
  });
}
