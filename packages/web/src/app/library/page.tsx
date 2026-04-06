"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EbookEntry {
  id: string;
  title: string;
  subtitle: string;
  topic: string;
  authors: string[];
  lang: string;
  chapters: string[];
  wordCount: number;
  pages: number;
  format: string;
  status: "generating" | "done" | "error";
  error?: string;
  markdownFile?: string;
  outputFiles: Record<string, string>;
  createdAt: string;
  template?: string;
  kdpMetadata?: {
    description: string;
    keywords: string[];
    categories: { name: string; path: string }[];
    pricing: { recommendedEUR: number; recommendedUSD: number; reasoning: string };
    searchTitle: string;
    searchSubtitle: string;
    preflight?: {
      trimSize: string;
      interiorColor: string;
      paperType: string;
      bleed: string;
      spineWidth: string;
      coverDimensions: string;
      checklist: string[];
    };
    socialMedia?: {
      instagram: string;
      twitter: string;
      facebook: string;
      amazonDescription: string;
    };
  };
}

function CoverThumbnail({ ebook }: { ebook: EbookEntry }) {
  const hasCover = ebook.outputFiles.cover;

  return (
    <div className="w-28 shrink-0 aspect-[3/4] rounded-xl overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-300">
      {hasCover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/library/download?id=${ebook.id}&format=cover`}
            alt={ebook.title}
            className="w-full h-full object-cover absolute inset-0"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-bg-3 to-bg-4" />
      )}

      {/* Text overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-2.5">
        <h3 className="text-white font-bold text-[10px] leading-tight line-clamp-3 drop-shadow-lg">
          {ebook.title}
        </h3>
        {ebook.authors.length > 0 && (
          <p className="text-white/60 text-[8px] mt-1 truncate">
            {ebook.authors.join(", ")}
          </p>
        )}
      </div>

      {/* Status badge */}
      {ebook.status === "generating" && (
        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
      )}
      {ebook.status === "error" && (
        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-coral" />
      )}
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-[10px] px-2 py-1 rounded bg-bg-3 hover:bg-bg-4 text-text-2 hover:text-text transition-colors"
    >
      {copied ? "Kopiert!" : label}
    </button>
  );
}

function KdpPanel({ ebook }: { ebook: EbookEntry }) {
  const kdp = ebook.kdpMetadata;
  if (!kdp) return null;

  return (
    <div className="mt-3 p-3 rounded-lg bg-bg-3/50 border border-border space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-accent">KDP Publishing Kit</span>
      </div>

      {/* Search Title */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-3 uppercase tracking-wider">Amazon-Titel</span>
          <CopyButton text={kdp.searchTitle} label="Kopieren" />
        </div>
        <p className="text-xs text-text">{kdp.searchTitle}</p>
      </div>

      {/* Search Subtitle */}
      {kdp.searchSubtitle && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-3 uppercase tracking-wider">Amazon-Untertitel</span>
            <CopyButton text={kdp.searchSubtitle} label="Kopieren" />
          </div>
          <p className="text-xs text-text">{kdp.searchSubtitle}</p>
        </div>
      )}

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-3 uppercase tracking-wider">Beschreibung ({kdp.description.length}/4000)</span>
          <CopyButton text={kdp.description} label="HTML kopieren" />
        </div>
        <div className="text-xs text-text-2 max-h-24 overflow-y-auto bg-bg-3 rounded p-2" dangerouslySetInnerHTML={{ __html: kdp.description }} />
      </div>

      {/* Keywords */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-3 uppercase tracking-wider">7 Keywords</span>
          <CopyButton text={kdp.keywords.join("\n")} label="Alle kopieren" />
        </div>
        <div className="flex flex-wrap gap-1">
          {kdp.keywords.map((kw, i) => (
            <span key={i} className="text-[10px] bg-bg-3 text-text-2 px-2 py-0.5 rounded">{kw}</span>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-3 uppercase tracking-wider">3 Kategorien</span>
        </div>
        <div className="space-y-1">
          {kdp.categories.map((cat, i) => (
            <div key={i} className="text-[10px] text-text-2">
              <span className="text-text font-medium">{cat.name}</span>
              <span className="text-text-3 ml-1">({cat.path})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-text-3">Empf. Preis:</span>
        <span className="text-text font-semibold">{kdp.pricing.recommendedEUR.toFixed(2)} EUR</span>
        <span className="text-text font-semibold">{kdp.pricing.recommendedUSD.toFixed(2)} USD</span>
        <span className="text-[10px] text-accent">60% Royalty</span>
      </div>

      {/* Pre-Flight */}
      {kdp.preflight && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-text-3 uppercase tracking-wider">Pre-Flight Check</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] mb-2">
            <span className="text-text-3">Trimsize:</span>
            <span className="text-text">{kdp.preflight.trimSize}</span>
            <span className="text-text-3">Interior:</span>
            <span className="text-text">{kdp.preflight.interiorColor}</span>
            <span className="text-text-3">Papier:</span>
            <span className="text-text">{kdp.preflight.paperType}</span>
            <span className="text-text-3">Rueckenbreite:</span>
            <span className="text-text">{kdp.preflight.spineWidth}</span>
            <span className="text-text-3">Cover-Mass:</span>
            <span className="text-text">{kdp.preflight.coverDimensions}</span>
          </div>
          <div className="space-y-1">
            {kdp.preflight.checklist.map((item: string, i: number) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-text-2">
                <span className="text-accent mt-0.5">☐</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Media */}
      {kdp.socialMedia && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-text-3 uppercase tracking-wider">Social Media Posts</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Instagram", text: kdp.socialMedia.instagram },
              { label: "Twitter/X", text: kdp.socialMedia.twitter },
              { label: "Facebook", text: kdp.socialMedia.facebook },
            ].map(({ label, text }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-[10px] text-text-3 w-16 shrink-0">{label}</span>
                <p className="text-[10px] text-text-2 flex-1">{text}</p>
                <CopyButton text={text} label="Copy" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KDP Guide Link */}
      <div className="pt-2 border-t border-border">
        <Link href="/kdp-guide" className="text-[10px] text-accent hover:underline">
          KDP Upload-Guide anzeigen →
        </Link>
      </div>

      {/* AI Disclosure */}
      <div className="text-[10px] text-text-3 italic border-t border-border pt-2">
        Hinweis: Bei KDP muss angegeben werden, dass der Inhalt AI-generiert ist.
      </div>
    </div>
  );
}

const ALL_FORMATS = ["pdf", "epub", "docx"] as const;

export default function LibraryPage() {
  const [ebooks, setEbooks] = useState<EbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<Record<string, string>>({});
  const [exportTemplate, setExportTemplate] = useState<Record<string, string>>({});
  const [expandedKdp, setExpandedKdp] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/library", { signal: controller.signal })
      .then((r) => r.json())
      .then(setEbooks)
      .catch((err) => { if (err.name !== "AbortError") console.error(err); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  async function handleExport(id: string, format: string) {
    const template = exportTemplate[`${id}-${format}`] || "dark-ocean";
    const key = `${id}-${format}`;
    setExporting((prev) => ({ ...prev, [key]: "loading" }));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch("/api/library/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, format, template }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh library to get updated outputFiles
      const libRes = await fetch("/api/library");
      const libData = await libRes.json();
      setEbooks(libData);

      // Download the new file
      const a = document.createElement("a");
      a.href = `/api/library/download?id=${id}&format=${format}`;
      a.download = data.filename || `export.${format}`;
      a.click();

      setExporting((prev) => ({ ...prev, [key]: "done" }));
      setTimeout(() => setExporting((prev) => { const n = { ...prev }; delete n[key]; return n; }), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err.name === "AbortError" ? "Zeitüberschreitung" : err.message) : "Export failed";
      setExporting((prev) => ({ ...prev, [key]: `error:${msg}` }));
      setTimeout(() => setExporting((prev) => { const n = { ...prev }; delete n[key]; return n; }), 4000);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Ebook wirklich loeschen?")) return;
    await fetch(`/api/library?id=${id}`, { method: "DELETE" });
    setEbooks((prev) => prev.filter((e) => e.id !== id));
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
              eb
            </div>
          </Link>
          <h1 className="text-lg font-semibold text-text">Library</h1>
          <span className="text-xs text-text-2 bg-bg-3 px-2 py-0.5 rounded-full">
            {ebooks.length} Ebooks
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/reddit"
            className="text-xs text-text-2 hover:text-text transition-colors"
          >
            Reddit
          </Link>
          <Link
            href="/settings"
            className="text-xs text-text-2 hover:text-text transition-colors"
          >
            Settings
          </Link>
          <Link
            href="/"
            className="text-xs bg-accent text-white px-4 py-1.5 rounded-lg font-medium hover:bg-accent-light transition-colors"
          >
            + Neues Ebook
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-text-2">
            Laden...
          </div>
        ) : ebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-4xl opacity-20">📚</div>
            <p className="text-text-2">Noch keine Ebooks generiert</p>
            <Link
              href="/"
              className="bg-accent text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-accent-light transition-colors"
            >
              Erstes Ebook erstellen
            </Link>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {ebooks.map((ebook) => (
              <div
                key={ebook.id}
                className="group bg-bg-2 border border-border rounded-xl p-4 flex gap-4 hover:border-border-hover transition-all"
              >
                {/* Cover */}
                <CoverThumbnail ebook={ebook} />

                {/* Info + Actions */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h2 className="text-text font-semibold text-sm leading-snug line-clamp-2">
                    {ebook.title}
                  </h2>
                  {ebook.subtitle && (
                    <p className="text-text-2 text-xs mt-0.5 truncate">
                      {ebook.subtitle}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-text-3">
                    <span>{ebook.chapters.length} Kapitel</span>
                    <span>{ebook.wordCount.toLocaleString("de")} Woerter</span>
                    <span>{ebook.authors.join(", ")}</span>
                  </div>

                  <div className="text-[10px] text-text-3 mt-1">
                    {formatDate(ebook.createdAt)}
                  </div>

                  {ebook.status === "error" && ebook.error && (
                    <p className="text-coral text-[10px] mt-1 line-clamp-2">
                      {ebook.error}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-3">
                    {ebook.status === "done" &&
                      ALL_FORMATS.map((fmt) => {
                        const key = `${ebook.id}-${fmt}`;
                        const state = exporting[key];
                        const hasFile = ebook.outputFiles[fmt];

                        if (state === "loading") {
                          return (
                            <span
                              key={fmt}
                              className="bg-bg-3 text-text-3 px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase"
                            >
                              {fmt}...
                            </span>
                          );
                        }

                        if (state === "done") {
                          return (
                            <span
                              key={fmt}
                              className="bg-success-muted text-success px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase"
                            >
                              {fmt} ✓
                            </span>
                          );
                        }

                        if (hasFile) {
                          return (
                            <a
                              key={fmt}
                              href={`/api/library/download?id=${ebook.id}&format=${fmt}`}
                              className="bg-bg-3 hover:bg-bg-4 text-text-2 hover:text-text px-3 py-1.5 rounded-md text-[11px] font-semibold uppercase transition-colors"
                            >
                              {fmt}
                            </a>
                          );
                        }

                        return (
                          <span key={fmt} className="flex items-center gap-0.5">
                            <select
                              value={exportTemplate[`${ebook.id}-${fmt}`] || "dark-ocean"}
                              onChange={(e) => setExportTemplate(prev => ({ ...prev, [`${ebook.id}-${fmt}`]: e.target.value }))}
                              className="bg-bg-3 text-text-3 text-[9px] px-1 py-1.5 rounded-l-md border border-dashed border-border focus:outline-none"
                            >
                              <option value="dark-ocean">Dark Ocean</option>
                              <option value="clean-light">Light</option>
                              <option value="print-ready">Print</option>
                              <option value="kindle-kdp">KDP</option>
                            </select>
                            <button
                              onClick={() => handleExport(ebook.id, fmt)}
                              className="bg-bg-3 hover:bg-accent-muted text-text-3 hover:text-accent px-2 py-1.5 rounded-r-md text-[11px] font-semibold uppercase transition-colors border border-dashed border-border hover:border-accent/30 border-l-0"
                              title={`Als ${fmt.toUpperCase()} exportieren`}
                            >
                              + {fmt}
                            </button>
                          </span>
                        );
                      })}
                    {ebook.status === "done" && ebook.markdownFile && (
                      <a
                        href={`/api/library/download?id=${ebook.id}&format=md`}
                        className="bg-bg-3 hover:bg-bg-4 text-text-2 hover:text-text px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                      >
                        MD
                      </a>
                    )}
                    {ebook.status === "done" && ebook.outputFiles["cover-pdf"] && (
                      <a
                        href={`/api/library/download?id=${ebook.id}&format=cover-pdf`}
                        className="bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                      >
                        Cover PDF
                      </a>
                    )}
                    {ebook.status === "done" && (
                      <a
                        href={`/cover?title=${encodeURIComponent(ebook.title)}&subtitle=${encodeURIComponent(ebook.subtitle || "")}&author=${encodeURIComponent(ebook.authors.join(", "))}&topic=${encodeURIComponent(ebook.topic)}&template=${encodeURIComponent(ebook.template || "dark-ocean")}${ebook.outputFiles.cover ? `&existingCover=${encodeURIComponent(ebook.id)}` : ""}`}
                        className="bg-bg-3 hover:bg-bg-4 text-text-2 hover:text-text px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors"
                        title="Neues Cover erstellen"
                      >
                        Cover
                      </a>
                    )}
                    {ebook.kdpMetadata && (
                      <button
                        onClick={() => setExpandedKdp(expandedKdp === ebook.id ? null : ebook.id)}
                        className="bg-accent/10 hover:bg-accent/20 text-accent px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
                      >
                        {expandedKdp === ebook.id ? "KDP ▲" : "KDP ▼"}
                      </button>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => handleDelete(ebook.id)}
                      className="text-text-3 hover:text-error px-2 py-1.5 rounded-md text-xs transition-colors"
                      title="Loeschen"
                    >
                      ✕
                    </button>
                  </div>
                  {expandedKdp === ebook.id && <KdpPanel ebook={ebook} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-3 shrink-0">
        <Link href="/" className="hover:text-text transition-colors">
          ← Startseite
        </Link>
        <span>ebook-gen v0.3.0</span>
      </footer>
    </div>
  );
}
