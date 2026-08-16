import React from "react";
import { cn } from "@/lib/utils";

interface SealIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  spinning?: boolean;
  className?: string;
}

export function SealIcon({
  size = 24,
  spinning = false,
  className,
  ...props
}: SealIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "text-gold select-none",
        spinning && "animate-sello-spin motion-reduce:animate-none",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {/* Círculo exterior con patrón de muescas/puntos */}
      <circle
        cx="24"
        cy="24"
        r="22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1 3"
        strokeLinecap="round"
      />
      {/* Círculo concéntrico medio */}
      <circle
        cx="24"
        cy="24"
        r="18"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Círculo interior */}
      <circle
        cx="24"
        cy="24"
        r="13"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      {/* Sigilo geométrico central: hexagrama/rombo místico estilizado */}
      <path
        d="M24 14L31 24L24 34L17 24Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 24H34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M24 14V34"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="24"
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
}
