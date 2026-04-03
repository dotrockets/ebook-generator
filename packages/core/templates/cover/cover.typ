// Ebook Generator — Cover Compositor
// Overlays professional typography on AI-generated background
// Compile: typst compile cover.typ cover.pdf

#set page(
  width: $if(page-width)$$page-width$$else$15.24cm$endif$,
  height: $if(page-height)$$page-height$$else$22.86cm$endif$,
  margin: 0pt,
)

#set text(
  lang: "$if(lang)$$lang$$else$de$endif$",
)

// === FONTS ===
#let heading-font = "$if(heading-font)$$heading-font$$else$Playfair Display$endif$"
#let body-font = "$if(body-font)$$body-font$$else$DM Sans 9pt$endif$"

// === COVER STYLE ===
// style: "classic" | "bold" | "minimal" | "dark" | "elegant"
// Each has different text placement, colors, and overlay

#let cover-style = "$if(cover-style)$$cover-style$$else$classic$endif$"

// Common overlay colors
#let overlay-dark = rgb("#000000cc")
#let overlay-light = rgb("#ffffff99")
#let text-white = rgb("#ffffff")
#let text-dark = rgb("#1a1a1a")
#let accent-color = rgb("$if(accent)$$accent$$else$#e67300$endif$")

#page[
  // Background image (full bleed)
  $if(cover-image)$
  #place(top + left)[
    #image("$cover-image$", width: 100%, height: 100%, fit: "cover")
  ]
  $else$
  #place(top + left)[
    #rect(width: 100%, height: 100%, fill: rgb("#1a1a2e"))
  ]
  $endif$

  // Gradient overlay (full page, top-to-bottom: transparent → dark)
  #place(top + left)[
    #rect(width: 100%, height: 100%, fill: gradient.linear(
      rgb("#00000005"),
      rgb("#00000010"),
      rgb("#00000020"),
      rgb("#00000050"),
      rgb("#00000090"),
      rgb("#000000cc"),
      rgb("#000000ee"),
      dir: ttb,
    ))
  ]

  // Title block
  #place(bottom + center, dy: -3.5cm)[
    #block(width: 85%)[
      #align(center)[
        // Title
        #text(
          font: heading-font,
          size: 28pt,
          weight: "bold",
          fill: text-white,
        )[
          $if(title)$$title$$endif$
        ]

        $if(subtitle)$
        #v(0.4cm)
        #text(
          font: body-font,
          size: 12pt,
          fill: rgb("#ffffffcc"),
          style: "italic",
        )[
          $subtitle$
        ]
        $endif$

        // Divider
        #v(0.8cm)
        #rect(width: 3cm, height: 1pt, fill: accent-color)
        #v(0.6cm)

        // Author
        #text(
          font: body-font,
          size: 11pt,
          fill: accent-color,
          weight: "bold",
          tracking: 0.1em,
        )[
          $if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$
        ]

        $if(publisher)$
        #v(0.4cm)
        #text(
          font: body-font,
          size: 8pt,
          fill: rgb("#ffffff88"),
          tracking: 0.15em,
        )[
          #upper[$publisher$]
        ]
        $endif$
      ]
    ]
  ]

  // Top accent bar (subtle)
  #place(top + center)[
    #rect(width: 100%, height: 3pt, fill: accent-color)
  ]
]

$body$
