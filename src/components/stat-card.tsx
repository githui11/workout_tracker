interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const colorMap = {
  blue: {
    card: 'border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5',
    accent: 'bg-blue-500',
    value: 'text-blue-400',
  },
  green: {
    card: 'border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-600/5',
    accent: 'bg-green-500',
    value: 'text-green-400',
  },
  orange: {
    card: 'border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5',
    accent: 'bg-orange-500',
    value: 'text-orange-400',
  },
  purple: {
    card: 'border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5',
    accent: 'bg-purple-500',
    value: 'text-purple-400',
  },
};

export default function StatCard({ title, value, subtitle, color = 'blue' }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 ${c.card} transition-transform active:scale-[0.98]`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${c.accent} rounded-r-full opacity-60`} />
      <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider pl-2">{title}</p>
      <p className={`text-xl font-bold mt-1.5 pl-2 ${c.value}`}>{value}</p>
      {subtitle && <p className="text-[11px] text-zinc-500 mt-1 pl-2">{subtitle}</p>}
    </div>
  );
}
