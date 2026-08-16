"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { SectionSigil } from "@/components/ui/SectionSigil";
import { SealIcon } from "@/components/ui/SealIcon";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { TagPill } from "@/components/ui/TagPill";
import { createClient } from "@/lib/supabase/client";
import { ENTRIES_CONFIG } from "@/lib/constants/entriesConfig";
import { EntryRelations } from "./EntryRelations";
import { trackEvent } from "@/lib/analytics";
import type { Database, EntryType } from "@/types/database";

type World = Database["public"]["Tables"]["worlds"]["Row"];
type Entry = Database["public"]["Tables"]["entries"]["Row"];

export interface EntriesSectionViewProps {
  worldId: string;
  entryType: EntryType;
}

export function EntriesSectionView({
  worldId,
  entryType,
}: EntriesSectionViewProps) {
  const config = ENTRIES_CONFIG[entryType];

  const [world, setWorld] = useState<World | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Filtros y búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Estados del Formulario (Crear / Editar)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [formName, setFormName] = useState("");
  const [formSummary, setFormSummary] = useState("");
  const [formDetails, setFormDetails] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formDateInWorld, setFormDateInWorld] = useState("");
  const [saving, setSaving] = useState(false);

  // Estado de Lectura Detallada (Acordeón)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Estado de Eliminación
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSectionData = useCallback(async () => {
    if (!worldId) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Cargar información del mundo
      const { data: worldData, error: worldErr } = await supabase
        .from("worlds")
        .select("*")
        .eq("id", worldId)
        .maybeSingle();

      if (worldErr || !worldData) {
        setError("No se pudo cargar la información del mundo.");
        setLoading(false);
        return;
      }

      setWorld(worldData);

      // 2. Cargar entradas del tipo correspondiente
      const { data: entriesData, error: entriesErr } = await supabase
        .from("entries")
        .select("*")
        .eq("world_id", worldId)
        .eq("type", entryType)
        .order("created_at", { ascending: false });

      if (entriesErr) {
        setError(`No se pudieron cargar las entradas de ${config.title.toLowerCase()}.`);
      } else {
        setEntries(entriesData || []);
      }
    } catch {
      setError("Error de conexión al consultar el códice.");
    } finally {
      setLoading(false);
    }
  }, [worldId, entryType, config.title]);

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  // Lista de todos los tags únicos presentes en esta sección
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      e.tags?.forEach((t) => {
        if (t.trim()) tagSet.add(t.trim());
      });
    });
    return Array.from(tagSet);
  }, [entries]);

  // Filtrado de entradas por texto y tag
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      const matchesTag = selectedTag
        ? item.tags?.includes(selectedTag)
        : true;

      if (!matchesTag) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inName = item.name.toLowerCase().includes(q);
      const inSummary = (item.summary || "").toLowerCase().includes(q);
      const inDetails = (item.details || "").toLowerCase().includes(q);
      const inTags = item.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
      const inDate = (item.date_in_world || "").toLowerCase().includes(q);

      return inName || inSummary || inDetails || inTags || inDate;
    });
  }, [entries, searchQuery, selectedTag]);

  // Manejo de formulario: Abrir para Crear
  const handleOpenCreate = () => {
    setEditingEntry(null);
    setFormName("");
    setFormSummary("");
    setFormDetails("");
    setFormTags([]);
    setTagInput("");
    setFormDateInWorld("");
    setIsFormOpen(true);
  };

  // Manejo de formulario: Abrir para Editar
  const handleOpenEdit = (entry: Entry, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingEntry(entry);
    setFormName(entry.name);
    setFormSummary(entry.summary || "");
    setFormDetails(entry.details || "");
    setFormTags(entry.tags || []);
    setTagInput("");
    setFormDateInWorld(entry.date_in_world || "");
    setIsFormOpen(true);
    // Asegurar scroll arriba al formulario
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Agregar tag desde el input
  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, "");
    if (clean && !formTags.includes(clean)) {
      setFormTags([...formTags, clean]);
      setTagInput("");
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  // Guardar (Insert o Update)
  const handleSaveEntry = async () => {
    if (!formName.trim()) {
      setError("El nombre de la entrada no puede estar en blanco.");
      return;
    }

    setSaving(true);
    setError(null);
    setBannerMessage(null);

    try {
      const supabase = createClient();

      if (editingEntry) {
        // UPDATE
        const { data, error: updateErr } = await supabase
          .from("entries")
          .update({
            name: formName.trim(),
            summary: formSummary.trim() || null,
            details: formDetails.trim() || null,
            tags: formTags,
            date_in_world: config.hasDateField ? formDateInWorld.trim() || null : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingEntry.id)
          .select()
          .single();

        if (updateErr) {
          setError("No se pudo actualizar la entrada en el códice.");
        } else if (data) {
          setEntries(entries.map((e) => (e.id === data.id ? data : e)));
          setIsFormOpen(false);
          setEditingEntry(null);
          setBannerMessage(`Sellado. «${data.name}» ha sido actualizado con éxito.`);
        }
      } else {
        // INSERT
        const { data, error: insertErr } = await supabase
          .from("entries")
          .insert({
            world_id: worldId,
            type: entryType,
            name: formName.trim(),
            summary: formSummary.trim() || null,
            details: formDetails.trim() || null,
            tags: formTags,
            date_in_world: config.hasDateField ? formDateInWorld.trim() || null : null,
          })
          .select()
          .single();

        if (insertErr) {
          setError("No se pudo sellar la nueva entrada en el códice.");
        } else if (data) {
          trackEvent("entry_created", {
            world_id: worldId,
            type: entryType,
            name: data.name,
          });
          setEntries([data, ...entries]);
          setIsFormOpen(false);
          setBannerMessage(`Sellado. «${data.name}» ha sido escrito en el códice.`);
        }
      }
    } catch {
      setError("Error de conexión al sellar la entrada.");
    } finally {
      setSaving(false);
    }
  };

  // Manejo de eliminación
  const handleDeleteEntry = async () => {
    if (!deletingEntry) return;

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteErr } = await supabase
        .from("entries")
        .delete()
        .eq("id", deletingEntry.id);

      if (deleteErr) {
        setError("No se pudo eliminar la entrada.");
      } else {
        setEntries(entries.filter((e) => e.id !== deletingEntry.id));
        setBannerMessage(`La crónica de «${deletingEntry.name}» ha sido borrada.`);
        setDeletingEntry(null);
      }
    } catch {
      setError("Error al eliminar la entrada.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav worldId={world?.id} worldName={world?.name} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Cabecera de la sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-border pb-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-ink-panel border border-ink-border flex items-center justify-center text-gold shrink-0 mt-0.5">
              <SectionSigil type={entryType} size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono uppercase tracking-widest text-gold">
                  {config.disciplineLabel}
                </span>
                <span className="text-xs font-mono text-muted">•</span>
                <span className="text-xs font-mono text-muted">
                  {entries.length} {entries.length === 1 ? "registro" : "registros"}
                </span>
              </div>
              <h1 className="font-display text-3xl uppercase tracking-wider text-parchment">
                {config.title}
              </h1>
              <p className="text-muted text-sm font-body mt-0.5 max-w-2xl leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/mundos/${worldId}`}>
              <ButtonGhost size="sm">← Resumen</ButtonGhost>
            </Link>
            {!isFormOpen && (
              <ButtonGold size="sm" onClick={handleOpenCreate}>
                + Escribir {config.singularLabel}
              </ButtonGold>
            )}
          </div>
        </div>

        {/* Mensaje Informativo / Toast */}
        {bannerMessage && (
          <div className="p-3.5 rounded-lg bg-moss/20 border border-moss/50 text-parchment text-sm font-body flex items-center justify-between gap-2 animate-in fade-in-50">
            <div className="flex items-center gap-2">
              <span className="text-moss font-bold">✓</span>
              <span>{bannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs font-mono text-muted hover:text-parchment cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div className="p-4 rounded-xl bg-burgundy/20 border border-burgundy/50 text-parchment flex items-center justify-between gap-2 animate-in fade-in-50">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-burgundy font-bold text-lg">⚠</span>
              <span>{error}</span>
            </div>
            <ButtonGhost size="sm" onClick={() => setError(null)}>
              Cerrar
            </ButtonGhost>
          </div>
        )}

        {/* Panel Expandible de Creación / Edición (sin tag <form>) */}
        {isFormOpen && (
          <Card className="border-gold/40 bg-ink-panel shadow-2xl space-y-5 animate-in fade-in-50 duration-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SectionSigil type={entryType} size={18} className="text-gold" />
                  <CardTitle className="text-lg">
                    {editingEntry
                      ? `Editar ${config.singularLabel}`
                      : `Sellar nuevo ${config.singularLabel}`}
                  </CardTitle>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-muted hover:text-parchment text-lg cursor-pointer"
                  title="Cerrar panel"
                >
                  ✕
                </button>
              </div>
              <CardDescription>
                Completa los campos para sellar esta crónica en el códice de «{world?.name}».
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Campo Nombre */}
              <div className="space-y-1.5">
                <label
                  htmlFor="entryName"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Nombre / Título <span className="text-gold">*</span>
                </label>
                <input
                  id="entryName"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={config.namePlaceholder}
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors"
                />
              </div>

              {/* Campo Fecha en el mundo (solo para eventos) */}
              {config.hasDateField && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="entryDate"
                    className="block text-xs font-mono uppercase tracking-wider text-muted"
                  >
                    Fecha o Era en el Mundo
                  </label>
                  <input
                    id="entryDate"
                    type="text"
                    value={formDateInWorld}
                    onChange={(e) => setFormDateInWorld(e.target.value)}
                    placeholder={config.datePlaceholder || "Ej. Año 120 de la Era Dorada..."}
                    className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Campo Resumen Corto */}
              <div className="space-y-1.5">
                <label
                  htmlFor="entrySummary"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Resumen Corto
                </label>
                <textarea
                  id="entrySummary"
                  rows={2}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder={config.summaryPlaceholder}
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none resize-none transition-colors"
                />
              </div>

              {/* Campo Detalles Largos */}
              <div className="space-y-1.5">
                <label
                  htmlFor="entryDetails"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Detalles &amp; Lore Completo
                </label>
                <textarea
                  id="entryDetails"
                  rows={6}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder={config.detailsPlaceholder}
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none resize-y transition-colors font-body"
                />
              </div>

              {/* Campo Tags Interactivos */}
              <div className="space-y-2 pt-1">
                <label
                  htmlFor="entryTags"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Etiquetas / Categorías
                </label>

                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {formTags.map((tag) => (
                      <TagPill
                        key={tag}
                        variant="gold"
                        onRemove={() => handleRemoveTag(tag)}
                      >
                        {tag}
                      </TagPill>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    id="entryTags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Escribe una etiqueta y presiona Enter o coma..."
                    className="flex-1 bg-ink border border-ink-border rounded-lg px-3.5 py-2 text-xs font-mono text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                  />
                  <ButtonGhost
                    size="sm"
                    onClick={handleAddTag}
                    disabled={!tagInput.trim()}
                  >
                    + Añadir
                  </ButtonGhost>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-border">
                <ButtonGhost
                  onClick={() => setIsFormOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </ButtonGhost>
                <ButtonGold
                  onClick={handleSaveEntry}
                  disabled={!formName.trim() || saving}
                  loading={saving}
                >
                  {editingEntry ? "Sellar cambios" : "Sellar entrada"}
                </ButtonGold>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Barra de Filtros y Búsqueda */}
        {entries.length > 0 && !isFormOpen && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Buscador de texto */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Buscar en ${config.title.toLowerCase()} (nombre, resumen o tags)...`}
                  className="w-full bg-ink-panel border border-ink-border rounded-lg pl-9 pr-8 py-2 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-muted text-xs">
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-muted hover:text-parchment cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Contador de resultados */}
              <span className="text-xs font-mono text-muted self-end sm:self-center shrink-0">
                Mostrando {filteredEntries.length} de {entries.length}
              </span>
            </div>

            {/* Chips de Tags Rápidos */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs font-mono text-muted">
                <span className="shrink-0 text-muted/70">Filtro por tag:</span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors ${
                    selectedTag === null
                      ? "bg-gold/20 text-gold border-gold/40 font-medium"
                      : "bg-ink-panel border-ink-border text-muted hover:text-parchment"
                  }`}
                >
                  Todos
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2.5 py-0.5 rounded-full border cursor-pointer transition-colors ${
                      selectedTag === tag
                        ? "bg-gold/20 text-gold border-gold/40 font-medium"
                        : "bg-ink-panel border-ink-border text-muted hover:text-parchment"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estado de Carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <SealIcon size={40} spinning />
            <p className="font-body text-muted text-base">
              Consultando las crónicas de {config.title.toLowerCase()}...
            </p>
          </div>
        )}

        {/* Estado Vacío de la Sección (Sin ninguna entrada) */}
        {!loading && !error && entries.length === 0 && !isFormOpen && (
          <div className="text-center py-20 px-4 max-w-lg mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-ink-panel border border-ink-border flex items-center justify-center mx-auto text-gold">
              <SectionSigil type={entryType} size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl uppercase tracking-wider text-parchment">
                Esta página todavía está en blanco
              </h2>
              <p className="text-muted text-sm font-body leading-relaxed">
                {config.emptyStateQuestion} Comienza a forjar y registrar el lore de este mundo.
              </p>
            </div>
            <ButtonGold onClick={handleOpenCreate}>
              {config.createButtonLabel}
            </ButtonGold>
          </div>
        )}

        {/* Estado Vacío de Búsqueda (Sin coincidencias) */}
        {!loading && !error && entries.length > 0 && filteredEntries.length === 0 && (
          <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
            <p className="font-display text-base uppercase tracking-wider text-muted">
              No se encontraron registros
            </p>
            <p className="text-xs font-body text-muted/80">
              Ninguna entrada coincide con «{searchQuery || selectedTag}». Prueba con otro término.
            </p>
            <ButtonGhost
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedTag(null);
              }}
            >
              Limpiar búsqueda y filtros
            </ButtonGhost>
          </div>
        )}

        {/* Lista de Entradas en Cuadrícula / Acordeón */}
        {!loading && !error && filteredEntries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredEntries.map((entry) => {
              const isExpanded = expandedEntryId === entry.id;

              return (
                <Card
                  key={entry.id}
                  hoverable={!isExpanded}
                  className={`flex flex-col justify-between transition-all ${
                    isExpanded
                      ? "md:col-span-2 border-gold/50 bg-ink-panel shadow-xl"
                      : "bg-ink-panel/90 border-ink-border"
                  }`}
                >
                  <CardHeader>
                    {/* Metadatos superiores: fecha, tags, acciones */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.date_in_world && (
                          <span className="font-mono text-xs text-gold bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
                            {entry.date_in_world}
                          </span>
                        )}
                        <span className="font-mono text-xs text-muted">
                          {new Date(entry.updated_at).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(entry, e)}
                          title="Editar entrada"
                          className="p-1 rounded text-muted hover:text-gold hover:bg-ink transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-gold"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingEntry(entry);
                          }}
                          title="Eliminar entrada"
                          className="p-1 rounded text-muted hover:text-burgundy hover:bg-ink transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-burgundy"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Título de la entrada */}
                    <CardTitle className="text-lg text-parchment">
                      {entry.name}
                    </CardTitle>

                    {/* Resumen corto */}
                    {entry.summary && (
                      <CardDescription className="text-muted leading-relaxed mt-1 text-sm">
                        {entry.summary}
                      </CardDescription>
                    )}
                  </CardHeader>

                  {/* Contenido expandido / lectura inmersiva & vínculos */}
                  {isExpanded && (
                    <CardContent className="pt-3 border-t border-ink-border/80 space-y-4">
                      {entry.details && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono uppercase tracking-wider text-gold">
                            Detalles &amp; Crónica
                          </h4>
                          <div className="font-body text-parchment text-base leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-gold/30">
                            {entry.details}
                          </div>
                        </div>
                      )}

                      {/* Subpanel de Vínculos & Relaciones */}
                      <EntryRelations worldId={worldId} entryId={entry.id} />
                    </CardContent>
                  )}

                  {/* Pie de tarjeta con Tags y botón de expandir */}
                  <CardFooter className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-ink-border text-xs font-mono">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.tags && entry.tags.length > 0 ? (
                        entry.tags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(selectedTag === t ? null : t);
                            }}
                            className={`px-2 py-0.2 rounded-full text-xs font-mono border cursor-pointer transition-colors ${
                              selectedTag === t
                                ? "bg-gold/20 text-gold border-gold/40"
                                : "bg-ink border-ink-border text-muted hover:text-parchment"
                            }`}
                          >
                            #{t}
                          </button>
                        ))
                      ) : (
                        <span className="text-muted/60">Sin etiquetas</span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEntryId(isExpanded ? null : entry.id)
                      }
                      className="text-gold hover:underline cursor-pointer flex items-center gap-1 self-end sm:self-center shrink-0 focus-visible:ring-1 focus-visible:ring-gold rounded p-1"
                    >
                      <span>
                        {isExpanded ? "Ocultar ficha" : "Ver ficha completa & vínculos"}
                      </span>
                      <span>{isExpanded ? "▲" : "▼"}</span>
                    </button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {deletingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/85 backdrop-blur-sm animate-in fade-in-50">
            <Card className="w-full max-w-md border-burgundy/60 bg-ink-panel shadow-2xl space-y-4">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-burgundy font-bold text-xl">⚠</span>
                  <CardTitle className="text-lg text-burgundy">
                    Eliminar {config.singularLabel}
                  </CardTitle>
                </div>
                <CardDescription className="text-parchment">
                  ¿Estás seguro de que deseas borrar el registro de «{deletingEntry.name}» del códice? Esta acción no se puede deshacer.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex items-center justify-end gap-3 pt-2">
                <ButtonGhost
                  onClick={() => setDeletingEntry(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </ButtonGhost>
                <button
                  type="button"
                  onClick={handleDeleteEntry}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-body font-medium rounded-lg bg-burgundy text-parchment hover:bg-burgundy-hover disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:outline-none cursor-pointer"
                >
                  {isDeleting ? "Borrando..." : "Eliminar entrada"}
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
