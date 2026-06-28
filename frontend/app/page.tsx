import Link from "next/link";

function ArrowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform duration-300 group-hover:translate-x-1"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const STEPS = [
  {
    n: "01",
    title: "La familia registra",
    body: "Se carga una foto clara del rostro junto con la última ubicación y un contacto. Cuantas más fotos, mejor.",
  },
  {
    n: "02",
    title: "El sistema compara",
    body: "Cada rostro se convierte en una huella numérica. Una foto nueva se contrasta contra todo el registro en segundos.",
  },
  {
    n: "03",
    title: "Una persona decide",
    body: "Se devuelven posibles coincidencias ordenadas por parecido. La confirmación final siempre es humana.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-20">
      {/* ---------- Hero asimétrico ---------- */}
      <section className="grid items-end gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="reveal flex flex-col gap-6" style={{ "--index": 0 } as React.CSSProperties}>
          <span className="kicker inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Reconocimiento facial asistido
          </span>
          <h1 className="font-serif text-5xl font-medium leading-[0.98] tracking-tight text-balance sm:text-6xl">
            Volver a encontrar
            <br />
            a quien falta.
          </h1>
          <p className="max-w-[58ch] text-lg leading-relaxed text-ink-2 text-pretty">
            Cuando muchas familias buscan a la vez, la memoria y las listas no
            alcanzan. Somos Huella convierte cada rostro en una huella y la
            compara con el registro para sugerir{" "}
            <span className="text-ink">posibles coincidencias</span>. La decisión
            final siempre es de una persona.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/buscar"
              className="press group inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-medium text-bg transition-colors duration-300 hover:bg-brand-strong"
            >
              Buscar por foto
              <ArrowIcon />
            </Link>
            <Link
              href="/registro"
              className="group inline-flex items-center gap-2 px-2 py-3 font-medium text-ink underline decoration-line decoration-2 underline-offset-[6px] transition-colors hover:decoration-brand"
            >
              Registrar a una persona
            </Link>
            <Link
              href="/ejemplos"
              className="group inline-flex items-center gap-2 px-2 py-3 text-sm text-ink-2 transition-colors hover:text-brand"
            >
              Ver ejemplos demo
            </Link>
          </div>
        </div>

        {/* Panel "expediente" — ficha sobria, no card genérica */}
        <aside
          className="reveal relative rounded-[var(--radius-card)] border border-line-strong bg-surface p-6 shadow-[0_18px_40px_-28px_rgba(34,31,26,0.5)]"
          style={{ "--index": 1 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <span className="kicker">Expediente vivo</span>
            <span className="flex items-center gap-1.5 text-xs text-ink-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
              en línea
            </span>
          </div>
          <dl className="mt-6 flex flex-col divide-y divide-line">
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-sm text-ink-2">Huella por rostro</dt>
              <dd className="tnum text-lg text-ink">512-d</dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-sm text-ink-2">Comparación típica</dt>
              <dd className="tnum text-lg text-ink">~0.5 s</dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-sm text-ink-2">Decisión automática</dt>
              <dd className="font-serif text-lg text-brand">nunca</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-ink-2">
            El parecido se expresa como porcentaje. Un número alto es una pista
            fuerte, no una certeza.
          </p>
        </aside>
      </section>

      {/* ---------- Cómo funciona: lista numerada, sin cards ---------- */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="rule-accent" />
          <h2 className="font-serif text-3xl font-medium tracking-tight">
            Tres pasos, una sola intención
          </h2>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className="reveal flex flex-col gap-3 bg-surface p-6"
              style={{ "--index": i + 2 } as React.CSSProperties}
            >
              <span className="tnum text-2xl text-brand">{step.n}</span>
              <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Nota ética: banda con borde de acento ---------- */}
      <section className="flex gap-4 border-l-2 border-brand bg-surface/60 py-5 pl-6 pr-5">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-xl font-medium text-ink">
            Una pista, no un veredicto
          </h2>
          <p className="max-w-[68ch] text-sm leading-relaxed text-ink-2">
            El sistema no confirma identidades. Una coincidencia con alto parecido
            puede equivocarse por luz, ángulo o el paso del tiempo. Toda
            coincidencia se verifica con la familia antes de tomar cualquier
            decisión. Las fotos de búsqueda no se almacenan.
          </p>
        </div>
      </section>
    </div>
  );
}
