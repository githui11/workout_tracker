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
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/running', label: 'Run', Icon: RunIcon },
  { href: '/cycling', label: 'Cycle', Icon: CycleIcon },
  { href: '/bodyweight', label: 'Weight', Icon: WeightIcon },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex justify-around items-center h-[4.25rem] max-w-lg mx-auto px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300 active:scale-95'
              }`}
            >
              <tab.Icon active={active} />
              <span className={`text-[10px] tracking-wide ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute -bottom-0 w-8 h-0.5 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
