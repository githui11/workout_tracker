'use client';

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  label: string;
  [key: string]: string | number | null;
}

interface LineConfig {
  key: string;
  color: string;
  name: string;
}

interface ProgressChartProps {
  data: DataPoint[];
  lines: LineConfig[];
  yAxisLabel?: string;
  height?: number;
}

export default function ProgressChart({ data, lines, yAxisLabel, height = 250 }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-44 rounded-2xl border border-zinc-800/30 bg-zinc-900/20">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" className="mb-3">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 4 2 5-6" />
        </svg>
        <p className="text-zinc-500 text-sm font-medium">No data yet</p>
        <p className="text-zinc-600 text-xs mt-1">Start logging to see your trends</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/30">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            {lines.map((line, i) => (
              <linearGradient key={line.key} id={`gradient-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity={i === 0 ? 0.2 : 0.05} />
                <stop offset="95%" stopColor={line.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#27272a" strokeOpacity={0.3} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#52525b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#52525b', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickMargin={4}
            width={32}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 9, fontWeight: 600 } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(63, 63, 70, 0.3)',
              borderRadius: '14px',
              fontSize: 12,
              padding: '10px 14px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
            }}
            labelStyle={{ color: '#a1a1aa', fontSize: 10, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}
            itemStyle={{ padding: '2px 0' }}
            cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
            separator=": "
          />
          {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {lines.map((line, i) => (
            i === 0 ? (
              <Area
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                fill={`url(#gradient-${line.key})`}
                strokeWidth={2}
                name={line.name}
                dot={{ r: 2.5, strokeWidth: 1.5, fill: '#18181b' }}
                activeDot={{ r: 4.5, strokeWidth: 2, fill: line.color }}
                connectNulls
              />
            ) : (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                stroke={line.color}
                strokeWidth={1.5}
                strokeDasharray="6 3"
                name={line.name}
                dot={false}
                connectNulls
              />
            )
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
