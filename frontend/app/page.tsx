import Link from "next/link";

function ActionCard({
  href,
  title,
  description,
  cta,
  icon,
  variant,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  variant: "brand" | "ghost";
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 transition hover:border-brand/60 hover:bg-surface-2"
    >
      <span
        aria-hidden
        className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand"
      >
        {icon}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed text-ink-2">{description}</p>
      <span
        className={
          "mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition " +
          (variant === "brand"
            ? "bg-brand text-bg group-hover:bg-brand-strong"
            : "border border-line text-ink group-hover:border-brand/60")
        }
      >
        {cta}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 pt-4">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Reconocimiento facial asistido por IA
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ayudamos a reencontrar personas
        </h1>
        <p className="max-w-prose text-balance text-ink-2">
          Las familias registran a sus seres queridos con una foto y datos de
          contacto. Quienes están en terreno pueden buscar por imagen para
          encontrar <strong className="text-ink">posibles coincidencias</strong>.
          El sistema sugiere; la decisión final siempre es humana.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          href="/registro"
          variant="ghost"
          title="Registrar a una persona"
          description="Sumá a tu familiar al registro con su foto, última ubicación conocida y un contacto."
          cta="Ir al registro"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M19 8v6M22 11h-6" />
            </svg>
          }
        />
        <ActionCard
          href="/buscar"
          variant="brand"
          title="Buscar por foto"
          description="Sacá o subí una foto de la persona encontrada y revisá las posibles coincidencias del registro."
          cta="Iniciar búsqueda"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          }
        />
      </section>

      <section className="rounded-2xl border border-warn/30 bg-warn/10 p-4 text-sm leading-relaxed text-ink-2">
        <p>
          <strong className="text-warn">Importante.</strong> Este sistema no
          confirma identidades: ofrece <em>posibles coincidencias</em> con un
          porcentaje de similitud. Toda coincidencia debe verificarse con la
          familia antes de tomar cualquier decisión.
        </p>
      </section>
    </div>
  );
}
