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

interface RedditIdea {
  title: string;
  subtitle: string;
  topic: string;
  category: string;
  targetAudience: string;
  whyItSells: string;
  redditSource: string;
  redditPosts: string[];
  coverImageUrl?: string;
  demandScore?: number;
  demandReason?: string;
  cover: CoverDesign;
}

interface ScanResult {
  ideas: RedditIdea[];
  scannedAt: string;
  postsAnalyzed: number;
  subreddits: string[];
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));
  if (hours >= 24) return `vor ${Math.floor(hours / 24)} Tag(en)`;
  if (hours >= 1) return `vor ${hours}h`;
  if (minutes >= 1) return `vor ${minutes}min`;
  return "gerade eben";
}

function CoverPreview({
  cover,
  title,
  imageUrl,
}: {
  cover: CoverDesign;
  title: string;
  imageUrl?: string;
}) {
  if (imageUrl) {
    return (
      <div className="w-full aspect-[3/4] rounded-xl relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        {/* Title overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end p-4 pb-5">
          <span className="text-2xl mb-2 drop-shadow-lg">
            {cover.iconEmoji}
          </span>
          <h3 className="text-center font-bold text-sm leading-tight px-2 text-white drop-shadow-lg">
            {title}
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-[3/4] rounded-xl flex flex-col items-center justify-center p-4 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-300"
      style={{
        background: `linear-gradient(135deg, ${cover.dominantColor}, ${cover.accentColor}40, ${cover.dominantColor}ee)`,
      }}
    >
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl"
        style={{ background: cover.accentColor }}
      />
      <div
        className="absolute bottom-0 left-0 w-32 h-32 rounded-full opacity-10 blur-3xl"
        style={{ background: cover.accentColor }}
      />
      <span className="text-4xl mb-3 drop-shadow-lg">{cover.iconEmoji}</span>
      <h3
        className="text-center font-bold text-sm leading-tight px-2 drop-shadow"
        style={{ color: cover.accentColor }}
      >
        {title}
      </h3>
      <div
        className="absolute bottom-3 w-8 h-0.5 rounded-full opacity-60"
        style={{ background: cover.accentColor }}
      />
    </div>
  );
}

function IdeaCard({ idea }: { idea: RedditIdea }) {
  const categoryLabels: Record<string, string> = {
    "self-help": "Self-Help",
    health: "Gesundheit",
    productivity: "Produktivität",
    finance: "Finanzen",
    relationships: "Beziehungen",
    parenting: "Eltern",
    "mental-health": "Mental Health",
    career: "Karriere",
  };

  return (
    <Link
      href={`/create?topic=${encodeURIComponent(idea.topic)}`}
      className="group block"
    >
      <div className="bg-bg-2 border border-border rounded-xl overflow-hidden hover:border-border-hover hover:bg-bg-3 transition-all duration-200 h-full flex flex-col">
        <div className="p-3 pb-0">
          <CoverPreview cover={idea.cover} title={idea.title} imageUrl={idea.coverImageUrl} />
        </div>

        <div className="p-4 space-y-2 flex-1 flex flex-col">
          <div className="flex items-center gap-2">
            {idea.demandScore != null && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{
                  background:
                    idea.demandScore >= 80
                      ? "rgba(34,197,94,0.15)"
                      : idea.demandScore >= 60
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(255,255,255,0.06)",
                  color:
                    idea.demandScore >= 80
                      ? "#22c55e"
                      : idea.demandScore >= 60
                        ? "#f59e0b"
                        : "#63636e",
                }}
                title={idea.demandReason || "Demand Score"}
              >
                {idea.demandScore}
              </span>
            )}
            <span
              className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded"
              style={{
                background: `${idea.cover.accentColor}15`,
                color: idea.cover.accentColor,
              }}
            >
              {categoryLabels[idea.category] || idea.category}
            </span>
            <span className="text-[10px] text-text-3">~10 Seiten</span>
          </div>

          <h3 className="text-text font-semibold text-sm leading-snug">
            {idea.title}
          </h3>
          <p className="text-text-2 text-xs leading-relaxed">
            {idea.subtitle}
          </p>

          <p className="text-accent text-[11px]">{idea.whyItSells}</p>

          {/* Reddit Source */}
          <div className="mt-auto pt-3 border-t border-border">
            <div className="flex items-start gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-[#ff4500] shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.46 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.231-.094z" />
              </svg>
              <p className="text-[10px] text-text-3 leading-relaxed">
                {idea.redditSource}
              </p>
            </div>
            {idea.redditPosts?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {idea.redditPosts.slice(0, 2).map((post, i) => (
                  <span
                    key={i}
                    className="text-[9px] text-text-3 bg-bg-4 px-1.5 py-0.5 rounded"
                  >
                    {post.length > 50 ? post.slice(0, 50) + "..." : post}
                  </span>
                ))}
              </div>
            )}
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
        <div className="border-t border-border pt-3 mt-3">
          <div className="h-3 bg-bg-3 rounded w-full" />
        </div>
      </div>
    </div>
  );
}

export default function RedditPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadIdeas(forceRefresh = false) {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    const params = new URLSearchParams();
    if (forceRefresh) params.set("refresh", "1");

    fetch(`/api/reddit-scan?${params}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Scan fehlgeschlagen");
        return r.json();
      })
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setResult(data);
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          setError("Timeout — Reddit-Scan dauert zu lange. Bitte nochmal versuchen.");
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
    loadIdeas();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-3.5 flex items-center justify-between shrink-0 backdrop-blur-sm bg-bg/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-white font-bold text-xs">
              eb
            </div>
            <h1 className="text-sm font-semibold text-text">ebook-gen</h1>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="text-xs text-text-2 hover:text-text px-3 py-1.5 rounded-md hover:bg-bg-3 transition-colors"
          >
            Ideen
          </Link>
          <Link
            href="/reddit"
            className="text-xs text-white bg-bg-3 px-3 py-1.5 rounded-md transition-colors"
          >
            Reddit
          </Link>
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
          {/* Title + Meta */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <svg
                  className="w-6 h-6 text-[#ff4500]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.463.327.327 0 0 0-.46 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.231-.094z" />
                </svg>
                <h2 className="text-xl font-semibold text-text tracking-tight">
                  Reddit Ebook-Scanner
                </h2>
              </div>
              <p className="text-text-2 text-sm">
                Echte Probleme aus Reddit — als Ebook-Ideen aufbereitet. Klick
                auf eine Idee um sofort loszulegen.
              </p>
            </div>
          </div>

          {/* Scan Info Bar */}
          <div className="flex items-center justify-between mt-6 mb-8 px-4 py-3 bg-bg-2 border border-border rounded-lg">
            <div className="flex items-center gap-4 text-xs text-text-3">
              {result && (
                <>
                  <span>
                    {result.postsAnalyzed} Posts analysiert
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span>
                    {result.subreddits.length} Subreddits
                  </span>
                  <span className="w-px h-3 bg-border" />
                  <span>Letzter Scan: {timeAgo(result.scannedAt)}</span>
                </>
              )}
              {loading && !result && (
                <span className="animate-pulse">
                  Scanne Reddit-Posts...
                </span>
              )}
            </div>
            <button
              onClick={() => loadIdeas(true)}
              disabled={loading}
              className="text-xs font-medium text-text-3 hover:text-text-2 hover:bg-bg-3 px-3 py-1.5 rounded-md transition-all disabled:opacity-50"
            >
              {loading ? "Scannt..." : "Neu scannen"}
            </button>
          </div>

          {/* Subreddit Pills */}
          {result && (
            <div className="flex flex-wrap gap-1.5 mb-6">
              {result.subreddits.map((sub) => (
                <span
                  key={sub}
                  className="text-[10px] text-text-3 bg-bg-2 border border-border px-2.5 py-1 rounded-full"
                >
                  r/{sub}
                </span>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-error-muted border border-error/30 text-sm text-error mb-6">
              {error}
            </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {loading && !result
              ? Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              : result?.ideas.map((idea, i) => (
                  <IdeaCard
                    key={`${idea.title}-${i}`}
                    idea={idea as RedditIdea}
                  />
                ))}
          </div>

          {/* Empty State */}
          {!loading && !error && result?.ideas.length === 0 && (
            <div className="text-center py-20">
              <p className="text-text-3 text-sm">
                Keine Ideen gefunden. Versuche einen neuen Scan.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-3 shrink-0">
        <span>Reddit + Claude + Typst</span>
        <span>ebook-gen</span>
      </footer>
    </div>
  );
}
