// Ebook Generator — Print-Ready Template
// Professional A4 layout optimized for home/office printing
// Mirror margins for duplex (double-sided) binding
// Based on Tschichold's proportions adapted for A4

// === COLORS ===
#let text-primary = rgb("$if(text-primary)$$text-primary$$else$#1a1a1a$endif$")
#let text-secondary = rgb("$if(text-secondary)$$text-secondary$$else$#444444$endif$")
#let accent = rgb("$if(accent)$$accent$$else$#333333$endif$")
#let rule-color = rgb("$if(rule-color)$$rule-color$$else$#999999$endif$")

// === FONTS ===
#let heading-font = "$if(heading-font)$$heading-font$$else$Playfair Display$endif$"
#let body-font = "$if(body-font)$$body-font$$else$DM Sans 9pt$endif$"

// === DOCUMENT METADATA ===
#set document(
  title: "$if(title)$$title$$else$Untitled$endif$",
  author: "$if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$",
)

// A4 with generous margins for binding
// Inside: 3cm (binding edge), Outside: 2cm, Top: 2.5cm, Bottom: 3cm
#set page(
  paper: "$if(paper)$$paper$$else$a4$endif$",
  margin: (
    inside: $if(margin-inside)$$margin-inside$$else$3cm$endif$,
    outside: $if(margin-outside)$$margin-outside$$else$2cm$endif$,
    top: $if(margin-top)$$margin-top$$else$2.5cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$3cm$endif$,
  ),
  fill: white,
  numbering: none,
)

#set text(
  font: body-font,
  size: 11pt,
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

// === COVER PAGE ===
#page(margin: (x: 3cm, y: 4cm))[
  #align(center)[
    #v(3cm)

$if(cover-image)$
    #block(width: 55%)[
      #image("$cover-image$", width: 100%)
    ]
    #v(1.5cm)
$else$
    #v(3cm)
$endif$

    #box(width: 3cm, height: 0.4pt, fill: rule-color)
    #v(1cm)

    #text(font: heading-font, size: 30pt, weight: "bold", fill: text-primary)[
      $if(title)$$title$$endif$
    ]

$if(subtitle)$
    #v(0.5cm)
    #text(size: 13pt, fill: text-secondary, style: "italic")[
      $subtitle$
    ]
$endif$

    #v(1.5cm)
    #box(width: 3cm, height: 0.4pt, fill: rule-color)
    #v(1cm)

    #text(size: 12pt, fill: text-primary, tracking: 0.05em)[
      $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
    ]

$if(publisher)$
    #v(0.5cm)
    #text(size: 10pt, fill: text-secondary)[$publisher$]
$endif$
  ]
]

// === COPYRIGHT PAGE ===
#page[
  #v(1fr)
  #set par(first-line-indent: 0pt, leading: 0.65em)
  #set text(size: 8pt, fill: text-secondary)

  *$if(title)$$title$$endif$*
$if(subtitle)$
  \ $subtitle$
$endif$

  #v(0.4cm)
$if(date)$
  Version 1.0 — $date$
$else$
  #{
    let m = datetime.today().display("[month]")
    let months = ("Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember")
    let month-name = months.at(int(m) - 1)
    [Version 1.0 — #month-name #datetime.today().display("[year]")]
  }
$endif$

  #v(0.3cm)
$if(copyright)$
  $copyright$
$else$
  © #datetime.today().display("[year]") $if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$
$endif$

  Alle Rechte vorbehalten.
$if(disclaimer)$
  #v(0.3cm)
  $disclaimer$
$endif$

  #v(0.3cm)
  _Dieses Dokument ist für beidseitigen Druck optimiert (Bindung an langer Kante)._
]

// === TABLE OF CONTENTS ===
$if(toc)$
#pagebreak(to: "odd")
#page[
  #v(3cm)
  #align(center)[
    #text(size: 8pt, fill: text-secondary, tracking: 0.3em)[INHALT]
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

// === CONTENT PAGES ===
#let current-chapter = state("chapter", [])

#set page(
  numbering: "1",
  header: context {
    let pg = counter(page).get().first()
    if pg <= 1 { return }
    let ch = current-chapter.get()
    if calc.even(pg) {
      text(size: 7.5pt, fill: text-secondary)[
        #counter(page).display()
        #h(1fr)
        #smallcaps(text(tracking: 0.05em)[_$if(title)$$title$$endif$_])
      ]
    } else {
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

// Chapter number tracker
#let chapter-num = state("chapter-num", 0)

// Chapter headings (H1)
#show heading.where(level: 1): it => {
  pagebreak(weak: true, to: "odd")
  chapter-num.update(n => n + 1)
  current-chapter.update(it.body)
  v(5cm)
  align(center)[
    #text(size: 7.5pt, fill: text-secondary, tracking: 0.35em)[
      #context {
        let n = chapter-num.get()
        upper[KAPITEL #n]
      }
    ]
    #v(0.6cm)
    #text(size: 10pt, fill: rule-color)[--- · ---]
    #v(0.6cm)
    #text(font: heading-font, size: 24pt, weight: "bold", fill: text-primary)[#it.body]
  ]
  v(2cm)
  set par(first-line-indent: 0pt)
}

// Section headings (H2)
#show heading.where(level: 2): it => {
  v(1.8cm)
  block(below: 0.7cm, above: 0pt)[
    #text(font: heading-font, size: 16pt, weight: "bold", fill: text-primary)[#it.body]
    #v(0.2cm)
    #box(width: 1.5cm, height: 0.3pt, fill: rule-color)
  ]
  set par(first-line-indent: 0pt)
}

// Sub-section headings (H3)
#show heading.where(level: 3): it => {
  v(1.2cm)
  block(below: 0.5cm)[
    #text(size: 12pt, weight: "bold", fill: text-primary)[#it.body]
  ]
  set par(first-line-indent: 0pt)
}

// Links
#show link: it => underline(offset: 2pt, stroke: 0.3pt + rule-color)[#it]

// Strong
#show strong: it => text(fill: rgb("#000000"), weight: "bold")[#it]

// Emphasis
#show emph: it => text(style: "italic")[#it]

// Tables
#set table(
  fill: (_, y) => if y == 0 { rgb("#e8e8e8") } else if calc.even(y) { rgb("#f7f7f7") } else { white },
  stroke: (x, y) => {
    if y == 0 { (bottom: 0.8pt + text-primary, top: 1pt + text-primary) }
    else { (bottom: 0.3pt + rule-color) }
  },
  inset: (x: 8pt, y: 6pt),
)
#show table.cell.where(y: 0): set text(weight: "bold", size: 9.5pt)

// Lists
#set list(
  marker: text(fill: text-primary, size: 8pt)[◆],
  spacing: 0.65em,
  body-indent: 0.6em,
)
#set enum(
  numbering: n => text(fill: text-primary, weight: "bold")[#n.],
  spacing: 0.65em,
  body-indent: 0.6em,
)

// Terms
#show terms: it => block(spacing: 0.7em)[#it]
#show terms.item: it => {
  block(spacing: 0.5em)[
    #text(fill: text-primary, weight: "bold")[#it.term]
    #if it.description != [] [ — #it.description]
  ]
}

// Block quotes
#show quote: it => {
  v(0.4cm)
  block(
    width: 100%,
    inset: (left: 1.5em, right: 1em, y: 0.3em),
    stroke: (left: 1.5pt + rule-color),
  )[
    #set text(fill: text-secondary, style: "italic", size: 10pt)
    #it.body
  ]
  v(0.4cm)
}

// Code blocks
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

#show raw.where(block: false): it => {
  box(fill: rgb("#f0f0f0"), inset: (x: 3pt, y: 1pt), radius: 2pt)[#text(size: 9pt)[#it]]
}

// Figures
#show figure: it => { v(0.8cm); align(center)[#it]; v(0.8cm) }
#show figure.caption: it => {
  set text(size: 8.5pt, fill: text-secondary, style: "italic")
  set par(first-line-indent: 0pt)
  it.body
}

// Scene breaks
#show line: it => {
  v(0.8cm)
  align(center)[#text(size: 9pt, fill: rule-color, tracking: 0.5em)[· · ·]]
  v(0.8cm)
}

// === CONTENT ===
$body$

// === BACK PAGE ===
$if(back-page)$
#pagebreak(to: "odd")
#v(1fr)
#align(center)[
  #box(width: 2cm, height: 0.3pt, fill: rule-color)
  #v(0.8cm)
  #text(font: heading-font, size: 18pt, fill: text-primary)[
    $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
  ]
$if(publisher)$
  #v(0.5cm)
  #text(size: 10pt, fill: text-secondary)[$publisher$]
$endif$
$if(website)$
  #v(0.5cm)
  #text(size: 10pt, fill: text-secondary)[$website$]
$endif$
  #v(0.8cm)
  #box(width: 2cm, height: 0.3pt, fill: rule-color)
]
#v(1fr)
$endif$
