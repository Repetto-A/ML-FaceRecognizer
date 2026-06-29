"use client";

import { useState } from "react";
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-2">{tier.label}</span>
        <span className="tnum text-ink-3">{pct}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
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

function MatchCard({ match, index }: { match: Match; index: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, match.similarity)) * 100);
  const tier = confidenceTier(match.similarity);
  // La foto registrada se sirve por el proxy `/api/image/{id}` (que agrega la x-api-key del
  // lado servidor). Mostramos la cara real para la verificación visual; si la API no tiene la
  // foto (404) o falla la carga, caemos con elegancia al ícono en vez de una imagen rota.
  const [imgFailed, setImgFailed] = useState(false);
  const photoUrl = match.person_id
    ? `/api/image/${encodeURIComponent(match.person_id)}`
    : null;
  const showImage = Boolean(photoUrl) && !imgFailed;
  return (
    <article
      className="reveal flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
      style={{ "--index": index, borderLeftWidth: "3px", borderLeftColor: tier.color } as React.CSSProperties}
    >
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-2">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl as string}
              alt={`Foto registrada de ${match.name}`}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink-3">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="kicker">Posible coincidencia</p>
              <h3 className="mt-1 truncate font-serif text-xl font-medium text-ink">
                {match.name}
              </h3>
            </div>
            <span className="tnum shrink-0 text-2xl leading-none" style={{ color: tier.color }}>
              {pct}%
            </span>
          </div>
          <ConfidenceBar similarity={match.similarity} />
        </div>
      </div>

      {(match.location || match.contact) && (
        <dl className="grid gap-3 border-t border-line pt-3 text-sm sm:grid-cols-2">
          {match.location && (
            <div className="flex flex-col gap-0.5">
              <dt className="kicker">Última ubicación</dt>
              <dd className="text-ink">{match.location}</dd>
            </div>
          )}
          {match.contact && (
            <div className="flex flex-col gap-0.5">
              <dt className="kicker">Contacto de la familia</dt>
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
    <section aria-live="polite" className="flex flex-col gap-5">
      {/* Disclaimer SIEMPRE visible, antes de los resultados. */}
      <div className="flex items-start gap-3 border-l-2 border-warn bg-warn/5 py-3 pl-4 pr-3 text-sm">
        <span aria-hidden className="mt-0.5 text-warn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </span>
        <p className="text-ink-2">
          <strong className="font-semibold text-ink">{disclaimer}.</strong> El
          sistema no confirma identidades; estas son coincidencias orientativas.
        </p>
      </div>

      {data.matches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
          <span aria-hidden className="mb-1 text-ink-3">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <p className="font-serif text-lg text-ink">Nadie supera el umbral</p>
          <p className="max-w-xs text-sm leading-relaxed text-ink-2">
            Probá bajar la exigencia de parecido o usar una foto más clara y de
            frente.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="kicker">
            {data.matches.length} posible{data.matches.length === 1 ? "" : "s"}{" "}
            coincidencia{data.matches.length === 1 ? "" : "s"}
          </p>
          {data.matches.map((m, i) => (
            <MatchCard key={m.person_id} match={m} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
