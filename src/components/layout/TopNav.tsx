"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SealIcon } from "@/components/ui/SealIcon";
import { NavPill } from "@/components/ui/NavPill";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface TopNavProps {
  worldId?: string;
  worldName?: string;
}

export function TopNav({ worldId, worldName }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoadingUser(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = worldId
    ? [
        { label: "Resumen", href: `/mundos/${worldId}` },
        { label: "Personajes", href: `/mundos/${worldId}/personajes` },
        { label: "Facciones", href: `/mundos/${worldId}/facciones` },
        { label: "Lugares", href: `/mundos/${worldId}/lugares` },
        { label: "Magia", href: `/mundos/${worldId}/magia` },
        { label: "Cronología", href: `/mundos/${worldId}/cronologia` },
        { label: "Glosario", href: `/mundos/${worldId}/glosario` },
        { label: "Investigación", href: `/mundos/${worldId}/investigacion` },
        { label: "Oráculo", href: `/mundos/${worldId}/oraculo` },
      ]
    : user
    ? [
        { label: "Mundos", href: "/mundos" },
        { label: "Perfil", href: "/perfil" },
      ]
    : [
        { label: "Mundos", href: "/mundos" },
      ];

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-border bg-ink/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo / Título */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-gold rounded-lg p-1 transition-opacity hover:opacity-90"
            aria-label="Ir a la página principal de Códice"
          >
            <SealIcon size={26} className="text-gold" />
            <span className="font-display uppercase tracking-widest text-lg font-bold text-parchment">
              Códice
            </span>
          </Link>

          {worldName && (
            <div className="hidden sm:flex items-center gap-2 text-muted text-sm font-body">
              <span className="text-ink-border">/</span>
              <span className="text-parchment font-medium truncate max-w-[180px]">
                {worldName}
              </span>
            </div>
          )}
        </div>

        {/* Navegación horizontal con pills */}
        <nav
          className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-2 no-scrollbar"
          aria-label="Navegación principal"
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/mundos" &&
                item.href !== "/perfil" &&
                item.href !== "/" &&
                pathname.startsWith(item.href));

            return (
              <NavPill key={item.href} href={item.href} active={isActive}>
                {item.label}
              </NavPill>
            );
          })}
        </nav>

        {/* Acciones de usuario */}
        <div className="flex items-center gap-2 shrink-0">
          {!loadingUser && (
            user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/perfil"
                  className="hidden md:flex items-center gap-1.5 text-xs font-mono text-muted hover:text-gold transition-colors px-2 py-1 rounded focus-visible:ring-1 focus-visible:ring-gold"
                  title="Ver perfil del escriba"
                >
                  <span className="w-2 h-2 rounded-full bg-moss inline-block" />
                  <span className="truncate max-w-[120px]">{displayName}</span>
                </Link>
                <ButtonGhost size="sm" onClick={handleSignOut}>
                  Cerrar sesión
                </ButtonGhost>
              </div>
            ) : (
              <Link href="/login">
                <ButtonGhost size="sm">Ingresar</ButtonGhost>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
