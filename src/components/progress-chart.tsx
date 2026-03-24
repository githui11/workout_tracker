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
      <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
        No data yet — start logging to see charts
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} />
        <YAxis tick={{ fontSize: 10, fill: '#888' }} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#888', fontSize: 10 } : undefined} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', fontSize: 12 }}
          labelStyle={{ color: '#888' }}
        />
        {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            name={line.name}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
