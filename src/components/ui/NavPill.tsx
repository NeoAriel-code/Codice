import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface NavPillProps {
  href?: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  className?: string;
}

export function NavPill({
  href,
  active = false,
  onClick,
  children,
  icon,
  badge,
  className,
}: NavPillProps) {
  const commonClasses = cn(
    "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-body transition-all duration-150 select-none whitespace-nowrap cursor-pointer",
    "focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink focus-visible:outline-none",
    active
      ? "bg-ink-panel text-gold border border-gold/60 shadow-[0_0_12px_rgba(201,162,75,0.15)] font-medium"
      : "bg-transparent text-muted hover:text-parchment hover:bg-ink-panel/70 border border-transparent hover:border-ink-border",
    className
  );

  const content = (
    <>
      {icon && <span className={cn("shrink-0", active ? "text-gold" : "text-muted")}>{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "text-xs font-mono px-1.5 py-0.2 rounded-full",
            active
              ? "bg-gold/20 text-gold"
              : "bg-ink-border text-muted"
          )}
        >
          {badge}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={commonClasses} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={commonClasses} onClick={onClick}>
      {content}
    </button>
  );
}
