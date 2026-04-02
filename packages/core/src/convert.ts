import { execa } from "execa";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");
const BUNDLED_FONTS = resolve(__dirname, "..", "fonts");
const VALID_PAPER_SIZES = ["a4", "a5", "letter", "legal", "us-letter"];

export interface ConvertOptions {
  /** Input markdown file path */
  input: string;
  /** Output file path */
  output: string;
  /** Book title */
  title: string;
  /** Book subtitle */
  subtitle?: string;
  /** Author name(s) */
  authors: string[];
  /** Language code (default: "de") */
  lang?: string;
  /** Template name (default: "dark-ocean") */
  template?: string;
  /** Custom template path (overrides template name) */
  templatePath?: string;
  /** Cover image path */
  coverImage?: string;
  /** Publisher name */
  publisher?: string;
  /** Website URL */
  website?: string;
  /** Copyright text */
  copyright?: string;
  /** Disclaimer text (e.g. affiliate disclaimer) */
  disclaimer?: string;
  /** Include table of contents (default: true) */
  toc?: boolean;
  /** TOC depth (default: 2) */
  tocDepth?: number;
  /** Include back page (default: true) */
  backPage?: boolean;
  /** Date string */
  date?: string;
  /** Paper size (default: "a4") */
  paper?: string;
  /** Custom page width (e.g. "15.24cm" for KDP 6x9) */
  pageWidth?: string;
  /** Custom page height (e.g. "22.86cm" for KDP 6x9) */
  pageHeight?: string;
  /** Font size (e.g. "10pt") */
  fontSize?: string;
  /** Font directory path */
  fontPath?: string;
  /** Custom Pandoc arguments */
  pandocArgs?: string[];
  /** Custom page margins */
  margins?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    /** Binding edge margin (for print-ready template) */
    inside?: string;
    /** Outer edge margin (for print-ready template) */
    outside?: string;
  };
  /** Custom Typst colors/fonts overrides */
  theme?: {
    bgPrimary?: string;
    bgSecondary?: string;
    bgTertiary?: string;
    textPrimary?: string;
    textSecondary?: string;
    accent?: string;
    accentRed?: string;
    accentGreen?: string;
    headingFont?: string;
    bodyFont?: string;
  };
}

function getTemplatePath(options: ConvertOptions): string {
  if (options.templatePath) return resolve(options.templatePath);
  const name = options.template ?? "dark-ocean";
  const path = resolve(TEMPLATES_DIR, name, "template.typ");
  if (!existsSync(path)) {
    throw new Error(`Template "${name}" not found at ${path}`);
  }
  return path;
}

function buildPandocArgs(options: ConvertOptions, format: string): string[] {
  const args: string[] = [options.input];

  if (format === "pdf") {
    const templatePath = getTemplatePath(options);
    args.push(`--to=typst`, `--template=${templatePath}`, `--pdf-engine=typst`);

    // Variables for the Typst template
    args.push(`--variable=title:${options.title}`);
    if (options.subtitle) args.push(`--variable=subtitle:${options.subtitle}`);
    for (const author of options.authors) {
      args.push(`--variable=authors:${author}`);
    }
    if (options.publisher) args.push(`--variable=publisher:${options.publisher}`);
    if (options.website) args.push(`--variable=website:${options.website}`);
    if (options.copyright) args.push(`--variable=copyright:${options.copyright}`);
    if (options.disclaimer) args.push(`--variable=disclaimer:${options.disclaimer}`);
    if (options.coverImage) {
      // Typst resolves paths relative to the input file's directory
      const inputDir = dirname(resolve(options.input));
      const coverAbs = resolve(options.coverImage);
      const coverRel = relative(inputDir, coverAbs);
      args.push(`--variable=cover-image:${coverRel}`);
    }
    if (options.date) args.push(`--variable=date:${options.date}`);
    if (options.paper) args.push(`--variable=paper:${options.paper}`);
    if (options.pageWidth) args.push(`--variable=page-width:${options.pageWidth}`);
    if (options.pageHeight) args.push(`--variable=page-height:${options.pageHeight}`);
    if (options.fontSize) args.push(`--variable=font-size:${options.fontSize}`);
    if (options.lang) args.push(`--variable=lang:${options.lang}`);
    if (options.toc !== false) args.push("--variable=toc:true");
    if (options.tocDepth) args.push(`--variable=toc-depth:${options.tocDepth}`);
    if (options.backPage !== false) args.push("--variable=back-page:true");

    // Margin overrides
    if (options.margins) {
      const m = options.margins;
      if (m.top) args.push(`--variable=margin-top:${m.top}`);
      if (m.bottom) args.push(`--variable=margin-bottom:${m.bottom}`);
      if (m.left) args.push(`--variable=margin-left:${m.left}`);
      if (m.right) args.push(`--variable=margin-right:${m.right}`);
      if (m.inside) args.push(`--variable=margin-inside:${m.inside}`);
      if (m.outside) args.push(`--variable=margin-outside:${m.outside}`);
    }

    // Theme overrides
    if (options.theme) {
      const t = options.theme;
      if (t.bgPrimary) args.push(`--variable=bg-primary:${t.bgPrimary}`);
      if (t.bgSecondary) args.push(`--variable=bg-secondary:${t.bgSecondary}`);
      if (t.bgTertiary) args.push(`--variable=bg-tertiary:${t.bgTertiary}`);
      if (t.textPrimary) args.push(`--variable=text-primary:${t.textPrimary}`);
      if (t.textSecondary) args.push(`--variable=text-secondary:${t.textSecondary}`);
      if (t.accent) args.push(`--variable=accent:${t.accent}`);
      if (t.accentRed) args.push(`--variable=accent-red:${t.accentRed}`);
      if (t.accentGreen) args.push(`--variable=accent-green:${t.accentGreen}`);
      if (t.headingFont) args.push(`--variable=heading-font:${t.headingFont}`);
      if (t.bodyFont) args.push(`--variable=body-font:${t.bodyFont}`);
    }

    // Font path for typst — auto-detect bundled fonts if not specified
    const fontPath = options.fontPath ?? (existsSync(BUNDLED_FONTS) ? BUNDLED_FONTS : null);
    if (fontPath) {
      args.push(`--pdf-engine-opt=--font-path`, `--pdf-engine-opt=${resolve(fontPath)}`);
    }
  } else if (format === "epub") {
    args.push("--to=epub3");
    args.push(`--metadata=title:${options.title}`);
    if (options.subtitle) args.push(`--metadata=subtitle:${options.subtitle}`);
    args.push(`--metadata=author:${options.authors.join(", ")}`);
    args.push(`--metadata=lang:${options.lang ?? "de"}`);
    if (options.date) args.push(`--metadata=date:${options.date}`);
    if (options.publisher) args.push(`--metadata=publisher:${options.publisher}`);
    if (options.copyright) args.push(`--metadata=rights:${options.copyright}`);
    if (options.coverImage) args.push(`--epub-cover-image=${resolve(options.coverImage)}`);
    if (options.toc !== false) args.push("--toc");
    args.push(`--toc-depth=${options.tocDepth ?? 2}`);
  } else if (format === "docx") {
    args.push("--to=docx");
    args.push(`--metadata=title:${options.title}`);
    if (options.subtitle) args.push(`--metadata=subtitle:${options.subtitle}`);
    args.push(`--metadata=author:${options.authors.join(", ")}`);
    args.push(`--metadata=lang:${options.lang ?? "de"}`);
    if (options.toc !== false) args.push("--toc");
    args.push(`--toc-depth=${options.tocDepth ?? 2}`);
  }

  args.push("-o", options.output);

  if (options.pandocArgs) {
    args.push(...options.pandocArgs);
  }

  return args;
}

export type OutputFormat = "pdf" | "epub" | "docx";

export interface ConvertResult {
  format: OutputFormat;
  outputPath: string;
  duration: number;
}

/**
 * Preprocess markdown to fix known Typst compatibility issues:
 * - `---` horizontal rules → Pandoc generates `#horizontalrule` which Typst doesn't know
 * - `$` dollar signs → math delimiter in Typst, needs escaping
 * - `☐` / `☑` checkbox chars → render badly in PDF
 */
function preprocessMarkdown(inputPath: string, format: OutputFormat): string {
  if (format !== "pdf") return inputPath;

  let content = readFileSync(inputPath, "utf-8");

  // Remove horizontal rules (--- or ***) that aren't frontmatter delimiters
  // Keep the first --- and the closing --- of frontmatter
  const lines = content.split("\n");
  let inFrontmatter = false;
  let frontmatterClosed = false;
  const processed: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (i === 0 && line === "---") {
      inFrontmatter = true;
      processed.push(lines[i]);
      continue;
    }
    if (inFrontmatter && line === "---") {
      inFrontmatter = false;
      frontmatterClosed = true;
      processed.push(lines[i]);
      continue;
    }
    if (frontmatterClosed && /^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      // Replace horizontal rule with empty line
      processed.push("");
      continue;
    }
    processed.push(lines[i]);
  }

  content = processed.join("\n");

  // Escape standalone $ signs (not already escaped, not in math blocks)
  content = content.replace(/(?<!\\)\$(?!\$)/g, "\\$");

  // Convert checkbox lists to normal lists
  content = content.replace(/^(\s*)- \[x\] /gm, "$1- ✓ ");
  content = content.replace(/^(\s*)- \[ \] /gm, "$1- ○ ");

  // Remove checkbox characters that render badly
  content = content.replace(/[☐☑☒]/g, "");

  // Write preprocessed file
  const preprocessedPath = inputPath.replace(/\.md$/, ".preprocessed.md");
  try {
    writeFileSync(preprocessedPath, content, "utf-8");
  } catch (err) {
    throw new Error(`Failed to write preprocessed file: ${err instanceof Error ? err.message : err}`);
  }
  return preprocessedPath;
}

export async function convert(
  options: ConvertOptions,
  format: OutputFormat
): Promise<ConvertResult> {
  if (!existsSync(options.input)) {
    throw new Error(`Input file not found: ${options.input}`);
  }
  if (options.paper && !VALID_PAPER_SIZES.includes(options.paper)) {
    throw new Error(`Invalid paper size "${options.paper}". Valid: ${VALID_PAPER_SIZES.join(", ")}`);
  }

  // Ensure output directory exists
  const outputDir = dirname(resolve(options.output));
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Preprocess markdown for Typst compatibility
  const processedInput = preprocessMarkdown(options.input, format);
  const processedOptions = { ...options, input: processedInput };

  const start = performance.now();
  const args = buildPandocArgs(processedOptions, format);

  try {
    await execa("pandoc", args, {
      stdio: "pipe",
      cwd: dirname(resolve(processedOptions.input)),
    });
  } catch (err: unknown) {
    const stderr = (err as { stderr?: string }).stderr;
    throw new Error(`Pandoc conversion failed (${format}): ${stderr || (err instanceof Error ? err.message : err)}`);
  } finally {
    // Clean up preprocessed temp file
    if (processedInput !== options.input) {
      try { unlinkSync(processedInput); } catch { /* ignore */ }
    }
  }

  const duration = Math.round(performance.now() - start);

  return {
    format,
    outputPath: resolve(options.output),
    duration,
  };
}

export async function generateCoverPdf(options: {
  backgroundImage: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  accent?: string;
  headingFont?: string;
  bodyFont?: string;
  pageWidth?: string;
  pageHeight?: string;
  fontPath?: string;
  output: string;
}): Promise<string> {
  const coverTemplatePath = resolve(TEMPLATES_DIR, "cover", "cover.typ");
  if (!existsSync(coverTemplatePath)) {
    throw new Error("Cover template not found at " + coverTemplatePath);
  }

  // Create a minimal markdown file with frontmatter for Pandoc
  const tempDir = dirname(resolve(options.output));
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
  const tempMd = join(tempDir, "cover-input.md");
  writeFileSync(tempMd, "---\n---\n", "utf-8");

  const args: string[] = [
    tempMd,
    "--to=typst",
    `--template=${coverTemplatePath}`,
    "--pdf-engine=typst",
    `--variable=title:${options.title}`,
  ];

  if (options.subtitle) args.push(`--variable=subtitle:${options.subtitle}`);
  for (const author of options.authors) {
    args.push(`--variable=authors:${author}`);
  }
  if (options.publisher) args.push(`--variable=publisher:${options.publisher}`);
  if (options.accent) args.push(`--variable=accent:${options.accent}`);
  if (options.headingFont) args.push(`--variable=heading-font:${options.headingFont}`);
  if (options.bodyFont) args.push(`--variable=body-font:${options.bodyFont}`);
  if (options.pageWidth) args.push(`--variable=page-width:${options.pageWidth}`);
  if (options.pageHeight) args.push(`--variable=page-height:${options.pageHeight}`);

  // Cover image path relative to temp markdown file
  const coverRel = relative(tempDir, resolve(options.backgroundImage));
  args.push(`--variable=cover-image:${coverRel}`);

  args.push("-o", options.output);

  // Font path
  const fontPath = options.fontPath ?? (existsSync(BUNDLED_FONTS) ? BUNDLED_FONTS : null);
  if (fontPath) {
    args.push("--pdf-engine-opt=--font-path", `--pdf-engine-opt=${resolve(fontPath)}`);
  }

  try {
    await execa("pandoc", args, { stdio: "pipe", cwd: tempDir });
  } catch (err: unknown) {
    const stderr = (err as { stderr?: string }).stderr;
    throw new Error(`Cover generation failed: ${stderr || (err instanceof Error ? err.message : err)}`);
  } finally {
    try { unlinkSync(tempMd); } catch { /* ignore */ }
  }

  return options.output;
}

export async function convertAll(
  options: Omit<ConvertOptions, "output">,
  outputDir: string,
  formats: OutputFormat[] = ["pdf", "epub", "docx"]
): Promise<ConvertResult[]> {
  const slug = options.title
    .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const results: ConvertResult[] = [];

  for (const format of formats) {
    const output = resolve(outputDir, `${slug}.${format}`);
    const result = await convert({ ...options, output }, format);
    results.push(result);
  }

  return results;
}
