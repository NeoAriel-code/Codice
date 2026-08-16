import React from "react";
import { cn } from "@/lib/utils";
import { SealIcon } from "./SealIcon";

export interface ChatBubbleProps {
  role: "user" | "assistant" | "oracle";
  children: React.ReactNode;
  timestamp?: string;
  className?: string;
}

export function ChatBubble({
  role,
  children,
  timestamp,
  className,
}: ChatBubbleProps) {
  const isOracle = role === "assistant" || role === "oracle";

  if (isOracle) {
    return (
      <div className={cn("flex items-start gap-3 my-4 max-w-3xl mr-auto", className)}>
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-ink border border-gold/40 flex items-center justify-center shadow-sm">
            <SealIcon size={18} />
          </div>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-xs tracking-wider uppercase text-gold">
              El Oráculo
            </span>
            {timestamp && (
              <span className="font-mono text-xs text-muted">{timestamp}</span>
            )}
          </div>
          <div className="bg-ink-panel border-l-2 border-l-gold border-y border-r border-ink-border rounded-r-xl rounded-bl-sm p-4 text-parchment font-body text-base leading-relaxed whitespace-pre-wrap shadow-sm">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-end my-4 max-w-2xl ml-auto", className)}>
      <div className="flex items-center gap-2 mb-1 mr-1">
        <span className="font-display text-xs tracking-wider uppercase text-muted">
          Tú
        </span>
        {timestamp && (
          <span className="font-mono text-xs text-muted">{timestamp}</span>
        )}
      </div>
      <div className="bg-burgundy/20 border border-burgundy/40 rounded-2xl rounded-tr-sm p-4 text-parchment font-body text-base leading-relaxed whitespace-pre-wrap shadow-sm">
        {children}
      </div>
    </div>
  );
}
