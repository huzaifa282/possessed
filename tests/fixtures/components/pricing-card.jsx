import React from "react";

export default function PricingCard({ plan = "Pro", price = 29, features = ["10 projects", "Priority support", "Custom domains"] }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <h3 className="text-lg font-semibold text-slate-900">{plan}</h3>
      <p className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-900">${price}</span>
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
