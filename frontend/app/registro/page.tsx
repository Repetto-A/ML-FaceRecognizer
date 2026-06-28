import type { Metadata } from "next";
import RegisterForm from "@/components/RegisterForm";

export const metadata: Metadata = {
  title: "Registrar persona — Reencuentros",
};

export default function RegistroPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Registrar a una persona</h1>
        <p className="text-sm text-ink-2">
          Agregá una foto clara del rostro y los datos de contacto. Cuanto mejor
          sea la foto, más fácil será encontrar coincidencias.
        </p>
      </header>
      <RegisterForm />
    </div>
  );
}
