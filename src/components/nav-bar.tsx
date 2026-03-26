'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function RunIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="17" cy="4" r="2" />
      <path d="M15 21l-3-6-4 3-3-3" />
      <path d="M12 15l2-8 4 2 3-3" />
    </svg>
  );
}

function CycleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M6 17l3-8h4l3 8" />
      <path d="M9 9l3 3" />
    </svg>
  );
}

function WeightIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a4 4 0 00-4 4h8a4 4 0 00-4-4z" />
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

const tabs = [
  { href: '/', label: 'Home', Icon: HomeIcon, activeColor: 'text-white' },
  { href: '/running', label: 'Run', Icon: RunIcon, activeColor: 'text-emerald-400' },
  { href: '/cycling', label: 'Cycle', Icon: CycleIcon, activeColor: 'text-blue-400' },
  { href: '/bodyweight', label: 'Weight', Icon: WeightIcon, activeColor: 'text-purple-400' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/70 backdrop-blur-2xl border-t border-white/[0.04]">
      <div className="flex justify-around items-center h-[4.5rem] max-w-lg mx-auto px-3 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-300 ${
                active
                  ? tab.activeColor
                  : 'text-zinc-600 hover:text-zinc-400 active:scale-95'
              }`}
            >
              {active && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.06]" />
              )}
              <div className="relative z-10">
                <tab.Icon active={active} />
              </div>
              <span className={`relative z-10 text-[10px] tracking-wide ${active ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
