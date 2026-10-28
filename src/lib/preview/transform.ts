// Client-side Sucrase transform of JSX/TSX + import stubbing.
// Spec: specs/05-preview-sandbox.md §5.3, specs/03 §3.3
// Task: T1.10
import { transform } from "sucrase";
import type { Options } from "sucrase";

/** Shared by the preview (client) and by validation (server) so both accept exactly the same code. */
export const SUCRASE_OPTIONS: Options = {
  transforms: ["jsx", "typescript", "imports"],
  jsxRuntime: "classic",
  production: true,
};

export interface TransformResult {
  /** Plain JS that assigns the module's exports to `exports` (wrapped by srcdoc.ts). */
  js: string;
  /** Packages whose imports were replaced by placeholders. */
  stubbed: string[];
  /** Name of the last capitalised function/const, used when there is no export. */
  fallbackName: string | null;
}

const IMPORT_FROM = /^[ \t]*import\s+([^;'"]*?)\s+from\s+(['"])([^'"\n]+)\2[ \t]*;?/gm;
const IMPORT_BARE = /^[ \t]*import\s+(['"])[^'"\n]+\1[ \t]*;?/gm;
const IDENT = /^[A-Za-z_$][\w$]*$/;

function stubDeclarations(clause: string): string {
  const decls: string[] = [];
  let rest = clause.trim();

  const ns = /^(?:([\w$]+)\s*,\s*)?\*\s+as\s+([\w$]+)$/.exec(rest);
  if (ns) {
    if (ns[1]) decls.push(`${ns[1]} = __stub(${JSON.stringify(ns[1])})`);
    decls.push(`${ns[2]} = new Proxy({}, { get: function (_, k) { return __stub(String(k)); } })`);
    return decls.length ? `const ${decls.join(", ")};` : "";
  }

  const braces = /\{([\s\S]*)\}/.exec(rest);
  if (braces) {
    rest = rest.replace(braces[0], "").replace(/,\s*$/, "").trim();
    for (const spec of braces[1].split(",")) {
      const s = spec.trim();
      if (!s || /^type\s/.test(s)) continue;
      const [imported, local = imported] = s.split(/\s+as\s+/).map((x) => x.trim());
      if (IDENT.test(imported) && IDENT.test(local)) decls.push(`${local} = __stub(${JSON.stringify(imported)})`);
    }
  }
  if (rest && IDENT.test(rest)) decls.push(`${rest} = __stub(${JSON.stringify(rest)})`);
  return decls.length ? `const ${decls.join(", ")};` : "";
}

function reactDeclarations(clause: string): string {
  const braces = /\{([\s\S]*)\}/.exec(clause);
  if (!braces) return ""; // default / namespace: React is already global in the frame
  const names = braces[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !/^type\s/.test(s))
    .map((s) => {
      const [imported, local] = s.split(/\s+as\s+/).map((x) => x.trim());
      return local && local !== imported ? `${imported}: ${local}` : imported;
    });
  return names.length ? `const { ${names.join(", ")} } = React;` : "";
}

/** Replaces every import: `react` becomes a destructure of the global React; anything else becomes a placeholder. */
export function stubImports(source: string): { code: string; stubbed: string[] } {
  const stubbed = new Set<string>();
  const code = source
    .replace(IMPORT_FROM, (_m, clause: string, _q: string, pkg: string) => {
      if (/^type\s/.test(clause.trim())) return ""; // import type {...}
      if (pkg === "react") return reactDeclarations(clause);
      const decl = stubDeclarations(clause);
      if (decl) stubbed.add(pkg);
      return decl;
    })
    .replace(IMPORT_BARE, "");
  return { code, stubbed: [...stubbed] };
}

function lastCapitalised(source: string): string | null {
  let name: string | null = null;
  for (const m of source.matchAll(/\b(?:function|const|let|var|class)\s+([A-Z][\w$]*)/g)) name = m[1];
  return name;
}

/** Throws if the code does not compile. */
export function transformJsx(source: string): TransformResult {
  const { code, stubbed } = stubImports(source);
  const js = transform(code, SUCRASE_OPTIONS).code;
  return { js, stubbed, fallbackName: lastCapitalised(source) };
}
