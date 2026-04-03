"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const TEMPLATES = [
  { value: "dark-ocean", label: "Dark Ocean" },
  { value: "clean-light", label: "Clean Light" },
  { value: "print-ready", label: "Print-Ready" },
  { value: "kindle-kdp", label: "Amazon KDP" },
];

function CoverPageInner() {
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [subtitle, setSubtitle] = useState(searchParams.get("subtitle") || "");
  const [authors, setAuthors] = useState(searchParams.get("author") || "");
  const [imagePrompt, setImagePrompt] = useState(searchParams.get("topic") || "");
  const [template, setTemplate] = useState(searchParams.get("template") || "dark-ocean");
  const [accent, setAccent] = useState("#e67300");
  const [existingCoverId, setExistingCoverId] = useState<string | null>(searchParams.get("existingCover"));

  // Step 1: background generation
  const [generatingBg, setGeneratingBg] = useState(false);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgBlob, setBgBlob] = useState<Blob | null>(null);
  const [bgError, setBgError] = useState<string | null>(null);

  // Load existing cover from library if linked from Library page
  useEffect(() => {
    if (existingCoverId) {
      fetch(`/api/library/download?id=${existingCoverId}&format=cover`)
        .then((r) => {
          if (!r.ok) throw new Error("Cover not found");
          return r.blob();
        })
        .then((blob) => {
          setBgBlob(blob);
          setBgImageUrl(URL.createObjectURL(blob));
          setExistingCoverId(null);
        })
        .catch(() => {});
    }
  }, [existingCoverId]);

  // Step 2: cover PDF composition
  const [composing, setComposing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);

  async function handleGenerateBackground() {
    if (!imagePrompt.trim()) return;
    setGeneratingBg(true);
    setBgError(null);
    setBgImageUrl(null);
    setBgBlob(null);
    setPdfUrl(null);
    setComposeError(null);

    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagePrompt: imagePrompt.trim(),
          style: "portrait",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(data.error || "Hintergrund-Generierung fehlgeschlagen");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setBgImageUrl(url);
      setBgBlob(blob);
    } catch (err: unknown) {
      setBgError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setGeneratingBg(false);
    }
  }

  async function handleComposeCover() {
    if (!bgBlob) return;
    setComposing(true);
    setComposeError(null);
    setPdfUrl(null);

    try {
      const formData = new FormData();
      formData.append("backgroundImage", bgBlob, "background.webp");
      formData.append("title", title || "Untitled");
      if (subtitle) formData.append("subtitle", subtitle);
      formData.append("authors", authors || "Unknown");
      formData.append("accent", accent);
      formData.append("template", template);

      const res = await fetch("/api/cover/compose", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Composition failed" }));
        throw new Error(data.error || "Cover-PDF-Erstellung fehlgeschlagen");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err: unknown) {
      setComposeError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setComposing(false);
    }
  }

  function handleDownloadPdf() {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    const slug = (title || "cover")
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
      .replace(/\s+/g, "-");
    a.download = `${slug}-cover.pdf`;
    a.click();
  }

  function handleDownloadImage() {
    if (!bgImageUrl) return;
    const a = document.createElement("a");
    a.href = bgImageUrl;
    const slug = (title || "cover")
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
      .replace(/\s+/g, "-");
    a.download = `${slug}-background.webp`;
    a.click();
  }

  const Spinner = () => (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
              eb
            </div>
          </Link>
          <h1 className="text-lg font-semibold text-text">Cover Generator</h1>
          <span className="text-xs text-text-2 bg-bg-3 px-2 py-0.5 rounded-full">
            standalone
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="text-xs text-text-2 hover:text-text transition-colors"
          >
            Library
          </Link>
          <Link
            href="/create"
            className="text-xs bg-accent text-white px-4 py-1.5 rounded-lg font-medium hover:bg-accent-hover transition-colors"
          >
            + Ebook erstellen
          </Link>
        </div>
      </header>

      {/* Main: two-column layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Inputs */}
        <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-border">
          <div className="px-4 py-2 border-b border-border bg-bg-2 shrink-0">
            <span className="text-xs text-text-2 font-mono">
              Einstellungen
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dein Buchtitel"
                className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Subtitle */}
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

            {/* Author */}
            <div>
              <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                Autor
              </label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="Name1, Name2"
                className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Image Prompt */}
            <div>
              <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                Cover-Beschreibung / Image Prompt
              </label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="z.B. Sonnenuntergang ueber dem Meer mit dramatischen Wolken, warme Farben..."
                rows={3}
                className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-3 focus:outline-none focus:border-accent transition-colors resize-none"
              />
              <p className="text-[10px] text-text-3 mt-1">
                Beschreibe das Hintergrundbild — kein Text, nur das Bild-Motiv.
              </p>
            </div>

            {/* Template + Accent Row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Template / Style
                </label>
                <select
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="w-full bg-bg-3 border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition-colors"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-32">
                <label className="block text-xs text-text-2 mb-1.5 uppercase tracking-wider">
                  Akzentfarbe
                </label>
                <div className="flex items-center gap-2 bg-bg-3 border border-border rounded-lg px-3 py-1.5">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0"
                  />
                  <span className="text-xs text-text-2 font-mono">
                    {accent}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Generate Background */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                  1
                </div>
                <span className="text-xs text-text-2 uppercase tracking-wider font-medium">
                  Hintergrund generieren
                </span>
              </div>
              <button
                onClick={handleGenerateBackground}
                disabled={generatingBg || !imagePrompt.trim()}
                className={`w-full py-3 rounded-lg font-semibold text-white text-sm tracking-wide transition-all ${
                  generatingBg
                    ? "bg-accent/60 cursor-wait animate-pulse-glow"
                    : "bg-accent hover:bg-accent-hover active:scale-[0.98] shadow-lg shadow-accent/20 hover:shadow-accent/30"
                } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                {generatingBg ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    AI generiert Bild...
                  </span>
                ) : (
                  "Hintergrund generieren"
                )}
              </button>
            </div>

            {/* Step 2: Compose Cover PDF */}
            {bgImageUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
                    2
                  </div>
                  <span className="text-xs text-text-2 uppercase tracking-wider font-medium">
                    Cover PDF erstellen
                  </span>
                </div>
                <button
                  onClick={handleComposeCover}
                  disabled={composing}
                  className={`w-full py-3 rounded-lg font-semibold text-white text-sm tracking-wide transition-all ${
                    composing
                      ? "bg-accent/60 cursor-wait animate-pulse-glow"
                      : "bg-accent hover:bg-accent-hover active:scale-[0.98] shadow-lg shadow-accent/20 hover:shadow-accent/30"
                  } disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none`}
                >
                  {composing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      PDF wird erstellt...
                    </span>
                  ) : (
                    "Cover PDF erstellen"
                  )}
                </button>
              </div>
            )}

            {/* Errors */}
            {bgError && (
              <div className="p-3 rounded-lg bg-coral/10 border border-coral/30 text-sm text-coral">
                {bgError}
              </div>
            )}
            {composeError && (
              <div className="p-3 rounded-lg bg-coral/10 border border-coral/30 text-sm text-coral">
                {composeError}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="w-full lg:w-[480px] flex flex-col bg-bg-2 shrink-0">
          <div className="px-4 py-2 border-b border-border bg-bg-2 shrink-0">
            <span className="text-xs text-text-2 font-mono">Vorschau</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center gap-5">
            {!bgImageUrl && !generatingBg && (
              <div className="text-center space-y-3">
                <div className="w-48 aspect-[3/4] rounded-xl bg-bg-3 border border-border mx-auto flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-text-3/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-text-3 text-xs">
                  Beschreibe dein Wunschmotiv und klicke auf
                  &ldquo;Hintergrund generieren&rdquo;
                </p>
              </div>
            )}

            {generatingBg && (
              <div className="text-center space-y-4">
                <div className="w-48 aspect-[3/4] rounded-xl bg-bg-3 border border-border mx-auto flex items-center justify-center animate-pulse">
                  <svg
                    className="w-8 h-8 animate-spin text-accent"
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
                </div>
                <p className="text-text-2 text-xs">
                  AI generiert dein Cover-Bild...
                </p>
              </div>
            )}

            {bgImageUrl && (
              <div className="w-full max-w-xs space-y-4">
                {/* Background image preview */}
                <div className="relative rounded-xl overflow-hidden border border-border shadow-2xl shadow-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bgImageUrl}
                    alt="Generated cover background"
                    className="w-full aspect-[3/4] object-cover"
                  />
                  {/* Title/Author overlay preview */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 flex flex-col justify-end p-5">
                    {subtitle && (
                      <p
                        className="text-xs font-medium mb-1 drop-shadow-lg"
                        style={{ color: accent }}
                      >
                        {subtitle}
                      </p>
                    )}
                    <h2 className="text-white font-bold text-lg leading-tight drop-shadow-lg">
                      {title || "Dein Titel"}
                    </h2>
                    <p className="text-white/70 text-xs mt-2 drop-shadow">
                      {authors || "Autor"}
                    </p>
                  </div>
                  {/* Accent line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{ backgroundColor: accent }}
                  />
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-seafoam" />
                  <span className="text-[11px] text-seafoam">
                    Hintergrund generiert
                  </span>
                </div>

                {/* Download buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownloadImage}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-bg-3 hover:bg-bg-4 text-text-2 hover:text-text border border-border transition-colors"
                  >
                    Hintergrundbild herunterladen (WebP)
                  </button>

                  {pdfUrl && (
                    <>
                      <div className="flex items-center gap-2 justify-center pt-2">
                        <div className="w-2 h-2 rounded-full bg-seafoam" />
                        <span className="text-[11px] text-seafoam">
                          Cover PDF erstellt
                        </span>
                      </div>
                      <button
                        onClick={handleDownloadPdf}
                        className="w-full py-2.5 rounded-lg text-sm font-semibold bg-accent/15 hover:bg-accent/25 text-accent border border-accent/20 transition-colors"
                      >
                        Cover PDF herunterladen
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-3 shrink-0">
        <Link href="/" className="hover:text-text transition-colors">
          Startseite
        </Link>
        <span>ebook-gen v0.3.0</span>
      </footer>
    </div>
  );
}

export default function CoverPage() {
  return (
    <Suspense>
      <CoverPageInner />
    </Suspense>
  );
}
