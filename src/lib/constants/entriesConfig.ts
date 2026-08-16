import type { EntryType } from "@/types/database";

export interface EntrySectionConfig {
  type: EntryType;
  title: string;
  disciplineLabel: string;
  description: string;
  emptyStateQuestion: string;
  createButtonLabel: string;
  singularLabel: string;
  namePlaceholder: string;
  summaryPlaceholder: string;
  detailsPlaceholder: string;
  hasDateField?: boolean;
  datePlaceholder?: string;
}

export const ENTRIES_CONFIG: Record<EntryType, EntrySectionConfig> = {
  personaje: {
    type: "personaje",
    title: "Personajes",
    disciplineLabel: "Dramatis Personae",
    description:
      "Linajes, motivaciones, arquetipos y secretos de cada habitante de tu universo.",
    emptyStateQuestion: "¿Quién será el primer nombre que se escriba aquí?",
    createButtonLabel: "Escribir el primer personaje",
    singularLabel: "personaje",
    namePlaceholder: "Ej. Valerius el Impío, Lady Lyanna de Arnor...",
    summaryPlaceholder: "Breve síntesis (1-2 oraciones) del rol, linaje o reputación...",
    detailsPlaceholder:
      "Historia completa, motivaciones, habilidades, rasgos psicológicos, secretos y vínculos...",
  },
  faccion: {
    type: "faccion",
    title: "Facciones",
    disciplineLabel: "Poder & Alianzas",
    description:
      "Órdenes sagradas, clanes rebeldes, gremios de mercaderes y tronos en pugna.",
    emptyStateQuestion: "¿Qué estandartes gobernarán o dividirán este mundo?",
    createButtonLabel: "Forjar la primera facción",
    singularLabel: "facción",
    namePlaceholder: "Ej. La Orden de la Ceniza, El Concilio de los Siete...",
    summaryPlaceholder: "Propósito central, esfera de influencia y lealtad política...",
    detailsPlaceholder:
      "Estructura jerárquica, cuarteles, recursos, aliados, enemigos jurados, doctrinas y símbolos...",
  },
  lugar: {
    type: "lugar",
    title: "Lugares",
    disciplineLabel: "Geografía Sagrada",
    description:
      "Ciudadelas inexpugnables, bosques vetados, mares ignotos y santuarios.",
    emptyStateQuestion: "¿Qué tierras moldearán el destino de tus historias?",
    createButtonLabel: "Trazar el primer lugar",
    singularLabel: "lugar",
    namePlaceholder: "Ej. La Ciudadela de Obsidiana, El Valle de los Susurros...",
    summaryPlaceholder: "Ubicación geográfica, clima, bioma y trascendencia en el mapa...",
    detailsPlaceholder:
      "Arquitectura, peligros ambientales, recursos naturales, leyendas locales y secretos enterrados...",
  },
  magia: {
    type: "magia",
    title: "Magia",
    disciplineLabel: "Leyes Arcanas",
    description:
      "Leyes sobrenaturales, costos arcanos, rituales prohibidos y reliquias de poder.",
    emptyStateQuestion: "¿Cuáles son las fuentes y los sacrificios del poder arcano?",
    createButtonLabel: "Codificar la primera ley arcana",
    singularLabel: "sistema arcano / reliquia",
    namePlaceholder: "Ej. La Piromancia de Sangre, El Ojo de Solaris...",
    summaryPlaceholder: "Regla fundamental, origen primordial y manifestación visible...",
    detailsPlaceholder:
      "Costos o sacrificios requeridos, catalizadores, limitaciones, escuelas y consecuencias...",
  },
  evento: {
    type: "evento",
    title: "Cronología",
    disciplineLabel: "Línea de Tiempo",
    description:
      "Las eras olvidadas, guerras decisivas, pactos ancestrales y profecías.",
    emptyStateQuestion: "¿Qué acontecimientos marcaron el antes y después de este universo?",
    createButtonLabel: "Registrar el primer evento",
    singularLabel: "evento histórico",
    namePlaceholder: "Ej. La Caída del Tercer Sol, El Gran Cónclave de Hierro...",
    summaryPlaceholder: "Resumen del suceso histórico y su impacto en las eras...",
    detailsPlaceholder:
      "Causas, protagonistas, desenlace bélico o diplomático, tratados y consecuencias a largo plazo...",
    hasDateField: true,
    datePlaceholder: "Ej. Año 342 de la Segunda Era, Época del Ocaso...",
  },
  termino: {
    type: "termino",
    title: "Glosario",
    disciplineLabel: "Léxico & Sabiduría",
    description:
      "Lenguas vernáculas, modismos arcaicos, títulos honoríficos y proverbios.",
    emptyStateQuestion: "¿Qué vocablos únicos dan identidad a este universo?",
    createButtonLabel: "Anotar el primer término",
    singularLabel: "término",
    namePlaceholder: "Ej. Valyrian, Aethelgard, Solsticio Negro, Drakkar...",
    summaryPlaceholder: "Definición concisa o traducción vernácula...",
    detailsPlaceholder:
      "Etimología, uso sociocultural, ejemplos de frases en contexto, connotaciones y variantes...",
  },
};
