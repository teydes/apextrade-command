import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Brain, Loader2, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WinRateOptimizer() {
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
    const byStrategy = {}, bySession = {}, byTimeframe = {}, byDirection = {};
    const groupBy = (obj, key, trade) => {
      if (!trade[key]) return;
      if (!obj[trade[key]]) obj[trade[key]] = { name: trade[key], total: 0, wins: 0, pnl: 0 };
      obj[trade[key]].total++;
      if (trade.result === 'win') obj[trade[key]].wins++;
      obj[trade[key]].pnl += trade.pnl || 0;
    };
    trades.forEach(t => { groupBy(byStrategy, 'strategy', t); groupBy(bySession, 'session', t); groupBy(byTimeframe, 'timeframe', t); groupBy(byDirection, 'direction', t); });
    const toChart = (obj) => Object.values(obj).map(v => ({ ...v, wr: v.total > 0 ? (v.wins / v.total) * 100 : 0 })).sort((a, b) => b.wr - a.wr);
    const stratData = toChart(byStrategy);
    const sessionData = toChart(bySession);
    const tfData = toChart(byTimeframe);
    const dirData = toChart(byDirection);
    const wins = trades.filter(t => t.result === 'win').length;
    const overallWR = (wins / trades.length) * 100;
    const bestStrategy = stratData[0];
    const worstStrategy = stratData[stratData.length - 1];
    const bestSession = sessionData[0];
    const potentialWR = bestStrategy ? (bestStrategy.wr + overallWR) / 2 : overallWR;
    const improvement = potentialWR - overallWR;
    const radarData = [
      { metric: 'Strategy', current: overallWR, potential: potentialWR },
      { metric: 'Session', current: overallWR, potential: bestSession ? (bestSession.wr + overallWR) / 2 : overallWR },
      { metric: 'Direction', current: overallWR, potential: dirData[0] ? (dirData[0].wr + overallWR) / 2 : overallWR },
      { metric: 'Timeframe', current: overallWR, potential: tfData[0] ? (tfData[0].wr + overallWR) / 2 : overallWR },
    ];
    return { stratData, sessionData, tfData, dirData, overallWR, bestStrategy, worstStrategy, bestSession, improvement, radarData };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Win Rate Optimizer: WR actuel=${data.overallWR.toFixed(1)}%. Meilleure stratégie=${data.bestStrategy?.name} (${data.bestStrategy?.wr.toFixed(0)}%), Pire=${data.worstStrategy?.name} (${data.worstStrategy?.wr.toFixed(0)}%). Meilleure session=${data.bestSession?.name} (${data.bestSession?.wr.toFixed(0)}%). Potentiel WR=${(data.overallWR + data.improvement).toFixed(1)}%. Analyse: 1) Leviers d'amélioration, 2) Éliminer quoi, 3) Plan d'action. Court.`,
        response_json_schema: { type: 'object', properties: { levers: { type: 'string' }, eliminate: { type: 'string' }, action_plan: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ levers: 'Erreur', eliminate: '', action_plan: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Win Rate Optimizer</h1><p className="text-sm text-muted-foreground">Identification des leviers d'amélioration</p></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">WR actuel</div><div className="text-2xl font-mono font-bold text-accent">{data.overallWR.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">WR potentiel</div><div className="text-2xl font-mono font-bold text-primary">{(data.overallWR + data.improvement).toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Amélioration</div><div className="text-2xl font-mono font-bold text-primary">+{data.improvement.toFixed(1)}%</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Meilleure stratégie</div><div className="text-lg font-bold text-primary">{data.bestStrategy?.name}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">WR par Stratégie</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.stratData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" unit="%" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="wr" radius={[0, 4, 4, 0]}>{data.stratData.map((e, i) => <Cell key={i} fill={e.wr > data.overallWR ? '#00FF88' : '#EF4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Radar: Potentiel d'amélioration</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="hsl(222 47% 16%)" />
                <PolarAngleAxis dataKey="metric" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis stroke="hsl(215 20% 55%)" />
                <Radar name="Actuel" dataKey="current" stroke="#0088FF" fill="#0088FF33" />
                <Radar name="Potentiel" dataKey="potential" stroke="#00FF88" fill="#00FF8833" />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">WR par Session</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.sessionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
              <YAxis stroke="hsl(215 20% 55%)" unit="%" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Bar dataKey="wr" radius={[4, 4, 0, 0]}>{data.sessionData.map((e, i) => <Cell key={i} fill={e.wr > data.overallWR ? '#00FF88' : '#EF4444'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Leviers:</span> {ai.levers}</div><div><span className="text-primary font-bold">Éliminer:</span> {ai.eliminate}</div><div><span className="text-primary font-bold">Plan:</span> {ai.action_plan}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}