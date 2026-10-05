import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Mountain, Clock } from 'lucide-react';
import { sum } from '@/lib/stats';

// Jauge de progression vers l'objectif de capital (plan Boule de Neige, défaut 1 M€)
export default function TargetProgress({ trades, totalEquity }) {
  const { data: plans = [] } = useQuery({
    queryKey: ['capital-target'],
    queryFn: () => base44.entities.SnowballPlan.list(),
  });
  const target = plans[0]?.target_amount || 1000000;
  const pct = Math.max(0, Math.min(100, (totalEquity / target) * 100));
  const remaining = Math.max(0, target - totalEquity);

  const monthlyAvg = useMemo(() => {
    const byMonth = {};
    (trades || []).forEach((t) => {
      if (typeof t.pnl !== 'number') return;
      const m = (t.entry_time || '').slice(0, 7);
      if (m) byMonth[m] = (byMonth[m] || 0) + t.pnl;
    });
    const months = Object.keys(byMonth).sort().slice(-3);
    return months.length ? sum(months.map((m) => byMonth[m])) / months.length : 0;
  }, [trades]);

  const monthsLeft = monthlyAvg > 0 ? Math.ceil(remaining / monthlyAvg) : null;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Mountain className="w-4 h-4 text-primary" />Objectif de capital</div>
          <div className="text-xs font-mono font-bold text-primary">{pct.toFixed(1)}%</div>
        </div>
        <div className="h-2 rounded bg-secondary overflow-hidden mb-1.5">
          <div className="h-full rounded bg-gradient-to-r from-primary/60 to-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
          <span>{Math.round(totalEquity).toLocaleString()}€ / {Math.round(target).toLocaleString()}€</span>
          {monthsLeft != null && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />≈ {monthsLeft} mois au rythme actuel ({monthlyAvg >= 0 ? '+' : ''}{Math.round(monthlyAvg).toLocaleString()}€/mois)</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}