"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Componente de captura de foto reutilizable: cámara en vivo (getUserMedia) o
// archivo/galería, con preview y manejo de estados. Adaptado del patrón de
// upload de Shippear (drag-drop + URL.createObjectURL), extendido con cámara.
//
// getUserMedia requiere contexto seguro (HTTPS o localhost) en producción.

type Mode = "idle" | "camera";

interface PhotoCaptureProps {
  /** Se llama con el File seleccionado, o null al limpiar. */
  onChange: (file: File | null) => void;
  /** Etiqueta accesible del bloque. */
  label?: string;
  disabled?: boolean;
}

export default function PhotoCapture({ onChange, label = "Foto", disabled }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const setPreview = useCallback((url: string | null) => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  // Limpieza al desmontar.
  useEffect(() => {
    return () => {
      stopCamera();
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [stopCamera]);

  const commitFile = useCallback(
    (file: File) => {
      setPreview(URL.createObjectURL(file));
      onChange(file);
    },
    [onChange, setPreview],
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    commitFile(file);
  }

  async function startCamera() {
    setCameraError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Tu navegador no permite usar la cámara.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("camera");
      setPreview(null);
      onChange(null);
      // El elemento <video> se monta al cambiar de modo; asignamos en el próximo tick.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (err) {
      setCameraError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permiso de cámara denegado. Podés subir un archivo en su lugar."
          : err instanceof Error
            ? err.message
            : "No se pudo acceder a la cámara.",
      );
      setMode("idle");
    } finally {
      setStarting(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `captura-${Date.now()}.jpg`, { type: "image/jpeg" });
        commitFile(file);
        stopCamera();
        setMode("idle");
      },
      "image/jpeg",
      0.92,
    );
  }

  function cancelCamera() {
    stopCamera();
    setMode("idle");
  }

  function clearPhoto() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-ink-2">{label}</span>

      {mode === "camera" ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-black">
          <div className="relative aspect-[3/4] w-full sm:aspect-video">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </div>
          <div className="flex gap-2 p-3">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 rounded-xl bg-brand px-4 py-2.5 font-medium text-bg transition hover:bg-brand-strong"
            >
              Tomar foto
            </button>
            <button
              type="button"
              onClick={cancelCamera}
              className="rounded-xl border border-line px-4 py-2.5 text-ink-2 transition hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="relative aspect-[3/4] w-full sm:aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa de la foto seleccionada" className="h-full w-full object-contain" />
          </div>
          <div className="flex gap-2 p-3">
            <button
              type="button"
              onClick={clearPhoto}
              disabled={disabled}
              className="rounded-xl border border-line px-4 py-2.5 text-ink-2 transition hover:text-ink disabled:opacity-50"
            >
              Quitar foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded-xl border border-line px-4 py-2.5 text-ink-2 transition hover:text-ink disabled:opacity-50"
            >
              Cambiar archivo
            </button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-line bg-surface px-4 py-8 text-center"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("border-brand");
          }}
          onDragLeave={(e) => e.currentTarget.classList.remove("border-brand")}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-brand");
            const file = e.dataTransfer.files?.[0];
            if (file) commitFile(file);
          }}
        >
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </span>
          <p className="text-sm text-ink-2">
            Sacá una foto con la cámara o subí un archivo.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={startCamera}
              disabled={disabled || starting}
              className="rounded-xl bg-brand px-4 py-2.5 font-medium text-bg transition hover:bg-brand-strong disabled:opacity-50"
            >
              {starting ? "Abriendo cámara…" : "Usar cámara"}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded-xl border border-line px-4 py-2.5 text-ink transition hover:border-brand/60 disabled:opacity-50"
            >
              Subir archivo
            </button>
          </div>
          {cameraError && (
            <p role="alert" className="text-xs text-bad">
              {cameraError}
            </p>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
