// Dev-only harness for the preview sandbox (T1.10). Returns 404 in production.
import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { detect } from "@/lib/limits/detect";
import type { Language } from "@/types";
import Harness, { type Sample } from "./Harness";

const FIXTURES = ["pricing-card.jsx", "login-form.html", "navbar.tsx", "guideme-sidepanel.html", "profile-card.jsx"];

// Each attack reports what it managed to do through postMessage, so the harness can show it.
const SAY = `function say(m){parent.postMessage({type:"error",message:String(m)},"*")}`;
const ATTACKS: Sample[] = [
  {
    name: "attack: reach parent DOM",
    language: "html",
    code: `<p>Trying to touch the parent…</p>
<script>${SAY}
try { parent.document.body.setAttribute("data-pwned","1"); say("ESCAPED: touched parent DOM"); }
catch (e) { say("blocked parent DOM: " + e.name); }</script>
<img src="x" onerror="try{parent.document.title='pwned';parent.postMessage({type:'error',message:'ESCAPED via onerror'},'*')}catch(e){parent.postMessage({type:'error',message:'onerror blocked: '+e.name},'*')}">`,
  },
  {
    name: "attack: fetch / network",
    language: "html",
    code: `<p>Trying the network…</p>
<script>${SAY}
fetch("/api/health").then(function(){ say("ESCAPED: fetch worked"); }).catch(function(e){ say("blocked fetch: " + e.name); });
new Image().src = "https://example.com/pixel.gif";</script>`,
  },
  {
    name: "attack: infinite loop (watchdog)",
    language: "jsx",
    code: `export default function Loop() { while (true) {} return <div>never</div>; }`,
  },
  {
    name: "attack: <script src> and <iframe>",
    language: "html",
    code: `<p>External embeds were stripped.</p><script src="https://example.com/evil.js"></script><iframe src="https://example.com"></iframe>`,
  },
  {
    name: "attack: storage, cookies, top navigation",
    language: "html",
    code: `<p>Storage and navigation</p>
<script>${SAY}
var r = [];
try { localStorage.x = 1; r.push("localStorage worked"); } catch (e) { r.push("localStorage blocked"); }
try { document.cookie = "a=1"; r.push("cookie: " + document.cookie); } catch (e) { r.push("cookie blocked"); }
try { top.location = "https://example.com"; r.push("top nav attempted"); } catch (e) { r.push("top nav blocked"); }
say(r.join("; "));</script>`,
  },
  {
    name: "break-out: </script> inside JSX string",
    language: "jsx",
    code: `export default function X() { const s = "</script><img src=x onerror=alert(1)>"; return <p>{s}</p>; }`,
  },
];

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const samples: Sample[] = FIXTURES.map((file) => {
    const code = readFileSync(path.resolve(process.cwd(), "tests/fixtures/components", file), "utf8");
    return { name: file, code, language: detect(code) as Language };
  });
  return <Harness samples={[...samples, ...ATTACKS]} />;
}
