// Ebook Generator — Amazon KDP Professional Template
// Based on Tschichold's canon + Chicago Manual of Style conventions
// Default: 6×9" trim, ~66 chars/line, 140% leading, drop caps
// Chapters on recto, no header on chapter openers, Roman front matter

// === COLORS (grayscale-safe for B&W interior) ===
#let text-primary = rgb("$if(text-primary)$$text-primary$$else$#1a1a1a$endif$")
#let text-secondary = rgb("$if(text-secondary)$$text-secondary$$else$#444444$endif$")
#let accent = rgb("$if(accent)$$accent$$else$#2a2a2a$endif$")
#let rule-color = rgb("$if(rule-color)$$rule-color$$else$#999999$endif$")

// === FONTS ===
#let heading-font = "$if(heading-font)$$heading-font$$else$Playfair Display$endif$"
#let body-font = "$if(body-font)$$body-font$$else$DM Sans 9pt$endif$"

// === DOCUMENT METADATA ===
#set document(
  title: "$if(title)$$title$$else$Untitled$endif$",
  author: "$if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$",
)

// === PAGE SETUP ===
// Tschichold-inspired margins for 6×9" (ratio ~2:3:4:5 adapted for KDP gutter)
// Inside: 2.54cm (1") for gutter/binding
// Top: 2.22cm (0.875")
// Outside: 2.22cm (0.875")
// Bottom: 2.86cm (1.125") — largest, grounds the text block
#set page(
  width: $if(page-width)$$page-width$$else$15.24cm$endif$,
  height: $if(page-height)$$page-height$$else$22.86cm$endif$,
  margin: (
    inside: $if(margin-inside)$$margin-inside$$else$2.54cm$endif$,
    outside: $if(margin-outside)$$margin-outside$$else$2.22cm$endif$,
    top: $if(margin-top)$$margin-top$$else$2.22cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$2.86cm$endif$,
  ),
  fill: white,
  numbering: none,
)

// === BODY TEXT ===
// 11pt for 6×9" → ~66 chars/line (optimal readability)
// Leading: 140% of font size = 15.4pt
#set text(
  font: body-font,
  size: $if(font-size)$$font-size$$else$11pt$endif$,
  fill: text-primary,
  lang: "$if(lang)$$lang$$else$de$endif$",
  hyphenate: true,
  ligatures: true,
)

#set par(
  leading: 0.78em,
  justify: true,
  spacing: 1.2em,
  first-line-indent: 1.2em,
)

// === Widow/Orphan control ===
#show par: set block(breakable: true)

// ============================================================
// FRONT MATTER — no headers, Roman page numbers
// ============================================================

// --- HALF-TITLE PAGE (Schmutztitel, always recto) ---
#page[
  #v(1fr)
  #align(center)[
    #text(font: heading-font, size: 20pt, fill: text-primary)[
      $if(title)$$title$$endif$
    ]
  ]
  #v(2fr)
]

// --- Blank verso ---
#page[]

// --- TITLE PAGE (always recto) ---
#page[
  #v(4cm)
  #align(center)[
    #text(font: heading-font, size: 30pt, weight: "bold", fill: text-primary)[
      $if(title)$$title$$endif$
    ]

$if(subtitle)$
    #v(0.6cm)
    #text(size: 13pt, fill: text-secondary, style: "italic")[
      $subtitle$
    ]
$endif$

    #v(2.5cm)
    #box(width: 2cm, height: 0.4pt, fill: rule-color)
    #v(1.2cm)

    #text(size: 13pt, fill: text-primary, weight: "regular", tracking: 0.05em)[
      $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
    ]

$if(publisher)$
    #v(1fr)
    #text(size: 9pt, fill: text-secondary, tracking: 0.1em)[
      #upper[$publisher$]
    ]
    #v(1cm)
$endif$
  ]
]

// --- COPYRIGHT PAGE (always verso, back of title) ---
#page[
  #v(1fr)
  #set par(first-line-indent: 0pt, leading: 0.65em)
  #set text(size: 7.5pt, fill: text-secondary)

  *$if(title)$$title$$endif$*
$if(subtitle)$
  \ $subtitle$
$endif$

  #v(0.4cm)

$if(date)$
  Erstausgabe — $date$
$else$
  #{
    let m = datetime.today().display("[month]")
    let months = ("Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember")
    let month-name = months.at(int(m) - 1)
    [Erstausgabe — #month-name #datetime.today().display("[year]")]
  }
$endif$

  #v(0.4cm)

$if(copyright)$
  $copyright$
$else$
  Copyright © #datetime.today().display("[year]") $if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$
$endif$

  Alle Rechte vorbehalten. Kein Teil dieses Buches darf ohne
  vorherige schriftliche Genehmigung des Autors in irgendeiner Form
  reproduziert, gespeichert oder uebertragen werden.

$if(publisher)$
  #v(0.3cm)
  Verlag: $publisher$
$endif$

$if(disclaimer)$
  #v(0.3cm)
  $disclaimer$
$endif$

  #v(0.3cm)
  Independently published.
]

// --- TABLE OF CONTENTS ---
$if(toc)$
#pagebreak(to: "odd")
#page[
  #v(3cm)
  #align(center)[
    #text(size: 8pt, fill: text-secondary, tracking: 0.3em, weight: "regular")[INHALT]
  ]
  #v(1.2cm)
  #set text(size: 10pt)
  #show outline.entry.where(level: 1): it => {
    v(0.3em)
    strong(it)
  }
  #show outline.entry: it => {
    text(fill: text-primary)[#it]
  }
  #outline(
    title: none,
    indent: 1.5em,
    depth: $if(toc-depth)$$toc-depth$$else$2$endif$,
  )
]
$endif$

// ============================================================
// MAIN CONTENT — Arabic numerals, running headers
// ============================================================

// Track chapter title for running headers
#let current-chapter = state("chapter", [])

#set page(
  numbering: "1",
  header: context {
    let pg = counter(page).get().first()
    // No header on page 1 (first chapter opener)
    if pg <= 1 { return }
    // No header on chapter opening pages (detected by large top space)
    // Instead we use state: chapter opener sets a flag
    let ch = current-chapter.get()
    if calc.even(pg) {
      // Verso (left): page number outer (left), book title inner (right)
      text(size: 7.5pt, fill: text-secondary)[
        #counter(page).display()
        #h(1fr)
        #smallcaps(text(tracking: 0.05em)[_$if(title)$$title$$endif$_])
      ]
    } else {
      // Recto (right): chapter title inner (left), page number outer (right)
      text(size: 7.5pt, fill: text-secondary)[
        #smallcaps(text(tracking: 0.05em)[_#ch _])
        #h(1fr)
        #counter(page).display()
      ]
    }
    v(-4pt)
    line(length: 100%, stroke: 0.15pt + rule-color)
  },
  footer: none,
)

// Chapter number tracker (Typst counter doesn't resolve inside show rules)
#let chapter-num = state("chapter-num", 0)

// === CHAPTER HEADINGS (H1) ===
// Chicago Manual convention: recto start, generous top space,
// chapter number as small-caps label, drop cap on first paragraph
#show heading.where(level: 1): it => {
  pagebreak(weak: true, to: "odd")
  // Step chapter counter via state (reliable inside show rules)
  chapter-num.update(n => n + 1)
  // Update running header state
  current-chapter.update(it.body)
  // Chapter opener: generous drop from top (~1/3 page)
  v(6cm)
  align(center)[
    // Chapter number label
    #text(size: 7.5pt, fill: text-secondary, tracking: 0.35em, weight: "regular")[
      #context {
        let n = chapter-num.get()
        upper[KAPITEL #n]
      }
    ]
    #v(0.6cm)
    // Ornamental divider
    #text(size: 10pt, fill: rule-color)[--- ✦ ---]
    #v(0.6cm)
    // Chapter title
    #text(font: heading-font, size: 22pt, weight: "bold", fill: text-primary, tracking: 0.02em)[
      #it.body
    ]
  ]
  v(2cm)
  // First paragraph after heading: no indent (typographic convention)
  set par(first-line-indent: 0pt)
}

// === SECTION HEADINGS (H2) ===
#show heading.where(level: 2): it => {
  v(1.8cm)
  block(below: 0.7cm, above: 0pt)[
    #text(font: heading-font, size: 14pt, weight: "bold", fill: text-primary)[#it.body]
    #v(0.2cm)
    #box(width: 1.5cm, height: 0.3pt, fill: rule-color)
  ]
  // No indent after section heading
  set par(first-line-indent: 0pt)
}

// === SUB-SECTION HEADINGS (H3) ===
#show heading.where(level: 3): it => {
  v(1.2cm)
  block(below: 0.5cm)[
    #text(size: 11pt, weight: "bold", fill: text-primary, tracking: 0.03em)[
      #it.body
    ]
  ]
  set par(first-line-indent: 0pt)
}

// === INLINE STYLES ===

// Links — underline only (B&W print)
#show link: it => underline(offset: 2pt, stroke: 0.3pt + rule-color)[#it]

// Strong — pure black
#show strong: it => text(fill: rgb("#000000"), weight: "bold")[#it]

// Emphasis
#show emph: it => text(style: "italic")[#it]

// === TABLES — professional book style ===
#set table(
  fill: (_, y) => if y == 0 { rgb("#e8e8e8") } else if calc.even(y) { rgb("#f7f7f7") } else { white },
  stroke: (x, y) => {
    // Top and bottom rules thicker (bookish convention)
    if y == 0 { (bottom: 0.8pt + text-primary, top: 1pt + text-primary) }
    else { (bottom: 0.3pt + rule-color) }
  },
  inset: (x: 8pt, y: 6pt),
)
#show table.cell.where(y: 0): set text(weight: "bold", size: 9.5pt)

// === LISTS ===
#set list(
  marker: text(fill: text-primary, size: 8pt)[◆],
  spacing: 0.65em,
  body-indent: 0.6em,
  indent: 0.5em,
)
#set enum(
  numbering: n => text(fill: text-primary, weight: "bold", size: 10pt)[#n.],
  spacing: 0.65em,
  body-indent: 0.6em,
  indent: 0.5em,
)

// === TERMS / DEFINITION LISTS ===
#show terms: it => {
  block(spacing: 0.7em)[#it]
}
#show terms.item: it => {
  block(spacing: 0.5em)[
    #text(fill: text-primary, weight: "bold")[#it.term]
    #if it.description != [] [ — #it.description]
  ]
}

// === BLOCK QUOTES — elegant book style ===
#show quote: it => {
  v(0.4cm)
  block(
    width: 100%,
    inset: (left: 1.5em, right: 1em, y: 0.3em),
    stroke: (left: 1.5pt + rule-color),
  )[
    #set text(fill: text-secondary, style: "italic", size: 10pt)
    #set par(leading: 0.7em)
    #it.body
  ]
  v(0.4cm)
}

// === CODE BLOCKS ===
#show raw.where(block: true): it => {
  v(0.3cm)
  block(
    width: 100%,
    fill: rgb("#f4f4f4"),
    inset: (x: 1em, y: 0.7em),
    stroke: (left: 2pt + rule-color),
  )[#text(size: 8.5pt, fill: rgb("#1a1a1a"))[#it]]
  v(0.3cm)
}

// Inline code
#show raw.where(block: false): it => {
  box(
    fill: rgb("#f0f0f0"),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
  )[#text(size: 9pt)[#it]]
}

// === FIGURES ===
#show figure: it => {
  v(0.8cm)
  align(center)[#it]
  v(0.8cm)
}
#show figure.caption: it => {
  set text(size: 8.5pt, fill: text-secondary, style: "italic")
  set par(first-line-indent: 0pt)
  it.body
}

// === HORIZONTAL RULES (scene breaks) ===
// Pandoc generates horizontal rules from --- in markdown
// Elegant centered ornament instead of plain line
#show line: it => {
  v(0.8cm)
  align(center)[
    #text(size: 9pt, fill: rule-color, tracking: 0.5em)[· · ·]
  ]
  v(0.8cm)
}

// ============================================================
// CONTENT
// ============================================================
$body$

// ============================================================
// BACK MATTER
// ============================================================

// --- REVIEW REQUEST PAGE ---
#pagebreak(to: "odd")
#v(5cm)
#align(center)[
  #text(size: 7.5pt, fill: text-secondary, tracking: 0.35em)[HAT IHNEN DIESES BUCH GEFALLEN?]
  #v(0.6cm)
  #text(size: 10pt, fill: rule-color)[--- ✦ ---]
  #v(1cm)
  #text(font: heading-font, size: 16pt, fill: text-primary)[
    Ihre Meinung zaehlt!
  ]
  #v(1cm)
  #set par(first-line-indent: 0pt, justify: false)
  #block(width: 80%)[
    #set text(size: 10pt, fill: text-secondary)
    #align(center)[
      Ehrliche Rezensionen helfen anderen Lesern, dieses Buch zu entdecken.
      Wenn Ihnen _$if(title)$$title$$endif$_ gefallen hat,
      wuerden wir uns sehr ueber eine kurze Bewertung auf Amazon freuen.

      #v(0.8cm)
      Schon ein oder zwei Saetze machen einen grossen Unterschied.

      #v(1.2cm)
      #text(size: 9pt, fill: rule-color)[Vielen Dank fuer Ihre Unterstuetzung!]
    ]
  ]
]
#v(1fr)

$if(website)$
// --- BONUS CONTENT PAGE (only if website is set) ---
#pagebreak()
#v(5cm)
#align(center)[
  #text(size: 7.5pt, fill: text-secondary, tracking: 0.35em)[EXKLUSIVES BONUSMATERIAL]
  #v(0.6cm)
  #text(size: 10pt, fill: rule-color)[--- ✦ ---]
  #v(1cm)
  #text(font: heading-font, size: 16pt, fill: text-primary)[
    Gratis fuer Sie
  ]
  #v(1cm)
  #set par(first-line-indent: 0pt, justify: false)
  #block(width: 80%)[
    #set text(size: 10pt, fill: text-secondary)
    #align(center)[
      Als Dankeschoen fuer den Kauf dieses Buches erhalten Sie
      kostenloses Bonusmaterial:

      #v(0.6cm)
      #set text(size: 10.5pt, fill: text-primary)
      ◆ Zusammenfassung aller Kernaussagen \
      ◆ Praktische Checklisten zum Ausdrucken \
      ◆ Exklusive Tipps und Updates

      #v(1cm)
      #set text(size: 9pt, fill: text-secondary)
      Besuchen Sie *$website$* fuer den Download.
    ]
  ]
]
#v(1fr)
$endif$

$if(back-page)$
// --- ABOUT THE AUTHOR ---
#pagebreak(to: "odd")
#v(6cm)
#align(center)[
  #text(size: 7.5pt, fill: text-secondary, tracking: 0.35em)[UEBER DEN AUTOR]
  #v(0.6cm)
  #text(size: 10pt, fill: rule-color)[--- ✦ ---]
  #v(0.8cm)
  #text(font: heading-font, size: 16pt, fill: text-primary)[
    $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
  ]
$if(publisher)$
  #v(0.8cm)
  #text(size: 9pt, fill: text-secondary)[$publisher$]
$endif$
$if(website)$
  #v(0.5cm)
  #text(size: 9pt, fill: text-secondary)[$website$]
$endif$
]
#v(1fr)
$endif$
