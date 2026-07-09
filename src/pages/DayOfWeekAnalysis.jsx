import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Calendar, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function DayOfWeekAnalysis() {
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
    const byDay = DAYS.map((name, i) => ({ day: name.substring(0, 3), fullName: name, idx: i, trades: 0, wins: 0, pnl: 0, pnlList: [] }));
    trades.forEach(t => {
      const d = new Date(t.entry_time || t.created_date);
      const day = d.getDay();
      byDay[day].trades++;
      if (t.result === 'win') byDay[day].wins++;
      byDay[day].pnl += t.pnl || 0;
      byDay[day].pnlList.push(t.pnl || 0);
    });
    byDay.forEach(d => {
      d.wr = d.trades > 0 ? (d.wins / d.trades) * 100 : 0;
      d.avgPnL = d.trades > 0 ? d.pnl / d.trades : 0;
      const mean = d.pnlList.length > 0 ? d.pnlList.reduce((a, b) => a + b, 0) / d.pnlList.length : 0;
      const variance = d.pnlList.length > 0 ? d.pnlList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / d.pnlList.length : 0;
      d.std = Math.sqrt(variance);
      d.sharpe = d.std > 0 ? mean / d.std : 0;
    });
    const tradingDays = byDay.filter(d => d.trades > 0);
    const bestDay = tradingDays.reduce((max, d) => d.pnl > max.pnl ? d : max, tradingDays[0] || { day: '', pnl: 0 });
    const worstDay = tradingDays.reduce((min, d) => d.pnl < min.pnl ? d : min, tradingDays[0] || { day: '', pnl: 0 });
    const weekendTrades = byDay[0].trades + byDay[6].trades;
    return { byDay, bestDay, worstDay, weekendTrades, tradingDaysCount: tradingDays.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const summary = data.byDay.filter(d => d.trades > 0).map(d => `${d.fullName}: ${d.trades}t, WR=${d.wr.toFixed(0)}%, PnL=${d.pnl.toFixed(0)}`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Day of Week Analysis: ${summary}. Best=${data.bestDay.fullName}, Worst=${data.worstDay.fullName}. Weekend trades=${data.weekendTrades}. Analyse: 1) Jours les plus productifs, 2) Pattern hebdomadaire, 3) Recommandation (focus/éviter). Court.`,
        response_json_schema: { type: 'object', properties: { best_days: { type: 'string' }, pattern: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ best_days: 'Erreur', pattern: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Day of Week Analysis</h1><p className="text-sm text-muted-foreground">Performance par jour de la semaine</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Meilleur jour</div><div className="text-2xl font-mono font-bold text-primary">{data.bestDay.fullName}</div><div className="text-xs text-muted-foreground">PnL: {data.bestDay.pnl.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading glow-red"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Pire jour</div><div className="text-2xl font-mono font-bold text-danger-red">{data.worstDay.fullName}</div><div className="text-xs text-muted-foreground">PnL: {data.worstDay.pnl.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Trades weekend</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.weekendTrades}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL par Jour</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="day" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.byDay.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : e.pnl < 0 ? '#EF4444' : '#3a3a3a'} />)}</Bar>
              <ReferenceLine y={0} stroke="#F59E0B" strokeDasharray="5 5" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Win Rate par Jour</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="day" stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]} fill="#0088FF" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Détail</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left p-2">Jour</th><th className="text-right p-2">Trades</th><th className="text-right p-2">WR</th><th className="text-right p-2">PnL</th><th className="text-right p-2">Avg</th><th className="text-right p-2">Sharpe</th></tr></thead>
              <tbody>
                {data.byDay.map(d => (
                  <tr key={d.idx} className="border-b border-border/50 row-hover">
                    <td className="p-2 font-bold">{d.fullName}</td>
                    <td className="p-2 text-right font-mono">{d.trades}</td>
                    <td className="p-2 text-right font-mono text-primary">{d.wr.toFixed(0)}%</td>
                    <td className={`p-2 text-right font-mono ${d.pnl > 0 ? 'text-primary' : 'text-danger-red'}`}>{d.pnl > 0 ? '+' : ''}{d.pnl.toFixed(!0)}</td>
                    <td className={`p-2 text-right font-mono ${d.avgPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{d.avgPnL > 0 ? '+' : ''}{d.avgPnL.toFixed(0)}</td>
                    <td className={`p-2 text-right font-mono ${d.sharpe > 0.5 ? 'text-primary' : 'text-muted-foreground'}`}>{d.sharpe.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Meilleurs jours:</span> {ai.best_days}</div><div><span className="text-primary font-bold">Pattern:</span> {ai.pattern}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}