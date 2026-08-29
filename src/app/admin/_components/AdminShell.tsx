"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/chat", label: "Chat" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/trade", label: "Trades" },
  { href: "/admin/holds", label: "Holds" },
  { href: "/admin/sync", label: "Sync" },
  { href: "/admin/forms", label: "Forms" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // The login page renders without the admin chrome.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/login", { method: "DELETE" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border-subtle bg-background-secondary md:flex print:hidden">
        <div className="border-b border-border-subtle px-5 py-5">
          <Link href="/admin" className="block">
            <span className="text-sm font-bold tracking-widest text-text-primary">
              RYDETIME
            </span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-accent">
              Admin
            </span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border-subtle p-3">
          <Link
            href="/"
            className="block rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-surface hover:text-text-primary"
          >
            ← View Site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm text-accent hover:bg-surface"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile top bar + content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 overflow-x-auto border-b border-border-subtle bg-background-secondary px-4 py-3 md:hidden print:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ${
                isActive(item.href)
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="ml-auto whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-accent"
          >
            Log Out
          </button>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
