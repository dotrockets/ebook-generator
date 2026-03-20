"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CoverDesign {
  style: string;
  dominantColor: string;
  accentColor: string;
  mood: string;
  iconEmoji: string;
  imagePrompt: string;
}

interface Suggestion {
  title: string;
  subtitle: string;
  topic: string;
  category: string;
  targetAudience: string;
  whyItSells: string;
  cover: CoverDesign;
}

const CATEGORIES = [
  { id: "all", label: "Alle" },
  { id: "self-help", label: "Self-Help" },
  { id: "health", label: "Gesundheit" },
  { id: "productivity", label: "Produktivitaet" },
  { id: "finance", label: "Finanzen" },
  { id: "relationships", label: "Beziehungen" },
  { id: "parenting", label: "Eltern" },
  { id: "mental-health", label: "Mental Health" },
  { id: "career", label: "Karriere" },
];

function CoverPreview({ cover, title }: { cover: CoverDesign; title: string }) {
  const styles: Record<string, string> = {
    minimal: `from-[${cover.dominantColor}] to-[${cover.dominantColor}dd]`,
    gradient: `from-[${cover.dominantColor}] via-[${cover.accentColor}] to-[${cover.dominantColor}]`,
    bold: `from-[${cover.dominantColor}] to-[${cover.accentColor}]`,
    elegant: `from-[${cover.dominantColor}] to-[${cover.dominantColor}cc]`,
    playful: `from-[${cover.accentColor}] to-[${cover.dominantColor}]`,
  };
  void styles; // unused for now, using inline styles instead

  return (
    <div
      className="w-full aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300"
      style={{
        background: `linear-gradient(135deg, ${cover.dominantColor}, ${cover.accentColor}40, ${cover.dominantColor}ee)`,
      }}
    >
      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
        style={{ background: cover.accentColor }}
      />
      <div
        className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 blur-3xl"
        style={{ background: cover.accentColor }}
      />

      {/* Icon */}
      <span className="text-4xl mb-3 drop-shadow-lg">{cover.iconEmoji}</span>

      {/* Title */}
      <h3
        className="text-center font-bold text-sm leading-tight px-2 drop-shadow"
        style={{ color: cover.accentColor }}
      >
        {title}
      </h3>

      {/* Bottom line */}
      <div
        className="absolute bottom-3 w-8 h-0.5 rounded-full opacity-60"
        style={{ background: cover.accentColor }}
      />
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const categoryLabels: Record<string, string> = {
    "self-help": "Self-Help",
    health: "Gesundheit",
    productivity: "Produktivitaet",
    finance: "Finanzen",
    relationships: "Beziehungen",
    parenting: "Eltern",
    "mental-health": "Mental Health",
    career: "Karriere",
  };

  return (
    <Link
      href={`/create?topic=${encodeURIComponent(suggestion.topic)}`}
      className="group block"
    >
      <div className="bg-ocean-light/30 border border-ocean-mid/20 rounded-2xl overflow-hidden hover:border-sunset/40 hover:bg-ocean-light/50 transition-all duration-300">
        {/* Cover Preview */}
        <div className="p-3 pb-0">
          <CoverPreview cover={suggestion.cover} title={suggestion.title} />
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full"
              style={{
                background: `${suggestion.cover.accentColor}20`,
                color: suggestion.cover.accentColor,
              }}
            >
              {categoryLabels[suggestion.category] || suggestion.category}
            </span>
            <span className="text-[10px] text-ocean-mid">~10 Seiten</span>
          </div>

          <h3 className="text-sand font-semibold text-sm leading-snug">
            {suggestion.title}
          </h3>
          <p className="text-sand-dark text-xs leading-relaxed">
            {suggestion.subtitle}
          </p>

          <p className="text-ocean-bright text-[11px] italic">
            {suggestion.whyItSells}
          </p>

          <div className="pt-1">
            <span className="text-[10px] text-ocean-mid">
              Zielgruppe: {suggestion.targetAudience}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-ocean-light/30 border border-ocean-mid/20 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-3 pb-0">
        <div className="w-full aspect-[3/4] rounded-xl bg-ocean-light/60" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-3 bg-ocean-light/60 rounded w-16" />
        <div className="h-4 bg-ocean-light/60 rounded w-3/4" />
        <div className="h-3 bg-ocean-light/60 rounded w-full" />
        <div className="h-3 bg-ocean-light/60 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  function loadSuggestions(cat: string, forceRefresh = false) {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const params = new URLSearchParams({ lang: "de", category: cat });
    if (forceRefresh) params.set("refresh", "1");

    fetch(`/api/suggestions?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load suggestions");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setSuggestions(data);
        else throw new Error(data.error || "Invalid response");
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          setError("Timeout — bitte nochmal versuchen");
        } else {
          setError(e.message);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadSuggestions(category);
  }, [category]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-ocean-light px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sunset flex items-center justify-center text-white font-bold text-sm">
            eb
          </div>
          <h1 className="text-lg font-semibold text-sand">ebook-gen</h1>
          <span className="text-xs text-sand-dark bg-ocean-light px-2 py-0.5 rounded-full">
            v0.3
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/library"
            className="text-xs text-sand-dark hover:text-sand transition-colors"
          >
            Library
          </Link>
          <Link
            href="/create"
            className="text-xs bg-sunset text-white px-4 py-1.5 rounded-lg font-medium hover:bg-sunset-light transition-colors"
          >
            + Erstellen
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="px-6 pt-10 pb-6 max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-sand mb-1">
            Trending Ebook-Ideen
          </h2>
          <p className="text-sand-dark text-sm mb-6">
            AI-kuratierte Vorschlaege fuer 10-Seiten-Ratgeber die sich gerade
            gut verkaufen. Klick auf eine Idee um sofort loszulegen.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  category === cat.id
                    ? "bg-sunset text-white shadow-lg shadow-sunset/20"
                    : "bg-ocean-light/60 text-sand-dark hover:bg-ocean-light hover:text-sand"
                }`}
              >
                {cat.label}
              </button>
            ))}
            <button
              onClick={() => loadSuggestions(category, true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-ocean-light/60 text-sand-dark hover:bg-ocean-light hover:text-sand transition-all ml-auto"
              title="Neue Vorschlaege generieren"
            >
              {loading ? "Laden..." : "Neue Ideen"}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-coral/10 border border-coral/30 text-sm text-coral mb-6">
              {error}
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              : suggestions.map((s, i) => (
                  <SuggestionCard key={i} suggestion={s} />
                ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-ocean-light px-6 py-3 flex items-center justify-between text-xs text-ocean-mid shrink-0">
        <span>Claude + Pandoc + Typst</span>
        <span>ebook-gen v0.3.0</span>
      </footer>
    </div>
  );
}
