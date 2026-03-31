// Ebook Generator — Amazon KDP Template
// Optimized for Amazon Kindle Direct Publishing paperback printing
// Default trim: 6×9" (most popular KDP size)
// Margins meet KDP minimums with comfortable reading space
// All fonts embedded, no transparency, grayscale-safe

// === THEME COLORS (grayscale-safe defaults for B&W interior) ===
#let text-primary = rgb("$if(text-primary)$$text-primary$$else$#1a1a1a$endif$")
#let text-secondary = rgb("$if(text-secondary)$$text-secondary$$else$#444444$endif$")
#let accent = rgb("$if(accent)$$accent$$else$#2a2a2a$endif$")
#let rule-color = rgb("$if(rule-color)$$rule-color$$else$#aaaaaa$endif$")

// === FONTS ===
#let heading-font = "$if(heading-font)$$heading-font$$else$Playfair Display$endif$"
#let body-font = "$if(body-font)$$body-font$$else$DM Sans 9pt$endif$"

// === DOCUMENT SETUP ===
#set document(
  title: "$if(title)$$title$$else$Untitled$endif$",
  author: "$if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$",
)

// KDP trim size: 6×9" = 15.24cm × 22.86cm (most popular)
// Margins: inside 0.75" (19mm) for 150-300 pages, outside/top/bottom 0.5" (12.7mm)
// These are generous — well above KDP minimums
#set page(
  width: $if(page-width)$$page-width$$else$15.24cm$endif$,
  height: $if(page-height)$$page-height$$else$22.86cm$endif$,
  margin: (
    inside: $if(margin-inside)$$margin-inside$$else$1.9cm$endif$,
    outside: $if(margin-outside)$$margin-outside$$else$1.5cm$endif$,
    top: $if(margin-top)$$margin-top$$else$1.8cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$1.8cm$endif$,
  ),
  fill: white,
  numbering: none,
)

#set text(
  font: body-font,
  size: $if(font-size)$$font-size$$else$10pt$endif$,
  fill: text-primary,
  lang: "$if(lang)$$lang$$else$de$endif$",
  hyphenate: true,
)

#set par(
  leading: 0.85em,
  justify: true,
  spacing: 1.2em,
  first-line-indent: 0.4cm,
)

// === HALF-TITLE PAGE (Schmutztitel) ===
#page[
  #v(1fr)
  #align(center)[
    #text(font: heading-font, size: 22pt, weight: "bold", fill: text-primary)[
      $if(title)$$title$$endif$
    ]
  ]
  #v(1fr)
]

// === TITLE PAGE (Titelseite) ===
#page[
  #v(2cm)
  #align(center)[
    #text(font: heading-font, size: 28pt, weight: "bold", fill: text-primary)[
      $if(title)$$title$$endif$
    ]

$if(subtitle)$
    #v(0.5cm)
    #text(size: 13pt, fill: text-secondary)[
      $subtitle$
    ]
$endif$

    #v(2cm)
    #line(length: 30%, stroke: 0.5pt + rule-color)
    #v(1cm)

    #text(size: 12pt, fill: text-primary)[
      $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
    ]

$if(publisher)$
    #v(3cm)
    #text(size: 10pt, fill: text-secondary)[
      $publisher$
    ]
$endif$
  ]
  #v(1fr)
]

// === COPYRIGHT PAGE ===
#page[
  #v(1fr)
  #text(size: 7.5pt, fill: text-secondary)[
    *$if(title)$$title$$endif$*\
$if(subtitle)$
    $subtitle$\
$endif$
    \
$if(date)$
    Version 1.0 — $date$$else$#{
      let m = datetime.today().display("[month]")
      let months = ("Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember")
      let month-name = months.at(int(m) - 1)
      [Version 1.0 — #month-name #datetime.today().display("[year]")]
    }$endif$\
    \
$if(copyright)$
    $copyright$\
$else$
    © #datetime.today().display("[year]") $if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$. Alle Rechte vorbehalten.\
$endif$
$if(publisher)$
    $publisher$\
$endif$
    \
    Kein Teil dieses Buches darf ohne schriftliche Genehmigung des\
    Autors reproduziert oder uebertragen werden.\
$if(disclaimer)$
    \
    $disclaimer$
$endif$
    \
    \
    Independently published.
  ]
]

// === DEDICATION PAGE (optional, blank for now) ===

// === TABLE OF CONTENTS ===
$if(toc)$
#page[
  #v(0.5cm)
  #text(font: heading-font, size: 22pt, weight: "bold", fill: text-primary)[Inhalt]
  #v(0.6cm)
  #line(length: 100%, stroke: 0.3pt + rule-color)
  #v(0.4cm)
  #set text(size: 9.5pt)
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

// === CONTENT PAGES ===
#set page(
  numbering: "1",
  header: context {
    let pg = counter(page).get().first()
    if pg > 1 {
      if calc.even(pg) {
        // Verso: page number left, book title right
        text(size: 7pt, fill: text-secondary)[
          #counter(page).display()
          #h(1fr)
          #smallcaps[_$if(title)$$title$$endif$_]
        ]
      } else {
        // Recto: author left, page number right
        text(size: 7pt, fill: text-secondary)[
          #smallcaps[_$if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$_]
          #h(1fr)
          #counter(page).display()
        ]
      }
      v(-3pt)
      line(length: 100%, stroke: 0.2pt + rule-color)
    }
  },
  footer: none,
)

// Chapter headings (H1) — recto start, KDP-style drop
#show heading.where(level: 1): it => {
  pagebreak(weak: true, to: "odd")
  v(3cm)
  align(center)[
    #text(size: 8pt, fill: text-secondary, weight: "regular", tracking: 0.3em)[
      KAPITEL #{counter(heading).display()}
    ]
    #v(0.3cm)
    #line(length: 15%, stroke: 0.5pt + rule-color)
    #v(0.3cm)
    #text(font: heading-font, size: 24pt, weight: "bold", fill: text-primary)[#it.body]
  ]
  v(1.5cm)
}

// Section headings (H2)
#show heading.where(level: 2): it => {
  v(1.5cm)
  block(below: 0.6cm, above: 0pt)[
    #text(font: heading-font, size: 15pt, weight: "bold", fill: text-primary)[#it.body]
    #v(0.15cm)
    #line(length: 10%, stroke: 0.3pt + rule-color)
  ]
}

// Sub-section headings (H3)
#show heading.where(level: 3): it => {
  v(1cm)
  block(below: 0.4cm)[
    #text(size: 11pt, weight: "bold", fill: text-primary)[#it.body]
  ]
}

// Links — no color, just underline (KDP is B&W interior)
#show link: it => underline(text(fill: text-primary)[#it])

// Strong
#show strong: it => text(fill: rgb("#000000"), weight: "bold")[#it]

// Emphasis
#show emph: it => text(style: "italic")[#it]

// Tables — clean, minimal strokes
#set table(
  fill: (_, y) => if y == 0 { rgb("#e8e8e8") } else if calc.odd(y) { rgb("#f5f5f5") } else { white },
  stroke: 0.4pt + rule-color,
  inset: 6pt,
)
#show table.cell.where(y: 0): set text(weight: "bold", size: 9pt)

// Lists
#set list(
  marker: text(fill: text-primary, size: 9pt)[--],
  spacing: 0.7em,
  body-indent: 0.4em,
)
#set enum(
  numbering: n => text(fill: text-primary, weight: "bold")[#n.],
  spacing: 0.7em,
  body-indent: 0.4em,
)

// Terms / Definition lists
#show terms: it => {
  block(spacing: 0.7em)[#it]
}
#show terms.item: it => {
  block(spacing: 0.5em)[
    #text(fill: text-primary, weight: "bold")[#it.term]
    #if it.description != [] [ — #it.description]
  ]
}

// Block quotes — indented with thin left rule
#show quote: it => {
  block(
    width: 100%,
    inset: (left: 1em, y: 0.4em),
    stroke: (left: 1pt + rule-color),
  )[
    #text(fill: text-secondary, style: "italic", size: 9.5pt)[#it.body]
  ]
}

// Code blocks
#show raw.where(block: true): it => {
  block(
    width: 100%,
    fill: rgb("#f0f0f0"),
    inset: 0.6em,
    stroke: 0.3pt + rule-color,
  )[#text(size: 8pt, fill: rgb("#1a1a1a"))[#it]]
}

// Figures
#show figure: it => {
  v(0.6cm)
  it
  v(0.6cm)
}
#show figure.caption: it => {
  text(size: 8pt, fill: text-secondary, style: "italic")[#it.body]
}

// === CONTENT ===
$body$

// === ABOUT THE AUTHOR (Recto) ===
$if(back-page)$
#pagebreak(to: "odd")
#v(2cm)
#align(center)[
  #text(size: 8pt, fill: text-secondary, tracking: 0.3em)[UEBER DEN AUTOR]
  #v(0.3cm)
  #line(length: 15%, stroke: 0.3pt + rule-color)
  #v(0.8cm)
  #text(font: heading-font, size: 16pt, fill: text-primary)[
    $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
  ]
$if(publisher)$
  #v(0.5cm)
  #text(size: 9pt, fill: text-secondary)[$publisher$]
$endif$
$if(website)$
  #v(0.6cm)
  #text(size: 9pt, fill: text-secondary)[$website$]
$endif$
]
#v(1fr)
$endif$
