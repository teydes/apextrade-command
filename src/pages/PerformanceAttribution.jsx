import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { PieChart as PieIcon, Brain, Loader2, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PerformanceAttribution() {
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
    const totalPnL = trades.reduce((a, t) => a + (t.pnl || 0), 0);
    const byDimension = (field) => {
      const groups = {};
      trades.forEach(t => {
        if (!t[field]) return;
        if (!groups[t[field]]) groups[t[field]] = { name: t[field], pnl: 0, count: 0 };
        groups[t[field]].pnl += t.pnl || 0;
        groups[t[field]].count++;
      });
      return Object.values(groups).map(g => ({ ...g, pct: totalPnL !== 0 ? (g.pnl / totalPnL) * 100 : 0 })).sort((a, b) => b.pnl - a.pnl);
    };
    const byStrategy = byDimension('strategy');
    const bySession = byDimension('session');
    const byTimeframe = byDimension('timeframe');
    const byDirection = byDimension('direction');
    const bySymbol = byDimension('symbol');
    const topContributor = byStrategy[0];
    const topDetractor = byStrategy[byStrategy.length - 1];
    return { totalPnL, byStrategy, bySession, byTimeframe, byDirection, bySymbol, topContributor, topDetractor };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Performance Attribution: Total PnL=${data.totalPnL.toFixed(0)}. By strategy: ${data.byStrategy.slice(0, 3).map(s => `${s.name}=${s.pnl.toFixed(0)} (${s.pct.toFixed(0)}%)`).join(', ')}. By session: ${data.bySession.slice(0, 3).map(s => `${s.name}=${s.pnl.toFixed(0)}`).join(', ')}. Top contributor=${data.topContributor?.name}, Top detractor=${data.topDetractor?.name}. Analyse: 1) Sources de profit, 2) Sources de perte, 3) Recommandation de focus. Court.`,
        response_json_schema: { type: 'object', properties: { profit_sources: { type: 'string' }, loss_sources: { type: 'string' }, focus: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ profit_sources: 'Erreur', loss_sources: '', focus: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  const colors = ['#00FF88', '#0088FF', '#F59E0B', '#EF4444', '#A855F7', '#00CED1'];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Layers className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Performance Attribution</h1><p className="text-sm text-muted-foreground">Décomposition du PnL par facteur</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Attribution par Stratégie</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.byStrategy} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{data.byStrategy.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Attribution par Session</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.bySession} dataKey="pnl" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => e.name}>{data.bySession.map((e, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Pie>
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Attribution par Timeframe</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.byTimeframe} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="name" stroke="hsl(215 20% 55%)" width={50} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{data.byTimeframe.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Attribution par Symbole</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.bySymbol} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={70} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{data.bySymbol.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Sources de profit:</span> {ai.profit_sources}</div><div><span className="text-primary font-bold">Sources de perte:</span> {ai.loss_sources}</div><div><span className="text-primary font-bold">Focus:</span> {ai.focus}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}