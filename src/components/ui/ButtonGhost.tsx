import React from "react";
import { cn } from "@/lib/utils";
import { SealIcon } from "./SealIcon";

export interface ButtonGhostProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export function ButtonGhost({
  className,
  children,
  loading = false,
  disabled,
  size = "md",
  icon,
  type = "button",
  ...props
}: ButtonGhostProps) {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-2.5 text-base gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-body font-medium rounded-lg transition-colors duration-150 select-none cursor-pointer",
        "bg-transparent text-parchment border border-ink-border hover:bg-ink-hover hover:border-gold/40 active:bg-ink-hover",
        "focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <SealIcon size={16} spinning className="text-gold" />
          <span>Consultando...</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
