import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { TrendingUp, Brain, Loader2, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TradeAttribution() {
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
    const factors = ['strategy', 'session', 'timeframe', 'asset_class', 'direction', 'pattern'];
    const attribution = {};
    factors.forEach(f => {
      const groups = {};
      trades.forEach(t => {
        if (!t[f]) return;
        if (!groups[t[f]]) groups[t[f]] = { name: t[f], pnl: 0, count: 0 };
        groups[t[f]].pnl += t.pnl || 0;
        groups[t[f]].count++;
      });
      attribution[f] = Object.values(groups).map(g => ({ ...g, pct: totalPnL !== 0 ? (g.pnl / totalPnL) * 100 : 0 })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
    });
    const topContributors = factors.map(f => ({ factor: f, top: attribution[f][0] })).sort((a, b) => Math.abs(b.top?.pnl || 0) - Math.abs(a.top?.pnl || 0));
    const radarData = topContributors.map(c => ({ factor: c.factor, pnl: c.top?.pnl || 0 }));
    return { attribution, topContributors, radarData, totalPnL };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const summary = data.topContributors.map(c => `${c.factor}=${c.top?.name} (${c.top?.pnl.toFixed(0)})`).join(', ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Trade Attribution: Total PnL=${data.totalPnL.toFixed(0)}. Top contributors: ${summary}. Analyse: 1) Facteur dominant, 2) Diversification, 3) Concentration risk. Court.`,
        response_json_schema: { type: 'object', properties: { dominant: { type: 'string' }, diversification: { type: 'string' }, risk: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ dominant: 'Erreur', diversification: '', risk: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Trade Attribution</h1><p className="text-sm text-muted-foreground">Attribution multi-facteurs du PnL</p></div>
      </div>

      <Card className="card-trading glow-green">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-8 h-8 text-primary" />
            <div><div className="text-xs text-muted-foreground">Total PnL attribué</div><div className={`text-2xl font-mono font-bold ${data.totalPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{data.totalPnL > 0 ? '+' : ''}{data.totalPnL.toFixed(0)}</div></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['strategy', 'session', 'timeframe', 'asset_class'].map(factor => (
          <Card key={factor} className="card-trading">
            <CardHeader><CardTitle className="text-sm">Attribution: {factor}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.attribution[factor]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis type="number" stroke="hsl(215 20% 55%)" />
                  <YAxis type="category" dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={70} />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>{data.attribution[factor].map((e, i) => <Cell key={i} fill={e.pnl > 0 ? '#00FF88' : '#EF4444'} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Radar: Top contributeur par facteur</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.radarData}>
              <PolarGrid stroke="hsl(222 47% 16%)" />
              <PolarAngleAxis dataKey="factor" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} />
              <Radar dataKey="pnl" stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Facteur dominant:</span> {ai.dominant}</div><div><span className="text-primary font-bold">Diversification:</span> {ai.diversification}</div><div><span className="text-primary font-bold">Risque:</span> {ai.risk}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}