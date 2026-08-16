"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { SectionSigil } from "@/components/ui/SectionSigil";
import { SealIcon } from "@/components/ui/SealIcon";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { Database } from "@/types/database";

type World = Database["public"]["Tables"]["worlds"]["Row"];
type OracleMessage = Database["public"]["Tables"]["oracle_messages"]["Row"];

interface UsageInfo {
  count: number;
  limit: number;
}

const QUICK_PROMPTS = [
  "¿Hay alguna contradicción o vacío en las entradas de mi mundo?",
  "Sugiere 3 ideas de facciones o personajes que puedan enriquecer este universo.",
  "¿Cómo se conectan los sistemas mágicos con la historia y geografía actuales?",
];

export default function OraculoPage() {
  const params = useParams();
  const worldId = params?.worldId as string;

  const [world, setWorld] = useState<World | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OracleMessage[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageInfo>({ count: 0, limit: 30 });

  // Estado para reiniciar conversación
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Cargar datos iniciales del mundo, conversación y cuota
  const fetchOracleData = useCallback(async () => {
    if (!worldId) return;

    setLoadingInitial(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Obtener datos del mundo
      const { data: worldData, error: worldErr } = await supabase
        .from("worlds")
        .select("*")
        .eq("id", worldId)
        .maybeSingle();

      if (worldErr || !worldData) {
        setError("No se pudo cargar la información del mundo.");
        setLoadingInitial(false);
        return;
      }

      setWorld(worldData);

      // 2. Obtener la conversación más reciente de este mundo
      const { data: convData } = await supabase
        .from("oracle_conversations")
        .select("id")
        .eq("world_id", worldId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convData) {
        setConversationId(convData.id);

        // 3. Obtener los mensajes de la conversación
        const { data: msgData } = await supabase
          .from("oracle_messages")
          .select("*")
          .eq("conversation_id", convData.id)
          .order("created_at", { ascending: true });

        setMessages(msgData || []);
      }

      // 4. Obtener la cuota de uso mensual desde la API route
      const usageRes = await fetch("/api/oracle");
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage({
          count: usageData.count || 0,
          limit: usageData.limit || 30,
        });
      }
    } catch {
      setError("Error de conexión al abrir el santuario del Oráculo.");
    } finally {
      setLoadingInitial(false);
    }
  }, [worldId]);

  useEffect(() => {
    fetchOracleData();
  }, [fetchOracleData]);

  // Enviar mensaje al Oráculo
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isThinking) return;

    if (usage.count >= usage.limit) {
      setError(
        `Has alcanzado el límite mensual de ${usage.limit} consultas del plan Escriba (Gratuito).`
      );
      return;
    }

    setError(null);
    setInputMessage("");

    // Optimistic User Message
    const tempUserMsg: OracleMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId || "",
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsThinking(true);

    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          worldId,
          message: text,
          conversationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ocurrió un error al consultar al Oráculo.");
        // Remover mensaje optimista si falló
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      } else {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }

        if (data.usage) {
          setUsage(data.usage);
        }

        trackEvent("oracle_query_sent", {
          world_id: worldId,
          query_length: text.length,
        });

        const assistantMsg: OracleMessage = {
          id: `assistant-${Date.now()}`,
          conversation_id: data.conversationId || conversationId || "",
          role: "assistant",
          content: data.message,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setError("Error de conexión con el servidor del Oráculo. Intenta de nuevo.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Crear una nueva conversación (archivar la actual)
  const handleStartNewConversation = async () => {
    setShowNewChatConfirm(false);
    setError(null);
    setLoadingInitial(true);

    try {
      const supabase = createClient();
      const { data: newConv, error: createErr } = await supabase
        .from("oracle_conversations")
        .insert({ world_id: worldId })
        .select("id")
        .single();

      if (createErr || !newConv) {
        setError("No se pudo iniciar una nueva sesión.");
      } else {
        setConversationId(newConv.id);
        setMessages([]);
      }
    } catch {
      setError("Error al crear un nuevo hilo de consulta.");
    } finally {
      setLoadingInitial(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav worldId={world?.id} worldName={world?.name} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col justify-between space-y-6">
        {/* Cabecera del Santuario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-border pb-5">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-ink-panel border border-gold/40 flex items-center justify-center text-gold shrink-0 mt-0.5 shadow-md">
              <SectionSigil type="oraculo" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono uppercase tracking-widest text-gold">
                  Inteligencia Arcanista
                </span>
                <span className="text-xs font-mono text-muted">•</span>
                <span className="text-xs font-mono text-muted">
                  Consultas este mes:{" "}
                  <strong className="text-gold font-medium">
                    {usage.count} / {usage.limit}
                  </strong>
                </span>
              </div>
              <h1 className="font-display text-3xl uppercase tracking-wider text-parchment">
                El Oráculo
              </h1>
              <p className="text-muted text-sm font-body mt-0.5">
                Archivero y consejero supremo del códice de «{world?.name || "tu mundo"}».
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {messages.length > 0 && (
              <ButtonGhost
                size="sm"
                onClick={() => setShowNewChatConfirm(true)}
                title="Comenzar una nueva consulta"
              >
                + Nueva consulta
              </ButtonGhost>
            )}
            <Link href={`/mundos/${worldId}`}>
              <ButtonGhost size="sm">← Resumen</ButtonGhost>
            </Link>
          </div>
        </div>

        {/* Mensaje de Error / Alerta */}
        {error && (
          <div className="p-3.5 rounded-xl bg-burgundy/20 border border-burgundy/50 text-parchment text-sm font-body flex items-center justify-between gap-2 animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <span className="text-burgundy font-bold text-base">⚠</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-xs font-mono text-muted hover:text-parchment cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Estado de Carga Inicial */}
        {loadingInitial ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-3">
            <SealIcon size={40} spinning />
            <p className="font-body text-muted text-sm">
              Abriendo el santuario del Oráculo...
            </p>
          </div>
        ) : (
          /* Área de Mensajes del Chat */
          <div className="flex-1 space-y-6 overflow-y-auto min-h-[360px] max-h-[60vh] p-2 pr-3 scrollbar-grimorio">
            {/* Mensaje de Bienvenida del Oráculo */}
            <ChatBubble role="oracle" timestamp="Santuario">
              {`Saludos, escriba de «${world?.name}». Conozco las leyes, linajes y cronología selladas en este códice. ¿Qué secreto, incoherencia o expansión narrativa deseas consultar hoy?`}
            </ChatBubble>

            {/* Historial de Mensajes */}
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                role={msg.role === "user" ? "user" : "oracle"}
                timestamp={new Date(msg.created_at).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              >
                {msg.content}
              </ChatBubble>
            ))}

            {/* Estado de Pensando del Oráculo */}
            {isThinking && (
              <div className="flex items-start gap-3 animate-in fade-in-50">
                <div className="w-8 h-8 rounded-full bg-ink-panel border border-gold/40 flex items-center justify-center text-gold shrink-0">
                  <SealIcon size={18} spinning />
                </div>
                <div className="p-3.5 rounded-xl bg-ink-panel border border-gold/30 text-muted font-body text-sm italic flex items-center gap-2">
                  <span>El Oráculo está consultando los manuscritos del códice...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Sugerencias Rápidas de Preguntas (si el hilo tiene pocos mensajes) */}
        {!loadingInitial && messages.length <= 1 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted">
              Consultas sugeridas:
            </span>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isThinking || usage.count >= usage.limit}
                  className="px-3 py-1.5 rounded-lg text-xs font-body text-parchment/90 bg-ink-panel border border-ink-border hover:border-gold/50 hover:bg-ink-hover text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  «{prompt}»
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Barra de Entrada de Mensaje (sin tag <form>) */}
        <div className="pt-2">
          <div className="relative rounded-xl border border-ink-border bg-ink-panel p-2 focus-within:border-gold/60 focus-within:ring-1 focus-within:ring-gold transition-all shadow-xl">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking || usage.count >= usage.limit}
              placeholder={
                usage.count >= usage.limit
                  ? "Has alcanzado el límite mensual de consultas para este plan."
                  : "Pregunta al Oráculo sobre leyes, personajes, facciones o ideas... (Enter para enviar)"
              }
              className="w-full bg-transparent border-0 text-sm text-parchment placeholder:text-muted/60 focus:outline-none resize-none px-2 py-1 font-body leading-relaxed disabled:opacity-50"
            />

            <div className="flex items-center justify-between pt-2 border-t border-ink-border/60 px-1">
              <span className="text-[11px] font-mono text-muted hidden sm:inline">
                Shift + Enter para salto de línea
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <ButtonGold
                  size="sm"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || isThinking || usage.count >= usage.limit}
                  loading={isThinking}
                >
                  Consultar al Oráculo
                </ButtonGold>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Confirmación para Nueva Consulta */}
        {showNewChatConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-in fade-in-50">
            <Card className="w-full max-w-sm border-gold/40 bg-ink-panel shadow-2xl space-y-3">
              <CardHeader className="pb-0">
                <CardTitle className="text-base">
                  Comenzar Nueva Consulta
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  ¿Deseas archivar la sesión actual e iniciar una nueva conversación con el Oráculo? Las entradas del códice permanecerán intactas.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-end gap-2 pt-3">
                <ButtonGhost
                  size="sm"
                  onClick={() => setShowNewChatConfirm(false)}
                >
                  Cancelar
                </ButtonGhost>
                <ButtonGold
                  size="sm"
                  onClick={handleStartNewConversation}
                >
                  Iniciar nueva sesión
                </ButtonGold>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
