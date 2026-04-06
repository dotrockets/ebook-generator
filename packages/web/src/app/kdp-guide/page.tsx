"use client";

import Link from "next/link";

export default function KdpGuidePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header - same style as other pages */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
              eb
            </div>
          </Link>
          <h1 className="text-lg font-semibold text-text">KDP Upload-Guide</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/reddit" className="text-xs text-text-2 hover:text-text transition-colors">Reddit</Link>
          <Link href="/library" className="text-xs text-text-2 hover:text-text transition-colors">Library</Link>
          <Link href="/create" className="text-xs bg-accent text-white px-4 py-1.5 rounded-lg font-medium hover:bg-accent-light transition-colors">+ Erstellen</Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Intro */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-text">Dein Buch auf Amazon veroeffentlichen</h2>
            <p className="text-text-2 text-sm">Schritt-fuer-Schritt Anleitung — von der Generierung bis zum Verkauf auf Amazon.</p>
          </div>

          {/* Step 1 */}
          <Step number={1} title="Ebook generieren">
            <p>Gehe zu <Link href="/create" className="text-accent hover:underline">Erstellen</Link> und waehle:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li><strong>Template: Amazon KDP</strong> — optimiert fuer 6x9&quot; Taschenbuch</li>
              <li><strong>Format: PDF</strong> — fuer das Taschenbuch-Interior</li>
              <li>Optional: EPUB fuer die Kindle-eBook-Version</li>
            </ul>
            <Tip>Waehle ~20 Seiten fuer einen kurzen Ratgeber oder ~50 fuer ein ausfuehrliches Buch.</Tip>
          </Step>

          {/* Step 2 */}
          <Step number={2} title="Cover erstellen">
            <p>Gehe in die <Link href="/library" className="text-accent hover:underline">Library</Link> und klicke auf <strong>&quot;Cover&quot;</strong> neben deinem Buch.</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Alle Felder sind bereits vorausgefuellt</li>
              <li>Passe die Bildbeschreibung an wenn noetig</li>
              <li>Klicke &quot;Hintergrund generieren&quot; → dann &quot;Cover PDF erstellen&quot;</li>
              <li>Lade das <strong>Cover PDF</strong> herunter</li>
            </ul>
            <Tip>KDP braucht ein separates Cover-PDF. Das Interior-PDF hat KEIN Cover — das ist richtig so!</Tip>
          </Step>

          {/* Step 3 */}
          <Step number={3} title="KDP-Metadaten kopieren">
            <p>In der Library, klicke den <strong>&quot;KDP&quot;</strong> Button neben deinem Buch. Dort findest du:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <MetaField label="Amazon-Titel" desc="Kopieren → KDP Feld 'Titel'" />
              <MetaField label="Amazon-Untertitel" desc="Kopieren → KDP Feld 'Untertitel'" />
              <MetaField label="Beschreibung (HTML)" desc="Kopieren → KDP Feld 'Beschreibung'" />
              <MetaField label="7 Keywords" desc="Einzeln in die 7 Keyword-Felder" />
              <MetaField label="3 Kategorien" desc="Bei KDP die passenden auswaehlen" />
              <MetaField label="Preis-Empfehlung" desc="Als Startpreis verwenden" />
            </div>
          </Step>

          {/* Step 4 */}
          <Step number={4} title="Bei KDP anmelden & Buch erstellen">
            <p>Gehe zu <strong>kdp.amazon.com</strong> und melde dich an (oder erstelle ein Konto).</p>
            <ol className="list-decimal list-inside space-y-2 mt-3">
              <li>Klicke <strong>&quot;+ Taschenbuch erstellen&quot;</strong> (oder &quot;+ Kindle eBook&quot;)</li>
              <li>Waehle die Sprache deines Buchs</li>
              <li>Gib den <strong>Titel</strong> und <strong>Untertitel</strong> ein (aus dem KDP-Panel kopieren)</li>
              <li>Autoren-Name eintragen</li>
              <li><strong>Beschreibung</strong> einfuegen (HTML wird unterstuetzt!)</li>
              <li><strong>Keywords</strong> eingeben (7 Felder, je eins pro Keyword)</li>
              <li><strong>Kategorien</strong> waehlen (die vorgeschlagenen Pfade helfen bei der Suche)</li>
            </ol>
            <Warning>KDP fragt ob AI-generierter Inhalt enthalten ist — mit &quot;Ja&quot; antworten!</Warning>
          </Step>

          {/* Step 5 */}
          <Step number={5} title="Taschenbuch-Inhalt hochladen">
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>ISBN: Waehle <strong>&quot;Kostenlose KDP-ISBN&quot;</strong> (oder eigene)</li>
              <li>Erscheinungsdatum: Heute oder Wunschdatum</li>
              <li>Druckoptionen:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li><strong>Trimgroesse: 6 x 9 Zoll</strong> (15.24 x 22.86 cm)</li>
                  <li><strong>Beschnitt: Kein Anschnitt</strong></li>
                  <li><strong>Papierfarbe: Weiss</strong></li>
                  <li><strong>Druckfarbe: Schwarz-Weiss</strong></li>
                </ul>
              </li>
              <li>Manuskript hochladen: <strong>Deine PDF-Datei</strong> (aus der Library)</li>
              <li>Cover hochladen: <strong>Dein Cover-PDF</strong> (vom Cover Generator)</li>
              <li>Vorschau pruefen im KDP-Previewer</li>
            </ol>
            <Tip>Die Pre-Flight Daten im KDP-Panel zeigen dir die genauen Masse und die Rueckenbreite.</Tip>
          </Step>

          {/* Step 6 - Kindle eBook */}
          <Step number={6} title="Kindle eBook hochladen (optional)">
            <p>Fuer die digitale Kindle-Version:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>In der Library: Exportiere dein Buch als <strong>EPUB</strong></li>
              <li>Bei KDP: &quot;+ Kindle eBook erstellen&quot;</li>
              <li>Gleiche Metadaten verwenden (Titel, Beschreibung, Keywords)</li>
              <li>EPUB-Datei als Manuskript hochladen</li>
              <li>Cover-Bild hochladen (das <strong>WebP/JPG aus der Library</strong>, nicht das PDF)</li>
            </ol>
            <Tip>EPUB ist besser als DOCX fuer Kindle — es hat ein echtes navigierbares Inhaltsverzeichnis das Kindle sofort erkennt.</Tip>
            <Warning>Kindle eBook Cover: JPG/PNG, mindestens 1000x1600 px, ideal 2560x1600 px. Kein PDF!</Warning>
          </Step>

          {/* Step 7 */}
          <Step number={7} title="Preis festlegen & veroeffentlichen">
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Preis eingeben (siehe Empfehlung im KDP-Panel)</li>
              <li>Taschenbuch: Ab <strong>9,99 EUR</strong> fuer 60% Tantiemen</li>
              <li>eBook: <strong>2,99 - 9,99 EUR</strong> fuer 70% Tantiemen</li>
              <li>Maerkte auswaehlen (alle empfohlen)</li>
              <li><strong>&quot;Taschenbuch veroeffentlichen&quot;</strong> klicken</li>
            </ol>
            <Tip>Bestelle erst ein <strong>Korrekturexemplar</strong> bevor du veroeffentlichst! So kannst du Druck und Layout pruefen.</Tip>
          </Step>

          {/* Step 8 */}
          <Step number={8} title="Nach der Veroeffentlichung">
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Buch ist in 24-72 Stunden auf Amazon verfuegbar</li>
              <li>Nutze die <strong>Social Media Posts</strong> aus dem KDP-Panel zum Bewerben</li>
              <li>Bitte Leser um <strong>Rezensionen</strong> (die Review-Seite im Buch hilft dabei!)</li>
              <li>Verlinke die Bonus-Seite im Buch mit deiner Website fuer E-Mail-Liste</li>
            </ul>
          </Step>

          {/* File reference */}
          <div className="bg-bg-2 border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-text font-semibold text-sm">Welche Datei wohin?</h3>
            <div className="space-y-2 text-sm">
              <FileRow file="PDF (KDP-Template)" target="KDP → Taschenbuch → Manuskript hochladen" />
              <FileRow file="Cover PDF" target="KDP → Taschenbuch → Buchcover hochladen" />
              <FileRow file="EPUB" target="KDP → Kindle eBook → Manuskript hochladen" />
              <FileRow file="Cover WebP/JPG" target="KDP → Kindle eBook → Buchcover hochladen" />
              <FileRow file="DOCX" target="Alternative zu EPUB fuer Kindle eBook" />
              <FileRow file="KDP-Metadaten" target="Titel, Beschreibung, Keywords → KDP Buchdetails" />
              <FileRow file="Social Media Posts" target="Instagram, Twitter, Facebook nach Veroeffentlichung" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-text-3 shrink-0">
        <Link href="/" className="hover:text-text transition-colors">← Startseite</Link>
        <span>ebook-gen v0.3.0</span>
      </footer>
    </div>
  );
}

// Helper components

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-2 border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
          {number}
        </div>
        <h3 className="text-text font-semibold">{title}</h3>
      </div>
      <div className="text-text-2 text-sm leading-relaxed pl-11">
        {children}
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs text-accent">
      <strong>Tipp:</strong> {children}
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-coral/10 border border-coral/20 text-xs text-coral">
      <strong>Wichtig:</strong> {children}
    </div>
  );
}

function MetaField({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-bg-3 rounded-lg px-3 py-2">
      <div className="text-text text-xs font-semibold">{label}</div>
      <div className="text-text-3 text-[10px]">{desc}</div>
    </div>
  );
}

function FileRow({ file, target }: { file: string; target: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-accent font-mono text-xs w-40 shrink-0">{file}</span>
      <span className="text-text-3">→</span>
      <span className="text-text-2">{target}</span>
    </div>
  );
}
