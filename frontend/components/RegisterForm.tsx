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
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-ok/40 bg-ok/10 p-6 text-center">
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-ok/20 text-ok">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div>
          <h2 className="text-lg font-semibold">Registro guardado</h2>
          <p className="mt-1 text-sm text-ink-2">
            {state.result.name} fue agregado/a al registro.
          </p>
          <p className="mt-1 text-xs text-ink-3">ID: {state.result.person_id}</p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="rounded-xl bg-brand px-4 py-2.5 font-medium text-bg transition hover:bg-brand-strong"
        >
          Registrar a otra persona
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PhotoCapture
        label="Foto de la persona"
        onChange={setPhoto}
        disabled={state.kind === "saving"}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-ink-2">
          Nombre y apellido <span className="text-bad">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej. María González"
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-3 focus:border-brand"
        />
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink-2">Situación</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {STATUS_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={
                "cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm transition " +
                (status === opt.value
                  ? "border-brand bg-brand/15 text-ink"
                  : "border-line bg-surface text-ink-2 hover:border-brand/50")
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
        <label htmlFor="location" className="text-sm font-medium text-ink-2">
          Última ubicación conocida
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ej. Caracas, Petare"
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-3 focus:border-brand"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact" className="text-sm font-medium text-ink-2">
          Contacto de la familia
        </label>
        <input
          id="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Teléfono, WhatsApp o correo"
          className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-3 focus:border-brand"
        />
        <p className="text-xs text-ink-3">
          Se mostrará a quienes encuentren una posible coincidencia.
        </p>
      </div>

      {state.kind === "error" && (
        <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-3.5 py-2.5 text-sm text-bad">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-xl bg-brand px-4 py-3 font-semibold text-bg transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.kind === "saving" ? "Guardando…" : "Guardar registro"}
      </button>
      {!photo && (
        <p className="text-center text-xs text-ink-3">
          Agregá una foto y un nombre para poder guardar.
        </p>
      )}
    </form>
  );
}
