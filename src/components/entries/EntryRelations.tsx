"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SectionSigil } from "@/components/ui/SectionSigil";
import { SealIcon } from "@/components/ui/SealIcon";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { TagPill } from "@/components/ui/TagPill";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { Database, EntryType } from "@/types/database";

type RelationRow = Database["public"]["Tables"]["entry_relations"]["Row"];
type EntryBrief = Pick<
  Database["public"]["Tables"]["entries"]["Row"],
  "id" | "name" | "type" | "summary"
>;

export interface EntryRelationsProps {
  worldId: string;
  entryId: string;
}

interface DisplayRelation {
  id: string;
  relationType: string;
  note: string | null;
  direction: "outgoing" | "incoming";
  otherEntry: EntryBrief | null;
}

const COMMON_RELATIONS = [
  "aliado de",
  "enemigo de",
  "miembro de",
  "gobierna en",
  "ubicado en",
  "creador de",
  "poseedor de",
  "mentor de",
  "leal a",
];

export function EntryRelations({ worldId, entryId }: EntryRelationsProps) {
  const [relations, setRelations] = useState<RelationRow[]>([]);
  const [worldEntries, setWorldEntries] = useState<EntryBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para nuevo vínculo
  const [isAdding, setIsAdding] = useState(false);
  const [searchTarget, setSearchTarget] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<EntryBrief | null>(null);
  const [relationType, setRelationType] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Estados para eliminación de vínculo
  const [deletingRelationId, setDeletingRelationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRelationsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Obtener todas las entradas del mundo para resolver nombres/sigilos y el buscador
      const { data: allEntries, error: entriesErr } = await supabase
        .from("entries")
        .select("id, name, type, summary")
        .eq("world_id", worldId);

      if (entriesErr) {
        setError("No se pudieron cargar los registros del mundo.");
        setLoading(false);
        return;
      }

      setWorldEntries(allEntries || []);

      // 2. Obtener relaciones donde esta entrada sea origen o destino
      const { data: relsData, error: relsErr } = await supabase
        .from("entry_relations")
        .select("*")
        .eq("world_id", worldId)
        .or(`from_entry_id.eq.${entryId},to_entry_id.eq.${entryId}`);

      if (relsErr) {
        setError("No se pudieron consultar los vínculos de esta entrada.");
      } else {
        setRelations(relsData || []);
      }
    } catch {
      setError("Error de conexión al consultar los vínculos.");
    } finally {
      setLoading(false);
    }
  }, [worldId, entryId]);

  useEffect(() => {
    fetchRelationsData();
  }, [fetchRelationsData]);

  // Mapa de entradas para búsqueda rápida por ID
  const entriesMap = useMemo(() => {
    const map = new Map<string, EntryBrief>();
    worldEntries.forEach((e) => map.set(e.id, e));
    return map;
  }, [worldEntries]);

  // Lista de relaciones procesadas para visualización bidireccional
  const displayRelations: DisplayRelation[] = useMemo(() => {
    return relations.map((rel) => {
      const isOutgoing = rel.from_entry_id === entryId;
      const otherId = isOutgoing ? rel.to_entry_id : rel.from_entry_id;
      const otherEntry = entriesMap.get(otherId) || null;

      return {
        id: rel.id,
        relationType: rel.relation_type,
        note: rel.note || null,
        direction: isOutgoing ? "outgoing" : "incoming",
        otherEntry,
      };
    });
  }, [relations, entryId, entriesMap]);

  // Entradas candidatas para el buscador (excluyendo la entrada actual)
  const candidateTargets = useMemo(() => {
    if (!searchTarget.trim()) return [];
    const q = searchTarget.toLowerCase().trim();
    return worldEntries
      .filter((e) => e.id !== entryId && e.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [worldEntries, entryId, searchTarget]);

  // Sellar nueva relación
  const handleSaveRelation = async () => {
    if (!selectedTarget) {
      setError("Debes seleccionar una entrada de destino para el vínculo.");
      return;
    }
    if (!relationType.trim()) {
      setError("Debes especificar el tipo de relación (ej. 'aliado de', 'ubicado en').");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const { data, error: insertErr } = await supabase
        .from("entry_relations")
        .insert({
          world_id: worldId,
          from_entry_id: entryId,
          to_entry_id: selectedTarget.id,
          relation_type: relationType.trim().toLowerCase(),
          note: note.trim() || null,
        })
        .select()
        .single();

      if (insertErr) {
        setError("No se pudo sellar el vínculo en el códice.");
      } else if (data) {
        trackEvent("entry_relation_created", {
          world_id: worldId,
          relation_type: data.relation_type,
        });
        setRelations([data, ...relations]);
        setIsAdding(false);
        setSelectedTarget(null);
        setSearchTarget("");
        setRelationType("");
        setNote("");
        setSuccessMessage("Sellado. El vínculo ha sido registrado en ambas fichas.");
      }
    } catch {
      setError("Error de conexión al crear el vínculo.");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar relación
  const handleDeleteRelation = async () => {
    if (!deletingRelationId) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("entry_relations")
        .delete()
        .eq("id", deletingRelationId);

      if (delErr) {
        setError("No se pudo desvincular la relación.");
      } else {
        setRelations(relations.filter((r) => r.id !== deletingRelationId));
        setSuccessMessage("Vínculo eliminado de ambas fichas.");
        setDeletingRelationId(null);
      }
    } catch {
      setError("Error de conexión al eliminar el vínculo.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 pt-3 border-t border-ink-border/80">
      {/* Cabecera del subpanel */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-gold flex items-center gap-1.5">
            <span>☍</span>
            <span>Vínculos &amp; Relaciones</span>
          </span>
          <span className="text-xs font-mono text-muted">
            ({displayRelations.length})
          </span>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setSelectedTarget(null);
              setSearchTarget("");
              setRelationType("");
              setNote("");
              setError(null);
            }}
            className="text-xs font-mono text-gold hover:underline cursor-pointer flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-gold rounded p-1"
          >
            <span>+ Vincular entrada</span>
          </button>
        )}
      </div>

      {/* Mensajes de feedback */}
      {successMessage && (
        <div className="p-2.5 rounded-lg bg-moss/20 border border-moss/40 text-parchment text-xs font-body flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-moss font-bold">✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-mono text-muted hover:text-parchment cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-burgundy/20 border border-burgundy/40 text-parchment text-xs font-body flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-burgundy font-bold">⚠</span>
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

      {/* Subpanel de Creación de Vínculo (sin <form>) */}
      {isAdding && (
        <Card className="border-gold/40 bg-ink p-4 space-y-3.5 shadow-lg animate-in fade-in-50">
          <div className="flex items-center justify-between border-b border-ink-border pb-2">
            <span className="font-display text-xs uppercase tracking-wider text-parchment">
              Forjar Nuevo Vínculo
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-muted hover:text-parchment text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 1. Selección de Entrada Destino */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted">
              Entrada de Destino <span className="text-gold">*</span>
            </label>

            {selectedTarget ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-ink-panel border border-gold/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded bg-ink border border-ink-border flex items-center justify-center text-gold">
                    <SectionSigil type={selectedTarget.type as EntryType} size={14} />
                  </div>
                  <span className="text-sm font-body font-medium text-parchment">
                    {selectedTarget.name}
                  </span>
                  <TagPill variant="default">{selectedTarget.type}</TagPill>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTarget(null)}
                  className="text-xs font-mono text-muted hover:text-parchment cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative space-y-1">
                <input
                  type="text"
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  placeholder="Buscar entrada por nombre en este mundo..."
                  className="w-full bg-ink-panel border border-ink-border rounded-lg px-3 py-2 text-xs text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                />

                {candidateTargets.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-ink-panel border border-ink-border rounded-lg shadow-2xl divide-y divide-ink-border overflow-hidden">
                    {candidateTargets.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedTarget(item);
                          setSearchTarget("");
                        }}
                        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-ink-hover text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <SectionSigil type={item.type as EntryType} size={14} className="text-gold" />
                          <span className="text-sm font-body text-parchment">{item.name}</span>
                        </div>
                        <TagPill variant="default">{item.type}</TagPill>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Tipo de Relación (texto libre + sugerencias) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted">
              Tipo de Relación <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={relationType}
              onChange={(e) => setRelationType(e.target.value)}
              placeholder="Ej. aliado de, enemigo de, gobierna en, creado por..."
              className="w-full bg-ink-panel border border-ink-border rounded-lg px-3 py-2 text-xs text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            />

            {/* Chips de sugerencias rápidas */}
            <div className="flex flex-wrap gap-1 pt-1">
              {COMMON_RELATIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setRelationType(suggestion)}
                  className="px-2 py-0.5 rounded-full text-xs font-mono bg-ink-panel border border-ink-border text-muted hover:text-gold hover:border-gold/40 transition-colors cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nota opcional */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted">
              Nota / Contexto (Opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Desde la batalla del solsticio, alianza secreta..."
              className="w-full bg-ink-panel border border-ink-border rounded-lg px-3 py-2 text-xs text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-border">
            <ButtonGhost
              size="sm"
              onClick={() => setIsAdding(false)}
              disabled={saving}
            >
              Cancelar
            </ButtonGhost>
            <ButtonGold
              size="sm"
              onClick={handleSaveRelation}
              disabled={!selectedTarget || !relationType.trim() || saving}
              loading={saving}
            >
              Sellar vínculo
            </ButtonGold>
          </div>
        </Card>
      )}

      {/* Estado de Carga */}
      {loading && (
        <div className="flex items-center gap-2 py-2 text-xs font-body text-muted">
          <SealIcon size={14} spinning />
          <span>Consultando vínculos registrados...</span>
        </div>
      )}

      {/* Estado Vacío de Relaciones */}
      {!loading && displayRelations.length === 0 && !isAdding && (
        <p className="text-xs font-body text-muted/70 italic">
          Sin vínculos registrados aún en el códice.
        </p>
      )}

      {/* Lista de Relaciones Existentes */}
      {!loading && displayRelations.length > 0 && (
        <div className="space-y-2">
          {displayRelations.map((rel) => {
            const isOutgoing = rel.direction === "outgoing";

            return (
              <div
                key={rel.id}
                className="p-2.5 rounded-lg bg-ink/70 border border-ink-border flex items-center justify-between gap-3 text-xs font-body group hover:border-gold/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  {rel.otherEntry ? (
                    <>
                      <div className="w-5 h-5 rounded bg-ink-panel border border-ink-border flex items-center justify-center text-gold shrink-0">
                        <SectionSigil
                          type={rel.otherEntry.type as EntryType}
                          size={12}
                        />
                      </div>

                      {isOutgoing ? (
                        <>
                          <span className="font-mono text-gold font-medium">
                            {rel.relationType}
                          </span>
                          <span className="text-muted">→</span>
                          <span className="font-medium text-parchment">
                            {rel.otherEntry.name}
                          </span>
                          <TagPill variant="default">{rel.otherEntry.type}</TagPill>
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-parchment">
                            {rel.otherEntry.name}
                          </span>
                          <TagPill variant="default">{rel.otherEntry.type}</TagPill>
                          <span className="text-muted">—</span>
                          <span className="font-mono text-gold/90 italic">
                            «{rel.relationType}»
                          </span>
                        </>
                      )}

                      {rel.note && (
                        <span className="text-muted/80 italic text-xs">
                          ({rel.note})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted italic">
                      Entrada vinculada no disponible
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setDeletingRelationId(rel.id)}
                  className="text-muted hover:text-burgundy opacity-70 group-hover:opacity-100 transition-opacity p-1 rounded cursor-pointer focus-visible:ring-1 focus-visible:ring-burgundy"
                  title="Desvincular relación"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de desvinculación */}
      {deletingRelationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-in fade-in-50">
          <Card className="w-full max-w-sm border-burgundy/60 bg-ink-panel shadow-2xl space-y-3">
            <CardHeader className="pb-0">
              <CardTitle className="text-base text-burgundy">
                Desvincular Relación
              </CardTitle>
              <CardDescription className="text-xs">
                ¿Estás seguro de que deseas eliminar este vínculo? Esta acción se reflejará en ambas entradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-end gap-2 pt-3">
              <ButtonGhost
                size="sm"
                onClick={() => setDeletingRelationId(null)}
                disabled={isDeleting}
              >
                Cancelar
              </ButtonGhost>
              <button
                type="button"
                onClick={handleDeleteRelation}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-body font-medium rounded-md bg-burgundy text-parchment hover:bg-burgundy-hover disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isDeleting ? "Borrando..." : "Desvincular"}
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
