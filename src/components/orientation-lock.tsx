'use client';

import { useEffect, useState } from 'react';

export default function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    // Screen Orientation API — works on Android Chrome in fullscreen/standalone PWA
    const lockOrientation = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (screen?.orientation as any)?.lock?.('portrait').catch(() => {});
      } catch {}
    };
    lockOrientation();
    document.addEventListener('visibilitychange', lockOrientation);

    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      document.removeEventListener('visibilitychange', lockOrientation);
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
      <p className="text-zinc-500 text-sm font-medium">Please rotate to portrait</p>
    </div>
  );
}
