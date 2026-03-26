'use client';

import {
  LineChart,
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
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm rounded-2xl border border-zinc-800/40 bg-zinc-900/30">
        No data yet — start logging to see charts
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/40 backdrop-blur-sm rounded-2xl p-4 border border-zinc-800/40">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.6} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#71717a' }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={{ stroke: '#27272a' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#71717a' }}
            axisLine={{ stroke: '#27272a' }}
            tickLine={{ stroke: '#27272a' }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 10 } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              borderRadius: '12px',
              fontSize: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
            labelStyle={{ color: '#71717a', marginBottom: 4 }}
            cursor={{ stroke: '#3f3f46', strokeDasharray: '4 4' }}
          />
          {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              name={line.name}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: '#18181b' }}
              activeDot={{ r: 5, strokeWidth: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
