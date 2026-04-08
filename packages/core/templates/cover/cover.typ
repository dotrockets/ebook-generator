// Ebook Generator — Cover Compositor v2
// 5 Cover-Styles: cinematic, minimal, bold, editorial, split
// Auto-sizing titles, genre-aware typography

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
#let cover-style = "$if(cover-style)$$cover-style$$else$cinematic$endif$"

// === COLORS ===
#let accent-color = rgb("$if(accent)$$accent$$else$#e67300$endif$")
#let text-white = rgb("#ffffff")
#let text-dark = rgb("#0a0a0a")

// === AUTO-SIZE TITLE ===
// Short titles get big, long titles get smaller
#let title-text = "$if(title)$$title$$else$Untitled$endif$"
#let title-len = title-text.len()
#let title-size = if title-len < 15 { 38pt } else if title-len < 25 { 32pt } else if title-len < 40 { 26pt } else { 22pt }
#let subtitle-text = "$if(subtitle)$$subtitle$$else$$endif$"
#let author-text = "$if(author)$$author$$else$$for(authors)$$authors$$sep$ · $endfor$$endif$"

// ============================================================
// STYLE: CINEMATIC
// Full bleed image, dramatic gradient, large centered title at bottom
// Best for: fiction, drama, self-help, emotional topics
// ============================================================
#let cover-cinematic = {
  page[
    // Background
    $if(cover-image)$
    #place(top + left)[
      #image("$cover-image$", width: 100%, height: 100%, fit: "cover")
    ]
    $else$
    #place(top + left)[#rect(width: 100%, height: 100%, fill: rgb("#0f0f23"))]
    $endif$

    // Heavy cinematic gradient — dark bottom 60%
    #place(top + left)[
      #rect(width: 100%, height: 100%, fill: gradient.linear(
        rgb("#00000000"),
        rgb("#00000008"),
        rgb("#00000015"),
        rgb("#00000030"),
        rgb("#00000060"),
        rgb("#000000a0"),
        rgb("#000000d0"),
        rgb("#000000e8"),
        rgb("#000000f5"),
        dir: ttb,
      ))
    ]

    // Accent glow at bottom
    #place(bottom + center)[
      #rect(width: 100%, height: 0.4cm, fill: gradient.linear(
        rgb("#00000000"), accent-color, rgb("#00000000"),
        dir: ltr,
      ))
    ]

    // Title block
    #place(bottom + center, dy: -2.8cm)[
      #block(width: 80%)[
        #align(center)[
          #text(
            font: heading-font,
            size: title-size,
            weight: "bold",
            fill: text-white,
          )[#title-text]

          #if subtitle-text.len() > 0 [
            #v(0.5cm)
            #text(
              font: body-font,
              size: 13pt,
              fill: rgb("#ffffffbb"),
              style: "italic",
            )[#subtitle-text]
          ]

          #v(1cm)
          #rect(width: 4cm, height: 1.5pt, fill: accent-color)
          #v(0.5cm)

          #text(
            font: body-font,
            size: 12pt,
            fill: accent-color,
            weight: "bold",
            tracking: 0.15em,
          )[#upper[#author-text]]
        ]
      ]
    ]
  ]
}

// ============================================================
// STYLE: MINIMAL
// Clean, modern — image top 65%, solid bar bottom 35% with type
// Best for: business, finance, productivity, tech
// ============================================================
#let cover-minimal = {
  page[
    // Solid background
    #place(top + left)[#rect(width: 100%, height: 100%, fill: rgb("#fafafa"))]

    // Image area (top 65%)
    $if(cover-image)$
    #place(top + left)[
      #rect(width: 100%, height: 65%)[
        #image("$cover-image$", width: 100%, height: 100%, fit: "cover")
      ]
    ]
    $endif$

    // Accent line separator
    #place(top + left, dy: 65%)[
      #rect(width: 100%, height: 4pt, fill: accent-color)
    ]

    // Title block (bottom 35%)
    #place(bottom + left, dy: -0.8cm)[
      #block(width: 100%, inset: (x: 1.8cm))[
        #text(
          font: heading-font,
          size: title-size,
          weight: "bold",
          fill: text-dark,
        )[#title-text]

        #if subtitle-text.len() > 0 [
          #v(0.3cm)
          #text(
            font: body-font,
            size: 11pt,
            fill: rgb("#555555"),
          )[#subtitle-text]
        ]

        #v(0.6cm)
        #text(
          font: body-font,
          size: 10pt,
          fill: accent-color,
          weight: "bold",
          tracking: 0.12em,
        )[#upper[#author-text]]
      ]
    ]
  ]
}

// ============================================================
// STYLE: BOLD
// Full bleed image, massive title centered, high contrast
// Best for: health, fitness, motivation, action-oriented
// ============================================================
#let cover-bold = {
  page[
    // Background
    $if(cover-image)$
    #place(top + left)[
      #image("$cover-image$", width: 100%, height: 100%, fit: "cover")
    ]
    $else$
    #place(top + left)[#rect(width: 100%, height: 100%, fill: rgb("#1a1a1a"))]
    $endif$

    // Radial-style vignette (stacked gradients)
    #place(top + left)[
      #rect(width: 100%, height: 100%, fill: gradient.linear(
        rgb("#00000088"), rgb("#00000020"), rgb("#00000020"), rgb("#00000088"),
        dir: ltr,
      ))
    ]
    #place(top + left)[
      #rect(width: 100%, height: 100%, fill: gradient.linear(
        rgb("#00000060"), rgb("#00000010"), rgb("#00000010"), rgb("#00000070"),
        dir: ttb,
      ))
    ]

    // Giant centered title (upper third)
    #place(top + center, dy: 5cm)[
      #block(width: 85%)[
        #align(center)[
          #text(
            font: heading-font,
            size: if title-len < 20 { 42pt } else if title-len < 35 { 34pt } else { 26pt },
            weight: "bold",
            fill: text-white,
          )[#title-text]

          #if subtitle-text.len() > 0 [
            #v(0.6cm)
            #text(
              font: body-font,
              size: 13pt,
              fill: rgb("#ffffffcc"),
            )[#subtitle-text]
          ]
        ]
      ]
    ]

    // Author + accent at bottom
    #place(bottom + center, dy: -2.5cm)[
      #block[
        #align(center)[
          #rect(width: 4cm, height: 2pt, fill: accent-color)
          #v(0.5cm)
          #text(
            font: body-font,
            size: 11pt,
            fill: text-white,
            tracking: 0.2em,
            weight: "bold",
          )[#upper[#author-text]]
        ]
      ]
    ]
  ]
}

// ============================================================
// STYLE: EDITORIAL
// Framed image with border, title in margin — magazine style
// Best for: relationships, parenting, lifestyle, culture
// ============================================================
#let cover-editorial = {
  page[
    // Background
    #place(top + left)[#rect(width: 100%, height: 100%, fill: rgb("#f5f0eb"))]

    // Framed image (with padding)
    $if(cover-image)$
    #place(top + center, dy: 1.5cm)[
      #block(width: 85%, height: 55%)[
        #image("$cover-image$", width: 100%, height: 100%, fit: "cover")
      ]
    ]
    $endif$

    // Title area below image
    #place(bottom + center, dy: -2.5cm)[
      #block(width: 80%)[
        #align(center)[
          // Thin accent line
          #rect(width: 2cm, height: 1pt, fill: accent-color)
          #v(0.6cm)

          #text(
            font: heading-font,
            size: title-size,
            weight: "bold",
            fill: text-dark,
          )[#title-text]

          #if subtitle-text.len() > 0 [
            #v(0.4cm)
            #text(
              font: body-font,
              size: 11pt,
              fill: rgb("#666666"),
              style: "italic",
            )[#subtitle-text]
          ]

          #v(0.8cm)
          #text(
            font: body-font,
            size: 10pt,
            fill: accent-color,
            weight: "bold",
            tracking: 0.12em,
          )[#upper[#author-text]]
        ]
      ]
    ]

    // Top/bottom accent frame lines
    #place(top + left, dy: 0.6cm, dx: 0.6cm)[
      #rect(width: 90%, height: 1pt, fill: accent-color)
    ]
    #place(bottom + left, dy: -0.6cm, dx: 0.6cm)[
      #rect(width: 90%, height: 1pt, fill: accent-color)
    ]
  ]
}

// ============================================================
// STYLE: SPLIT
// Top half: image. Bottom half: solid dark with centered type
// Best for: career, mental health, education, serious topics
// ============================================================
#let cover-split = {
  page[
    // Bottom half solid
    #place(top + left)[#rect(width: 100%, height: 100%, fill: rgb("#111116"))]

    // Top half image
    $if(cover-image)$
    #place(top + left)[
      #rect(width: 100%, height: 52%)[
        #image("$cover-image$", width: 100%, height: 100%, fit: "cover")
      ]
    ]
    $endif$

    // Fade from image into dark
    #place(top + left, dy: 42%)[
      #rect(width: 100%, height: 12%, fill: gradient.linear(
        rgb("#11111600"),
        rgb("#111116"),
        dir: ttb,
      ))
    ]

    // Accent line at split point
    #place(top + left, dy: 52%)[
      #rect(width: 100%, height: 2pt, fill: accent-color)
    ]

    // Title block (bottom half)
    #place(bottom + center, dy: -3cm)[
      #block(width: 80%)[
        #align(center)[
          #text(
            font: heading-font,
            size: title-size,
            weight: "bold",
            fill: text-white,
          )[#title-text]

          #if subtitle-text.len() > 0 [
            #v(0.5cm)
            #text(
              font: body-font,
              size: 12pt,
              fill: rgb("#ffffffaa"),
            )[#subtitle-text]
          ]

          #v(0.8cm)
          #line(length: 3cm, stroke: 1pt + accent-color)
          #v(0.5cm)

          #text(
            font: body-font,
            size: 10pt,
            fill: accent-color,
            weight: "bold",
            tracking: 0.15em,
          )[#upper[#author-text]]
        ]
      ]
    ]
  ]
}

// === RENDER SELECTED STYLE ===
#if cover-style == "minimal" {
  cover-minimal
} else if cover-style == "bold" {
  cover-bold
} else if cover-style == "editorial" {
  cover-editorial
} else if cover-style == "split" {
  cover-split
} else {
  cover-cinematic
}

$body$
