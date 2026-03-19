import { execa } from "execa";

interface DepCheck {
  name: string;
  command: string;
  args: string[];
  required: boolean;
  installHint: string;
}

const DEPS: DepCheck[] = [
  {
    name: "pandoc",
    command: "pandoc",
    args: ["--version"],
    required: true,
    installHint: "brew install pandoc",
  },
  {
    name: "typst",
    command: "typst",
    args: ["--version"],
    required: false,
    installHint: "brew install typst",
  },
];

export interface DepStatus {
  name: string;
  installed: boolean;
  version?: string;
  required: boolean;
  installHint: string;
}

export async function checkDependencies(): Promise<DepStatus[]> {
  const results: DepStatus[] = [];

  for (const dep of DEPS) {
    try {
      const { stdout } = await execa(dep.command, dep.args);
      const version = stdout.split("\n")[0]?.trim();
      results.push({
        name: dep.name,
        installed: true,
        version,
        required: dep.required,
        installHint: dep.installHint,
      });
    } catch {
      results.push({
        name: dep.name,
        installed: false,
        required: dep.required,
        installHint: dep.installHint,
      });
    }
  }

  return results;
}
