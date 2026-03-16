import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { urlApi } from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, MousePointer, Globe, Monitor } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export default function StatsPage() {
  const { code } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['stats', code],
    queryFn: () => urlApi.stats(code),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center text-gray-400">
        <p>Could not load stats for <code className="text-violet-400">{code}</code></p>
        <Link to="/dashboard" className="text-violet-400 hover:underline text-sm mt-4 block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const { url, timeSeries, browsers, countries } = data;

  const chartData = timeSeries.map((d) => ({
    date: format(new Date(d._id), 'MMM d'),
    clicks: d.count,
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors w-fit">
        <ArrowLeft size={15} />
        Back to dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-2xl font-bold text-violet-400">{code}</span>
        </div>
        <p className="text-gray-400 text-sm truncate max-w-lg">{url?.originalUrl}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { icon: MousePointer, label: 'Total clicks', value: url?.clicks ?? 0 },
          { icon: Globe, label: 'Countries', value: countries?.length ?? 0 },
          { icon: Monitor, label: 'Browsers', value: browsers?.length ?? 0 },
          { icon: MousePointer, label: 'Avg/day (30d)', value: timeSeries?.length
              ? Math.round(timeSeries.reduce((s, d) => s + d.count, 0) / 30)
              : 0 },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-5 bg-white/5 border border-white/8 rounded-2xl">
            <Icon size={16} className="text-violet-400 mb-3" />
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Time series chart */}
      <div className="p-6 bg-white/5 border border-white/8 rounded-2xl mb-6">
        <h2 className="text-sm font-medium text-gray-300 mb-6">Clicks over time (last 30 days)</h2>
        {chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
            No click data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#4b5563" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#111827',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#grad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Browsers + Countries */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="p-6 bg-white/5 border border-white/8 rounded-2xl">
          <h2 className="text-sm font-medium text-gray-300 mb-5">Browsers</h2>
          {browsers?.length === 0 ? (
            <p className="text-gray-600 text-sm">No data</p>
          ) : (
            <div className="flex items-center gap-6">
              <PieChart width={120} height={120}>
                <Pie data={browsers} cx={55} cy={55} innerRadius={35} outerRadius={55}
                  dataKey="count" nameKey="_id" paddingAngle={3}>
                  {browsers?.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="space-y-2 flex-1">
                {browsers?.map((b, i) => (
                  <div key={b._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-300">{b._id || 'Unknown'}</span>
                    </div>
                    <span className="text-gray-500">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/5 border border-white/8 rounded-2xl">
          <h2 className="text-sm font-medium text-gray-300 mb-5">Top countries</h2>
          {countries?.length === 0 ? (
            <p className="text-gray-600 text-sm">No data</p>
          ) : (
            <div className="space-y-2">
              {countries?.map((c, i) => {
                const max = countries[0]?.count || 1;
                return (
                  <div key={c._id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{c._id || 'Unknown'}</span>
                      <span className="text-gray-500">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{ width: `${(c.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
