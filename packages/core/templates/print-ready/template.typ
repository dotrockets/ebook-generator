// Ebook Generator — Print-Ready Template
// Optimized for physical printing: mirror margins, B&W friendly,
// chapters on recto pages, orphan/widow control, outer page numbers
// Usage: pandoc content.md --to=typst --template=template.typ --pdf-engine=typst

// === THEME COLORS (print-friendly defaults, minimal ink) ===
#let text-primary = rgb("$if(text-primary)$$text-primary$$else$#1a1a1a$endif$")
#let text-secondary = rgb("$if(text-secondary)$$text-secondary$$else$#444444$endif$")
#let accent = rgb("$if(accent)$$accent$$else$#333333$endif$")
#let rule-color = rgb("$if(rule-color)$$rule-color$$else$#999999$endif$")

// === FONTS ===
#let heading-font = "$if(heading-font)$$heading-font$$else$Playfair Display$endif$"
#let body-font = "$if(body-font)$$body-font$$else$DM Sans 9pt$endif$"

// === DOCUMENT SETUP ===
#set document(
  title: "$if(title)$$title$$else$Untitled$endif$",
  author: "$if(author)$$author$$else$$for(authors)$$authors$$sep$, $endfor$$endif$",
)

// Mirror margins: inside (binding edge) is wider than outside
#set page(
  paper: "$if(paper)$$paper$$else$a4$endif$",
  margin: (
    inside: $if(margin-inside)$$margin-inside$$else$3cm$endif$,
    outside: $if(margin-outside)$$margin-outside$$else$2cm$endif$,
    top: $if(margin-top)$$margin-top$$else$2.5cm$endif$,
    bottom: $if(margin-bottom)$$margin-bottom$$else$2.5cm$endif$,
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
)

#set par(
  leading: 0.9em,
  justify: true,
  spacing: 1.3em,
  first-line-indent: 0.5cm,
)

// Orphan/widow control: minimum 2 lines at top/bottom of page
#set block(breakable: true)

// === COVER PAGE ===
#page(margin: (x: 3cm, y: 4cm))[
  #align(center)[
    #v(3cm)

$if(cover-image)$
    #block(width: 60%)[
      #image("$cover-image$", width: 100%)
    ]
    #v(1.5cm)
$else$
    #v(2cm)
$endif$

    #line(length: 40%, stroke: 0.5pt + rule-color)
    #v(1cm)

    #text(font: heading-font, size: 32pt, weight: "bold", fill: text-primary)[
      $if(title)$$title$$endif$
    ]

$if(subtitle)$
    #v(0.5cm)
    #text(size: 14pt, fill: text-secondary)[
      $subtitle$
    ]
$endif$

    #v(1.5cm)
    #line(length: 40%, stroke: 0.5pt + rule-color)
    #v(1cm)

    #text(size: 12pt, fill: text-primary, weight: "bold")[
      $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
    ]

$if(publisher)$
    #v(0.5cm)
    #text(size: 10pt, fill: text-secondary)[
      $publisher$
    ]
$endif$
  ]
]

// === COPYRIGHT PAGE (always verso / left page) ===
#page[
  #v(1fr)
  #text(size: 8.5pt, fill: text-secondary)[
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
    \
    \
    _Dieses Buch wurde fuer den Druck optimiert. Beste Ergebnisse mit\
    beidseitigem Druck (Bindung an langer Kante)._
  ]
]

// === TABLE OF CONTENTS ===
$if(toc)$
#page[
  #v(1cm)
  #text(font: heading-font, size: 26pt, weight: "bold", fill: text-primary)[Inhalt]
  #v(0.8cm)
  #line(length: 100%, stroke: 0.3pt + rule-color)
  #v(0.5cm)
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
  // Page numbers on outer edge (left on verso, right on recto)
  header: context {
    let pg = counter(page).get().first()
    if pg > 1 {
      if calc.even(pg) {
        // Verso (left page): page number left, book title right
        text(size: 7.5pt, fill: text-secondary)[
          #counter(page).display()
          #h(1fr)
          _$if(title)$$title$$endif$_
        ]
      } else {
        // Recto (right page): chapter right, page number right
        text(size: 7.5pt, fill: text-secondary)[
          $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
          #h(1fr)
          #counter(page).display()
        ]
      }
      v(-4pt)
      line(length: 100%, stroke: 0.3pt + rule-color)
    }
  },
  footer: none,
)

// Chapter headings (H1) — always start on recto (odd/right) page
#show heading.where(level: 1): it => {
  // Force recto: pagebreak to odd page (inserts blank if needed)
  pagebreak(weak: true, to: "odd")
  v(4cm)
  text(font: heading-font, size: 28pt, weight: "bold", fill: text-primary)[#it.body]
  v(0.4cm)
  line(length: 25%, stroke: 1.5pt + accent)
  v(1.5cm)
}

// Section headings (H2)
#show heading.where(level: 2): it => {
  v(1.8cm)
  block(below: 0.7cm, above: 0pt)[
    #text(font: heading-font, size: 18pt, weight: "bold", fill: text-primary)[#it.body]
    #v(0.2cm)
    #line(length: 12%, stroke: 0.5pt + rule-color)
  ]
}

// Sub-section headings (H3)
#show heading.where(level: 3): it => {
  v(1.2cm)
  block(below: 0.5cm)[
    #text(size: 13pt, weight: "bold", fill: text-primary)[#it.body]
  ]
}

// Links — underlined instead of colored (prints well in B&W)
#show link: it => underline(text(fill: text-primary, weight: "medium")[#it])

// Strong
#show strong: it => text(fill: rgb("#000000"), weight: "bold")[#it]

// Emphasis
#show emph: it => text(fill: text-secondary, style: "italic")[#it]

// Tables — clean B&W design
#set table(
  fill: (_, y) => if y == 0 { rgb("#e8e8e8") } else if calc.odd(y) { rgb("#f5f5f5") } else { white },
  stroke: 0.5pt + rule-color,
  inset: 8pt,
)
#show table.cell.where(y: 0): set text(weight: "bold")

// Lists
#set list(
  marker: text(fill: text-primary, size: 11pt)[--],
  spacing: 0.8em,
  body-indent: 0.5em,
)
#set enum(
  numbering: n => text(fill: text-primary, weight: "bold")[#n.],
  spacing: 0.8em,
  body-indent: 0.5em,
)

// Terms / Definition lists
#show terms: it => {
  block(spacing: 0.8em)[#it]
}
#show terms.item: it => {
  block(spacing: 0.6em)[
    #text(fill: text-primary, weight: "bold")[#it.term]
    #if it.description != [] [ — #it.description]
  ]
}

// Block quotes — left border + indent
#show quote: it => {
  block(
    width: 100%,
    inset: (left: 1.2em, y: 0.5em),
    stroke: (left: 1.5pt + rule-color),
  )[
    #text(fill: text-secondary, style: "italic")[#it.body]
  ]
}

// Code blocks — light gray box, no rounded corners (cleaner print)
#show raw.where(block: true): it => {
  block(
    width: 100%,
    fill: rgb("#f0f0f0"),
    inset: 0.8em,
    stroke: 0.3pt + rule-color,
  )[#text(size: 8.5pt, fill: rgb("#1a1a1a"))[#it]]
}

// Figures
#show figure: it => {
  v(0.8cm)
  it
  v(0.8cm)
}
#show figure.caption: it => {
  text(size: 9pt, fill: text-secondary, style: "italic")[#it.body]
}

// === CONTENT ===
$body$

// === BACK PAGE ===
$if(back-page)$
#pagebreak(to: "odd")
#v(1fr)
#align(center)[
  #line(length: 30%, stroke: 0.3pt + rule-color)
  #v(1cm)
  #text(font: heading-font, size: 18pt, fill: text-primary)[
    $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
  ]
$if(publisher)$
  #v(0.5cm)
  #text(size: 10pt, fill: text-secondary)[$publisher$]
$endif$
$if(website)$
  #v(0.8cm)
  #text(size: 10pt, fill: text-secondary)[$website$]
$endif$
  #v(1cm)
  #line(length: 30%, stroke: 0.3pt + rule-color)
]
#v(1fr)
$endif$
