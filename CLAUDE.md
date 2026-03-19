# Ebook Generator — Projekt-Kontext

## Was ist das
Ein Tool/SaaS das aus Markdown-Content schoene Ebooks generiert — als PDF, EPUB und DOCX. Gebaut aus der Erfahrung mit beachmoneyteam.com wo wir ein 156-seitiges Ebook komplett automatisiert erstellt haben.

## Vision
4 Produkte aus einer Codebase:
1. **SaaS Web-App** — Upload Markdown, bekomme schoenes Ebook (Freemium + Paid)
2. **CLI Tool** — `npx ebook-gen content.md` → PDF/EPUB/DOCX (Open Source, npm Package)
3. **Service** — "Wir erstellen dein Ebook" (Done-for-you, Premium-Preis)
4. **Templates** — Verkauf von Ebook-Design-Templates auf Digistore24/Gumroad

## Bewiesener Tech Stack (funktioniert bereits!)

### PDF-Generierung: Typst
- **Typst** ist ein modernes Typesetting-System (wie LaTeX, aber 100x einfacher)
- Installieren: `brew install typst`
- Kompiliert in Millisekunden (27x schneller als LaTeX)
- Volle Kontrolle: Custom Fonts, Farben, Layouts, Headers/Footers, Seitenzahlen
- Deutsche Silbentrennung: `#set text(lang: "de")`
- Buch-Templates verfuegbar: wonderous-book, bookly, orange-book
- Pipeline: `Markdown → Pandoc → Typst → PDF`
- Oder: Eigenes Typst-Template + `#include "content.typ"`

### EPUB-Generierung: Pandoc
```bash
pandoc content.md --to=epub3 --toc --toc-depth=2 --epub-cover-image=cover.png --split-level=1 -o book.epub
```

### DOCX-Generierung: Pandoc
```bash
pandoc content.md --to=docx --toc --toc-depth=2 -o book.docx
```

### Bild-Generierung: Replicate API (nano-banana-pro)
- Model: `google/nano-banana-pro` auf Replicate
- Version: `712e06a8e122fb7c8dae55dcf7ad6a8e717afb7b1c41c889fc8c5132fd42f374`
- Aspect Ratios: 16:9 (Kapitel-Header), 1:1 (Cover), 9:16 (Stories)
- Konvertierung: `cwebp -q 82 -resize 1200 675 input.jpg -o output.webp`

### Cover-Generierung: Canva MCP
- Canva API fuer professionelle Book-Covers
- Alternativ: Replicate fuer AI-generierte Cover

## Was wir bei beachmoneyteam.com gebaut haben

### Typst Template (funktioniert!)
Das Template unter beachmoneyteam/ebook/main.typ hat:
- Dark Ocean Theme (customizable Farben)
- Cover Page mit Bild + Titel + Autoren
- Copyright Page
- Inhaltsverzeichnis
- Kapitel mit automatischem Pagebreak
- H1/H2/H3 Heading-Styles mit Akzentfarben
- Custom Fonts (DM Sans + Playfair Display)
- Header/Footer mit Seitenzahlen
- Tabellen im Dark Theme
- Listen mit farbigen Markern
- Bilder zwischen Kapiteln
- Back Page mit Autoren-Info
- Affiliate-Links im Text

### Build-Prozess (funktioniert!)
1. Content in Markdown schreiben (oder AI generieren lassen)
2. `pandoc content.md --to=typst -o content.typ` (Markdown → Typst)
3. Python-Script: Headings hochstufen, Bilder einfuegen, Sonderzeichen fixen
4. `typst compile main.typ book.pdf --root . --font-path fonts/` → PDF
5. `pandoc content.md --to=epub3 ...` → EPUB
6. `pandoc content.md --to=docx ...` → DOCX

### Bekannte Probleme & Loesungen
- **Variable Fonts**: Typst unterstuetzt keine Variable Fonts → statische TTF/OTF verwenden
- **Dollar-Zeichen**: `$` ist Math-Delimiter in Typst → escapen mit `\$`
- **#horizontalrule**: Pandoc generiert `#horizontalrule` fuer `---` → ersetzen mit `#line(...)`
- **Show Rule Loop**: `#show line:` darf nicht `line()` enthalten → Loop-Gefahr
- **Checkbox-Zeichen**: `☐` und `☑` sehen in PDF komisch aus → entfernen
- **Bilder-Pfade**: Bei `#include` sind Pfade relativ zur included Datei, nicht zum Hauptdokument

## Architektur-Vorschlag

```
ebook-generator/
├── packages/
│   ├── core/              — Kern-Logic (Markdown → PDF/EPUB/DOCX)
│   │   ├── src/
│   │   │   ├── convert.ts      — Pandoc Markdown → Typst/EPUB/DOCX
│   │   │   ├── compile.ts      — Typst → PDF
│   │   │   ├── images.ts       — Replicate API fuer Kapitel-Bilder
│   │   │   ├── cover.ts        — Cover-Generierung
│   │   │   ├── template.ts     — Template-Management
│   │   │   └── index.ts        — Public API
│   │   ├── templates/
│   │   │   ├── default/        — Unser Dark Ocean Template
│   │   │   ├── light/          — Helles Template
│   │   │   ├── minimal/        — Minimalistisch
│   │   │   └── magazine/       — Magazin-Style
│   │   └── fonts/
│   ├── cli/               — CLI Tool (`npx ebook-gen`)
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── web/               — SaaS Web-App
│       ├── src/
│       └── package.json
├── templates/             — Verkaufbare Templates
├── turbo.json             — Monorepo Config
└── package.json
```

## Monetarisierung
- **CLI**: Open Source (gratis) → zieht Nutzer an
- **SaaS**: Freemium (3 Ebooks gratis, dann 9€/Mo oder 29€/Mo)
- **Templates**: 5-19€ pro Template auf Gumroad
- **Service**: 99-499€ pro Ebook (Done-for-you)
- **Affiliate**: Hostinger fuer "brauchst du eine Website fuer dein Ebook?"

## Referenz-Dateien (im beachmoneyteam Repo)
- Template: `/Users/dotrockets/WORK/beachmoneyteam/ebook/main.typ`
- Content-Beispiel: `/Users/dotrockets/WORK/beachmoneyteam/ebook/content.typ`
- Build-Script: `/Users/dotrockets/WORK/beachmoneyteam/ebook/build.sh`
- Markdown-Quelle: `/Users/dotrockets/WORK/beachmoneyteam/src/data/ebook-passive-einkommen.md`
- Fonts: `/Users/dotrockets/WORK/beachmoneyteam/ebook/fonts/`
- Fertiges PDF (156 Seiten): `/Users/dotrockets/WORK/beachmoneyteam/ebook/Das-Passive-Einkommen-Playbook.pdf`

## Blotato MCP Guide
Fuer Social Media Automatisierung: `/Users/dotrockets/Documents/blotato-guide.md`

## User
- Name: Bjoern Puls
- Email: mail@bjoernpuls.com
- Bevorzugt autonomes Arbeiten, minimale Rueckfragen
- Deutsch, locker, direkt
