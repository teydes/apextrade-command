import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Wallet, BarChart3 } from 'lucide-react';
import { sum } from '@/lib/stats';

// Évolution globale du capital: equity historique agrégée + PnL mensuel + drawdown agrégé
export default function CapitalEvolution({ trades, accounts }) {
  const { equityData, monthlyData, startEquity, maxDD } = useMemo(() => {
    const ts = (trades || []).filter((t) => typeof t.pnl === 'number' && t.entry_time);
    const start = sum(accounts.map((a) =>
      (a.current_balance || 0) - sum(ts.filter((t) => t.account_id === a.id).map((t) => t.pnl))
    ));
    const byDate = {}, byMonth = {};
    ts.forEach((t) => {
      const d = t.entry_time.slice(0, 10);
      const m = t.entry_time.slice(0, 7);
      byDate[d] = (byDate[d] || 0) + t.pnl;
      byMonth[m] = (byMonth[m] || 0) + t.pnl;
    });
    let eq = start, peak = start, dd = 0;
    const long = Object.keys(byDate).sort();
    const label = (d) => (long.length > 90 ? d.slice(0, 7) : d.slice(5));
    const equity = long.map((d) => {
      eq += byDate[d];
      peak = Math.max(peak, eq);
      return { name: label(d), value: Math.round(eq), dd: Math.round(peak - eq) };
    });
    const monthly = Object.keys(byMonth).sort().slice(-12).map((m) => ({ name: m.slice(2), value: Math.round(byMonth[m]) }));
    return { equityData: equity, monthlyData: monthly, startEquity: Math.round(start), maxDD: Math.max(0, ...equity.map((e) => e.dd)) };
  }, [trades, accounts]);

  const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: '12px' };
  const fmt = (v) => `${Math.round(v).toLocaleString()}€`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Wallet className="w-4 h-4 text-primary" />Évolution du capital — tous comptes</div>
            <div className="text-[10px] text-muted-foreground font-mono">Max DD hist.: <span className="text-red-400">-{fmt(maxDD)}</span></div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00FF88" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
              <ReferenceLine y={startEquity} stroke="#0088FF" strokeDasharray="5 5" label={{ value: 'Capital initial', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Area type="monotone" dataKey="value" stroke="#00FF88" strokeWidth={2} fill="url(#eqGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-bold mb-2"><BarChart3 className="w-4 h-4 text-primary" />PnL mensuel agrégé (12 mois)</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {monthlyData.map((d, i) => <Cell key={i} fill={d.value >= 0 ? '#00FF88' : '#EF4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}