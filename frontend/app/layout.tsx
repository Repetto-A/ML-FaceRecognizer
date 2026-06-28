import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reencuentros — Reconocimiento facial asistido",
  description:
    "Herramienta de apoyo para reunir personas: registro familiar y búsqueda por foto. Las coincidencias son orientativas y requieren verificación humana.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1120",
};

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <span>
            Reencuentros<span className="text-brand">.</span>
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/registro"
            className="rounded-lg px-3 py-1.5 text-ink-2 transition hover:bg-surface hover:text-ink"
          >
            Registrar
          </Link>
          <Link
            href="/buscar"
            className="rounded-lg bg-brand px-3 py-1.5 font-medium text-bg transition hover:bg-brand-strong"
          >
            Buscar
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">{children}</main>
        <footer className="border-t border-line/60 px-4 py-6 text-center text-xs text-ink-3">
          Herramienta de apoyo humanitario · Las coincidencias son orientativas y
          deben verificarse siempre con la familia.
        </footer>
      </body>
    </html>
  );
}
