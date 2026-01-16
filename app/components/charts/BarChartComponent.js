// components/charts/BarChartComponent.js

'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BarChartComponent({
  data,
  dataKey = 'value',
  xAxisKey = 'name',
  height = 300,
  barColor = '#4F46E5',
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
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
        {Array.isArray(dataKey) ? (
          dataKey.map((key, index) => (
            <Bar
              key={key.key}
              dataKey={key.key}
              fill={key.color || barColor}
              name={key.name || key.key}
              radius={[8, 8, 0, 0]}
            />
          ))
        ) : (
          <Bar dataKey={dataKey} fill={barColor} radius={[8, 8, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
