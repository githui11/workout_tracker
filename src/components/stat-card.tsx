interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

const colorMap = {
  blue: 'border-blue-500/30 bg-blue-500/5',
  green: 'border-green-500/30 bg-green-500/5',
  orange: 'border-orange-500/30 bg-orange-500/5',
  purple: 'border-purple-500/30 bg-purple-500/5',
};

export default function StatCard({ title, value, subtitle, color = 'blue' }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs text-zinc-400 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}
