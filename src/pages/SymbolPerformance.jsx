import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Coins, Brain, Loader2, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SymbolPerformance() {
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
    if (trades.length < 5) return null;
    const bySymbol = {};
    trades.forEach(t => {
      if (!bySymbol[t.symbol]) bySymbol[t.symbol] = { symbol: t.symbol, trades: 0, wins: 0, pnl: 0, pnlList: [] };
      bySymbol[t.symbol].trades++;
      if (t.result === 'win') bySymbol[t.symbol].wins++;
      bySymbol[t.symbol].pnl += t.pnl || 0;
      bySymbol[t.symbol].pnlList.push(t.pnl || 0);
    });
    const arr = Object.values(bySymbol).map(s => {
      const mean = s.pnlList.reduce((a, b) => a + b, 0) / s.pnlList.length;
      const variance = s.pnlList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / s.pnlList.length;
      return { ...s, wr: (s.wins / s.trades) * 100, avgPnL: s.pnl / s.trades, std: Math.sqrt(variance), sharpe: variance > 0 ? mean / Math.sqrt(variance) : 0 };
    }).sort((a, b) => b.pnl - a.pnl);
    return arr;
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const top = data.slice(0, 5).map(s => `${s.symbol}: ${s.trades}t WR=${s.wr.toFixed(0)}% PnL=${s.pnl.toFixed(0)} Sharpe=${s.sharpe.toFixed(2)}`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Performance par symbole: ${top}. Analyse: 1) Meilleur symbole, 2) À éviter, 3) Recommandation de focus. Court.`,
        response_json_schema: { type: 'object', properties: { best: { type: 'string' }, avoid: { type: 'string' }, focus: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ best: 'Erreur', avoid: '', focus: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 5 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Layers className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Symbol Performance</h1><p className="text-sm text-muted-foreground">Décomposition par instrument</p></div>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">PnL par Symbole</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis type="number" stroke="hsl(215 20% 55%)" />
              <YAxis type="category" dataKey="symbol" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{data.map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Détail par Symbole</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="text-left p-2">Symbole</th><th className="text-right p-2">Trades</th><th className="text-right p-2">WR</th><th className="text-right p-2">PnL</th><th className="text-right p-2">Avg</th><th className="text-right p-2">Sharpe</th></tr></thead>
              <tbody>
                {data.map(s => (
                  <tr key={s.symbol} className="border-b border-border/50 row-hover">
                    <td className="p-2 font-mono font-bold">{s.symbol}</td>
                    <td className="p-2 text-right font-mono">{s.trades}</td>
                    <td className="p-2 text-right font-mono text-primary">{s.wr.toFixed(0)}%</td>
                    <td className={`p-2 text-right font-mono ${s.pnl > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.pnl > 0 ? '+' : ''}{s.pnl.toFixed(0)}</td>
                    <td className={`p-2 text-right font-mono ${s.avgPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.avgPnL > 0 ? '+' : ''}{s.avgPnL.toFixed(0)}</td>
                    <td className={`p-2 text-right font-mono ${s.sharpe > 0.5 ? 'text-primary' : s.sharpe > 0 ? 'text-warning-yellow' : 'text-danger-red'}`}>{s.sharpe.toFixed(2)}</td>
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
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Meilleur:</span> {ai.best}</div><div><span className="text-primary font-bold">À éviter:</span> {ai.avoid}</div><div><span className="text-primary font-bold">Focus:</span> {ai.focus}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}