import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reencuentros — búsqueda de personas por rostro",
  description:
    "Herramienta de apoyo para reunir familias: registro de personas y búsqueda por foto. Las coincidencias son orientativas y siempre requieren verificación humana.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#efe9dc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${fraunces.variable} ${outfit.variable} ${jetbrains.variable}`}>
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-bg"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="contenido" className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 sm:px-8">
          {children}
        </main>
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8">
            <div className="flex flex-col gap-2">
              <span className="font-serif text-lg text-ink">
                Reencuentros<span className="text-brand">.</span>
              </span>
              <p className="max-w-sm text-sm leading-relaxed text-ink-2">
                Apoyo humanitario para reunir familias. Las coincidencias son
                orientativas y deben confirmarse con la familia antes de actuar.
              </p>
            </div>
            <p className="kicker">
              No identifica · sugiere · verificación humana
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
