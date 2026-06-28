import { NextResponse, type NextRequest } from "next/server";
import { proxyFormData } from "@/lib/server/proxy";

// Proxy server-side de POST /api/register -> ${API_URL}/register (con x-api-key).

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Cuerpo inválido (se esperaba multipart)." }, { status: 400 });
  }

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ message: "El nombre es obligatorio." }, { status: 400 });
  }
  if (!(formData.get("photo") instanceof File)) {
    return NextResponse.json({ message: "Falta la foto de la persona." }, { status: 400 });
  }

  return proxyFormData("/register", formData);
}
