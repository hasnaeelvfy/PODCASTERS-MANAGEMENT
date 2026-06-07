'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { GlowCard } from '@/components/ui/GlowCard';
import { formatNumber } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { PlatformAnalyticsResponse } from '@/types';

const COLORS: Record<string, string> = {
  youtube: '#EF4444',
  spotify: '#10B981',
  tiktok: '#F8F8F8',
  instagram: '#EC4899',
};

const LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  tiktok: 'TikTok',
  instagram: 'Instagram',
};

function mergeGrowthData(platforms: PlatformAnalyticsResponse['platforms']) {
  const monthSet = new Set<string>();
  for (const p of platforms) {
    for (const point of p.audienceGrowth) monthSet.add(point.month);
  }
  const months = [...monthSet];
  return months.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const p of platforms) {
      const point = p.audienceGrowth.find((g) => g.month === month);
      row[p.platform] = point?.value ?? 0;
    }
    return row;
  });
}

export function PlatformGrowthCharts({
  platforms,
}: {
  platforms: PlatformAnalyticsResponse['platforms'];
}) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const chartData = mergeGrowthData(platforms);
  const hasData = platforms.some((p) => p.audienceGrowth.length > 0);
  const tickStyle = { fill: 'rgba(100, 116, 139, 0.7)', fontSize: 11, fontWeight: 500 };

  return (
    <GlowCard className="!p-4 sm:!p-6 mb-6 sm:mb-8">
      <h3 className="section-title mb-1">Croissance audience par plateforme</h3>
      <p className="section-subtitle mb-4">Évolution calculée depuis les synchronisations API</p>

      {!hasData ? (
        <p className="text-sm text-[var(--text-muted)] py-8 text-center">
          Les courbes apparaîtront après plusieurs synchronisations (toutes les 6h).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[280px]">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart
                data={chartData}
                margin={
                  isMobile
                    ? { top: 8, right: 12, left: -8, bottom: 4 }
                    : { top: 8, right: 20, left: 0, bottom: 4 }
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.06)" />
                <XAxis
                  dataKey="month"
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                  height={isMobile ? 40 : 30}
                />
                <YAxis
                  tick={tickStyle}
                  axisLine={false}
                  tickLine={false}
                  width={isMobile ? 44 : 52}
                  tickFormatter={(v) => formatNumber(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(10, 14, 20, 0.9)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 12,
                    fontSize: 14,
                    boxShadow: '0 8px 32px rgba(6, 182, 212, 0.1)',
                  }}
                  formatter={(v: number, name: string) => [
                    formatNumber(v),
                    LABELS[name] || name,
                  ]}
                  labelStyle={{ color: '#22D3EE', fontSize: 14, fontWeight: 600 }}
                />
                <Legend
                  formatter={(value) => LABELS[value] || value}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8, color: 'rgba(255, 255, 255, 0.7)' }}
                />
                {platforms.map((p) =>
                  p.audienceGrowth.length > 0 ? (
                    <Line
                      key={p.platform}
                      type="monotone"
                      dataKey={p.platform}
                      stroke={COLORS[p.platform] || '#06B6D4'}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ) : null,
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </GlowCard>
  );
}
