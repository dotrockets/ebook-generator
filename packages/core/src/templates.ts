import { readdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

export interface TemplateInfo {
  name: string;
  path: string;
}

export function listTemplates(): TemplateInfo[] {
  if (!existsSync(TEMPLATES_DIR)) return [];

  return readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => existsSync(resolve(TEMPLATES_DIR, d.name, "template.typ")))
    .map((d) => ({
      name: d.name,
      path: resolve(TEMPLATES_DIR, d.name, "template.typ"),
    }));
}

export function getTemplatePath(name: string): string {
  const path = resolve(TEMPLATES_DIR, name, "template.typ");
  if (!existsSync(path)) {
    throw new Error(
      `Template "${name}" not found. Available: ${listTemplates()
        .map((t) => t.name)
        .join(", ")}`
    );
  }
  return path;
}
