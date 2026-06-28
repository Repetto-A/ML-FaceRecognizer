"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import MatchResults from "@/components/MatchResults";
import { errorMessage, searchFace } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "done"; data: SearchResponse }
  | { kind: "error"; message: string };

const DEFAULT_THRESHOLD = 0.6;
const DEFAULT_TOP_K = 5;

export default function SearchCapture() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [state, setState] = useState<State>({ kind: "idle" });

  const canSearch = photo !== null && state.kind !== "searching";

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    // Al cambiar la foto, descartamos resultados anteriores.
    if (state.kind === "done" || state.kind === "error") setState({ kind: "idle" });
  }

  async function handleSearch() {
    if (!photo) return;
    setState({ kind: "searching" });
    try {
      const data = await searchFace(photo, { threshold, topK });
      setState({ kind: "done", data });
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err) });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PhotoCapture
        label="Foto de la persona encontrada"
        onChange={handlePhotoChange}
        disabled={state.kind === "searching"}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <label htmlFor="threshold" className="text-sm font-medium text-ink-2">
            Umbral de similitud
          </label>
          <span className="text-sm font-semibold tabular-nums text-brand">
            {Math.round(threshold * 100)}%
          </span>
        </div>
        <input
          id="threshold"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          disabled={state.kind === "searching"}
          className="w-full accent-[var(--color-brand)]"
        />
        <p className="text-xs text-ink-3">
          Más alto = coincidencias más estrictas (menos resultados). Más bajo =
          más resultados, con más falsos positivos.
        </p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <label htmlFor="topk" className="text-sm font-medium text-ink-2">
            Máximo de resultados
          </label>
          <select
            id="topk"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            disabled={state.kind === "searching"}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink focus:border-brand"
          >
            {[3, 5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={!canSearch}
        className="flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-semibold text-bg transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.kind === "searching" ? (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Buscando coincidencias…
          </>
        ) : (
          "Buscar coincidencias"
        )}
      </button>
      {!photo && (
        <p className="-mt-3 text-center text-xs text-ink-3">
          Sacá o subí una foto para iniciar la búsqueda.
        </p>
      )}

      {state.kind === "error" && (
        <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3.5 py-2.5 text-sm text-bad">
          {state.message}
        </p>
      )}

      {state.kind === "done" && <MatchResults data={state.data} />}
    </div>
  );
}
