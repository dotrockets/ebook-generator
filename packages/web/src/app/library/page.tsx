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
  outputFiles: Record<string, string>;
  createdAt: string;
}

export default function LibraryPage() {
  const [ebooks, setEbooks] = useState<EbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then(setEbooks)
      .finally(() => setLoading(false));
  }, []);

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
      {/* Header */}
      <header className="border-b border-ocean-light px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 rounded-lg bg-sunset flex items-center justify-center text-white font-bold text-sm">
              eb
            </div>
          </Link>
          <h1 className="text-lg font-semibold text-sand">Library</h1>
          <span className="text-xs text-sand-dark bg-ocean-light px-2 py-0.5 rounded-full">
            {ebooks.length} Ebooks
          </span>
        </div>
        <Link
          href="/"
          className="text-sm text-sand-dark hover:text-sand transition-colors"
        >
          + Neues Ebook
        </Link>
      </header>

      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-sand-dark">
            Laden...
          </div>
        ) : ebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="text-4xl opacity-20">📚</div>
            <p className="text-sand-dark">Noch keine Ebooks generiert</p>
            <Link
              href="/"
              className="bg-sunset text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-sunset-light transition-colors"
            >
              Erstes Ebook erstellen
            </Link>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-3">
            {ebooks.map((ebook) => (
              <div
                key={ebook.id}
                className="bg-ocean-light/40 border border-ocean-mid/30 rounded-xl p-5 flex items-start gap-4 hover:border-ocean-mid/60 transition-colors"
              >
                {/* Status indicator */}
                <div className="shrink-0 pt-1">
                  {ebook.status === "done" ? (
                    <div className="w-3 h-3 rounded-full bg-seafoam" />
                  ) : ebook.status === "generating" ? (
                    <div className="w-3 h-3 rounded-full bg-sunset animate-pulse" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-coral" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sand font-semibold truncate">
                    {ebook.title}
                  </h2>
                  {ebook.subtitle && (
                    <p className="text-sand-dark text-sm truncate">
                      {ebook.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-ocean-mid">
                    <span>{ebook.chapters.length} Kapitel</span>
                    <span>{ebook.wordCount.toLocaleString("de")} Woerter</span>
                    <span>{ebook.lang.toUpperCase()}</span>
                    <span>{formatDate(ebook.createdAt)}</span>
                  </div>
                  {ebook.status === "error" && ebook.error && (
                    <p className="text-coral text-xs mt-1 truncate">
                      {ebook.error}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {ebook.status === "done" &&
                    Object.keys(ebook.outputFiles).map((fmt) => (
                      <a
                        key={fmt}
                        href={`/api/library/download?id=${ebook.id}&format=${fmt}`}
                        className="bg-ocean-light hover:bg-ocean-mid text-sand-dark hover:text-sand px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors"
                      >
                        {fmt}
                      </a>
                    ))}
                  {/* Download Markdown */}
                  {ebook.status === "done" && (
                    <a
                      href={`/api/library/download?id=${ebook.id}&format=md`}
                      className="bg-ocean-light hover:bg-ocean-mid text-sand-dark hover:text-sand px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      title="Markdown herunterladen"
                    >
                      MD
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(ebook.id)}
                    className="text-ocean-mid hover:text-coral px-2 py-1.5 rounded-lg text-xs transition-colors"
                    title="Loeschen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-ocean-light px-6 py-3 flex items-center justify-between text-xs text-ocean-mid shrink-0">
        <Link href="/" className="hover:text-sand transition-colors">
          ← Generator
        </Link>
        <span>ebook-gen v0.2.0</span>
      </footer>
    </div>
  );
}
