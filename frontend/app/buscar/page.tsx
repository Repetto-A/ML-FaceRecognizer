import type { Metadata } from "next";
import Link from "next/link";
import SearchCapture from "@/components/SearchCapture";

export const metadata: Metadata = {
  title: "Buscar por foto",
};

export default function BuscarPage() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <Link
          href="/"
          className="kicker inline-flex w-fit items-center gap-1.5 transition-colors hover:text-brand"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Inicio
        </Link>
        <div className="rule-accent" />
        <h1 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          Buscar por foto
        </h1>
        <p className="max-w-[60ch] text-lg leading-relaxed text-ink-2 text-pretty">
          Sacá o subí una foto del rostro de la persona encontrada. La comparamos
          con el registro y te mostramos las coincidencias más parecidas.
        </p>
      </header>
      <SearchCapture />
    </div>
  );
}
