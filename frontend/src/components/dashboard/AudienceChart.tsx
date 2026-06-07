'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatNumber } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export function AudienceChart({ data }: { data: { month: string; audience: number }[] }) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const chartMargin = isMobile
    ? { top: 8, right: 12, left: -8, bottom: 4 }
    : { top: 8, right: 20, left: 0, bottom: 4 };
  const tickStyle = { fill: 'rgba(100, 116, 139, 0.7)', fontSize: isMobile ? 14 : 12, fontWeight: 500 };

  return (
    <GlowCard className="!p-4 sm:!p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <div>
          <h3 className="section-title">Évolution audience</h3>
          <p className="section-subtitle">Portée cumulée par mois</p>
        </div>
        <span className="badge badge-violet">
          Live
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[280px]">
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data} margin={chartMargin}>
              <defs>
                <linearGradient id="audienceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.06)" />
              <XAxis
                dataKey="month"
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? 0 : 'preserveStartEnd'}
                angle={isMobile ? -35 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 50 : 30}
              />
              <YAxis
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={isMobile ? 48 : 56}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(10, 14, 20, 0.9)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(6, 182, 212, 0.1)',
                  fontSize: 14,
                }}
                formatter={(v: number) => [formatNumber(v), 'Audience']}
                labelStyle={{ color: '#22D3EE', fontSize: 14, fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="audience"
                stroke="#06B6D4"
                fill="url(#audienceGrad)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlowCard>
  );
}
