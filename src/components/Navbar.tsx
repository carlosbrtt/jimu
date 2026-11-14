'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Dumbbell, LayoutDashboard, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/treinos', label: 'Treinos', icon: Dumbbell },
  { href: '/perfil', label: 'Perfil', icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold text-white hover:opacity-80 transition-opacity"
        >
          <Dumbbell className="h-6 w-6 text-emerald-400" />
          <span className="text-lg tracking-tight">
            Jimu <span className="text-emerald-400 text-sm font-normal">ジム</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Sign Out */}
        <button
          onClick={handleSignOut}
          className="hidden md:flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-950 px-4 pb-4 pt-2">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </header>
  );
}