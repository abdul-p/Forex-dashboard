"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Overview", href: "/overview", icon: "📊" },
  { label: "Markets", href: "/markets", icon: "💱" },
  { label: "Charts", href: "/charts", icon: "📈" },
  { label: "Journal", href: "/journal", icon: "📓" },
  { label: "Calendar", href: "/calendar", icon: "📅" },
  { label: "News", href: "/news", icon: "📰" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">
          Forex<span className="text-green-400">Pro</span>
        </h1>
        <p className="text-gray-500 text-xs mt-1">Trading Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-3 px-3">
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                isActive
                  ? "bg-green-400/10 text-green-400 font-medium"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition w-full"
        >
          <span>🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
