"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { SealIcon } from "@/components/ui/SealIcon";
import { SectionSigil, SigilType } from "@/components/ui/SectionSigil";
import { TagPill } from "@/components/ui/TagPill";
import { createClient } from "@/lib/supabase/client";
import type { Database, EntryType } from "@/types/database";

type World = Database["public"]["Tables"]["worlds"]["Row"];
type EntryItem = Pick<
  Database["public"]["Tables"]["entries"]["Row"],
  "id" | "name" | "type" | "summary" | "updated_at"
>;

interface SectionCardInfo {
  type: EntryType;
  title: string;
  subtitle: string;
  href: string;
}

export default function WorldDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const worldId = params?.worldId as string;

  const [world, setWorld] = useState<World | null>(null);
  const [counts, setCounts] = useState<Record<EntryType, number>>({
    personaje: 0,
    faccion: 0,
    lugar: 0,
    magia: 0,
    evento: 0,
    termino: 0,
  });
  const [recentEntries, setRecentEntries] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados de edición inline
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingWorld, setSavingWorld] = useState(false);

  // Estados de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorldDashboard = useCallback(async () => {
    if (!worldId) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Obtener datos del mundo
      const { data: worldData, error: worldError } = await supabase
        .from("worlds")
        .select("*")
        .eq("id", worldId)
        .maybeSingle();

      if (worldError || !worldData) {
        setError(
          "No se encontró este mundo en tu códice o no cuentas con los permisos para consultarlo."
        );
        setLoading(false);
        return;
      }

      setWorld(worldData);
      setEditName(worldData.name);
      setEditDesc(worldData.description || "");

      // 2. Obtener conteo de entradas por tipo
      const { data: entriesData } = await supabase
        .from("entries")
        .select("type")
        .eq("world_id", worldId);

      const typeCounts: Record<EntryType, number> = {
        personaje: 0,
        faccion: 0,
        lugar: 0,
        magia: 0,
        evento: 0,
        termino: 0,
      };

      entriesData?.forEach((e) => {
        if (e.type in typeCounts) {
          typeCounts[e.type as EntryType]++;
        }
      });

      setCounts(typeCounts);

      // 3. Obtener las 5 entradas más recientemente editadas
      const { data: recentData } = await supabase
        .from("entries")
        .select("id, name, type, summary, updated_at")
        .eq("world_id", worldId)
        .order("updated_at", { ascending: false })
        .limit(5);

      setRecentEntries(recentData || []);
    } catch {
      setError("Error de conexión al cargar el dashboard del mundo.");
    } finally {
      setLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    fetchWorldDashboard();
  }, [fetchWorldDashboard]);

  const handleSaveInlineEdit = async () => {
    if (!world || !editName.trim()) return;

    setSavingWorld(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("worlds")
        .update({
          name: editName.trim(),
          description: editDesc.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", world.id)
        .select()
        .single();

      if (updateError) {
        setError("No se pudieron guardar los cambios.");
      } else if (data) {
        setWorld(data);
        setIsEditing(false);
        setSuccessMessage("Sellado. La crónica de este universo ha sido actualizada.");
      }
    } catch {
      setError("Error de conexión al actualizar el mundo.");
    } finally {
      setSavingWorld(false);
    }
  };

  const handleDeleteWorld = async () => {
    if (!world) return;
    if (deleteConfirmationText !== world.name) {
      setError("El nombre ingresado no coincide.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("worlds")
        .delete()
        .eq("id", world.id);

      if (deleteError) {
        setError("No se pudo eliminar el mundo.");
      } else {
        router.push("/mundos");
        router.refresh();
      }
    } catch {
      setError("Error al eliminar el mundo.");
    } finally {
      setIsDeleting(false);
    }
  };

  const sections: SectionCardInfo[] = [
    {
      type: "personaje",
      title: "Personajes",
      subtitle: "Héroes, villanos, linajes y almas errantes",
      href: `/mundos/${worldId}/personajes`,
    },
    {
      type: "faccion",
      title: "Facciones",
      subtitle: "Órdenes sagradas, clanes, gremios y casas reales",
      href: `/mundos/${worldId}/facciones`,
    },
    {
      type: "lugar",
      title: "Lugares",
      subtitle: "Ciudadelas, bosques sombríos, santuarios y reinos",
      href: `/mundos/${worldId}/lugares`,
    },
    {
      type: "magia",
      title: "Magia",
      subtitle: "Leyes arcanas, rituales, reliquias y costos",
      href: `/mundos/${worldId}/magia`,
    },
    {
      type: "evento",
      title: "Cronología",
      subtitle: "Eras primigenias, batallas y profecías",
      href: `/mundos/${worldId}/cronologia`,
    },
    {
      type: "termino",
      title: "Glosario",
      subtitle: "Lenguas vernáculas, modismos arcanos y títulos",
      href: `/mundos/${worldId}/glosario`,
    },
  ];

  const totalEntries = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav worldId={world?.id} worldName={world?.name} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 space-y-10">
        {/* Estado de Carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <SealIcon size={48} spinning />
            <p className="font-body text-muted text-base">
              Buscando en los archivos del mundo...
            </p>
          </div>
        )}

        {/* Estado de Error / 404 */}
        {!loading && error && !world && (
          <div className="text-center py-20 px-4 max-w-md mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-burgundy/20 border border-burgundy/40 flex items-center justify-center mx-auto text-burgundy">
              <span className="text-2xl font-bold">⚠</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl uppercase tracking-wider text-parchment">
                Mundo no encontrado
              </h2>
              <p className="text-muted text-sm font-body">{error}</p>
            </div>
            <Link href="/mundos">
              <ButtonGold>← Volver a la Biblioteca de Mundos</ButtonGold>
            </Link>
          </div>
        )}

        {/* Contenido Principal del Dashboard */}
        {!loading && world && (
          <>
            {/* Mensajes de feedback */}
            {successMessage && (
              <div className="p-3.5 rounded-lg bg-moss/20 border border-moss/50 text-parchment text-sm font-body flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
              <div className="p-3.5 rounded-lg bg-burgundy/20 border border-burgundy/50 text-parchment text-sm font-body flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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

            {/* Cabecera del Mundo con Edición Inline */}
            <div className="border-b border-ink-border pb-8">
              {!isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <SealIcon size={20} className="text-gold" />
                        <span className="text-xs font-mono uppercase tracking-widest text-gold">
                          Grimorio Activo
                        </span>
                      </div>
                      <h1 className="font-display text-3xl sm:text-4xl uppercase tracking-wider text-parchment">
                        {world.name}
                      </h1>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ButtonGhost
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        icon={
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        }
                      >
                        Editar crónica
                      </ButtonGhost>
                      <ButtonGhost
                        size="sm"
                        onClick={() => {
                          setShowDeleteModal(true);
                          setDeleteConfirmationText("");
                        }}
                        className="hover:border-burgundy/60 hover:text-burgundy"
                        title="Eliminar mundo"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </ButtonGhost>
                    </div>
                  </div>

                  <p className="text-muted text-base font-body max-w-3xl leading-relaxed">
                    {world.description || "Este universo aún no tiene una premisa escrita."}
                  </p>

                  <div className="flex items-center gap-4 pt-2 text-xs font-mono text-muted">
                    <span>
                      Total de entradas selladas:{" "}
                      <strong className="text-gold font-bold">{totalEntries}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Última modificación:{" "}
                      {new Date(world.updated_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                /* Formulario de edición inline (sin <form>) */
                <Card className="border-gold/40 bg-ink-panel space-y-4 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Editar Crónica del Mundo</CardTitle>
                    <CardDescription>
                      Modifica el nombre y la premisa fundamental de este universo.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="inlineWorldName"
                        className="block text-xs font-mono uppercase tracking-wider text-muted"
                      >
                        Nombre del Mundo
                      </label>
                      <input
                        id="inlineWorldName"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="inlineWorldDesc"
                        className="block text-xs font-mono uppercase tracking-wider text-muted"
                      >
                        Premisa / Descripción
                      </label>
                      <textarea
                        id="inlineWorldDesc"
                        rows={3}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <ButtonGhost
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(world.name);
                          setEditDesc(world.description || "");
                        }}
                        disabled={savingWorld}
                      >
                        Cancelar
                      </ButtonGhost>
                      <ButtonGold
                        onClick={handleSaveInlineEdit}
                        disabled={!editName.trim() || savingWorld}
                        loading={savingWorld}
                      >
                        Sellar cambios
                      </ButtonGold>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Disciplinas del Códice (Seis Categorías Fundamentales) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display uppercase tracking-widest text-lg text-parchment">
                  Índice de Disciplinas
                </h2>
                <span className="font-mono text-xs text-muted">
                  6 Ramas del Conocimiento
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sections.map((section) => (
                  <Link
                    key={section.type}
                    href={section.href}
                    className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl"
                  >
                    <Card
                      hoverable
                      className="h-full flex flex-col justify-between p-5 group-hover:border-gold/60 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-9 h-9 rounded-lg bg-ink border border-ink-border flex items-center justify-center text-gold group-hover:border-gold/50 transition-colors">
                            <SectionSigil type={section.type} size={20} />
                          </div>
                          <span className="font-display text-2xl font-bold text-parchment group-hover:text-gold transition-colors">
                            {counts[section.type]}
                          </span>
                        </div>

                        <CardTitle className="text-base group-hover:text-gold transition-colors">
                          {section.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-muted mt-1 leading-normal">
                          {section.subtitle}
                        </CardDescription>
                      </div>

                      <div className="mt-4 pt-3 border-t border-ink-border flex items-center justify-between text-xs font-mono text-muted">
                        <span>Consultar sección</span>
                        <span className="text-gold group-hover:translate-x-1 transition-transform">
                          →
                        </span>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>

            {/* Accesos Especiales: El Oráculo y el Estante de Investigación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Link
                href={`/mundos/${worldId}/oraculo`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl"
              >
                <Card
                  hoverable
                  className="h-full border-gold/30 bg-ink-panel relative overflow-hidden group-hover:border-gold/70"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gold" />
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-ink border border-gold/40 flex items-center justify-center text-gold shrink-0 mt-0.5">
                      <SectionSigil type="oraculo" size={22} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs tracking-wider uppercase text-gold">
                          Inteligencia Arcanista
                        </span>
                        <span className="font-mono text-xs text-muted group-hover:text-gold group-hover:translate-x-1 transition-all">
                          Consultar →
                        </span>
                      </div>
                      <CardTitle className="text-lg">El Oráculo</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        Pregunta sobre leyes de tu mundo, inconsistencias en tu lore o genera ideas conectadas a tus entradas.
                      </CardDescription>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link
                href={`/mundos/${worldId}/investigacion`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl"
              >
                <Card
                  hoverable
                  className="h-full border-ink-border bg-ink-panel relative overflow-hidden group-hover:border-gold/40"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-muted" />
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-ink border border-ink-border flex items-center justify-center text-muted group-hover:text-parchment shrink-0 mt-0.5">
                      <SectionSigil type="investigacion" size={22} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs tracking-wider uppercase text-muted">
                          Biblioteca Real
                        </span>
                        <span className="font-mono text-xs text-muted group-hover:text-parchment group-hover:translate-x-1 transition-all">
                          Explorar →
                        </span>
                      </div>
                      <CardTitle className="text-lg">Estante de Investigación</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        Busca y guarda referencias históricas y bibliográficas de Google Books vinculadas a tu mundo.
                      </CardDescription>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>

            {/* Crónicas Recientes (Últimas 5 entradas) */}
            <div className="space-y-4 pt-4 border-t border-ink-border">
              <div className="flex items-center justify-between">
                <h2 className="font-display uppercase tracking-widest text-lg text-parchment">
                  Crónicas Recientes
                </h2>
                <span className="font-mono text-xs text-muted">
                  Últimos 5 Sellos Registrados
                </span>
              </div>

              {recentEntries.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-ink-border bg-ink-panel/40 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-ink border border-ink-border flex items-center justify-center mx-auto text-muted">
                    <SealIcon size={24} />
                  </div>
                  <p className="font-display text-sm uppercase tracking-wider text-muted">
                    Aún no hay crónicas selladas en este mundo
                  </p>
                  <p className="text-xs font-body text-muted/80 max-w-sm mx-auto">
                    Elige una disciplina arriba (Personajes, Facciones, Lugares...) para escribir el primer registro de este universo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentEntries.map((entry) => {
                    const sectionPath =
                      entry.type === "evento"
                        ? "cronologia"
                        : entry.type === "termino"
                        ? "glosario"
                        : `${entry.type}s`;

                    return (
                      <Link
                        key={entry.id}
                        href={`/mundos/${worldId}/${sectionPath}`}
                        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-lg"
                      >
                        <div className="p-3.5 rounded-lg border border-ink-border bg-ink-panel hover:border-gold/40 hover:bg-ink-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded bg-ink border border-ink-border flex items-center justify-center text-gold shrink-0">
                              <SectionSigil type={entry.type as SigilType} size={16} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-body font-medium text-parchment text-sm truncate group-hover:text-gold transition-colors">
                                  {entry.name}
                                </span>
                                <TagPill variant="default">
                                  {entry.type}
                                </TagPill>
                              </div>
                              {entry.summary && (
                                <p className="text-xs font-body text-muted truncate mt-0.5 max-w-xl">
                                  {entry.summary}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <span className="font-mono text-xs text-muted">
                              {new Date(entry.updated_at).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                            <span className="text-xs text-gold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                              →
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal de Eliminación Segura */}
            {showDeleteModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/85 backdrop-blur-md animate-in fade-in-50">
                <Card className="w-full max-w-lg border-burgundy/60 bg-ink-panel shadow-2xl space-y-4">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-burgundy font-bold text-xl">⚠</span>
                      <CardTitle className="text-lg text-burgundy">
                        Destrucción Definitiva del Mundo
                      </CardTitle>
                    </div>
                    <CardDescription className="text-parchment/90">
                      Esta acción es irreversible y eliminará en cascada todas las entradas (personajes, facciones, magia, cronología), relaciones y conversaciones del Oráculo de este universo.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="p-3 bg-burgundy/15 rounded-lg border border-burgundy/30 text-xs font-body text-muted leading-relaxed">
                      Para confirmar la eliminación, escribe el nombre exacto del mundo a continuación:
                      <strong className="block mt-1 text-sm font-display text-parchment">
                        {world.name}
                      </strong>
                    </div>

                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={deleteConfirmationText}
                        onChange={(e) => setDeleteConfirmationText(e.target.value)}
                        placeholder="Escribe el nombre aquí..."
                        className="w-full bg-ink border border-burgundy/50 rounded-lg px-3.5 py-2.5 text-sm text-parchment focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3">
                      <ButtonGhost
                        onClick={() => setShowDeleteModal(false)}
                        disabled={isDeleting}
                      >
                        Conservar Mundo
                      </ButtonGhost>
                      <button
                        type="button"
                        onClick={handleDeleteWorld}
                        disabled={deleteConfirmationText !== world.name || isDeleting}
                        className="px-4 py-2 text-sm font-body font-medium rounded-lg bg-burgundy text-parchment hover:bg-burgundy-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:outline-none cursor-pointer"
                      >
                        {isDeleting ? "Destruyendo..." : "Eliminar Definitivamente"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
