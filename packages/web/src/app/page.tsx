"use client";

import { useState, useRef } from "react";

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

export default function Home() {
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setMarkdown(text);

      // Try to extract frontmatter
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
      <header className="border-b border-ocean-light px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sunset flex items-center justify-center text-white font-bold text-sm">
            eb
          </div>
          <h1 className="text-lg font-semibold text-sand">ebook-gen</h1>
          <span className="text-xs text-sand-dark bg-ocean-light px-2 py-0.5 rounded-full">
            v0.1
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ocean-mid hidden sm:block">
            Markdown → PDF / EPUB / DOCX
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Editor Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-ocean-light bg-ocean-light/30 shrink-0">
            <span className="text-xs text-sand-dark font-mono">content.md</span>
            <div className="flex-1" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-sand-dark hover:text-sand bg-ocean-light hover:bg-ocean-mid px-3 py-1 rounded transition-colors"
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

          {/* Textarea */}
          <div className="flex-1 overflow-auto">
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-full min-h-full bg-transparent p-6 font-mono text-sm text-sand resize-none focus:outline-none placeholder:text-ocean-mid"
              placeholder="Schreib hier dein Markdown..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Settings Panel */}
        <div className="w-full lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l border-ocean-light bg-ocean-light/10 shrink-0">
          <div className="px-4 py-2 border-b border-ocean-light bg-ocean-light/30 shrink-0">
            <span className="text-xs text-sand-dark font-mono">Einstellungen</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                Untertitel
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Optional"
                className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand placeholder:text-ocean-mid focus:outline-none focus:border-sunset transition-colors"
              />
            </div>

            {/* Authors */}
            <div>
              <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                Autoren
              </label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="Name1, Name2"
                className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand placeholder:text-ocean-mid focus:outline-none focus:border-sunset transition-colors"
              />
            </div>

            {/* Format */}
            <div>
              <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                Format
              </label>
              <div className="flex gap-2">
                {(["pdf", "epub", "docx"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all ${
                      format === f
                        ? "bg-sunset text-white shadow-lg shadow-sunset/20"
                        : "bg-ocean-light/80 text-sand-dark hover:bg-ocean-mid/60 hover:text-sand"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Template */}
            <div>
              <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                Template
              </label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
              >
                <option value="dark-ocean">Dark Ocean</option>
              </select>
            </div>

            {/* Cover Image */}
            <div>
              <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                Cover-Bild
              </label>
              <button
                onClick={() => coverInputRef.current?.click()}
                className="w-full bg-ocean-light/40 border border-dashed border-ocean-mid rounded-lg px-3 py-4 text-sm text-sand-dark hover:border-sunset hover:text-sand transition-colors text-center"
              >
                {coverFile ? (
                  <span className="text-sand">{coverFile.name}</span>
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
                    if (coverInputRef.current) coverInputRef.current.value = "";
                  }}
                  className="text-xs text-coral mt-1.5 hover:underline"
                >
                  Entfernen
                </button>
              )}
            </div>

            {/* Language & Paper */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                  Sprache
                </label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Francais</option>
                  <option value="es">Espanol</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                  Papier
                </label>
                <select
                  value={paper}
                  onChange={(e) => setPaper(e.target.value)}
                  className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                >
                  <option value="a4">A4</option>
                  <option value="a5">A5</option>
                  <option value="us-letter">US Letter</option>
                </select>
              </div>
            </div>

            {/* TOC Toggle */}
            <div className="flex items-center justify-between py-1">
              <label className="text-sm text-sand-dark">Inhaltsverzeichnis</label>
              <button
                onClick={() => setToc(!toc)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  toc ? "bg-sunset" : "bg-ocean-mid"
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

          {/* Generate Button */}
          <div className="p-4 border-t border-ocean-light shrink-0">
            {error && (
              <div className="mb-3 p-3 rounded-lg bg-coral/10 border border-coral/30 text-sm text-coral">
                {error}
              </div>
            )}
            {genTime && !error && (
              <div className="mb-3 p-3 rounded-lg bg-seafoam/10 border border-seafoam/30 text-sm text-seafoam flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Generiert in {genTime}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating || !markdown.trim()}
              className={`w-full py-3.5 rounded-lg font-semibold text-white text-sm tracking-wide transition-all ${
                generating
                  ? "bg-sunset/60 cursor-wait animate-pulse-glow"
                  : "bg-sunset hover:bg-sunset-light active:scale-[0.98] shadow-lg shadow-sunset/20 hover:shadow-sunset/30"
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

      {/* Footer */}
      <footer className="border-t border-ocean-light px-6 py-3 flex items-center justify-between text-xs text-ocean-mid shrink-0">
        <span>Pandoc + Typst</span>
        <span>ebook-gen v0.1.0</span>
      </footer>
    </div>
  );
}
