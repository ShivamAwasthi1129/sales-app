'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function LineChartComponent({ 
  data, 
  lines = [{ key: 'value', color: '#4F46E5', name: 'Value' }],
  xAxisKey = 'name', 
  height = 300,
  showLegend = true,
  formatYAxis = null,
  formatTooltip = null
}) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm text-gray-600">
              {entry.name}: <span className="font-bold" style={{ color: entry.color }}>
                {formatTooltip ? formatTooltip(entry.value) : entry.value}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis 
          dataKey={xAxisKey} 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#9CA3AF"
        />
        <YAxis 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          stroke="#9CA3AF"
          tickFormatter={formatYAxis}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={line.color}
            strokeWidth={2}
            dot={{ fill: line.color, r: 4 }}
            activeDot={{ r: 6 }}
            name={line.name || line.key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

