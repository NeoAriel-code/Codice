import Link from "next/link";
import { TopNav } from "@/components/layout/TopNav";
import { SealIcon } from "@/components/ui/SealIcon";
import { SectionSigil } from "@/components/ui/SectionSigil";
import { ButtonGold } from "@/components/ui/ButtonGold";
import { ButtonGhost } from "@/components/ui/ButtonGhost";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { TagPill } from "@/components/ui/TagPill";
import type { EntryType } from "@/types/database";

export default function HomePage() {
  const sections = [
    {
      title: "Personajes",
      type: "personaje",
      desc: "Linajes, motivaciones, arquetipos y secretos de cada habitante de tu reino.",
      tag: "Dramatis Personae",
    },
    {
      title: "Facciones",
      type: "faccion",
      desc: "Órdenes sagradas, clanes rebeldes, gremios de mercaderes y tronos en pugna.",
      tag: "Poder & Alianzas",
    },
    {
      title: "Lugares",
      type: "lugar",
      desc: "Ciudadelas inexpugnables, bosques vetados, mares ignotos y santuarios.",
      tag: "Geografía Sagrada",
    },
    {
      title: "Magia",
      type: "magia",
      desc: "Leyes sobrenaturales, costos arcanos, rituales prohibidos y reliquias.",
      tag: "Leyes Arcanas",
    },
    {
      title: "Cronología",
      type: "evento",
      desc: "Las eras olvidadas, guerras decisivas y profecías aún por cumplirse.",
      tag: "Línea de Tiempo",
    },
    {
      title: "Glosario",
      type: "termino",
      desc: "Lenguas vernáculas, modismos arcaicos, títulos honoríficos y proverbios.",
      tag: "Léxico",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-ink text-parchment">
      <TopNav />

      {/* Portada / Hero */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center space-y-8">
        <div className="relative flex flex-col items-center">
          <SealIcon size={72} className="text-gold mb-6 animate-pulse motion-reduce:animate-none" />
          <h1 className="font-display text-4xl sm:text-6xl uppercase tracking-[0.2em] font-bold text-parchment drop-shadow-sm">
            Códice
          </h1>
          <p className="mt-4 font-body text-xl sm:text-2xl text-muted max-w-2xl leading-relaxed">
            El grimorio viviente para forjar, catalogar y consultar los universos que habitan en tu imaginación.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link href="/mundos">
            <ButtonGold size="lg" className="px-8 py-3 text-base">
              Abrir el libro
            </ButtonGold>
          </Link>
          <Link href="/login">
            <ButtonGhost size="lg" className="px-8 py-3 text-base">
              Acceder como Escriba
            </ButtonGhost>
          </Link>
        </div>

        {/* Cita de ambientación */}
        <div className="max-w-xl mx-auto pt-8">
          <blockquote className="italic font-body text-muted text-base border-l-2 border-gold/40 pl-4 text-left">
            «Toda historia comienza en una página en blanco, pero solo los mundos con memoria perduran a través de las eras.»
          </blockquote>
        </div>

        {/* Capítulos del Códice */}
        <div className="w-full pt-16 space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-ink-border pb-3">
            <h2 className="font-display uppercase tracking-widest text-xl text-parchment">
              Estructura del Grimorio
            </h2>
            <span className="font-mono text-xs text-gold uppercase tracking-wider">
              6 Disciplinas Fundamentales
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sections.map((section) => (
              <Card
                key={section.type}
                hoverable
                className="flex flex-col justify-between h-full bg-ink-panel/90 border-ink-border"
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded bg-ink border border-ink-border flex items-center justify-center text-gold">
                      <SectionSigil type={section.type as EntryType} size={16} />
                    </div>
                    <TagPill variant="gold">{section.tag}</TagPill>
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription className="text-muted leading-normal mt-1">
                    {section.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* El Oráculo y la Investigación */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left">
          <Card className="border-gold/30 bg-ink-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <SealIcon size={20} className="text-gold" />
                <span className="font-display uppercase tracking-wider text-xs text-gold">
                  Inteligencia Arcanista
                </span>
              </div>
              <CardTitle className="text-xl">El Oráculo</CardTitle>
              <CardDescription className="text-muted leading-relaxed">
                Consulta a la IA conocedora de las leyes y coherencia de tu universo para descubrir contradicciones, expandir leyendas y sugerir giros argumentales.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-ink-border bg-ink-panel relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-muted" />
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-muted uppercase">
                  Biblioteca Externa
                </span>
              </div>
              <CardTitle className="text-xl">Estante de Investigación</CardTitle>
              <CardDescription className="text-muted leading-relaxed">
                Integra fuentes bibliográficas reales y referencias de Google Books para dar solidez histórica, botánica y mitológica a tus creaciones.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="border-t border-ink-border py-8 text-center text-xs font-mono text-muted bg-ink">
        <p>Códice — Grimorio de Worldbuilding &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
