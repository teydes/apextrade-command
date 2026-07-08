import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, TrendingDown, Brain, Loader2, Grid3x3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SYMBOLS = ['NQ1!', 'ES1!', 'EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD'];
const STRATEGIES = ['ICT/SMC', 'AMD/IFVG', 'Footprint', 'Order Book', 'Pullback', 'Breakout', 'Range', 'Scalping'];

export default function CorrelationMatrix() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const matrix = useMemo(() => {
    const symbols = [...new Set(trades.map(t => t.symbol))].slice(0, 8);
    const bySymbol = {};
    symbols.forEach(s => {
      bySymbol[s] = trades.filter(t => t.symbol === s && t.status === 'closed').map(t => ({ pnl: t.pnl || 0, date: t.entry_time }));
    });

    const correlations = [];
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i; j < symbols.length; j++) {
        const corr = computeCorrelation(bySymbol[symbols[i]], bySymbol[symbols[j]]);
        correlations.push({ x: symbols[i], y: symbols[j], corr: corr || 0 });
      }
    }

    const strategyPerf = {};
    STRATEGIES.forEach(strat => {
      const stratTrades = trades.filter(t => t.strategy === strat && t.status === 'closed');
      if (stratTrades.length === 0) return;
      const pnl = stratTrades.reduce((a, t) => a + (t.pnl || 0), 0);
      const wins = stratTrades.filter(t => t.result === 'win').length;
      strategyPerf[strat] = { strategy: strat, pnl, trades: stratTrades.length, winRate: (wins / stratTrades.length) * 100 };
    });

    const scatterData = trades.filter(t => t.status === 'closed' && t.pnl != null && t.risk_reward != null).slice(-100).map(t => ({
      rr: t.risk_reward || 0,
      pnl: t.pnl || 0,
      symbol: t.symbol,
      result: t.result,
    }));

    return { symbols, correlations, strategyPerf: Object.values(strategyPerf), scatterData };
  }, [trades]);

  function computeCorrelation(arr1, arr2) {
    if (arr1.length < 3 || arr2.length < 3) return 0;
    const n = Math.min(arr1.length, arr2.length);
    const x = arr1.slice(0, n).map(a => a.pnl);
    const y = arr2.slice(0, n).map(a => a.pnl);
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - meanX) * (y[i] - meanY);
      denX += Math.pow(x[i] - meanX, 2);
      denY += Math.pow(y[i] - meanY, 2);
    }
    const den = Math.sqrt(denX * denY);
    return den > 0 ? num / den : 0;
  }

  const runAI = async () => {
    setAiLoading(true);
    try {
      const topCorr = matrix.correlations.filter(c => Math.abs(c.corr) > 0.3 && c.x !== c.y).sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr)).slice(0, 5);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse corrélations entre actifs: ${topCorr.map(c => `${c.x}/${c.y}=${c.corr.toFixed(2)}`).join(', ')}. Stratégies: ${matrix.strategyPerf.map(s => `${s.strategy}=${s.winRate.toFixed(0)}% WR, PnL=${s.pnl.toFixed(0)}`).join('; ')}. Donne: 1) Diversification et risques de concentration, 2) Meilleure/pires stratégies, 3) Recommandations d'allocation. Court.`,
        response_json_schema: { type: 'object', properties: { diversification: { type: 'string' }, strategy_analysis: { type: 'string' }, allocation: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ diversification: 'Erreur', strategy_analysis: '', allocation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  const corrColor = (v) => v > 0.5 ? '#EF4444' : v > 0.2 ? '#F59E0B' : v > -0.2 ? '#6B7280' : v > -0.5 ? '#0088FF' : '#00FF88';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Grid3x3 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Correlation Matrix</h1>
          <p className="text-sm text-muted-foreground">Corrélations entre actifs et performance par stratégie</p>
        </div>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Matrice de Corrélation (PnL)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {matrix.symbols.map(s => <th key={s} className="p-2 font-mono text-muted-foreground">{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.symbols.map(rowSym => (
                  <tr key={rowSym}>
                    <td className="p-2 font-mono font-bold text-muted-foreground">{rowSym}</td>
                    {matrix.symbols.map(colSym => {
                      const cell = matrix.correlations.find(c => c.x === rowSym && c.y === colSym) || matrix.correlations.find(c => c.x === colSym && c.y === rowSym);
                      const v = cell?.corr || 0;
                      return (
                        <td key={colSym} className="p-2 text-center font-mono" style={{ background: `${corrColor(v)}33`, color: corrColor(v) }}>
                          {rowSym === colSym ? '—' : v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#EF4444' }} /> Forte positive</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#00FF88' }} /> Forte négative</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: '#6B7280' }} /> Neutre</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Performance par Stratégie</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={matrix.strategyPerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="strategy" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="pnl" name="PnL" radius={[0, 4, 4, 0]}>
                  {matrix.strategyPerf.map((entry, i) => <Cell key={i} fill={entry.pnl > 0 ? '#00FF88' : '#EF4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">R:R vs PnL (Scatter)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" dataKey="rr" name="R:R" stroke="hsl(215 20% 55%)" label={{ value: 'R:R', position: 'insideBottom' }} />
                <YAxis type="number" dataKey="pnl" name="PnL" stroke="hsl(215 20% 55%)" />
                <ZAxis range={[40, 40]} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Scatter data={matrix.scatterData.filter(d => d.result === 'win')} fill="#00FF88" />
                <Scatter data={matrix.scatterData.filter(d => d.result === 'loss')} fill="#EF4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA des Corrélations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analyser la diversification et l'allocation
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Diversification:</span> {aiAnalysis.diversification}</div>
              <div><span className="text-primary font-bold">Stratégies:</span> {aiAnalysis.strategy_analysis}</div>
              <div><span className="text-primary font-bold">Allocation:</span> {aiAnalysis.allocation}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}