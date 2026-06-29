import { type NextRequest } from "next/server";
import { proxyPersonPhoto } from "@/lib/server/proxy";

// Proxy server-side de GET /api/image/[id] -> ${API_URL}/people/[id]/photo (con x-api-key).
// Sirve la foto registrada para la verificación visual humana, sin exponer la API key.

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyPersonPhoto(id);
}
