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
      <div className="bg-bg-2 border border-border rounded-xl overflow-hidden hover:border-border-hover hover:bg-bg-3 transition-all duration-200">
        <div className="p-3 pb-0">
          <CoverPreview cover={suggestion.cover} title={suggestion.title} />
        </div>

        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded"
              style={{
                background: `${suggestion.cover.accentColor}15`,
                color: suggestion.cover.accentColor,
              }}
            >
              {categoryLabels[suggestion.category] || suggestion.category}
            </span>
            <span className="text-[10px] text-text-3">~10 Seiten</span>
          </div>

          <h3 className="text-text font-semibold text-sm leading-snug">
            {suggestion.title}
          </h3>
          <p className="text-text-2 text-xs leading-relaxed">
            {suggestion.subtitle}
          </p>

          <p className="text-accent text-[11px]">
            {suggestion.whyItSells}
          </p>

          <div className="pt-1">
            <span className="text-[10px] text-text-3">
              {suggestion.targetAudience}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-bg-2 border border-border rounded-xl overflow-hidden animate-pulse">
      <div className="p-3 pb-0">
        <div className="w-full aspect-[3/4] rounded-lg bg-bg-3" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-3 bg-bg-3 rounded w-16" />
        <div className="h-4 bg-bg-3 rounded w-3/4" />
        <div className="h-3 bg-bg-3 rounded w-full" />
        <div className="h-3 bg-bg-3 rounded w-2/3" />
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
      <header className="border-b border-border px-6 py-3.5 flex items-center justify-between shrink-0 backdrop-blur-sm bg-bg/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white font-bold text-xs">
            eb
          </div>
          <h1 className="text-sm font-semibold text-text">ebook-gen</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/library"
            className="text-xs text-text-2 hover:text-text px-3 py-1.5 rounded-md hover:bg-bg-3 transition-colors"
          >
            Library
          </Link>
          <Link
            href="/kdp-guide"
            className="text-xs text-text-2 hover:text-text px-3 py-1.5 rounded-md hover:bg-bg-3 transition-colors"
          >
            KDP Guide
          </Link>
          <Link
            href="/settings"
            className="text-xs text-text-2 hover:text-text px-3 py-1.5 rounded-md hover:bg-bg-3 transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/create"
            className="text-xs bg-accent text-white px-4 py-1.5 rounded-md font-medium hover:bg-accent-hover transition-colors ml-2"
          >
            + Erstellen
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="px-6 pt-10 pb-6 max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-text mb-1 tracking-tight">
            Trending Ebook-Ideen
          </h2>
          <p className="text-text-2 text-sm mb-6">
            AI-kuratierte Vorschlaege fuer 10-Seiten-Ratgeber. Klick auf eine Idee um sofort loszulegen.
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 mb-8">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  category === cat.id
                    ? "bg-accent text-white"
                    : "text-text-3 hover:text-text-2 hover:bg-bg-3"
                }`}
              >
                {cat.label}
              </button>
            ))}
            <button
              onClick={() => loadSuggestions(category, true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-text-3 hover:text-text-2 hover:bg-bg-3 transition-all ml-auto"
            >
              {loading ? "..." : "Neue Ideen"}
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
                  <SuggestionCard key={`${s.title}-${i}`} suggestion={s} />
                ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-3 shrink-0">
        <span>Claude + Pandoc + Typst</span>
        <span>ebook-gen</span>
      </footer>
    </div>
  );
}
