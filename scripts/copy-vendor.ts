// Postinstall: copy @tailwindcss/browser dist/index.global.js → public/vendor/tailwind.browser.js, src/effects/effects.css → public/vendor/effects.css, @fontsource files → public/fonts/.
// Spec: specs/05 §5.2
// Task: T1.10
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const VENDOR = path.join(ROOT, "public/vendor");
const FONTS = path.join(ROOT, "public/fonts");

/** Preset fonts: @fontsource package → CSS family name. Latin only, regular and bold. */
const FONT_PACKAGES: Record<string, string> = {
  cinzel: "Cinzel",
  "cinzel-decorative": "Cinzel Decorative",
  "im-fell-english": "IM Fell English",
  rye: "Rye",
  unifrakturcook: "UnifrakturCook",
  vt323: "VT323",
};

function copy(from: string, to: string) {
  if (!existsSync(from)) throw new Error(`copy-vendor: missing ${path.relative(ROOT, from)} (run npm install)`);
  copyFileSync(from, to);
}

function main() {
  mkdirSync(VENDOR, { recursive: true });
  mkdirSync(FONTS, { recursive: true });

  copy(path.join(ROOT, "node_modules/@tailwindcss/browser/dist/index.global.js"), path.join(VENDOR, "tailwind.browser.js"));
  copy(path.join(ROOT, "src/effects/effects.css"), path.join(VENDOR, "effects.css"));

  const faces: string[] = [];
  for (const [pkg, family] of Object.entries(FONT_PACKAGES)) {
    const dir = path.join(ROOT, "node_modules/@fontsource", pkg, "files");
    if (!existsSync(dir)) throw new Error(`copy-vendor: missing @fontsource/${pkg} (run npm install)`);
    for (const file of readdirSync(dir)) {
      const m = /-latin-(400|700)-normal\.woff2$/.exec(file);
      if (!m) continue;
      copy(path.join(dir, file), path.join(FONTS, file));
      // Root-relative: resolved against the stylesheet's origin (the app), not the sandboxed frame's opaque origin.
      faces.push(
        `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${m[1]}; font-display: swap; src: url(/fonts/${file}) format('woff2'); }`,
      );
    }
  }
  writeFileSync(path.join(VENDOR, "fonts.css"), `${faces.join("\n")}\n`);
  console.log(`copy-vendor: tailwind.browser.js, effects.css, fonts.css and ${faces.length} font files`);
}

main();
