"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { SealIcon } from "@/components/ui/SealIcon";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { TagPill } from "@/components/ui/TagPill";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        router.push("/login?next=/perfil");
        return;
      }

      setUser(authUser);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError) {
        setError("No se pudo cargar el perfil del escriba desde el archivo.");
      } else {
        setProfile(profileData);
        setDisplayName(
          profileData?.display_name ||
            authUser.user_metadata?.display_name ||
            authUser.email?.split("@")[0] ||
            ""
        );
      }
    } catch {
      setError("Error de conexión al consultar el códice de escribas.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      setError("El nombre de autor o seudónimo no puede quedar en blanco.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          display_name: displayName.trim(),
          plan: profile?.plan || "free",
        });

      if (updateError) {
        setError("No se pudieron sellar los cambios. Intenta de nuevo.");
      } else {
        // También actualiza metadatos de usuario en Auth para sincronía
        await supabase.auth.updateUser({
          data: { display_name: displayName.trim() },
        });

        setSuccessMessage("Sellado. Los cambios han sido resguardados.");
        setProfile((prev) =>
          prev
            ? { ...prev, display_name: displayName.trim() }
            : {
                id: user.id,
                display_name: displayName.trim(),
                plan: "free",
                created_at: new Date().toISOString(),
              }
        );
      }
    } catch {
      setError("Ocurrió un error inesperado al actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setResendingEmail(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/perfil`,
        },
      });

      if (resendError) {
        setError("No se pudo reenviar el pergamino de confirmación.");
      } else {
        setSuccessMessage(`Pergamino de confirmación reenviado a ${user.email}.`);
      }
    } catch {
      setError("Error de conexión al solicitar el reenvío.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isEmailVerified = Boolean(user?.email_confirmed_at);

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Encabezado */}
        <div className="border-b border-ink-border pb-6">
          <div className="flex items-center gap-2 mb-1">
            <SealIcon size={20} className="text-gold" />
            <span className="text-xs font-mono uppercase tracking-widest text-gold">
              Registro de Escriba
            </span>
          </div>
          <h1 className="font-display text-3xl uppercase tracking-wider text-parchment">
            Tu Perfil
          </h1>
          <p className="text-muted text-sm font-body mt-1">
            Identidad del autor, credenciales y rango en el códice.
          </p>
        </div>

        {/* Estado de Carga */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <SealIcon size={40} spinning />
            <p className="font-body text-muted text-base">
              Buscando en los archivos...
            </p>
          </div>
        )}

        {/* Estado de Error */}
        {!loading && error && (
          <div className="p-4 rounded-xl bg-burgundy/20 border border-burgundy/50 text-parchment flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-burgundy font-bold text-lg">⚠</span>
              <span>{error}</span>
            </div>
            <ButtonGhost size="sm" onClick={fetchProfile}>
              Reintentar
            </ButtonGhost>
          </div>
        )}

        {/* Estado con datos cargados */}
        {!loading && user && (
          <div className="space-y-6">
            {/* Mensaje de éxito */}
            {successMessage && (
              <div className="p-4 rounded-xl bg-moss/20 border border-moss/50 text-parchment text-sm font-body flex items-center gap-2">
                <span className="text-moss font-bold text-lg">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Tarjeta de Identidad */}
            <Card className="border-ink-border bg-ink-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Ficha del Escriba</CardTitle>
                  <TagPill variant="gold">
                    {profile?.plan === "pro" ? "Plan Magíster" : "Plan Escriba — Gratuito"}
                  </TagPill>
                </div>
                <CardDescription>
                  Datos visibles en la creación de tus mundos y entradas.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Nombre de autor */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="profileDisplayName"
                    className="block text-xs font-mono uppercase tracking-wider text-muted"
                  >
                    Nombre a Mostrar / Seudónimo
                  </label>
                  <input
                    id="profileDisplayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. Cronista Valerius"
                    className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none transition-colors"
                  />
                </div>

                {/* Correo y estado de verificación */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-ink-border">
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted">
                      Correo Electrónico
                    </span>
                    <p className="text-sm font-body text-parchment">{user.email}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted">
                      Estado de Verificación
                    </span>
                    <div className="flex items-center gap-2">
                      {isEmailVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-moss bg-moss/10 px-2 py-0.5 rounded-full border border-moss/30">
                          ✓ Correo verificado
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-burgundy bg-burgundy/10 px-2 py-0.5 rounded-full border border-burgundy/30">
                            ⚠ Pendiente de confirmación
                          </span>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendingEmail}
                            className="text-xs font-mono text-gold hover:underline cursor-pointer focus-visible:ring-1 focus-visible:ring-gold"
                          >
                            {resendingEmail ? "Enviando..." : "Reenviar"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fecha de registro */}
                <div className="space-y-1 pt-2 border-t border-ink-border">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted">
                    Miembro del Códice Desde
                  </span>
                  <p className="text-sm font-mono text-muted">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Fecha desconocida"}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between">
                <ButtonGhost size="sm" onClick={handleSignOut}>
                  Cerrar sesión
                </ButtonGhost>
                <ButtonGold
                  size="md"
                  onClick={handleSaveProfile}
                  disabled={saving || !displayName.trim()}
                  loading={saving}
                >
                  Sellar cambios
                </ButtonGold>
              </CardFooter>
            </Card>

            {/* Información del plan */}
            <Card className="border-ink-border bg-ink-panel/70">
              <CardHeader>
                <CardTitle className="text-base">Membresía &amp; Límites</CardTitle>
                <CardDescription>
                  Durante la fase beta, todos los escribas cuentan con acceso sin restricciones a la creación de mundos, biblioteca e investigación.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
