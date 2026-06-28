export interface DemoExample {
  id: string;
  name: string;
  role: string;
  /** Foto en el registro (familia) */
  refImage: string;
  /** Foto para buscar (simula hallazgo en campo) */
  queryImage: string;
  expectedMatch: string;
  location: string;
  contact: string;
  hint: string;
}

/** Celebridades de demostración — datos ficticios, no personas desaparecidas reales. */
export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "angelina_jolie",
    name: "Angelina Jolie",
    role: "Actriz",
    refImage: "/demo/angelina_jolie_1.jpg",
    queryImage: "/demo/angelina_jolie_2.jpg",
    expectedMatch: "Angelina Jolie",
    location: "La Guaira",
    contact: "+1 555 0101",
    hint: "Debería aparecer con similitud muy alta (>90%).",
  },
  {
    id: "bradley_cooper",
    name: "Bradley Cooper",
    role: "Actor",
    refImage: "/demo/bradley_cooper_1.jpg",
    queryImage: "/demo/bradley_cooper_2.jpg",
    expectedMatch: "Bradley Cooper",
    location: "Caracas",
    contact: "+1 555 0102",
    hint: "Otro ángulo de la misma persona — típico de un hallazgo real.",
  },
  {
    id: "kate_siegel",
    name: "Kate Siegel",
    role: "Actriz",
    refImage: "/demo/kate_siegel_1.jpg",
    queryImage: "/demo/kate_siegel_2.jpg",
    expectedMatch: "Kate Siegel",
    location: "Maracaibo",
    contact: "+1 555 0103",
    hint: "Compará el contacto devuelto con el del registro demo.",
  },
  {
    id: "paul_rudd",
    name: "Paul Rudd",
    role: "Actor",
    refImage: "/demo/paul_rudd_1.jpg",
    queryImage: "/demo/paul_rudd_2.jpg",
    expectedMatch: "Paul Rudd",
    location: "Valencia",
    contact: "+1 555 0104",
    hint: "Si subís la foto de otra persona, no debería matchear.",
  },
  {
    id: "shea_whigham",
    name: "Shea Whigham",
    role: "Actor",
    refImage: "/demo/shea_whigham_1.jpg",
    queryImage: "/demo/shea_whigham_2.jpg",
    expectedMatch: "Shea Whigham",
    location: "Mérida",
    contact: "+1 555 0105",
    hint: "La decisión final siempre es humana — el sistema solo sugiere.",
  },
];
