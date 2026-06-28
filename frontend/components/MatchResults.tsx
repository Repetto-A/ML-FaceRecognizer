"use client";

import type { Match, SearchResponse } from "@/lib/types";

const DEFAULT_DISCLAIMER = "Posible coincidencia — verificar con la familia";

/** Color/etiqueta según el nivel de similitud (orientativo). */
function confidenceTier(similarity: number): { label: string; color: string } {
  if (similarity >= 0.75) return { label: "Similitud alta", color: "var(--color-ok)" };
  if (similarity >= 0.55) return { label: "Similitud media", color: "var(--color-warn)" };
  return { label: "Similitud baja", color: "var(--color-bad)" };
}

function ConfidenceBar({ similarity }: { similarity: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, similarity)) * 100);
  const tier = confidenceTier(similarity);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-2">{tier.label}</span>
        <span className="font-semibold tabular-nums" style={{ color: tier.color }}>
          {pct}%
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Similitud ${pct}%`}
      >
        <div className="h-full rounded-full transition-[width]" style={{ width: `${pct}%`, background: tier.color }} />
      </div>
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const pct = Math.round(Math.max(0, Math.min(1, match.similarity)) * 100);
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
          {match.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.image_path} alt={`Foto registrada de ${match.name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-ink-3">Posible coincidencia</p>
              <h3 className="truncate text-base font-semibold">
                {match.name}{" "}
                <span className="font-normal text-ink-2">({pct}%)</span>
              </h3>
            </div>
          </div>
          <ConfidenceBar similarity={match.similarity} />
        </div>
      </div>

      {(match.location || match.contact) && (
        <dl className="grid gap-2 border-t border-line/70 pt-3 text-sm sm:grid-cols-2">
          {match.location && (
            <div className="flex flex-col">
              <dt className="text-xs text-ink-3">Última ubicación</dt>
              <dd className="text-ink">{match.location}</dd>
            </div>
          )}
          {match.contact && (
            <div className="flex flex-col">
              <dt className="text-xs text-ink-3">Contacto de la familia</dt>
              <dd className="break-words text-ink">{match.contact}</dd>
            </div>
          )}
        </dl>
      )}
    </article>
  );
}

export default function MatchResults({ data }: { data: SearchResponse }) {
  const disclaimer = data.disclaimer?.trim() || DEFAULT_DISCLAIMER;

  return (
    <section aria-live="polite" className="flex flex-col gap-4">
      {/* Disclaimer SIEMPRE visible, antes de los resultados. */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-warn/40 bg-warn/10 p-3.5 text-sm">
        <span aria-hidden className="mt-0.5 text-warn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </span>
        <p className="text-ink">
          <strong className="text-warn">{disclaimer}.</strong> El sistema no
          confirma identidades; estas son coincidencias orientativas.
        </p>
      </div>

      {data.matches.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-center text-sm text-ink-2">
          <p className="font-medium text-ink">Sin coincidencias por encima del umbral</p>
          <p className="mt-1">
            Probá bajar el umbral de similitud o usar una foto más clara y de frente.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            {data.matches.length} posible{data.matches.length === 1 ? "" : "s"} coincidencia
            {data.matches.length === 1 ? "" : "s"} encontrada
            {data.matches.length === 1 ? "" : "s"}.
          </p>
          {data.matches.map((m) => (
            <MatchCard key={m.person_id} match={m} />
          ))}
        </div>
      )}
    </section>
  );
}
