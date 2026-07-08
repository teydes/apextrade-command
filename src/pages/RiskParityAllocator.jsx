import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Scale, Brain, Loader2, PieChart as PieIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RiskParityAllocator() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCapital, setTotalCapital] = useState(100000);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allocations = useMemo(() => {
    const byStrategy = {};
    trades.filter(t => t.status === 'closed').forEach(t => {
      if (!t.strategy) return;
      if (!byStrategy[t.strategy]) byStrategy[t.strategy] = { strategy: t.strategy, trades: 0, wins: 0, pnl: 0, pnls: [] };
      byStrategy[t.strategy].trades++;
      if (t.result === 'win') byStrategy[t.strategy].wins++;
      byStrategy[t.strategy].pnl += t.pnl || 0;
      byStrategy[t.strategy].pnls.push(t.pnl || 0);
    });

    const strategies = Object.values(byStrategy).filter(s => s.trades >= 3);
    strategies.forEach(s => {
      s.winRate = (s.wins / s.trades) * 100;
      const mean = s.pnls.reduce((a, b) => a + b, 0) / s.pnls.length;
      const variance = s.pnls.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / s.pnls.length;
      s.std = Math.sqrt(variance);
      s.sharpe = s.std > 0 ? mean / s.std : 0;
      s.expectancy = s.pnl / s.trades;
      s.riskWeight = s.sharpe > 0 ? s.sharpe : 0.01;
    });

    const totalWeight = strategies.reduce((a, s) => a + s.riskWeight, 0);
    strategies.forEach(s => {
      s.allocationPct = (s.riskWeight / totalWeight) * 100;
      s.allocationAmount = totalCapital * (s.allocationPct / 100);
    });

    return strategies.sort((a, b) => b.allocationPct - a.allocationPct);
  }, [trades, totalCapital]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Allocation Risk Parity: ${allocations.map(s => `${s.strategy}: ${s.allocationPct.toFixed(1)}% (Sharpe=${s.sharpe.toFixed(2)}, WR=${s.winRate.toFixed(0)}%, Expectancy=${s.expectancy.toFixed(0)})`).join('; ')}. Capital total=${totalCapital}. Analyse: 1) Qualité de la diversification, 2) Concentration risk, 3) Réajustement recommandé. Court.`,
        response_json_schema: { type: 'object', properties: { diversification: { type: 'string' }, concentration: { type: 'string' }, rebalancing: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ diversification: 'Erreur', concentration: '', rebalancing: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Scale className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Risk Parity Allocator</h1>
          <p className="text-sm text-muted-foreground">Allocation optimale basée sur le ratio Sharpe inverse-volatility</p>
        </div>
      </div>

      <Card className="card-trading">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div><Label>Capital total à allouer</Label><Input type="number" value={totalCapital} onChange={e => setTotalCapital(+e.target.value)} className="w-40" /></div>
            <Button onClick={runAI} disabled={aiLoading} className="ml-auto">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Analyse IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {allocations.length === 0 ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades par stratégie (min 3)</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Allocation par Stratégie</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={allocations} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis type="number" stroke="hsl(215 20% 55%)" unit="%" />
                    <YAxis type="category" dataKey="strategy" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="allocationPct" name="Allocation %" radius={[0, 4, 4, 0]}>
                      {allocations.map((entry, i) => <Cell key={i} fill={entry.sharpe > 0.5 ? '#00FF88' : entry.sharpe > 0 ? '#F59E0B' : '#EF4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><PieIcon className="w-4 h-4 text-primary" /> Répartition</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={allocations} dataKey="allocationPct" nameKey="strategy" cx="50%" cy="50%" outerRadius={100} label={e => e.strategy}>
                      {allocations.map((entry, i) => <Cell key={i} fill={['#00FF88', '#0088FF', '#F59E0B', '#EF4444', '#A855F7', '#00CED1'][i % 6]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">Détail par Stratégie</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-2">Stratégie</th>
                      <th className="text-right p-2">Trades</th>
                      <th className="text-right p-2">Win Rate</th>
                      <th className="text-right p-2">Sharpe</th>
                      <th className="text-right p-2">Expectancy</th>
                      <th className="text-right p-2">Allocation</th>
                      <th className="text-right p-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map(s => (
                      <tr key={s.strategy} className="border-b border-border/50 row-hover">
                        <td className="p-2 font-bold">{s.strategy}</td>
                        <td className="p-2 text-right font-mono">{s.trades}</td>
                        <td className="p-2 text-right font-mono text-primary">{s.winRate.toFixed(0)}%</td>
                        <td className={`p-2 text-right font-mono ${s.sharpe > 0.5 ? 'text-primary' : s.sharpe > 0 ? 'text-warning-yellow' : 'text-danger-red'}`}>{s.sharpe.toFixed(2)}</td>
                        <td className={`p-2 text-right font-mono ${s.expectancy > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.expectancy > 0 ? '+' : ''}{s.expectancy.toFixed(0)}</td>
                        <td className="p-2 text-right font-mono font-bold text-accent">{s.allocationPct.toFixed(1)}%</td>
                        <td className="p-2 text-right font-mono text-primary">€{s.allocationAmount.toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {aiAnalysis && (
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Analyse IA</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="text-primary font-bold">Diversification:</span> {aiAnalysis.diversification}</div>
                <div><span className="text-primary font-bold">Concentration:</span> {aiAnalysis.concentration}</div>
                <div><span className="text-primary font-bold">Réajustement:</span> {aiAnalysis.rebalancing}</div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}