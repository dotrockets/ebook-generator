"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const DEMO_MARKDOWN = `---
title: Mein Ebook
subtitle: Ein Beispiel
authors: [Dein Name]
lang: de
---

# Kapitel 1: Einleitung

Hier beginnt dein Ebook. Schreib einfach in **Markdown** — der Rest passiert automatisch.

## Warum Markdown?

- Einfach zu schreiben
- Fokus auf den Inhalt
- Perfekte Typografie im Output

### Los geht's

> "Der beste Zeitpunkt ein Buch zu schreiben war vor einem Jahr. Der zweitbeste ist jetzt."

1. Schreib deinen Content
2. Waehle ein Template
3. Klick auf Generieren
4. Fertig!

# Kapitel 2: Features

## Tabellen

| Feature | Status |
|---------|--------|
| PDF | Funktioniert |
| EPUB | Funktioniert |
| DOCX | Funktioniert |

## Code

\`\`\`bash
npx ebook-gen content.md -f pdf,epub,docx
\`\`\`

# Kapitel 3: Fazit

Das war's — so einfach ist es, ein schoenes Ebook zu generieren.
`;

type Format = "pdf" | "epub" | "docx";
type Mode = "editor" | "auto";

function CreatePageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("auto");

  // Editor mode state
  const [markdown, setMarkdown] = useState(DEMO_MARKDOWN);
  const [title, setTitle] = useState("Mein Ebook");
  const [subtitle, setSubtitle] = useState("");
  const [authors, setAuthors] = useState("Dein Name");
  const [format, setFormat] = useState<Format>("pdf");
  const [template, setTemplate] = useState("dark-ocean");
  const [lang, setLang] = useState("de");
  const [paper, setPaper] = useState("a4");
  const [toc, setToc] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genTime, setGenTime] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Auto mode state
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [pages, setPages] = useState(20);
  const [autoFormat, setAutoFormat] = useState<Format>("pdf");
  const [autoLang, setAutoLang] = useState("de");
  const [autoTemplate, setAutoTemplate] = useState("dark-ocean");
  const [autoPaper, setAutoPaper] = useState("a4");
  const [kdpTrim, setKdpTrim] = useState("6x9");

  const KDP_TRIMS: Record<string, { w: string; h: string; label: string }> = {
    "6x9": { w: "15.24cm", h: "22.86cm", label: '6×9" (Standard)' },
    "5.5x8.5": { w: "13.97cm", h: "21.59cm", label: '5.5×8.5"' },
    "5x8": { w: "12.7cm", h: "20.32cm", label: '5×8" (Kompakt)' },
    "5.25x8": { w: "13.34cm", h: "20.32cm", label: '5.25×8"' },
    "8.5x11": { w: "21.59cm", h: "27.94cm", label: '8.5×11" (Sachbuch)' },
    "7x10": { w: "17.78cm", h: "25.4cm", label: '7×10" (Fachbuch)' },
    "8x10": { w: "20.32cm", h: "25.4cm", label: '8×10" (Bildband)' },
  };
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [autoChapters, setAutoChapters] = useState<string[]>([]);
  const [autoProgress, setAutoProgress] = useState<{ current: number; total: number } | null>(null);
  const [autoResult, setAutoResult] = useState<{
    title: string;
    words: number;
    chapters: number;
    conversionTime: number;
  } | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setGenTime(null);

    try {
      const formData = new FormData();
      formData.append("markdown", markdown);
      formData.append("title", title);
      if (subtitle) formData.append("subtitle", subtitle);
      formData.append("authors", authors);
      formData.append("format", format);
      formData.append("template", template);
      formData.append("lang", lang);
      formData.append("paper", paper);
      formData.append("toc", toc ? "true" : "false");
      if (coverFile) formData.append("coverImage", coverFile);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      setGenTime(res.headers.get("X-Generation-Time") || null);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = title
        .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
        .replace(/\s+/g, "-");
      a.href = url;
      a.download = `${slug}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  // Auto-start if topic came from URL
  const autoStarted = useRef(false);
  useEffect(() => {
    const urlTopic = searchParams.get("topic");
    const autoStart = searchParams.get("auto") === "1";
    if (urlTopic && autoStart && !autoStarted.current) {
      autoStarted.current = true;
      handleAutoGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAutoGenerate() {
    if (!topic.trim()) return;
    setAutoGenerating(true);
    setAutoError(null);
    setAutoResult(null);
    setAutoChapters([]);
    setAutoProgress(null);
    setAutoStatus("Gliederung wird erstellt...");

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort();
      setAutoError("Zeitüberschreitung — die Generierung hat zu lange gedauert.");
      setAutoGenerating(false);
      setAutoStatus(null);
    }, 20 * 60 * 1000);

    try {
      const res = await fetch("/api/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          topic: topic.trim(),
          pages,
          lang: autoLang,
          format: autoFormat,
          template: autoTemplate,
          paper: autoPaper,
          ...(autoTemplate === "kindle-kdp" && kdpTrim !== "6x9" ? {
            pageWidth: KDP_TRIMS[kdpTrim].w,
            pageHeight: KDP_TRIMS[kdpTrim].h,
          } : {}),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errorMsg = "Generation failed";
        try { errorMsg = JSON.parse(text).error || errorMsg; } catch { errorMsg = text || errorMsg; }
        throw new Error(errorMsg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7);
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (eventType) {
                case "status":
                  setAutoStatus(data.message);
                  break;
                case "outline":
                  setAutoChapters(data.chapters);
                  break;
                case "chapter_done":
                  setAutoProgress({ current: data.current, total: data.total });
                  break;
                case "done": {
                  // Download via library API (no base64 in SSE)
                  const downloadUrl = `/api/library/download?id=${data.id}&format=${data.format}`;
                  const a = document.createElement("a");
                  a.href = downloadUrl;
                  a.download = data.filename;
                  a.click();
                  setAutoResult({
                    title: data.title,
                    words: data.words,
                    chapters: data.chapters,
                    conversionTime: data.conversionTime,
                  });
                  setAutoStatus(null);
                  setAutoProgress(null);
                  break;
                }
                case "error":
                  throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e;
            }
            eventType = "";
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setAutoError(err instanceof Error ? err.message : "Unknown error");
        setAutoStatus(null);
      }
    } finally {
      clearTimeout(timeout);
      setAutoGenerating(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setMarkdown(text);
      const match = text.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const fm = match[1];
        const titleMatch = fm.match(/title:\s*["']?(.+?)["']?\s*$/m);
        const subtitleMatch = fm.match(/subtitle:\s*["']?(.+?)["']?\s*$/m);
        const authorsMatch = fm.match(/authors:\s*\[(.+?)\]/);
        const authorMatch = fm.match(/author:\s*["']?(.+?)["']?\s*$/m);
        if (titleMatch) setTitle(titleMatch[1]);
        if (subtitleMatch) setSubtitle(subtitleMatch[1]);
        if (authorsMatch) setAuthors(authorsMatch[1]);
        else if (authorMatch) setAuthors(authorMatch[1]);
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
            eb
          </div>
          <h1 className="text-lg font-semibold text-text">ebook-gen</h1>
          <span className="text-xs text-text-2 bg-bg-3 px-2 py-0.5 rounded-full">
            v0.2
          </span>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-3">
        <Link href="/library" className="text-xs text-text-2 hover:text-text transition-colors">
          Library
        </Link>
        <div className="flex items-center bg-bg-3 rounded-lg p-0.5">
          <button
            onClick={() => setMode("auto")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "auto"
                ? "bg-accent text-white shadow"
                : "text-text-2 hover:text-text"
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setMode("editor")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "editor"
                ? "bg-accent text-white shadow"
                : "text-text-2 hover:text-text"
            }`}
          >
            Editor
          </button>
        </div>
        </div>
      </header>

      {mode === "auto" ? (
        /* ========== AUTO MODE ========== */
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl space-y-6">
            {/* Topic Input */}
            <div className="space-y-2">
              <label className="block text-xs text-text-2 uppercase tracking-wider">
                Thema
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="z.B. Ratgeber fuer Eltern von Schreikindern..."
                rows={3}
                className="w-full bg-bg-3 border border-border rounded-xl px-4 py-3 text-text text-lg placeholder:text-text-3 focus:outline-none focus:border-accent transition-colors resize-none"
                disabled={autoGenerating}
              />
            </div>

            {/* Settings Row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Seiten
                </label>
                <select
                  value={pages}
                  onChange={(e) => setPages(Number(e.target.value))}
                  disabled={autoGenerating}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  <option value={5}>~5 Seiten</option>
                  <option value={10}>~10 Seiten</option>
                  <option value={15}>~15 Seiten</option>
                  <option value={20}>~20 Seiten</option>
                  <option value={30}>~30 Seiten</option>
                  <option value={50}>~50 Seiten</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Format
                </label>
                <div className="flex gap-1.5">
                  {(["pdf", "epub", "docx"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAutoFormat(f)}
                      disabled={autoGenerating}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase transition-all ${
                        autoFormat === f
                          ? "bg-accent text-white shadow-lg shadow-accent/20"
                          : "bg-bg-3 text-text-2 hover:bg-bg-4"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Template
                </label>
                <select
                  value={autoTemplate}
                  onChange={(e) => setAutoTemplate(e.target.value)}
                  disabled={autoGenerating}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="dark-ocean">Dark Ocean</option>
                  <option value="clean-light">Clean Light</option>
                  <option value="print-ready">Print-Ready</option>
                  <option value="kindle-kdp">Amazon KDP</option>
                </select>
              </div>
              {autoTemplate === "kindle-kdp" && (
                <div className="flex-1">
                  <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                    Trimsize
                  </label>
                  <select
                    value={kdpTrim}
                    onChange={(e) => setKdpTrim(e.target.value)}
                    disabled={autoGenerating}
                    className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  >
                    {Object.entries(KDP_TRIMS).map(([key, t]) => (
                      <option key={key} value={key}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex-1">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Sprache
                </label>
                <select
                  value={autoLang}
                  onChange={(e) => setAutoLang(e.target.value)}
                  disabled={autoGenerating}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Francais</option>
                  <option value="es">Espanol</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Papier
                </label>
                <select
                  value={autoPaper}
                  onChange={(e) => setAutoPaper(e.target.value)}
                  disabled={autoGenerating}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="a4">A4</option>
                  <option value="a5">A5</option>
                  <option value="us-letter">US Letter</option>
                </select>
              </div>
            </div>

            {/* Status / Error / Result */}
            {autoError && (
              <div className="p-4 rounded-xl bg-coral/10 border border-coral/30 text-sm text-coral">
                {autoError}
              </div>
            )}
            {(autoStatus || autoChapters.length > 0) && !autoResult && (
              <div className="rounded-xl bg-bg-3 border border-border overflow-hidden">
                {autoStatus && (
                  <div className="p-4 text-sm text-text-2 flex items-center gap-3">
                    <svg
                      className="w-5 h-5 animate-spin text-accent shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    {autoStatus}
                  </div>
                )}
                {autoProgress && (
                  <div className="px-4 pb-2">
                    <div className="w-full h-1.5 bg-bg-4/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${(autoProgress.current / autoProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {autoChapters.length > 0 && (
                  <div className="px-4 pb-3 space-y-1">
                    {autoChapters.map((ch, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {autoProgress && i < autoProgress.current ? (
                          <svg className="w-3.5 h-3.5 text-seafoam shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : autoProgress && i === autoProgress.current ? (
                          <svg className="w-3.5 h-3.5 animate-spin text-accent shrink-0" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                        )}
                        <span className={
                          autoProgress && i < autoProgress.current
                            ? "text-seafoam"
                            : autoProgress && i === autoProgress.current
                            ? "text-text"
                            : "text-text-3"
                        }>
                          {ch}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {autoResult && (
              <div className="p-4 rounded-xl bg-seafoam/10 border border-seafoam/30 text-sm text-seafoam space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ebook generiert!
                </div>
                <div className="text-seafoam/70 text-xs">
                  {autoResult.title} — {autoResult.chapters} Kapitel — {autoResult.words} Woerter — PDF in {autoResult.conversionTime}ms
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleAutoGenerate}
              disabled={autoGenerating || !topic.trim()}
              className={`w-full py-4 rounded-xl font-semibold text-white text-base tracking-wide transition-all ${
                autoGenerating
                  ? "bg-accent/60 cursor-wait animate-pulse-glow"
                  : "bg-accent hover:bg-accent-light active:scale-[0.98] shadow-lg shadow-accent/25 hover:shadow-accent/40"
              } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {autoGenerating ? "AI schreibt..." : "Ebook generieren"}
            </button>

            <p className="text-center text-xs text-text-3">
              AI generiert Inhalt + formatiert als {autoFormat.toUpperCase()} mit
              Dark Ocean Template
            </p>
          </div>
        </main>
      ) : (
        /* ========== EDITOR MODE ========== */
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg-2 shrink-0">
              <span className="text-xs text-text-2 font-mono">
                content.md
              </span>
              <div className="flex-1" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-text-2 hover:text-text bg-bg-3 hover:bg-bg-4 px-3 py-1 rounded transition-colors"
              >
                Datei laden
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1 overflow-auto">
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full h-full min-h-full bg-transparent p-6 font-mono text-sm text-text resize-none focus:outline-none placeholder:text-text-3"
                placeholder="Schreib hier dein Markdown..."
                spellCheck={false}
              />
            </div>
          </div>

          {/* Settings Panel */}
          <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-bg-2 shrink-0">
            <div className="px-4 py-2 border-b border-border bg-bg-2 shrink-0">
              <span className="text-xs text-text-2 font-mono">
                Einstellungen
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Titel
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Untertitel
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Autoren
                </label>
                <input
                  type="text"
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="Name1, Name2"
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Format
                </label>
                <div className="flex gap-2">
                  {(["pdf", "epub", "docx"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all ${
                        format === f
                          ? "bg-accent text-white shadow-lg shadow-accent/20"
                          : "bg-bg-3 text-text-2 hover:bg-bg-4 hover:text-text"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Template
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  <option value="dark-ocean">Dark Ocean</option>
                  <option value="clean-light">Clean Light</option>
                  <option value="print-ready">Print-Ready (Druck)</option>
                  <option value="kindle-kdp">Amazon KDP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Cover-Bild
                </label>
                <button
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full bg-bg-2 border border-dashed border-border rounded-lg px-3 py-4 text-sm text-text-2 hover:border-accent hover:text-text transition-colors text-center"
                >
                  {coverFile ? (
                    <span className="text-text">{coverFile.name}</span>
                  ) : (
                    <span>Bild waehlen (optional)</span>
                  )}
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                {coverFile && (
                  <button
                    onClick={() => {
                      setCoverFile(null);
                      if (coverInputRef.current)
                        coverInputRef.current.value = "";
                    }}
                    className="text-xs text-coral mt-1.5 hover:underline"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                    Sprache
                  </label>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="fr">Francais</option>
                    <option value="es">Espanol</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                    Papier
                  </label>
                  <select
                    value={paper}
                    onChange={(e) => setPaper(e.target.value)}
                    className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                  >
                    <option value="a4">A4</option>
                    <option value="a5">A5</option>
                    <option value="us-letter">US Letter</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <label className="text-sm text-text-2">
                  Inhaltsverzeichnis
                </label>
                <button
                  onClick={() => setToc(!toc)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    toc ? "bg-accent" : "bg-bg-4"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${
                      toc ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-border shrink-0">
              {error && (
                <div className="mb-3 p-3 rounded-lg bg-coral/10 border border-coral/30 text-sm text-coral">
                  {error}
                </div>
              )}
              {genTime && !error && (
                <div className="mb-3 p-3 rounded-lg bg-seafoam/10 border border-seafoam/30 text-sm text-seafoam flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Generiert in {genTime}
                </div>
              )}
              <button
                onClick={handleGenerate}
                disabled={generating || !markdown.trim()}
                className={`w-full py-3.5 rounded-lg font-semibold text-white text-sm tracking-wide transition-all ${
                  generating
                    ? "bg-accent/60 cursor-wait animate-pulse-glow"
                    : "bg-accent hover:bg-accent-light active:scale-[0.98] shadow-lg shadow-accent/20 hover:shadow-accent/30"
                } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Generiert {format.toUpperCase()}...
                  </span>
                ) : (
                  `${format.toUpperCase()} generieren`
                )}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-3 shrink-0">
        <span>Claude + Pandoc + Typst</span>
        <span>ebook-gen v0.3.0</span>
      </footer>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  );
}
