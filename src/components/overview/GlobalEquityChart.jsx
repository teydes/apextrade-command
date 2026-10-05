import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';

// Courbe d'equity agrégée: PnL journalier cumulé de tous les comptes (30 derniers jours)
export default function GlobalEquityChart({ trades }) {
  const data = useMemo(() => {
    const byDate = {};
    (trades || []).forEach((t) => {
      if (typeof t.pnl !== 'number') return;
      const d = (t.entry_time || '').slice(0, 10);
      if (d) byDate[d] = (byDate[d] || 0) + t.pnl;
    });
    let cum = 0;
    return Object.keys(byDate).sort().slice(-30).map((d) => {
      cum += byDate[d];
      return { name: d.slice(5), value: Math.round(cum) };
    });
  }, [trades]);

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-bold mb-2"><TrendingUp className="w-4 h-4 text-primary" />Equity agrégée — tous comptes (30 j)</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
            <Line type="monotone" dataKey="value" stroke="#00FF88" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}