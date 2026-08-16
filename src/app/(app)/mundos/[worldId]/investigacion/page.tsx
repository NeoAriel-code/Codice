"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { TopNav } from "@/components/layout/TopNav";
import { SectionSigil } from "@/components/ui/SectionSigil";
import { SealIcon } from "@/components/ui/SealIcon";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { TagPill } from "@/components/ui/TagPill";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { Database } from "@/types/database";

type World = Database["public"]["Tables"]["worlds"]["Row"];
type ShelfItem = Database["public"]["Tables"]["research_shelf"]["Row"];

interface GoogleBookItem {
  id: string;
  title: string;
  authors: string;
  thumbnailUrl: string | null;
  year: string | null;
  description: string;
  infoLink: string | null;
}

export default function InvestigacionPage() {
  const params = useParams();
  const worldId = params?.worldId as string;

  const [world, setWorld] = useState<World | null>(null);
  const [shelfItems, setShelfItems] = useState<ShelfItem[]>([]);
  const [loadingShelf, setLoadingShelf] = useState(true);
  const [shelfError, setShelfError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Estados de Búsqueda en Google Books
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleBookItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Estado para guardar libro con nota opcional
  const [savingBookId, setSavingBookId] = useState<string | null>(null);
  const [activeNoteInputBookId, setActiveNoteInputBookId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Estado para edición de nota en la estantería
  const [editingNoteItemId, setEditingNoteItemId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);

  // Estado para eliminación de la estantería
  const [deletingItem, setDeletingItem] = useState<ShelfItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchShelfData = useCallback(async () => {
    if (!worldId) return;

    setLoadingShelf(true);
    setShelfError(null);

    try {
      const supabase = createClient();

      // 1. Obtener información del mundo
      const { data: worldData, error: worldErr } = await supabase
        .from("worlds")
        .select("*")
        .eq("id", worldId)
        .maybeSingle();

      if (worldErr || !worldData) {
        setShelfError("No se pudo cargar la información del mundo.");
        setLoadingShelf(false);
        return;
      }

      setWorld(worldData);

      // 2. Obtener estantería del mundo
      const { data: shelfData, error: shelfErr } = await supabase
        .from("research_shelf")
        .select("*")
        .eq("world_id", worldId)
        .order("created_at", { ascending: false });

      if (shelfErr) {
        setShelfError("No se pudo cargar la estantería del mundo.");
      } else {
        setShelfItems(shelfData || []);
      }
    } catch {
      setShelfError("Error de conexión al cargar la estantería de investigación.");
    } finally {
      setLoadingShelf(false);
    }
  }, [worldId]);

  useEffect(() => {
    fetchShelfData();
  }, [fetchShelfData]);

  // Set de IDs de Google Books ya guardados en el estante
  const savedGoogleBookIds = useMemo(() => {
    const set = new Set<string>();
    shelfItems.forEach((item) => {
      if (item.external_id) set.add(item.external_id);
    });
    return set;
  }, [shelfItems]);

  // Consulta a la API de Google Books
  const handleSearchBooks = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const endpoint = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        searchQuery.trim()
      )}&maxResults=12&printType=books`;

      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error("Error en la respuesta del servicio de Google Books.");
      }

      const data = await res.json();
      const items = data.items || [];

      interface GoogleApiVolumeItem {
        id: string;
        volumeInfo?: {
          title?: string;
          authors?: string[];
          imageLinks?: {
            thumbnail?: string;
            smallThumbnail?: string;
          };
          publishedDate?: string;
          description?: string;
          infoLink?: string;
          previewLink?: string;
        };
      }

      const formatted: GoogleBookItem[] = items.map((item: GoogleApiVolumeItem) => {
        const info = item.volumeInfo || {};
        const rawThumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
        const secureThumb = rawThumb ? rawThumb.replace(/^http:\/\//i, "https://") : null;

        return {
          id: item.id,
          title: info.title || "Sin título",
          authors: info.authors ? info.authors.join(", ") : "Autor desconocido",
          thumbnailUrl: secureThumb,
          year: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
          description: info.description || "",
          infoLink: info.infoLink || info.previewLink || null,
        };
      });

      setSearchResults(formatted);
    } catch {
      setSearchError("No se pudieron consultar los archivos de Google Books. Revisa tu conexión.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchBooks();
    }
  };

  // Guardar libro en la estantería de Supabase
  const handleSaveToShelf = async (book: GoogleBookItem, customNote?: string) => {
    setSavingBookId(book.id);
    setShelfError(null);
    setBannerMessage(null);

    try {
      const supabase = createClient();
      const payload: Database["public"]["Tables"]["research_shelf"]["Insert"] = {
        world_id: worldId,
        external_id: book.id,
        title: book.title,
        authors: book.authors || null,
        thumbnail_url: book.thumbnailUrl || null,
        year: book.year || null,
        note: customNote ? customNote.trim() : "",
      };

      const { data, error: insertErr } = await supabase
        .from("research_shelf")
        .insert(payload)
        .select()
        .single();

      if (insertErr) {
        setShelfError("No se pudo guardar la obra en el estante de este mundo.");
      } else if (data) {
        trackEvent("research_shelf_saved", {
          world_id: worldId,
          external_id: book.id,
          title: book.title,
        });
        setShelfItems([data, ...shelfItems]);
        setActiveNoteInputBookId(null);
        setNoteText("");
        setBannerMessage(`«${book.title}» ha sido colocado en tu estantería de investigación.`);
      }
    } catch {
      setShelfError("Error de conexión al guardar en la estantería.");
    } finally {
      setSavingBookId(null);
    }
  };

  // Actualizar nota de un libro ya guardado
  const handleUpdateNote = async (item: ShelfItem) => {
    setIsUpdatingNote(true);
    setShelfError(null);

    try {
      const supabase = createClient();
      const { data, error: updateErr } = await supabase
        .from("research_shelf")
        .update({
          note: editNoteContent.trim(),
        })
        .eq("id", item.id)
        .select()
        .single();

      if (updateErr) {
        setShelfError("No se pudo actualizar la nota de investigación.");
      } else if (data) {
        setShelfItems(shelfItems.map((s) => (s.id === data.id ? data : s)));
        setEditingNoteItemId(null);
        setBannerMessage("Sellado. La nota de investigación ha sido actualizada.");
      }
    } catch {
      setShelfError("Error de conexión al actualizar la nota.");
    } finally {
      setIsUpdatingNote(false);
    }
  };

  // Retirar libro de la estantería
  const handleDeleteShelfItem = async () => {
    if (!deletingItem) return;

    setIsDeleting(true);
    setShelfError(null);

    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("research_shelf")
        .delete()
        .eq("id", deletingItem.id);

      if (delErr) {
        setShelfError("No se pudo retirar la obra del estante.");
      } else {
        setShelfItems(shelfItems.filter((s) => s.id !== deletingItem.id));
        setBannerMessage(`«${deletingItem.title}» ha sido retirada del estante.`);
        setDeletingItem(null);
      }
    } catch {
      setShelfError("Error al retirar la obra del estante.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav worldId={world?.id} worldName={world?.name} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 space-y-12">
        {/* Cabecera de la sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-border pb-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-ink-panel border border-ink-border flex items-center justify-center text-gold shrink-0 mt-0.5">
              <SectionSigil type="investigacion" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono uppercase tracking-widest text-gold">
                  Biblioteca Real &amp; Referencias
                </span>
                <span className="text-xs font-mono text-muted">•</span>
                <span className="text-xs font-mono text-muted">
                  {shelfItems.length} {shelfItems.length === 1 ? "obra en estante" : "obras en estante"}
                </span>
              </div>
              <h1 className="font-display text-3xl uppercase tracking-wider text-parchment">
                Estante de Investigación
              </h1>
              <p className="text-muted text-sm font-body mt-0.5 max-w-2xl leading-relaxed">
                Consulta fuentes históricas, mitológicas y bibliográficas de Google Books para dar verosimilitud y riqueza al lore de {world?.name || "tu mundo"}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/mundos/${worldId}`}>
              <ButtonGhost size="sm">← Volver al resumen</ButtonGhost>
            </Link>
          </div>
        </div>

        {/* Mensajes Informativos / Feedback */}
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

        {shelfError && (
          <div className="p-4 rounded-xl bg-burgundy/20 border border-burgundy/50 text-parchment flex items-center justify-between gap-2 animate-in fade-in-50">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-burgundy font-bold text-lg">⚠</span>
              <span>{shelfError}</span>
            </div>
            <ButtonGhost size="sm" onClick={() => setShelfError(null)}>
              Cerrar
            </ButtonGhost>
          </div>
        )}

        {/* BLOQUE 1: Buscador de Google Books */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gold font-bold">✦</span>
              <h2 className="font-display uppercase tracking-widest text-lg text-parchment">
                Buscar Obras en Google Books
              </h2>
            </div>
            <span className="text-xs font-mono text-muted">
              Archivo Bibliográfico Universal
            </span>
          </div>

          {/* Barra de búsqueda (sin tag <form>) */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Ej. Castillo medieval, alquimia renacentista, mitología nórdica, heráldica..."
                className="w-full bg-ink-panel border border-ink-border rounded-lg pl-10 pr-4 py-3 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors"
              />
              <span className="absolute left-3.5 top-3.5 text-muted text-sm">
                🔍
              </span>
            </div>
            <ButtonGold
              size="md"
              onClick={handleSearchBooks}
              disabled={!searchQuery.trim() || isSearching}
              loading={isSearching}
              className="shrink-0"
            >
              Explorar archivos
            </ButtonGold>
          </div>

          {/* Error de búsqueda */}
          {searchError && (
            <p className="text-xs font-body text-burgundy bg-burgundy/10 p-3 rounded-lg border border-burgundy/30">
              {searchError}
            </p>
          )}

          {/* Estado de carga de búsqueda */}
          {isSearching && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <SealIcon size={32} spinning />
              <p className="font-body text-muted text-sm">
                Buscando en los registros de Google Books...
              </p>
            </div>
          )}

          {/* Resultados de Búsqueda */}
          {!isSearching && hasSearched && searchResults.length === 0 && !searchError && (
            <div className="p-8 rounded-xl border border-dashed border-ink-border bg-ink-panel/40 text-center space-y-2">
              <p className="font-display text-sm uppercase tracking-wider text-muted">
                No se hallaron volúmenes
              </p>
              <p className="text-xs font-body text-muted/80">
                Ninguna obra coincide con «{searchQuery}». Prueba con términos más generales o en inglés.
              </p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-muted">
                <span>Resultados hallados ({searchResults.length})</span>
                <span>Haz clic en «Guardar» para colocar en el estante de este mundo</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {searchResults.map((book) => {
                  const isAlreadySaved = savedGoogleBookIds.has(book.id);
                  const isNoteOpen = activeNoteInputBookId === book.id;
                  const isSavingThis = savingBookId === book.id;

                  return (
                    <Card
                      key={book.id}
                      hoverable
                      className="h-full flex flex-col justify-between bg-ink-panel/90 border-ink-border"
                    >
                      <CardHeader className="space-y-3">
                        <div className="flex gap-3.5 items-start">
                          {/* Portada del libro o fallback */}
                          <div className="w-16 h-22 rounded bg-ink border border-ink-border overflow-hidden shrink-0 relative flex items-center justify-center text-muted shadow-sm">
                            {book.thumbnailUrl ? (
                              <Image
                                src={book.thumbnailUrl}
                                alt={`Portada de ${book.title}`}
                                fill
                                sizes="64px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-1 text-center">
                                <SectionSigil type="investigacion" size={20} className="text-muted/60" />
                                <span className="text-[9px] font-mono text-muted/60 mt-1">Sin portada</span>
                              </div>
                            )}
                          </div>

                          {/* Metadatos del libro */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono text-gold">
                              <span className="truncate">{book.year || "Año s/d"}</span>
                              {book.infoLink && (
                                <a
                                  href={book.infoLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted hover:text-gold transition-colors flex items-center gap-0.5"
                                  title="Ver en Google Books"
                                >
                                  <span>↗</span>
                                </a>
                              )}
                            </div>
                            <CardTitle className="text-sm line-clamp-2 leading-snug">
                              {book.title}
                            </CardTitle>
                            <p className="text-xs font-mono text-muted truncate">
                              {book.authors}
                            </p>
                          </div>
                        </div>

                        {/* Descripción truncada */}
                        {book.description && (
                          <CardDescription className="text-xs line-clamp-3 leading-relaxed">
                            {book.description}
                          </CardDescription>
                        )}
                      </CardHeader>

                      {/* Pie de tarjeta con acciones de guardado */}
                      <CardFooter className="pt-3 border-t border-ink-border flex flex-col gap-2">
                        {isAlreadySaved ? (
                          <div className="w-full flex items-center justify-between text-xs font-mono">
                            <TagPill variant="moss">✓ En el estante</TagPill>
                            <span className="text-muted">Registrado</span>
                          </div>
                        ) : isNoteOpen ? (
                          /* Subpanel para nota personal */
                          <div className="w-full space-y-2 animate-in fade-in-50">
                            <label className="block text-[11px] font-mono uppercase tracking-wider text-muted">
                              Nota de investigación (opcional):
                            </label>
                            <textarea
                              rows={2}
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Ej. Referencia clave para los rituales lunares..."
                              className="w-full bg-ink border border-ink-border rounded p-2 text-xs text-parchment focus-visible:ring-1 focus-visible:ring-gold focus-visible:outline-none resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <ButtonGhost
                                size="sm"
                                onClick={() => {
                                  setActiveNoteInputBookId(null);
                                  setNoteText("");
                                }}
                                disabled={isSavingThis}
                              >
                                Cancelar
                              </ButtonGhost>
                              <ButtonGold
                                size="sm"
                                onClick={() => handleSaveToShelf(book, noteText)}
                                loading={isSavingThis}
                              >
                                Sellar en estante
                              </ButtonGold>
                            </div>
                          </div>
                        ) : (
                          /* Botones normales de guardado */
                          <div className="w-full flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveNoteInputBookId(book.id);
                                setNoteText("");
                              }}
                              className="text-xs font-mono text-muted hover:text-parchment cursor-pointer"
                            >
                              + Con nota
                            </button>
                            <ButtonGold
                              size="sm"
                              onClick={() => handleSaveToShelf(book)}
                              loading={isSavingThis}
                            >
                              + Guardar
                            </ButtonGold>
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* BLOQUE 2: Estantería Guardada del Mundo */}
        <section className="space-y-6 pt-6 border-t border-ink-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SectionSigil type="investigacion" size={20} className="text-gold" />
              <h2 className="font-display uppercase tracking-widest text-lg text-parchment">
                Estantería de «{world?.name || "este mundo"}»
              </h2>
            </div>
            <span className="text-xs font-mono text-muted">
              {shelfItems.length} {shelfItems.length === 1 ? "referencia guardada" : "referencias guardadas"}
            </span>
          </div>

          {/* Estado de carga de la estantería */}
          {loadingShelf && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <SealIcon size={32} spinning />
              <p className="font-body text-muted text-sm">
                Recuperando las obras de tu estantería...
              </p>
            </div>
          )}

          {/* Estado vacío de la estantería */}
          {!loadingShelf && shelfItems.length === 0 && (
            <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-full bg-ink-panel border border-ink-border flex items-center justify-center mx-auto text-muted">
                <SectionSigil type="investigacion" size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base uppercase tracking-wider text-parchment">
                  La estantería está vacía
                </h3>
                <p className="text-xs font-body text-muted leading-relaxed">
                  Utiliza el buscador superior para encontrar obras de historia, ciencia y mitología y agregarlas como bibliografía viva de este universo.
                </p>
              </div>
            </div>
          )}

          {/* Cuadrícula de Libros Guardados */}
          {!loadingShelf && shelfItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {shelfItems.map((item) => {
                const isEditingThisNote = editingNoteItemId === item.id;

                return (
                  <Card
                    key={item.id}
                    hoverable
                    className="flex flex-col justify-between bg-ink-panel border-ink-border/90"
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex gap-4 items-start">
                        {/* Portada */}
                        <div className="w-18 h-26 rounded bg-ink border border-ink-border overflow-hidden shrink-0 relative flex items-center justify-center text-muted shadow-md">
                          {item.thumbnail_url ? (
                            <Image
                              src={item.thumbnail_url}
                              alt={`Portada de ${item.title}`}
                              fill
                              sizes="72px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-1 text-center">
                              <SectionSigil type="investigacion" size={24} className="text-muted/60" />
                              <span className="text-[9px] font-mono text-muted/60 mt-1">Sin portada</span>
                            </div>
                          )}
                        </div>

                        {/* Información del libro guardado */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono text-gold">
                              {item.year || "Año s/d"}
                            </span>
                            <span className="text-[11px] font-mono text-muted">
                              {new Date(item.created_at).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>

                          <CardTitle className="text-base line-clamp-2 leading-snug">
                            {item.title}
                          </CardTitle>

                          <p className="text-xs font-mono text-muted truncate">
                            {item.authors || "Autor desconocido"}
                          </p>
                        </div>
                      </div>

                      {/* Nota personal del escriba */}
                      {!isEditingThisNote ? (
                        <div className="p-3 rounded-lg bg-ink/70 border border-ink-border space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-gold">
                            <span>Nota del Escriba</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteItemId(item.id);
                                setEditNoteContent(item.note || "");
                              }}
                              className="text-muted hover:text-gold cursor-pointer"
                            >
                              Editar nota ✎
                            </button>
                          </div>
                          <p className="text-xs font-body text-parchment italic leading-relaxed">
                            {item.note ? `«${item.note}»` : "Sin notas añadidas todavía."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 p-3 rounded-lg bg-ink border border-gold/40 animate-in fade-in-50">
                          <label className="block text-[11px] font-mono uppercase tracking-wider text-muted">
                            Editar nota de investigación:
                          </label>
                          <textarea
                            rows={2}
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full bg-ink-panel border border-ink-border rounded p-2 text-xs text-parchment focus-visible:ring-1 focus-visible:ring-gold focus-visible:outline-none resize-none"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <ButtonGhost
                              size="sm"
                              onClick={() => setEditingNoteItemId(null)}
                              disabled={isUpdatingNote}
                            >
                              Cancelar
                            </ButtonGhost>
                            <ButtonGold
                              size="sm"
                              onClick={() => handleUpdateNote(item)}
                              loading={isUpdatingNote}
                            >
                              Sellar nota
                            </ButtonGold>
                          </div>
                        </div>
                      )}
                    </CardHeader>

                    {/* Pie de tarjeta: botón para retirar de la estantería */}
                    <CardFooter className="pt-3 border-t border-ink-border flex items-center justify-between text-xs font-mono">
                      {item.external_id && (
                        <a
                          href={`https://books.google.com/books?id=${item.external_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-gold transition-colors flex items-center gap-1"
                        >
                          <span>Google Books</span>
                          <span>↗</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeletingItem(item)}
                        className="text-muted hover:text-burgundy transition-colors ml-auto cursor-pointer flex items-center gap-1 p-1 rounded focus-visible:ring-1 focus-visible:ring-burgundy"
                        title="Retirar de la estantería"
                      >
                        <span>✕ Quitar del estante</span>
                      </button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal de Confirmación para Retirar Obra */}
        {deletingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-in fade-in-50">
            <Card className="w-full max-w-md border-burgundy/60 bg-ink-panel shadow-2xl space-y-4">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-burgundy font-bold text-xl">⚠</span>
                  <CardTitle className="text-lg text-burgundy">
                    Retirar Obra de la Estantería
                  </CardTitle>
                </div>
                <CardDescription className="text-parchment">
                  ¿Deseas retirar «{deletingItem.title}» y sus notas asociadas de la estantería de este mundo?
                </CardDescription>
              </CardHeader>

              <CardContent className="flex items-center justify-end gap-3 pt-2">
                <ButtonGhost
                  onClick={() => setDeletingItem(null)}
                  disabled={isDeleting}
                >
                  Conservar en estante
                </ButtonGhost>
                <button
                  type="button"
                  onClick={handleDeleteShelfItem}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-body font-medium rounded-lg bg-burgundy text-parchment hover:bg-burgundy-hover disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:outline-none cursor-pointer"
                >
                  {isDeleting ? "Retirando..." : "Quitar referencia"}
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
