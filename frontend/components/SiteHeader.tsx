"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group flex items-baseline gap-px font-serif text-xl tracking-tight text-ink"
          aria-label="Somos Huella — inicio"
        >
          Somos Huella
          <span className="text-brand transition-transform duration-300 group-hover:translate-y-[-2px]">
            .
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {(() => {
            const active = pathname === "/ejemplos";
            return (
              <Link
                href="/ejemplos"
                aria-current={active ? "page" : undefined}
                className={
                  "relative px-2 py-1.5 text-sm transition-colors " +
                  (active ? "text-ink" : "text-ink-2 hover:text-ink")
                }
              >
                Ejemplos
                <span
                  aria-hidden
                  className={
                    "absolute inset-x-2 -bottom-px h-px origin-left bg-brand transition-transform duration-300 " +
                    (active ? "scale-x-100" : "scale-x-0")
                  }
                />
              </Link>
            );
          })()}

          {/* Registrar: enlace de texto con subrayado en pagina activa */}
          {(() => {
            const active = pathname === "/registro";
            return (
              <Link
                href="/registro"
                aria-current={active ? "page" : undefined}
                className={
                  "relative px-2 py-1.5 text-sm transition-colors " +
                  (active ? "text-ink" : "text-ink-2 hover:text-ink")
                }
              >
                Registrar
                <span
                  aria-hidden
                  className={
                    "absolute inset-x-2 -bottom-px h-px origin-left bg-brand transition-transform duration-300 " +
                    (active ? "scale-x-100" : "scale-x-0")
                  }
                />
              </Link>
            );
          })()}

          {/* Buscar: CTA primario persistente (oxide) */}
          {(() => {
            const active = pathname === "/buscar";
            return (
              <Link
                href="/buscar"
                aria-current={active ? "page" : undefined}
                className={
                  "press inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium text-bg transition-colors duration-300 " +
                  (active ? "bg-brand-strong" : "bg-brand hover:bg-brand-strong")
                }
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                Buscar
              </Link>
            );
          })()}
        </div>
      </nav>
    </header>
  );
}
