'use client';

import Link from 'next/link';

const sections = [
  {
    href: '/bodyweight',
    label: 'Body Weight',
    description: 'Track daily weigh-ins',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/[0.06]',
    borderColor: 'border-purple-500/15',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="16" rx="9" ry="5" />
        <path d="M5 12a9 5 0 0114 0" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="10.5" x2="13.5" y2="11.5" />
      </svg>
    ),
  },
];

export default function MorePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight animate-fadeInUp">More</h1>

      <div className="space-y-3 animate-fadeInUp delay-1">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`flex items-center gap-4 ${section.bgColor} backdrop-blur-sm rounded-2xl p-4 border ${section.borderColor} transition-all duration-200 active:scale-[0.98]`}
          >
            <div className={section.color}>{section.icon}</div>
            <div>
              <p className={`font-semibold text-sm ${section.color}`}>{section.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{section.description}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-zinc-600">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
