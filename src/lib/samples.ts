// Built-in samples for the editor (AC-1.3). Kept identical to tests/fixtures/components/* (tests/samples.test.ts).
// Spec: specs/01 US-1
// Task: T2.2
import type { Language } from "@/types";

export interface Sample {
  id: string;
  label: string;
  language: Language;
  code: string;
}

export const SAMPLES: readonly Sample[] = [
  {
    id: "pricing-card",
    label: "Pricing card",
    language: "jsx",
    code: `import React from "react";

export default function PricingCard({ plan = "Pro", price = 29, features = ["10 projects", "Priority support", "Custom domains"] }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900">{plan}</h3>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">\${price}</span>
        <span className="text-sm text-slate-500">/month</span>
      </p>
      <ul className="mt-6 space-y-3 text-slate-600">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span className="text-emerald-500">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <button className="mt-8 w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500">
        Get started
      </button>
    </div>
  );
}
`,
  },
  {
    id: "login-form",
    label: "Login form",
    language: "html",
    code: `<form class="mx-auto max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-md">
  <h2 class="text-2xl font-bold text-gray-900">Sign in</h2>
  <label class="block text-sm font-medium text-gray-700">
    Email
    <input type="email" placeholder="you@example.com" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
  </label>
  <label class="block text-sm font-medium text-gray-700">
    Password
    <input type="password" class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
  </label>
  <button type="submit" class="w-full rounded-md bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700">
    Sign in
  </button>
  <p class="text-center text-sm text-gray-500">
    No account? <a href="#" class="text-blue-600 underline">Create one</a>
  </p>
</form>
`,
  },
  {
    id: "navbar",
    label: "Navbar",
    language: "tsx",
    code: `import React from "react";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  brand?: string;
  links?: NavLink[];
}

export const Navbar: React.FC<NavbarProps> = ({ brand = "Possessed", links = [{ label: "Home", href: "/" }, { label: "Pricing", href: "/pricing" }, { label: "Contact", href: "/contact" }] }) => {
  return (
    <nav className="flex items-center justify-between bg-white px-6 py-4 shadow">
      <a href="/" className="text-xl font-bold text-gray-900">
        {brand}
      </a>
      <ul className="flex gap-6">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="text-gray-600 hover:text-gray-900">
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};
`,
  },
];
