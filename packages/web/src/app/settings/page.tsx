"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Settings {
  defaultAuthor: string;
  defaultPublisher: string;
  defaultWebsite: string;
  template: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  defaultLang: string;
  defaultPaper: string;
  defaultPages: number;
  coverModel: string;
}

const PRESETS: Record<string, Partial<Settings>> = {
  "dark-ocean": {
    bgPrimary: "#0a2c37",
    bgSecondary: "#0e4050",
    bgTertiary: "#12576f",
    textPrimary: "#f5ead6",
    textSecondary: "#d4b87a",
    accent: "#e67300",
  },
  "midnight": {
    bgPrimary: "#0f0f1a",
    bgSecondary: "#1a1a2e",
    bgTertiary: "#2d2d44",
    textPrimary: "#e8e8f0",
    textSecondary: "#9999bb",
    accent: "#7c3aed",
  },
  "forest": {
    bgPrimary: "#0d1f0d",
    bgSecondary: "#1a3a1a",
    bgTertiary: "#2d5a2d",
    textPrimary: "#e8f0e8",
    textSecondary: "#a0c0a0",
    accent: "#22c55e",
  },
  "rose": {
    bgPrimary: "#1a0f14",
    bgSecondary: "#2d1a24",
    bgTertiary: "#442d3a",
    textPrimary: "#f0e8ec",
    textSecondary: "#c0a0b0",
    accent: "#f43f5e",
  },
  "light": {
    bgPrimary: "#ffffff",
    bgSecondary: "#f5f5f5",
    bgTertiary: "#e5e5e5",
    textPrimary: "#1a1a1a",
    textSecondary: "#666666",
    accent: "#2563eb",
  },
};

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border border-ocean-mid/50 cursor-pointer bg-transparent"
      />
      <div className="flex-1">
        <div className="text-xs text-sand-dark">{label}</div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sand text-xs font-mono focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings);
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function applyPreset(name: string) {
    if (!settings) return;
    const preset = PRESETS[name];
    if (preset) {
      setSettings({ ...settings, ...preset, template: name });
    }
  }

  function update(key: keyof Settings, value: string | number) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sand-dark">
        Laden...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-ocean-light px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 rounded-lg bg-sunset flex items-center justify-center text-white font-bold text-sm">
              eb
            </div>
          </Link>
          <h1 className="text-lg font-semibold text-sand">Einstellungen</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-xs text-seafoam">Gespeichert!</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sunset text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-sunset-light transition-colors disabled:opacity-50"
          >
            {saving ? "..." : "Speichern"}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Author Section */}
          <section>
            <h2 className="text-sand font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-ocean-light flex items-center justify-center text-xs">A</span>
              Autor & Publisher
            </h2>
            <div className="space-y-4 bg-ocean-light/30 rounded-xl p-5 border border-ocean-mid/20">
              <div>
                <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                  Standard-Autor
                </label>
                <input
                  type="text"
                  value={settings.defaultAuthor}
                  onChange={(e) => update("defaultAuthor", e.target.value)}
                  className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                  Publisher
                </label>
                <input
                  type="text"
                  value={settings.defaultPublisher}
                  onChange={(e) => update("defaultPublisher", e.target.value)}
                  placeholder="z.B. Dein Verlagsname"
                  className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand placeholder:text-ocean-mid focus:outline-none focus:border-sunset transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                  Website
                </label>
                <input
                  type="text"
                  value={settings.defaultWebsite}
                  onChange={(e) => update("defaultWebsite", e.target.value)}
                  placeholder="z.B. bjoernpuls.com"
                  className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand placeholder:text-ocean-mid focus:outline-none focus:border-sunset transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Theme Section */}
          <section>
            <h2 className="text-sand font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-ocean-light flex items-center justify-center text-xs">T</span>
              Theme
            </h2>
            <div className="space-y-5 bg-ocean-light/30 rounded-xl p-5 border border-ocean-mid/20">
              {/* Presets */}
              <div>
                <label className="block text-xs text-sand-dark mb-2 uppercase tracking-wider">
                  Preset
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(PRESETS).map(([name, preset]) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        settings.template === name
                          ? "border-sunset text-sand bg-ocean-light"
                          : "border-ocean-mid/30 text-sand-dark hover:border-ocean-mid"
                      }`}
                    >
                      <div
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{
                          background: `linear-gradient(135deg, ${preset.bgPrimary}, ${preset.accent})`,
                        }}
                      />
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Grid */}
              <div className="grid grid-cols-2 gap-3">
                <ColorInput
                  label="Hintergrund"
                  value={settings.bgPrimary}
                  onChange={(v) => update("bgPrimary", v)}
                />
                <ColorInput
                  label="Hintergrund 2"
                  value={settings.bgSecondary}
                  onChange={(v) => update("bgSecondary", v)}
                />
                <ColorInput
                  label="Hintergrund 3"
                  value={settings.bgTertiary}
                  onChange={(v) => update("bgTertiary", v)}
                />
                <ColorInput
                  label="Akzentfarbe"
                  value={settings.accent}
                  onChange={(v) => update("accent", v)}
                />
                <ColorInput
                  label="Text"
                  value={settings.textPrimary}
                  onChange={(v) => update("textPrimary", v)}
                />
                <ColorInput
                  label="Text sekundaer"
                  value={settings.textSecondary}
                  onChange={(v) => update("textSecondary", v)}
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-xs text-sand-dark mb-2 uppercase tracking-wider">
                  Vorschau
                </label>
                <div
                  className="rounded-xl p-5 space-y-3 border border-white/5"
                  style={{ background: settings.bgPrimary }}
                >
                  <h3
                    className="text-lg font-bold"
                    style={{ color: settings.accent }}
                  >
                    Kapitel 1: Beispiel
                  </h3>
                  <div
                    className="w-12 h-0.5 rounded"
                    style={{ background: settings.accent }}
                  />
                  <p className="text-sm" style={{ color: settings.textPrimary }}>
                    Dies ist ein <strong>Beispieltext</strong> um zu sehen wie
                    dein Theme aussieht. Die{" "}
                    <em style={{ color: settings.textSecondary }}>
                      sekundaere Textfarbe
                    </em>{" "}
                    wird fuer weniger wichtige Elemente verwendet.
                  </p>
                  <div
                    className="text-xs px-3 py-2 rounded-lg border-l-2"
                    style={{
                      color: settings.textSecondary,
                      borderColor: settings.accent,
                      background: settings.bgSecondary,
                    }}
                  >
                    &gt; Ein Blockquote sieht so aus
                  </div>
                </div>
              </div>

              {/* Fonts */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                    Heading Font
                  </label>
                  <input
                    type="text"
                    value={settings.headingFont}
                    onChange={(e) => update("headingFont", e.target.value)}
                    className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                    Body Font
                  </label>
                  <input
                    type="text"
                    value={settings.bodyFont}
                    onChange={(e) => update("bodyFont", e.target.value)}
                    className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Defaults Section */}
          <section>
            <h2 className="text-sand font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-ocean-light flex items-center justify-center text-xs">D</span>
              Standard-Werte
            </h2>
            <div className="space-y-4 bg-ocean-light/30 rounded-xl p-5 border border-ocean-mid/20">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                    Sprache
                  </label>
                  <select
                    value={settings.defaultLang}
                    onChange={(e) => update("defaultLang", e.target.value)}
                    className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                  >
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="fr">Francais</option>
                    <option value="es">Espanol</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                    Papierformat
                  </label>
                  <select
                    value={settings.defaultPaper}
                    onChange={(e) => update("defaultPaper", e.target.value)}
                    className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                  >
                    <option value="a4">A4</option>
                    <option value="a5">A5</option>
                    <option value="us-letter">US Letter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                    Seiten
                  </label>
                  <select
                    value={settings.defaultPages}
                    onChange={(e) =>
                      update("defaultPages", Number(e.target.value))
                    }
                    className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                  >
                    <option value={10}>~10</option>
                    <option value={15}>~15</option>
                    <option value={20}>~20</option>
                    <option value={30}>~30</option>
                    <option value={50}>~50</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-sand-dark mb-1.5 uppercase tracking-wider">
                  Cover-Modell
                </label>
                <select
                  value={settings.coverModel}
                  onChange={(e) => update("coverModel", e.target.value)}
                  className="w-full bg-ocean-light/80 border border-ocean-mid/50 rounded-lg px-3 py-2 text-sm text-sand focus:outline-none focus:border-sunset transition-colors"
                >
                  <option value="black-forest-labs/flux-schnell">
                    Flux Schnell (schnell, guenstig)
                  </option>
                  <option value="black-forest-labs/flux-1.1-pro">
                    Flux 1.1 Pro (beste Qualitaet)
                  </option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-ocean-light px-6 py-3 flex items-center justify-between text-xs text-ocean-mid shrink-0">
        <Link href="/" className="hover:text-sand transition-colors">
          ← Zurueck
        </Link>
        <span>ebook-gen v0.3.0</span>
      </footer>
    </div>
  );
}
