export type AnalyticsEvent =
  | "user_signup"
  | "world_created"
  | "entry_created"
  | "entry_relation_created"
  | "research_shelf_saved"
  | "oracle_query_sent";

export interface AnalyticsEventProps {
  user_signup?: { method?: string };
  world_created?: { world_id?: string; name?: string };
  entry_created?: { world_id?: string; type: string; name?: string };
  entry_relation_created?: {
    world_id?: string;
    relation_type: string;
  };
  research_shelf_saved?: {
    world_id?: string;
    external_id?: string;
    title?: string;
  };
  oracle_query_sent?: {
    world_id?: string;
    query_length?: number;
  };
}

/**
 * Registra un evento de analítica de forma segura y respetuosa de la privacidad.
 * Compatible con PostHog, Plausible o logging seguro en desarrollo.
 */
export function trackEvent<E extends AnalyticsEvent>(
  event: E,
  properties?: AnalyticsEventProps[E]
) {
  if (typeof window === "undefined") return;

  try {
    // 1. PostHog (si está configurado en el cliente)
    interface WindowWithPostHog extends Window {
      posthog?: {
        capture: (name: string, props?: Record<string, unknown>) => void;
      };
      plausible?: (name: string, options?: { props?: Record<string, unknown> }) => void;
    }

    const win = window as WindowWithPostHog;

    if (win.posthog && typeof win.posthog.capture === "function") {
      win.posthog.capture(event, properties as Record<string, unknown>);
      return;
    }

    // 2. Plausible (si está configurado)
    if (win.plausible && typeof win.plausible === "function") {
      win.plausible(event, { props: properties as Record<string, unknown> });
      return;
    }

    // 3. Modo desarrollo (solo en console de depuración local si está activo)
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analítica Códice] Evento: ${event}`, properties);
    }
  } catch {
    // Silencioso: la analítica nunca debe interrumpir la experiencia del usuario
  }
}
