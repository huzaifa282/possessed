import React from "react";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  brand: string;
  links: NavLink[];
}

export const Navbar: React.FC<NavbarProps> = ({ brand, links }) => {
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
