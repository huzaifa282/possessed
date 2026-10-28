// Client-side Sucrase transform of JSX/TSX + import stubbing.
// Spec: specs/05-preview-sandbox.md §5.3, specs/03 §3.3
// Task: T1.10
import type { Options } from "sucrase";

/** Shared by the preview (client) and by validation (server) so both accept exactly the same code. */
export const SUCRASE_OPTIONS: Options = {
  transforms: ["jsx", "typescript", "imports"],
  jsxRuntime: "classic",
  production: true,
};
