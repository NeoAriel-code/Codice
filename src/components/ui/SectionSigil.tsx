import React from "react";
import { cn } from "@/lib/utils";
import type { EntryType } from "@/types/database";

export type SigilType = EntryType | "investigacion" | "oraculo" | "resumen";

export interface SectionSigilProps extends React.SVGProps<SVGSVGElement> {
  type: SigilType;
  size?: number | string;
  className?: string;
}

export function SectionSigil({
  type,
  size = 24,
  className,
  ...props
}: SectionSigilProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("select-none shrink-0", className),
    "aria-hidden": true,
    ...props,
  };

  switch (type) {
    case "personaje":
      // Espada ceremonial / linaje
      return (
        <svg {...commonProps}>
          <path d="M12 2v14" />
          <path d="M7 6l5-4 5 4" />
          <path d="M8 16h8" />
          <path d="M12 16v5" />
          <circle cx="12" cy="22" r="1" fill="currentColor" />
        </svg>
      );

    case "faccion":
      // Estandarte heráldico / blasón
      return (
        <svg {...commonProps}>
          <path d="M4 2v20" />
          <path d="M4 3h14l-3 6 3 6H4" />
          <circle cx="11" cy="9" r="1.5" fill="currentColor" />
        </svg>
      );

    case "lugar":
      // Torre vigía / ciudadela
      return (
        <svg {...commonProps}>
          <path d="M4 21h16" />
          <path d="M6 21V9l6-6 6 6v12" />
          <path d="M10 9h4" />
          <path d="M10 14h4" />
          <path d="M10 21v-4h4v4" />
        </svg>
      );

    case "magia":
      // Runa arcana / sigilo de poder
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" strokeDasharray="2 2" />
          <path d="M12 3v18" />
          <path d="M3 12h18" />
          <path d="M7 7l10 10" />
          <path d="M17 7L7 17" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );

    case "evento":
      // Reloj de arena / eras cronológicas
      return (
        <svg {...commonProps}>
          <path d="M5 2h14" />
          <path d="M5 22h14" />
          <path d="M6 2v6l6 4-6 4v6" />
          <path d="M18 2v6l-6 4 6 4v6" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );

    case "termino":
      // Pluma de escriba / glosario
      return (
        <svg {...commonProps}>
          <path d="M20 2L9 13l-4 7 7-4L23 5l-3-3z" />
          <path d="M15 7l2 2" />
          <path d="M5 20l2-2" />
        </svg>
      );

    case "investigacion":
      // Grimorio abierto / estante de investigación
      return (
        <svg {...commonProps}>
          <path d="M2 4h7a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
          <path d="M22 4h-7a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h8z" />
        </svg>
      );

    case "oraculo":
      // Ojo omnisciente / oráculo
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6a6 6 0 0 1 6 6c0 3.314-6 9-6 9s-6-5.686-6-9a6 6 0 0 1 6-6z" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );

    case "resumen":
    default:
      // Sello resumen / libro general
      return (
        <svg {...commonProps}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8" />
          <path d="M8 11h8" />
          <path d="M8 15h5" />
        </svg>
      );
  }
}
