import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts';
import { Gauge, Brain, Loader2, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SharpeMetrics() {
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

  const metrics = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return null;
    const returns = closed.map(t => t.pnl_pct || 0);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const std = Math.sqrt(variance);
    const downside = returns.filter(r => r < 0);
    const downsideVar = downside.length > 0 ? downside.reduce((a, b) => a + b * b, 0) / downside.length : 0;
    const downsideDev = Math.sqrt(downsideVar);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
    const sortino = downsideDev > 0 ? (mean / downsideDev) * Math.sqrt(252) : 0;
    const maxDD = computeMaxDD(closed);
    const calmar = maxDD > 0 ? (mean * 252) / (maxDD * 100) : 0;
    const gain = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const loss = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    const omega = loss > 0 ? gain / loss : 0;
    const bestReturn = Math.max(...returns);
    const worstReturn = Math.min(...returns);
    return { sharpe, sortino, calmar, omega, mean, std, maxDD, bestReturn, worstReturn, count: closed.length };
  }, [trades]);

  function computeMaxDD(closed) {
    let peak = 0, equity = 0, maxDD = 0;
    closed.forEach(t => { equity += t.pnl || 0; if (equity > peak) peak = equity; const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0; if (dd > maxDD) maxDD = dd; });
    return maxDD;
  }

  const rollingData = useMemo(() => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl_pct != null);
    const window = 20;
    const data = [];
    for (let i = window; i <= closed.length; i++) {
      const slice = closed.slice(i - window, i);
      const rets = slice.map(t => t.pnl_pct || 0);
      const m = rets.reduce((a, b) => a + b, 0) / rets.length;
      const v = rets.reduce((a, b) => a + Math.pow(b - m, 2), 0) / rets.length;
      const s = Math.sqrt(v);
      data.push({ idx: i, sharpe: s > 0 ? (m / s) * Math.sqrt(252) : 0 });
    }
    return data;
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse performance risque-adjusté: Sharpe=${metrics?.sharpe?.toFixed(2)}, Sortino=${metrics?.sortino?.toFixed(2)}, Calmar=${metrics?.calmar?.toFixed(2)}, Omega=${metrics?.omega?.toFixed(2)}, MaxDD=${metrics?.maxDD?.toFixed(1)}%. Donne: qualité globale, comparaison aux benchmarks (SP500 Sharpe~1), recommandations d'amélioration du ratio. Court.`,
        response_json_schema: { type: 'object', properties: { quality: { type: 'string' }, benchmark: { type: 'string' }, recommendations: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ quality: 'Erreur', benchmark: '', recommendations: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Gauge className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Sharpe & Risk Metrics</h1>
          <p className="text-sm text-muted-foreground">Ratios de performance risque-adjusté (Sharpe, Sortino, Calmar, Omega)</p>
        </div>
      </div>

      {!metrics ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades fermés (min 5 requis)</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(2)} icon={<Gauge className="w-5 h-5" />} good={metrics.sharpe > 1} />
            <MetricCard label="Sortino Ratio" value={metrics.sortino.toFixed(2)} icon={<TrendingDown className="w-5 h-5" />} good={metrics.sortino > 1.5} />
            <MetricCard label="Calmar Ratio" value={metrics.calmar.toFixed(2)} icon={<Activity className="w-5 h-5" />} good={metrics.calmar > 0.5} />
            <MetricCard label="Omega Ratio" value={metrics.omega.toFixed(2)} icon={<TrendingUp className="w-5 h-5" />} good={metrics.omega > 1} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Rolling Sharpe (fenêtre 20 trades)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={rollingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                    <YAxis stroke="hsl(215 20% 55%)" />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Line type="monotone" dataKey="sharpe" stroke="#00FF88" strokeWidth={2} dot={false} />
                    <ReferenceLine y={1} stroke="#F59E0B" strokeDasharray="5 5" label="Sharpe = 1" />
                    <ReferenceLine y={2} stroke="#0088FF" strokeDasharray="5 5" label="Sharpe = 2" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Distribution des R</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trades.filter(t => t.status === 'closed' && t.pnl_pct != null).slice(-50).map((t, i) => ({ idx: i + 1, ret: t.pnl_pct || 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                    <YAxis stroke="hsl(215 20% 55%)" />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="ret" fill="#00FF88" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA des Métriques</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyser la performance risque-adjusté
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Qualité:</span> {aiAnalysis.quality}</div>
                  <div><span className="text-primary font-bold">Benchmark:</span> {aiAnalysis.benchmark}</div>
                  <div><span className="text-primary font-bold">Recommandations:</span> {aiAnalysis.recommendations}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, good }) {
  return (
    <Card className="card-trading">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon}
        </div>
        <div className={`text-2xl font-mono font-bold ${good ? 'text-primary' : 'text-warning-yellow'}`}>{value}</div>
      </CardContent>
    </Card>
  );
}