import React from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { QualityScoreBreakdown } from '../../types/research';

const SHORT_LABELS: Record<string, string> = {
  coverage: 'Coverage',
  verification: 'Claims',
  diversity: 'Diversity',
  recency: 'Recency',
  completeness: 'Complete',
};

export const QualityScoreCard: React.FC<{ quality: QualityScoreBreakdown; compact?: boolean }> = ({
  quality,
  compact = false,
}) => {
  const chartData = quality.criteria.map((c) => ({
    key: c.key,
    name: SHORT_LABELS[c.key] || c.label,
    fullName: c.label,
    score: c.score,
    weight: c.weight,
  }));

  const barColors = ['#8b5cf6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0D1323] p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-mono text-cyan-300">
              {quality.isSimulated ? 'PROTOTYPE QUALITY INDEX' : 'VERIFIED EVIDENCE QUALITY'}
            </span>
            <span aria-hidden="true">·</span>
            <span>Weighted 0–100 Index</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mt-1">Research Quality Overview</h3>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold font-mono tabular-nums text-slate-50">
            {quality.overall}
            <span className="text-base text-slate-500 font-normal"> / 100</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {quality.isSimulated ? 'Prototype score' : 'Computed from retrieved records'}
          </p>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#1e293b' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(148,163,184,0.06)' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(148,163,184,0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: unknown, _name: unknown, props: { payload?: { fullName?: string; weight?: number } }) => [
                `${value}/100 (Weight ${props.payload?.weight ?? 0}%)`,
                props.payload?.fullName ?? 'Score',
              ]}
            />
            <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={38}>
              {chartData.map((entry, idx) => (
                <Cell key={entry.key} fill={barColors[idx % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!compact && (
        <div className="divide-y divide-slate-800/70">
          {quality.criteria.map((c) => (
            <div key={c.key} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-200">
                  {c.label} <span className="text-xs text-slate-500 font-mono tabular-nums">({c.weight}%)</span>
                </span>
                <span className="font-mono tabular-nums text-slate-100 font-medium">{c.score} / 100</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{c.explanation}</p>
              <p className="text-xs text-cyan-300/90">Recommendation: {c.recommendation}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
