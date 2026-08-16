"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { SealIcon } from "@/components/ui/SealIcon";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

type World = Database["public"]["Tables"]["worlds"]["Row"];

export default function MundosPage() {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Estados para creación
  const [isCreating, setIsCreating] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldDesc, setNewWorldDesc] = useState("");
  const [savingWorld, setSavingWorld] = useState(false);

  // Estados para edición
  const [editingWorld, setEditingWorld] = useState<World | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [updatingWorld, setUpdatingWorld] = useState(false);

  // Estados para eliminación segura
  const [deletingWorld, setDeletingWorld] = useState<World | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWorlds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setUser(authUser);

      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("worlds")
        .select("*")
        .order("updated_at", { ascending: false });

      if (fetchError) {
        setError("No se pudieron cargar los mundos desde el archivo. Intenta de nuevo.");
      } else {
        setWorlds(data || []);
      }
    } catch {
      setError("Error de conexión al recuperar los registros del códice.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const isEmailVerified = Boolean(user?.email_confirmed_at);

  const handleResendConfirmation = async () => {
    if (!user?.email) return;

    setResendingEmail(true);
    setBannerMessage(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/mundos`,
        },
      });

      if (resendError) {
        setError("No se pudo reenviar el correo de confirmación. Intenta de nuevo más tarde.");
      } else {
        setBannerMessage(`Enlace de confirmación reenviado a ${user.email}. Revisa tu bandeja de entrada.`);
      }
    } catch {
      setError("Error al solicitar el reenvío de confirmación.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) return;

    if (!isEmailVerified) {
      setError("Debes confirmar tu correo electrónico antes de poder sellar un mundo.");
      return;
    }

    setSavingWorld(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setError("Debes iniciar sesión para sellar un nuevo mundo.");
        setSavingWorld(false);
        return;
      }

      const payload: Database["public"]["Tables"]["worlds"]["Insert"] = {
        name: newWorldName.trim(),
        description: newWorldDesc.trim() || null,
        owner_id: authUser.id,
      };

      const { data, error: insertError } = await supabase
        .from("worlds")
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        setError("No se pudo sellar el mundo. Revisa tu conexión o permisos.");
      } else if (data) {
        trackEvent("world_created", { world_id: data.id, name: data.name });
        setWorlds([data, ...worlds]);
        setNewWorldName("");
        setNewWorldDesc("");
        setIsCreating(false);
        setBannerMessage(`El mundo «${data.name}» ha sido sellado con éxito.`);
      }
    } catch {
      setError("Ocurrió un error inesperado al forjar el mundo.");
    } finally {
      setSavingWorld(false);
    }
  };

  const handleOpenEdit = (world: World, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingWorld(world);
    setEditName(world.name);
    setEditDesc(world.description || "");
  };

  const handleUpdateWorld = async () => {
    if (!editingWorld || !editName.trim()) return;

    setUpdatingWorld(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("worlds")
        .update({
          name: editName.trim(),
          description: editDesc.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingWorld.id)
        .select()
        .single();

      if (updateError) {
        setError("No se pudieron guardar los cambios en el mundo.");
      } else if (data) {
        setWorlds(worlds.map((w) => (w.id === data.id ? data : w)));
        setEditingWorld(null);
        setBannerMessage("Sellado. Los cambios del mundo han sido registrados.");
      }
    } catch {
      setError("Error al actualizar la ficha del mundo.");
    } finally {
      setUpdatingWorld(false);
    }
  };

  const handleOpenDelete = (world: World, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingWorld(world);
    setDeleteConfirmationText("");
  };

  const handleDeleteWorld = async () => {
    if (!deletingWorld) return;
    if (deleteConfirmationText !== deletingWorld.name) {
      setError("El nombre escrito no coincide con el mundo a eliminar.");
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("worlds")
        .delete()
        .eq("id", deletingWorld.id);

      if (deleteError) {
        setError("No se pudo eliminar el mundo. Intenta de nuevo.");
      } else {
        setWorlds(worlds.filter((w) => w.id !== deletingWorld.id));
        setBannerMessage(`El mundo «${deletingWorld.name}» y todas sus entradas han sido eliminados.`);
        setDeletingWorld(null);
      }
    } catch {
      setError("Error de conexión al eliminar el mundo.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Banner de Correo No Verificado */}
        {!loading && user && !isEmailVerified && (
          <div className="p-4 rounded-xl bg-burgundy/15 border border-burgundy/40 text-parchment flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in-50 duration-200">
            <div className="flex items-start gap-3">
              <span className="text-gold font-bold text-lg mt-0.5">✦</span>
              <div className="space-y-0.5">
                <p className="text-sm font-body font-medium text-parchment">
                  Verificación de correo pendiente
                </p>
                <p className="text-xs font-body text-muted leading-relaxed">
                  Para forjar y sellar nuevos mundos en el códice, confirma el enlace que enviamos a{" "}
                  <strong className="text-parchment">{user.email}</strong>.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <ButtonGhost
                size="sm"
                onClick={handleResendConfirmation}
                loading={resendingEmail}
              >
                Reenviar correo
              </ButtonGhost>
            </div>
          </div>
        )}

        {/* Mensaje Informativo */}
        {bannerMessage && (
          <div className="p-3.5 rounded-lg bg-moss/20 border border-moss/50 text-parchment text-sm font-body flex items-center justify-between gap-2">
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

        {/* Cabecera de la sección */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SealIcon size={20} className="text-gold" />
              <span className="text-xs font-mono uppercase tracking-widest text-gold">
                Biblioteca Principal
              </span>
            </div>
            <h1 className="font-display text-3xl uppercase tracking-wider text-parchment">
              Tus Mundos
            </h1>
            <p className="text-muted text-sm font-body mt-1">
              Universos forjados y resguardados en tu códice personal.
            </p>
          </div>

          {!isCreating && (
            <div className="flex flex-col items-end gap-1">
              <ButtonGold
                onClick={() => {
                  if (!isEmailVerified) {
                    setError("Debes confirmar tu correo electrónico antes de poder escribir un nuevo mundo.");
                    return;
                  }
                  setIsCreating(true);
                }}
                disabled={!isEmailVerified}
                size="md"
              >
                + Escribir nuevo mundo
              </ButtonGold>
              {!isEmailVerified && !loading && (
                <span className="text-xs font-mono text-muted">
                  Requiere correo verificado
                </span>
              )}
            </div>
          )}
        </div>

        {/* Panel para forjar nuevo mundo (sin <form>) */}
        {isCreating && (
          <Card className="border-gold/40 bg-ink-panel space-y-4 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Forjar un Nuevo Mundo</CardTitle>
              <CardDescription>
                Bautiza este universo y escribe las primeras líneas de su premisa.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="worldName"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Nombre del Mundo
                </label>
                <input
                  id="worldName"
                  type="text"
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  placeholder="Ej. El Continente de Eldoria, Las Tierras Sombrías..."
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="worldDesc"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Descripción o Premisa General
                </label>
                <textarea
                  id="worldDesc"
                  rows={3}
                  value={newWorldDesc}
                  onChange={(e) => setNewWorldDesc(e.target.value)}
                  placeholder="Un reino fragmentado por la caída de los tres soles..."
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <ButtonGhost
                  onClick={() => {
                    setIsCreating(false);
                    setNewWorldName("");
                    setNewWorldDesc("");
                  }}
                  disabled={savingWorld}
                >
                  Cancelar
                </ButtonGhost>
                <ButtonGold
                  onClick={handleCreateWorld}
                  disabled={!newWorldName.trim() || savingWorld}
                  loading={savingWorld}
                >
                  Sellar Mundo
                </ButtonGold>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de edición de mundo */}
        {editingWorld && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/80 backdrop-blur-sm animate-in fade-in-50">
            <Card className="w-full max-w-lg border-gold/40 bg-ink-panel shadow-2xl space-y-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Editar Mundo</CardTitle>
                  <button
                    type="button"
                    onClick={() => setEditingWorld(null)}
                    className="text-muted hover:text-parchment text-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <CardDescription>
                  Actualiza el nombre y la premisa general de «{editingWorld.name}».
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="editWorldName"
                    className="block text-xs font-mono uppercase tracking-wider text-muted"
                  >
                    Nombre del Mundo
                  </label>
                  <input
                    id="editWorldName"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="editWorldDesc"
                    className="block text-xs font-mono uppercase tracking-wider text-muted"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="editWorldDesc"
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <ButtonGhost
                    onClick={() => setEditingWorld(null)}
                    disabled={updatingWorld}
                  >
                    Cancelar
                  </ButtonGhost>
                  <ButtonGold
                    onClick={handleUpdateWorld}
                    disabled={!editName.trim() || updatingWorld}
                    loading={updatingWorld}
                  >
                    Sellar cambios
                  </ButtonGold>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de eliminación segura */}
        {deletingWorld && (
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
                    {deletingWorld.name}
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
                    onClick={() => setDeletingWorld(null)}
                    disabled={isDeleting}
                  >
                    Conservar Mundo
                  </ButtonGhost>
                  <button
                    type="button"
                    onClick={handleDeleteWorld}
                    disabled={deleteConfirmationText !== deletingWorld.name || isDeleting}
                    className="px-4 py-2 text-sm font-body font-medium rounded-lg bg-burgundy text-parchment hover:bg-burgundy-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:outline-none cursor-pointer"
                  >
                    {isDeleting ? "Destruyendo..." : "Eliminar Definitivamente"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estado de Error */}
        {error && (
          <div className="p-4 rounded-xl bg-burgundy/20 border border-burgundy/50 text-parchment flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-burgundy font-bold text-lg">⚠</span>
              <span>{error}</span>
            </div>
            <ButtonGhost size="sm" onClick={() => setError(null)}>
              Cerrar
            </ButtonGhost>
          </div>
        )}

        {/* Estado de Carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <SealIcon size={40} spinning />
            <p className="font-body text-muted text-base">
              Buscando en los archivos...
            </p>
          </div>
        )}

        {/* Estado Vacío */}
        {!loading && !error && worlds.length === 0 && (
          <div className="text-center py-20 px-4 max-w-lg mx-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-ink-panel border border-ink-border flex items-center justify-center mx-auto text-gold">
              <SealIcon size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl uppercase tracking-wider text-parchment">
                Esta página todavía está en blanco
              </h2>
              <p className="text-muted text-sm font-body leading-relaxed">
                ¿Cuál será el primer mundo que se escriba aquí? Dale nombre y comienza a catalogar sus personajes, magia y leyendas.
              </p>
            </div>
            <ButtonGold
              onClick={() => {
                if (!isEmailVerified) {
                  setError("Debes confirmar tu correo electrónico antes de poder escribir un nuevo mundo.");
                  return;
                }
                setIsCreating(true);
              }}
              disabled={!isEmailVerified}
            >
              Escribir el primer mundo
            </ButtonGold>
            {!isEmailVerified && (
              <p className="text-xs font-mono text-muted">
                Requiere confirmación de correo
              </p>
            )}
          </div>
        )}

        {/* Lista de Mundos */}
        {!loading && worlds.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {worlds.map((world) => (
              <Card
                key={world.id}
                hoverable
                className="h-full flex flex-col justify-between group transition-all"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-muted">
                      {new Date(world.updated_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(world, e)}
                        title="Editar nombre y descripción"
                        className="p-1 rounded text-muted hover:text-gold hover:bg-ink transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-gold"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(world, e)}
                        title="Eliminar mundo definitivamente"
                        className="p-1 rounded text-muted hover:text-burgundy hover:bg-ink transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-burgundy"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <Link href={`/mundos/${world.id}`} className="block focus-visible:outline-none">
                    <CardTitle className="text-lg group-hover:text-gold transition-colors">
                      {world.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 mt-1.5 leading-relaxed">
                      {world.description || "Sin descripción anotada aún."}
                    </CardDescription>
                  </Link>
                </CardHeader>

                <CardFooter className="flex items-center justify-between text-xs font-mono text-muted">
                  <Link
                    href={`/mundos/${world.id}`}
                    className="hover:text-gold transition-colors flex items-center gap-1 focus-visible:ring-1 focus-visible:ring-gold rounded"
                  >
                    <span>Abrir grimorio</span>
                    <span className="text-gold group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
