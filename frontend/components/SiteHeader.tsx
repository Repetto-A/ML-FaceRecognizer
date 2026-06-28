"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/registro", label: "Registrar" },
  { href: "/buscar", label: "Buscar" },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="group flex items-baseline gap-px font-serif text-xl tracking-tight text-ink"
          aria-label="Reencuentros — inicio"
        >
          Reencuentros
          <span className="text-brand transition-transform duration-300 group-hover:translate-y-[-2px]">
            .
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "relative px-3 py-1.5 text-sm transition-colors " +
                  (active ? "text-ink" : "text-ink-2 hover:text-ink")
                }
              >
                {item.label}
                <span
                  aria-hidden
                  className={
                    "absolute inset-x-3 -bottom-px h-px origin-left bg-brand transition-transform duration-300 " +
                    (active ? "scale-x-100" : "scale-x-0")
                  }
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
