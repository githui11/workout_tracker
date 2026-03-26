interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
  progress?: number; // 0-100
}

const colorMap = {
  blue: {
    card: 'border-blue-500/15 bg-gradient-to-br from-blue-500/8 via-blue-600/3 to-transparent',
    ring: '#3b82f6',
    ringBg: 'rgba(59,130,246,0.1)',
    value: 'text-blue-400',
    glow: 'shadow-blue-500/5',
  },
  green: {
    card: 'border-emerald-500/15 bg-gradient-to-br from-emerald-500/8 via-emerald-600/3 to-transparent',
    ring: '#10b981',
    ringBg: 'rgba(16,185,129,0.1)',
    value: 'text-emerald-400',
    glow: 'shadow-emerald-500/5',
  },
  purple: {
    card: 'border-purple-500/15 bg-gradient-to-br from-purple-500/8 via-purple-600/3 to-transparent',
    ring: '#a855f7',
    ringBg: 'rgba(168,85,247,0.1)',
    value: 'text-purple-400',
    glow: 'shadow-purple-500/5',
  },
  orange: {
    card: 'border-orange-500/15 bg-gradient-to-br from-orange-500/8 via-orange-600/3 to-transparent',
    ring: '#f97316',
    ringBg: 'rgba(249,115,22,0.1)',
    value: 'text-orange-400',
    glow: 'shadow-orange-500/5',
  },
};

function ProgressRing({ progress, color, bgColor, size = 44 }: { progress: number; color: string; bgColor: string; size?: number }) {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={bgColor} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
    </svg>
  );
}

export default function StatCard({ title, value, subtitle, color = 'blue', progress }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-3.5 ${c.card} ${c.glow} shadow-lg transition-all duration-200 active:scale-[0.97]`}>
      {progress !== undefined && (
        <div className="flex justify-center mb-2">
          <div className="relative">
            <ProgressRing progress={progress} color={c.ring} bgColor={c.ringBg} size={44} />
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-zinc-400">
              {progress}%
            </span>
          </div>
        </div>
      )}
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{title}</p>
      <p className={`text-lg font-bold mt-0.5 tracking-tight ${c.value}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
