import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { CalendarDays, Brain, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function MonthlySeasonality() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(d => {
      setTrades((d || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (trades.length < 10) return null;
    const byMonth = MONTHS.map((name, i) => ({ month: name, idx: i, trades: 0, wins: 0, pnl: 0, years: {} }));
    trades.forEach(t => {
      const d = new Date(t.entry_time || t.created_date);
      const m = d.getMonth();
      const y = d.getFullYear();
      byMonth[m].trades++;
      if (t.result === 'win') byMonth[m].wins++;
      byMonth[m].pnl += t.pnl || 0;
      if (!byMonth[m].years[y]) byMonth[m].years[y] = { pnl: 0, trades: 0 };
      byMonth[m].years[y].pnl += t.pnl || 0;
      byMonth[m].years[y].trades++;
    });
    byMonth.forEach(m => { m.wr = m.trades > 0 ? (m.wins / m.trades) * 100 : 0; m.avgPnL = m.trades > 0 ? m.pnl / m.trades : 0; });
    const activeMonths = byMonth.filter(m => m.trades > 0);
    const bestMonth = activeMonths.reduce((max, m) => m.pnl > max.pnl ? m : max, activeMonths[0] || { month: '', pnl: 0 });
    const worstMonth = activeMonths.reduce((min, m) => m.pnl < min.pnl ? m : min, activeMonths[0] || { month: '', pnl: 0 });
    const greenMonths = activeMonths.filter(m => m.pnl > 0).length;
    const redMonths = activeMonths.filter(m => m.pnl < 0).length;
    return { byMonth, bestMonth, worstMonth, greenMonths, redMonths, activeCount: activeMonths.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const summary = data.byMonth.filter(m => m.trades > 0).map(m => `${m.month}: ${m.trades}t, WR=${m.wr.toFixed(0)}%, PnL=${m.pnl.toFixed(0)}`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Monthly Seasonality: ${summary}. Best=${data.bestMonth.month}, Worst=${data.worstMonth.month}. Green=${data.greenMonths}, Red=${data.redMonths}. Analyse: 1) Saisonnalité détectée, 2) Mois à risque, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { seasonality: { type: 'string' }, risk_months: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ seasonality: 'Erreur', risk_months: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Monthly Seasonality</h1><p className="text-sm text-muted-foreground">Performance par mois — patterns saisonniers</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Meilleur mois</div><div className="text-2xl font-mono font-bold text-primary">{data.bestMonth.month}</div><div className="text-xs text-muted-foreground">PnL: {data.bestMonth.pnl.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading glow-red"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Pire mois</div><div className="text-2xl font-mono font-bold text-danger-red">{data.worstMonth.month}</div><div className="text-xs text-muted-foreground">PnL: {data.worstMonth.pnl.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Mois verts</div><div className="text-2xl font-mono font-bold text-primary">{data.greenMonths}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Mois rouges</div><div className="text-2xl font-mono font-bold text-danger-red">{data.redMonths}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL par Mois (saisonnalité)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="month" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.byMonth.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : e.pnl < 0 ? '#EF4444' : '#3a3a3a'} />)}</Bar>
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Win Rate par Mois</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="month" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]} fill="#0088FF" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Saisonnalité:</span> {ai.seasonality}</div><div><span className="text-primary font-bold">Mois à risque:</span> {ai.risk_months}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}