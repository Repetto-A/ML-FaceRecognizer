import type { Metadata } from "next";
import SearchCapture from "@/components/SearchCapture";

export const metadata: Metadata = {
  title: "Buscar por foto — Reencuentros",
};

export default function BuscarPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Buscar por foto</h1>
        <p className="text-sm text-ink-2">
          Sacá una foto del rostro de la persona encontrada (o subí una). El
          sistema la comparará con el registro y mostrará posibles coincidencias.
        </p>
      </header>
      <SearchCapture />
    </div>
  );
}
