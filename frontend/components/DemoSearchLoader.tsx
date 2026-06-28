"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { DEMO_EXAMPLES } from "@/lib/demo-examples";

async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo cargar la foto demo.");
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

interface DemoSearchLoaderProps {
  onLoad: (file: File, label: string) => void;
}

/** Si la URL tiene ?demo=..., precarga la foto de hallazgo correspondiente. */
export default function DemoSearchLoader({ onLoad }: DemoSearchLoaderProps) {
  const searchParams = useSearchParams();
  const loadedRef = useRef<string | null>(null);
  const demoId = searchParams.get("demo");

  useEffect(() => {
    if (!demoId || loadedRef.current === demoId) return;
    const example = DEMO_EXAMPLES.find((e) => e.id === demoId);
    if (!example) return;

    loadedRef.current = demoId;
    urlToFile(example.queryImage, `${example.id}_query.jpg`)
      .then((file) => onLoad(file, example.name))
      .catch(() => {
        loadedRef.current = null;
      });
  }, [demoId, onLoad]);

  return null;
}
