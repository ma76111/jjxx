import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosClient from '../../api/axiosClient';
import { useTheme } from '../../context/ThemeContext';

interface ChartPoint { date: string; balance: number; }

export default function BalanceChart({ days = 30 }: { days?: number }) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDark } = useTheme();

  useEffect(() => {
    axiosClient.get(`/user/balance-chart?days=${days}`)
      .then(r => setData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return (
    <div className="card h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">
      جاري التحميل...
    </div>
  );
  if (!data.length) return (
    <div className="card h-48 flex items-center justify-center text-gray-400 dark:text-gray-500">
      لا توجد بيانات رصيد بعد.
    </div>
  );

  const gridColor  = isDark ? '#374151' : '#e5e7eb';
  const textColor  = isDark ? '#9ca3af' : '#6b7280';
  const lineColor  = isDark ? '#60a5fa' : '#3b82f6';
  const tooltipBg  = isDark ? '#1f2937' : '#ffffff';
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb';

  return (
    <div className="card">
      <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">
        📈 مخطط الرصيد ({days} يوم)
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: textColor }} />
          <YAxis tick={{ fontSize: 11, fill: textColor }} />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: 8 }}
            labelStyle={{ color: textColor }}
          />
          <Line type="monotone" dataKey="balance" stroke={lineColor} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
