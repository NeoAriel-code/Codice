"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SealIcon } from "@/components/ui/SealIcon";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/mundos";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const validate = () => {
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Por favor ingresa un correo electrónico válido.");
      return false;
    }
    if (password.length < 6) {
      setErrorMessage("La contraseña debe contener al menos 6 caracteres.");
      return false;
    }
    if (mode === "register" && !displayName.trim()) {
      setErrorMessage("Por favor ingresa tu nombre de autor o seudónimo.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setUnconfirmedEmail(null);

    if (!validate()) {
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (
            error.message.includes("Email not confirmed") ||
            error.message.includes("email_not_confirmed")
          ) {
            setUnconfirmedEmail(email.trim());
            setErrorMessage(
              "Tu correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada o solicita un nuevo enlace."
            );
          } else if (error.message.includes("Invalid login credentials")) {
            setErrorMessage("Correo o contraseña incorrectos. Verifica tus datos.");
          } else {
            setErrorMessage(error.message || "No se pudo iniciar sesión. Intenta de nuevo.");
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          router.push(next);
          router.refresh();
        }
      } else {
        // Validar código de invitación si la beta está restringida por variable de entorno
        const requiredInviteCode = process.env.NEXT_PUBLIC_BETA_INVITE_CODE;
        if (requiredInviteCode && requiredInviteCode.trim() !== "") {
          if (inviteCode.trim().toUpperCase() !== requiredInviteCode.trim().toUpperCase()) {
            setErrorMessage(
              "El código de invitación al grimorio no es válido o ha expirado. Si eres un autor invitado, verifica tu código."
            );
            setLoading(false);
            return;
          }
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            setErrorMessage("Ya existe una cuenta registrada con este correo electrónico.");
          } else {
            setErrorMessage(error.message || "No se pudo registrar la cuenta. Intenta de nuevo.");
          }
          setLoading(false);
          return;
        }

        // Registrar evento de activación
        trackEvent("user_signup", { method: "email" });

        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setSuccessMessage(
            `El sello ha sido creado. Hemos enviado un pergamino de confirmación a ${email.trim()}. Por favor verifica tu correo para activar el acceso completo.`
          );
          setLoading(false);
        }
      }
    } catch {
      setErrorMessage("Ocurrió un error inesperado al conectar con el archivo. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail && !email.trim()) return;

    setResendingEmail(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const targetEmail = unconfirmedEmail || email.trim();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (error) {
        setErrorMessage("No se pudo reenviar el correo. Intenta de nuevo en unos minutos.");
      } else {
        setSuccessMessage(`Enlace de confirmación reenviado a ${targetEmail}. Revisa tu bandeja de entrada.`);
      }
    } catch {
      setErrorMessage("Error de conexión al solicitar el reenvío.");
    } finally {
      setResendingEmail(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Cabecera del sello */}
      <div className="flex flex-col items-center text-center space-y-2">
        <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
          <SealIcon size={48} className="text-gold mb-2" />
        </Link>
        <h1 className="font-display text-2xl uppercase tracking-widest text-parchment">
          {mode === "login" ? "Acceso al Códice" : "Nuevo Escriba"}
        </h1>
        <p className="text-muted text-sm font-body max-w-xs">
          {mode === "login"
            ? "Abre tu libro y continúa forjando tus universos."
            : "Comienza a catalogar la historia, magia y leyendas de tu mundo."}
        </p>
      </div>

      {/* Tarjeta de autenticación (sin tag <form>) */}
      <Card className="border-ink-border bg-ink-panel shadow-2xl">
        <CardHeader className="space-y-4">
          {/* Selector de modo (Pills) */}
          <div className="grid grid-cols-2 p-1 bg-ink rounded-lg border border-ink-border">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
                setSuccessMessage(null);
                setUnconfirmedEmail(null);
              }}
              className={`py-2 text-sm font-body rounded-md transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-ink-panel text-gold shadow-sm font-medium border border-ink-border"
                  : "text-muted hover:text-parchment"
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
                setSuccessMessage(null);
                setUnconfirmedEmail(null);
              }}
              className={`py-2 text-sm font-body rounded-md transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-ink-panel text-gold shadow-sm font-medium border border-ink-border"
                  : "text-muted hover:text-parchment"
              }`}
            >
              Registrarse
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mensajes de error o éxito */}
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-burgundy/20 border border-burgundy/50 text-parchment text-sm font-body space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-burgundy font-bold">⚠</span>
                <span>{errorMessage}</span>
              </div>
              {unconfirmedEmail && (
                <div className="pt-1 border-t border-burgundy/30 flex justify-end">
                  <ButtonGhost
                    size="sm"
                    onClick={handleResendConfirmation}
                    loading={resendingEmail}
                  >
                    Reenviar correo de confirmación
                  </ButtonGhost>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-lg bg-moss/20 border border-moss/50 text-parchment text-sm font-body flex items-start gap-2">
              <span className="text-moss font-bold">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Campo Nombre (solo en registro) */}
          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="displayName"
                  className="block text-xs font-mono uppercase tracking-wider text-muted"
                >
                  Nombre o Seudónimo
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej. Cronista Valerius"
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink-panel focus-visible:outline-none transition-colors"
                />
              </div>

              {/* Campo Código de Invitación (Beta Cerrada) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="inviteCode"
                    className="block text-xs font-mono uppercase tracking-wider text-muted"
                  >
                    Código de Invitación a la Beta
                  </label>
                  {!process.env.NEXT_PUBLIC_BETA_INVITE_CODE && (
                    <span className="text-[10px] font-mono text-muted/60">
                      (Opcional)
                    </span>
                  )}
                </div>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej. CODICE-BETA-2026"
                  className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm font-mono text-gold placeholder:text-muted/40 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink-panel focus-visible:outline-none transition-colors"
                />
              </div>
            </>
          )}

          {/* Campo Correo */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-mono uppercase tracking-wider text-muted"
            >
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="autor@grimorio.com"
              className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink-panel focus-visible:outline-none transition-colors"
            />
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-mono uppercase tracking-wider text-muted"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              className="w-full bg-ink border border-ink-border rounded-lg px-3.5 py-2.5 text-sm text-parchment placeholder:text-muted/50 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink-panel focus-visible:outline-none transition-colors"
            />
          </div>

          {/* Botón de acción */}
          <div className="pt-2">
            <ButtonGold
              onClick={handleSubmit}
              loading={loading}
              className="w-full py-2.5 text-base"
            >
              {mode === "login" ? "Ingresar al Códice" : "Sellar Registro"}
            </ButtonGold>
          </div>
        </CardContent>
      </Card>

      {/* Enlace de regreso */}
      <div className="text-center">
        <Link
          href="/"
          className="text-xs font-mono text-muted hover:text-parchment transition-colors"
        >
          ← Volver a la portada principal
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <SealIcon size={36} spinning />
            <p className="font-body text-muted text-sm">Buscando en los archivos...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
