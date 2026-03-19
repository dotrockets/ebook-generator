// Ebook Generator — Dark Ocean Template
// A professional dark theme for ebooks
// Usage: pandoc content.md --to=typst --template=template.typ --pdf-engine=typst

// === THEME COLORS (customizable via variables) ===
#let bg-primary = rgb("$if(bg-primary)$$bg-primary$$else$#0a2c37$endif$")
#let bg-secondary = rgb("$if(bg-secondary)$$bg-secondary$$else$#0e4050$endif$")
#let bg-tertiary = rgb("$if(bg-tertiary)$$bg-tertiary$$else$#12576f$endif$")
#let text-primary = rgb("$if(text-primary)$$text-primary$$else$#f5ead6$endif$")
#let text-secondary = rgb("$if(text-secondary)$$text-secondary$$else$#d4b87a$endif$")
#let accent = rgb("$if(accent)$$accent$$else$#e67300$endif$")
#let accent-red = rgb("$if(accent-red)$$accent-red$$else$#ff6b6b$endif$")
#let accent-green = rgb("$if(accent-green)$$accent-green$$else$#69db7c$endif$")

// === FONTS ===
#let heading-font = "$if(heading-font)$$heading-font$$else$Playfair Display$endif$"
#let body-font = "$if(body-font)$$body-font$$else$DM Sans$endif$"

// === DOCUMENT SETUP ===
#set document(
  title: "$if(title)$$title$$else$Untitled$endif$",
  author: "$if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$",
)

#set page(
  paper: "$if(paper)$$paper$$else$a4$endif$",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.2cm, right: 2.2cm),
  fill: bg-primary,
  numbering: none,
)

#set text(
  font: body-font,
  size: 11pt,
  fill: text-primary,
  lang: "$if(lang)$$lang$$else$de$endif$",
  hyphenate: true,
)

#set par(
  leading: 0.85em,
  justify: true,
  spacing: 1.4em,
)

// === COVER PAGE ===
#page(margin: 0pt)[
  #box(width: 100%, height: 100%, fill: bg-primary)[
$if(cover-image)$
    #place(top + center, image("$cover-image$", width: 100%))
    #place(top + center, rect(width: 100%, height: 100%, fill: gradient.linear(
      rgb("#0a2c3700"), rgb("#0a2c3740"), rgb("#0a2c37cc"), rgb("#0a2c37"),
      angle: 180deg,
    )))
$endif$

    #place(bottom + center, dy: -5cm, block(width: 75%)[
      #align(center)[
        #text(font: heading-font, size: 36pt, weight: "bold", fill: text-primary)[
          $if(title)$$title$$endif$
        ]
$if(subtitle)$
        #v(0.4cm)
        #text(size: 15pt, fill: text-secondary)[
          $subtitle$
        ]
$endif$
        #v(1.2cm)
        #rect(width: 60%, height: 1pt, fill: accent)
        #v(0.8cm)
        #text(size: 11pt, fill: accent, weight: "bold")[
          $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
        ]
$if(publisher)$
        #v(0.3cm)
        #text(size: 9pt, fill: text-secondary)[
          $publisher$
        ]
$endif$
      ]
    ])
  ]
]

// === COPYRIGHT PAGE ===
#page[
  #v(1fr)
  #text(size: 8.5pt, fill: text-secondary)[
    *$if(title)$$title$$endif$*\
$if(subtitle)$
    $subtitle$\
$endif$
    \
$if(date)$
    Version 1.0 — $date$$else$#datetime.today().display("[month repr:long] [year]")$endif$\
    \
$if(copyright)$
    $copyright$\
$else$
    © #datetime.today().display("[year]") $if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$\
$endif$
$if(publisher)$
    $publisher$\
$endif$
    \
    Alle Rechte vorbehalten.\
$if(disclaimer)$
    \
    $disclaimer$
$endif$
  ]
]

// === TABLE OF CONTENTS ===
$if(toc)$
#page[
  #v(1cm)
  #text(font: heading-font, size: 28pt, weight: "bold", fill: accent)[Inhalt]
  #v(1cm)
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

// === CONTENT PAGES SETUP ===
#set page(
  numbering: "1",
  number-align: center,
  header: context {
    if counter(page).get().first() > 1 {
      text(size: 7.5pt, fill: text-secondary)[
        $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
        #h(1fr)
        $if(title)$$title$$endif$
      ]
      v(-4pt)
      line(length: 100%, stroke: 0.3pt + bg-secondary)
    }
  },
  footer: context {
    line(length: 100%, stroke: 0.3pt + bg-secondary)
    v(4pt)
    align(center, text(size: 8pt, fill: text-secondary)[#counter(page).display()])
  },
)

// Chapter headings (H1)
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(3.5cm)
  text(font: heading-font, size: 32pt, weight: "bold", fill: accent)[#it.body]
  v(0.5cm)
  line(length: 30%, stroke: 2pt + accent)
  v(1.5cm)
}

// Section headings (H2)
#show heading.where(level: 2): it => {
  v(2cm)
  block(below: 0.8cm, above: 0pt)[
    #text(font: heading-font, size: 20pt, weight: "bold", fill: text-primary)[#it.body]
    #v(0.3cm)
    #line(length: 15%, stroke: 1pt + bg-tertiary)
  ]
}

// Sub-section headings (H3)
#show heading.where(level: 3): it => {
  v(1.4cm)
  block(below: 0.6cm)[
    #text(size: 13pt, weight: "bold", fill: accent)[#it.body]
  ]
}

// Links
#show link: it => text(fill: accent, weight: "medium")[#it]

// Strong
#show strong: it => text(fill: rgb("#ffffff"), weight: "bold")[#it]

// Emphasis
#show emph: it => text(fill: text-secondary, style: "italic")[#it]

// Tables
#set table(
  fill: (_, y) => if y == 0 { bg-secondary } else if calc.odd(y) { rgb("#0c3545") } else { bg-primary },
  stroke: 0.5pt + bg-tertiary,
  inset: 10pt,
)

// Lists
#set list(
  marker: text(fill: accent, weight: "bold", size: 13pt)[•],
  spacing: 1em,
  body-indent: 0.5em,
)
#set enum(
  numbering: n => text(fill: accent, weight: "bold")[#n.],
  spacing: 1em,
  body-indent: 0.5em,
)

// Block quotes
#show quote: it => {
  block(
    width: 100%,
    inset: (left: 1em, y: 0.5em),
    stroke: (left: 2pt + accent),
  )[
    #text(fill: text-secondary, style: "italic")[#it.body]
  ]
}

// Code blocks
#show raw.where(block: true): it => {
  block(
    width: 100%,
    fill: rgb("#0c3545"),
    inset: 1em,
    radius: 8pt,
  )[#text(size: 9pt)[#it]]
}

// Figures
#show figure: it => {
  v(1cm)
  it
  v(1cm)
}
#show figure.caption: it => {
  text(size: 9pt, fill: text-secondary, style: "italic")[#it.body]
}

// === CONTENT ===
$body$

// === BACK PAGE ===
$if(back-page)$
#pagebreak()
#v(1fr)
#align(center)[
  #text(font: heading-font, size: 20pt, fill: accent)[
    $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
  ]
$if(publisher)$
  #v(0.5cm)
  #text(size: 10pt, fill: text-secondary)[$publisher$]
$endif$
$if(website)$
  #v(1cm)
  #text(size: 11pt, fill: accent, weight: "bold")[$website$]
$endif$
]
#v(1fr)
$endif$
