import { NextResponse, type NextRequest } from "next/server";
import { proxyFormData } from "@/lib/server/proxy";

// Proxy server-side de POST /api/search -> ${API_URL}/search (con x-api-key).
// La API key vive solo en el servidor.

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Cuerpo inválido (se esperaba multipart)." }, { status: 400 });
  }

  if (!(formData.get("photo") instanceof File)) {
    return NextResponse.json({ message: "Falta la foto a buscar." }, { status: 400 });
  }

  return proxyFormData("/search", formData);
}
