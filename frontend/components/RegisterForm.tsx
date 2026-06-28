"use client";

import { useState } from "react";
import PhotoCapture from "@/components/PhotoCapture";
import { errorMessage, registerPerson } from "@/lib/api";
import type { PersonStatus, RegisterResponse } from "@/lib/types";

const STATUS_OPTIONS: { value: PersonStatus; label: string }[] = [
  { value: "desaparecido", label: "Desaparecido/a" },
  { value: "buscando", label: "Lo/la estoy buscando" },
  { value: "encontrado", label: "Ya fue encontrado/a" },
];

type State =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "done"; result: RegisterResponse }
  | { kind: "error"; message: string };

export default function RegisterForm() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PersonStatus>("desaparecido");
  const [location, setLocation] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const canSubmit = name.trim().length > 0 && photo !== null && state.kind !== "saving";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo || name.trim().length === 0) return;
    setState({ kind: "saving" });
    try {
      const result = await registerPerson(photo, {
        name: name.trim(),
        status,
        location: location.trim() || undefined,
        contact: contact.trim() || undefined,
      });
      setState({ kind: "done", result });
    } catch (err) {
      setState({ kind: "error", message: errorMessage(err) });
    }
  }

  function resetForm() {
    setPhoto(null);
    setName("");
    setStatus("desaparecido");
    setLocation("");
    setContact("");
    setState({ kind: "idle" });
  }

  if (state.kind === "done") {
    return (
      <div className="reveal flex max-w-xl flex-col items-start gap-5 rounded-[var(--radius-card)] border border-line-strong border-l-2 border-l-ok bg-surface p-7">
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-ok/10 text-ok">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div>
          <h2 className="font-serif text-2xl font-medium text-ink">Registro guardado</h2>
          <p className="mt-1.5 text-ink-2">
            {state.result.name} ya forma parte del registro y puede aparecer en
            las búsquedas.
          </p>
          <p className="kicker mt-3">ID · {state.result.person_id}</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="press rounded-lg bg-brand px-5 py-2.5 font-medium text-bg transition-colors duration-300 hover:bg-brand-strong"
        >
          Registrar a otra persona
        </button>
      </div>
    );
  }

  const saving = state.kind === "saving";
  const inputClass =
    "rounded-lg border border-line bg-bg px-3.5 py-2.5 text-ink transition-colors placeholder:text-ink-3 focus:border-brand";

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,360px)] lg:items-start">
      <div className="lg:order-2">
        <PhotoCapture label="Foto de la persona" onChange={setPhoto} disabled={saving} />
      </div>

      <div className="flex flex-col gap-6 lg:order-1">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="kicker">
            Nombre y apellido <span className="text-bad">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. María Belén Ferreyra"
            className={inputClass}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="kicker mb-1">Situación</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={
                  "press cursor-pointer rounded-lg border px-3 py-2.5 text-center text-sm transition-colors " +
                  (status === opt.value
                    ? "border-brand bg-brand/10 font-medium text-ink"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong")
                }
              >
                <input
                  type="radio"
                  name="status"
                  value={opt.value}
                  checked={status === opt.value}
                  onChange={() => setStatus(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="kicker">
            Última ubicación conocida
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ej. Rosario, barrio Tablada"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact" className="kicker">
            Contacto de la familia
          </label>
          <input
            id="contact"
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Teléfono, WhatsApp o correo"
            className={inputClass}
          />
          <p className="text-xs text-ink-3">
            Se mostrará a quien encuentre una posible coincidencia.
          </p>
        </div>

        {state.kind === "error" && (
          <p role="alert" className="border-l-2 border-bad bg-bad/5 px-4 py-3 text-sm text-bad">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="press rounded-lg bg-brand px-4 py-3 font-semibold text-bg transition-colors duration-300 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar registro"}
        </button>
        {!photo && (
          <p className="-mt-3 text-center text-xs text-ink-3 lg:text-left">
            Agregá una foto y un nombre para poder guardar.
          </p>
        )}
      </div>
    </form>
  );
}
