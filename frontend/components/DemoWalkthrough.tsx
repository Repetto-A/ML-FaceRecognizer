"use client";

import Image from "next/image";
import Link from "next/link";
import { DEMO_EXAMPLES } from "@/lib/demo-examples";

export default function DemoWalkthrough() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-4">
        <span className="kicker">Guía práctica</span>
        <h2 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">
          Probar con celebridades (demo)
        </h2>
        <p className="max-w-[62ch] text-lg leading-relaxed text-ink-2">
          El índice en producción incluye cinco perfiles de demostración con nombres,
          ubicación y contacto ficticios. No son personas desaparecidas reales: son
          actores usados para validar que el flujo funciona antes de datos sensibles.
        </p>
      </section>

      <ol className="flex flex-col gap-8">
        {[
          {
            n: "1",
            title: "Entender el registro",
            body: "Cada card muestra la foto que la “familia” cargó al registro (referencia).",
          },
          {
            n: "2",
            title: "Simular un hallazgo",
            body: "La segunda foto es un recorte distinto — como si un rescatista la hubiera tomado en campo.",
          },
          {
            n: "3",
            title: "Buscar y verificar",
            body: "En Buscar, cargá la foto de hallazgo. Deberías ver la coincidencia correcta con contacto y ubicación.",
          },
        ].map((step) => (
          <li key={step.n} className="flex gap-4 border-l border-line pl-5">
            <span className="tnum font-mono text-sm text-brand">{step.n}</span>
            <div>
              <h3 className="font-medium text-ink">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DEMO_EXAMPLES.map((ex) => (
          <article
            key={ex.id}
            className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line-strong bg-surface p-5"
          >
            <header className="flex flex-col gap-1">
              <h3 className="font-serif text-xl font-medium">{ex.name}</h3>
              <p className="text-sm text-ink-3">{ex.role} · demo</p>
            </header>

            <div className="grid grid-cols-2 gap-3">
              <figure className="flex flex-col gap-1.5">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-bg">
                  <Image
                    src={ex.refImage}
                    alt={`Referencia ${ex.name}`}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-xs text-ink-3">Registro familiar</figcaption>
              </figure>
              <figure className="flex flex-col gap-1.5">
                <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-bg">
                  <Image
                    src={ex.queryImage}
                    alt={`Hallazgo demo ${ex.name}`}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                </div>
                <figcaption className="text-xs text-ink-3">Foto de hallazgo</figcaption>
              </figure>
            </div>

            <dl className="grid gap-1 text-xs text-ink-2">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Ubicación</dt>
                <dd>{ex.location}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-3">Contacto</dt>
                <dd className="tnum">{ex.contact}</dd>
              </div>
            </dl>

            <p className="text-xs leading-relaxed text-ink-3">{ex.hint}</p>

            <Link
              href={`/buscar?demo=${ex.id}`}
              className="press mt-auto inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-brand-strong"
            >
              Probar con esta foto
            </Link>
          </article>
        ))}
      </div>

      <p className="text-sm text-ink-3 border-t border-line pt-6">
        Imágenes de prueba derivadas del dataset público de{" "}
        <a
          href="https://github.com/timesler/facenet-pytorch"
          className="underline decoration-line underline-offset-2 hover:decoration-brand"
          target="_blank"
          rel="noopener noreferrer"
        >
          facenet-pytorch
        </a>
        . Solo para demostración técnica.
      </p>
    </div>
  );
}
