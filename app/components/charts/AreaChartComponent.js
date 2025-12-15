'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AreaChartComponent({ 
  data, 
  dataKey = 'value', 
  xAxisKey = 'name', 
  height = 300,
  gradientFrom = '#4F46E5',
  gradientTo = '#818CF8',
  formatYAxis = null,
  formatTooltip = null
}) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-sm text-gray-600">
            Value: <span className="font-bold" style={{ color: gradientFrom }}>
              {formatTooltip ? formatTooltip(payload[0].value) : payload[0].value}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={gradientFrom} stopOpacity={0.8}/>
            <stop offset="95%" stopColor={gradientTo} stopOpacity={0.1}/>
          </linearGradient>
        </defs>
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
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          stroke={gradientFrom} 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorValue)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

