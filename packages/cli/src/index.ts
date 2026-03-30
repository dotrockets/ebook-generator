#!/usr/bin/env node

import { parseArgs } from "node:util";
import { resolve, basename, dirname, extname } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  convert,
  convertAll,
  checkDependencies,
  listTemplates,
  type OutputFormat,
  type ConvertOptions,
} from "@ebook-gen/core";
import matter from "gray-matter";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    output: { type: "string", short: "o" },
    format: { type: "string", short: "f" },
    title: { type: "string", short: "t" },
    subtitle: { type: "string" },
    author: { type: "string", short: "a", multiple: true },
    template: { type: "string" },
    "cover-image": { type: "string" },
    "font-path": { type: "string" },
    lang: { type: "string" },
    publisher: { type: "string" },
    website: { type: "string" },
    "no-toc": { type: "boolean" },
    "toc-depth": { type: "string" },
    paper: { type: "string" },
    quiet: { type: "boolean", short: "q" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
    check: { type: "boolean" },
    templates: { type: "boolean" },
  },
});

function printHelp() {
  console.log(`
  ebook-gen — Generate beautiful ebooks from Markdown

  Usage:
    ebook-gen <input.md> [options]
    ebook-gen content.md -o book.pdf
    ebook-gen content.md -f pdf,epub,docx

  Options:
    -o, --output <path>      Output file path (default: <title>.<format>)
    -f, --format <formats>   Output formats: pdf, epub, docx (comma-separated, default: pdf)
    -t, --title <title>      Book title (or set in frontmatter)
    -a, --author <name>      Author name (repeatable, or set in frontmatter)
    --subtitle <text>        Book subtitle
    --template <name>        Template name (default: dark-ocean)
    --cover-image <path>     Cover image path
    --font-path <path>       Custom fonts directory
    --lang <code>            Language code (default: de)
    --publisher <name>       Publisher name
    --website <url>          Website URL
    --no-toc                 Disable table of contents
    --toc-depth <n>          TOC depth (default: 2)
    --paper <size>           Paper size: a4, a5, us-letter (default: a4)
    -q, --quiet              Suppress non-error output
    --check                  Check if dependencies are installed
    --templates              List available templates
    -h, --help               Show this help
    -v, --version            Show version

  Frontmatter:
    You can set options in your Markdown frontmatter:
    ---
    title: My Book
    subtitle: A great subtitle
    authors: [Alice, Bob]
    template: dark-ocean
    cover-image: cover.png
    lang: de
    ---
`);
}

async function main() {
  if (values.version) {
    const pkg = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf-8")
    );
    console.log(pkg.version);
    return;
  }

  if (values.help) {
    printHelp();
    return;
  }

  if (values.check) {
    const deps = await checkDependencies();
    console.log("\n  Dependencies:\n");
    for (const dep of deps) {
      const status = dep.installed ? "✓" : "✗";
      const color = dep.installed ? "\x1b[32m" : "\x1b[31m";
      console.log(
        `  ${color}${status}\x1b[0m ${dep.name}${dep.version ? ` (${dep.version})` : ""}`
      );
      if (!dep.installed) {
        console.log(`    Install: ${dep.installHint}`);
      }
    }
    console.log();

    const missing = deps.filter((d) => d.required && !d.installed);
    if (missing.length > 0) {
      console.error("  Missing required dependencies!");
      process.exit(1);
    }
    return;
  }

  if (values.templates) {
    const templates = listTemplates();
    console.log("\n  Available templates:\n");
    for (const t of templates) {
      console.log(`  • ${t.name}`);
    }
    console.log();
    return;
  }

  const input = positionals[0];
  if (!input) {
    console.error("Error: No input file specified.\n");
    printHelp();
    process.exit(1);
  }

  const inputPath = resolve(input);
  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  // Parse frontmatter
  const raw = readFileSync(inputPath, "utf-8");
  const { data: fm } = matter(raw);

  const title = values.title ?? fm.title ?? basename(input, extname(input));
  const authors: string[] =
    values.author ?? fm.authors ?? (fm.author ? [fm.author] : ["Unknown"]);

  const options: ConvertOptions = {
    input: inputPath,
    output: "", // set per format
    title,
    subtitle: values.subtitle ?? fm.subtitle,
    authors,
    lang: values.lang ?? fm.lang ?? "de",
    template: values.template ?? fm.template ?? "dark-ocean",
    coverImage: values["cover-image"] ?? fm["cover-image"],
    fontPath: values["font-path"] ?? fm["font-path"],
    publisher: values.publisher ?? fm.publisher,
    website: values.website ?? fm.website,
    toc: !values["no-toc"],
    tocDepth: values["toc-depth"] ? (() => {
      const d = parseInt(values["toc-depth"]!);
      if (isNaN(d) || d < 1 || d > 6) {
        console.error("Error: --toc-depth must be a number between 1 and 6");
        process.exit(1);
      }
      return d;
    })() : (fm["toc-depth"] ?? 2),
    paper: values.paper ?? fm.paper ?? "a4",
    date: fm.date,
  };

  // Determine and validate formats
  const formatStr = values.format ?? fm.format ?? "pdf";
  const VALID_FORMATS = ["pdf", "epub", "docx"];
  const formats: string[] = formatStr.split(",").map((f: string) => f.trim());
  const invalid = formats.find((f: string) => !VALID_FORMATS.includes(f));
  if (invalid) {
    console.error(`Error: Invalid format "${invalid}". Valid formats: ${VALID_FORMATS.join(", ")}`);
    process.exit(1);
  }

  const log = values.quiet ? () => {} : console.log;

  // Determine output
  if (values.output && formats.length === 1) {
    options.output = resolve(values.output);
    const result = await convert(options, formats[0] as OutputFormat);
    log(`\n  ✓ ${result.format.toUpperCase()} → ${result.outputPath} (${result.duration}ms)\n`);
  } else {
    const outputDir = values.output ? resolve(values.output) : dirname(inputPath);
    const results = await convertAll(options, outputDir, formats as OutputFormat[]);
    log();
    for (const result of results) {
      log(`  ✓ ${result.format.toUpperCase()} → ${result.outputPath} (${result.duration}ms)`);
    }
    log();
  }
}

main().catch((err) => {
  console.error(`\n  Error: ${err.message}\n`);
  if (err.stderr) console.error(err.stderr);
  process.exit(1);
});
