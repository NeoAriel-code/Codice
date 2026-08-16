import React from "react";
import { cn } from "@/lib/utils";

export type TagPillVariant = "default" | "gold" | "burgundy" | "moss";

export interface TagPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagPillVariant;
  onRemove?: () => void;
  children: React.ReactNode;
}

export function TagPill({
  variant = "default",
  onRemove,
  className,
  children,
  ...props
}: TagPillProps) {
  const variantStyles: Record<TagPillVariant, string> = {
    default: "bg-ink-panel border-ink-border text-muted",
    gold: "bg-gold/10 border-gold/40 text-gold",
    burgundy: "bg-burgundy/15 border-burgundy/40 text-burgundy-hover",
    moss: "bg-moss/15 border-moss/40 text-moss",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border select-none transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold rounded-full p-0.5 -mr-1 cursor-pointer"
          aria-label="Eliminar etiqueta"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M3 3l6 6M9 3l-6 6" />
          </svg>
        </button>
      )}
    </span>
  );
}
