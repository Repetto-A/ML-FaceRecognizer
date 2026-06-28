"use client";

import { Suspense, useCallback, useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import MatchResults from "@/components/MatchResults";
import DemoSearchLoader from "@/components/DemoSearchLoader";
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
  const [demoLabel, setDemoLabel] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [state, setState] = useState<State>({ kind: "idle" });

  const canSearch = photo !== null && state.kind !== "searching";

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    if (!file) setDemoLabel(null);
    // Al cambiar la foto, descartamos resultados anteriores.
    if (state.kind === "done" || state.kind === "error") setState({ kind: "idle" });
  }

  const handleDemoLoad = useCallback((file: File, label: string) => {
    setPhoto(file);
    setDemoLabel(label);
    setState({ kind: "idle" });
  }, []);

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

  const searching = state.kind === "searching";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start">
      <Suspense fallback={null}>
        <DemoSearchLoader onLoad={handleDemoLoad} />
      </Suspense>
      <div className="flex flex-col gap-6">
        {demoLabel && (
          <p className="border-l-2 border-brand bg-brand/5 px-4 py-3 text-sm text-ink-2">
            Foto demo precargada: <span className="font-medium text-ink">{demoLabel}</span>.
            Pulsa «Buscar coincidencias» o probá otra en{" "}
            <a href="/ejemplos" className="text-brand underline decoration-line underline-offset-2">
              Ejemplos
            </a>.
          </p>
        )}
        <PhotoCapture
          label="Foto de la persona encontrada"
          presetFile={photo}
          onChange={handlePhotoChange}
          disabled={searching}
        />

        {searching && (
          <div aria-hidden className="flex flex-col gap-3">
            <div className="skeleton h-5 w-40 rounded" />
            <div className="skeleton h-24 w-full rounded-[var(--radius-card)]" />
            <div className="skeleton h-24 w-full rounded-[var(--radius-card)]" />
          </div>
        )}

        {state.kind === "error" && (
          <p role="alert" className="border-l-2 border-bad bg-bad/5 px-4 py-3 text-sm text-bad">
            {state.message}
          </p>
        )}

        {state.kind === "done" && <MatchResults data={state.data} />}
      </div>

      {/* Panel de ajustes — sticky en desktop, tipo controles de revelado */}
      <aside className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-line-strong bg-surface p-5 lg:sticky lg:top-24">
        <span className="kicker">Ajustes de búsqueda</span>

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <label htmlFor="threshold" className="text-sm font-medium text-ink">
              Exigencia de parecido
            </label>
            <span className="tnum text-base text-brand">
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
            disabled={searching}
            className="w-full accent-[var(--color-brand)]"
          />
          <p className="text-xs leading-relaxed text-ink-3">
            Más alto, coincidencias más estrictas. Más bajo, más resultados con
            más falsos positivos.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <label htmlFor="topk" className="text-sm font-medium text-ink">
            Máximo de resultados
          </label>
          <select
            id="topk"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            disabled={searching}
            className="rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink transition-colors focus:border-brand"
          >
            {[3, 5, 10, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSearch}
          disabled={!canSearch}
          className="press flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 font-semibold text-bg transition-colors duration-300 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Buscando…
            </>
          ) : (
            "Buscar coincidencias"
          )}
        </button>
        {!photo && (
          <p className="text-center text-xs text-ink-3">
            Cargá una foto para habilitar la búsqueda.
          </p>
        )}
      </aside>
    </div>
  );
}
