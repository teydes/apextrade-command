import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { HeartPulse, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PsychologyScore() {
  const [psychEntries, setPsychEntries] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.PsychologyEntry.list('-date', 100),
      base44.entities.Trade.list('-created_date', 500),
    ]).then(([psy, tr]) => {
      setPsychEntries(psy || []);
      setTrades((tr || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const data = useMemo(() => {
    if (psychEntries.length < 3) return null;
    const total = psychEntries.length;
    const avgDiscipline = psychEntries.reduce((a, e) => a + (e.discipline_score || 0), 0) / total;
    const avgFomo = psychEntries.reduce((a, e) => a + (e.fomo_level || 0), 0) / total;
    const avgFatigue = psychEntries.reduce((a, e) => a + (e.fatigue_level || 0), 0) / total;
    const rulesFollowed = psychEntries.filter(e => e.rules_followed).length;
    const rulesPct = (rulesFollowed / total) * 100;
    const overtradingCount = psychEntries.filter(e => e.overtrading).length;
    const revengeCount = psychEntries.filter(e => e.revenge_trading).length;
    const tradesTaken = psychEntries.reduce((a, e) => a + (e.trades_taken || 0), 0);
    const tradesPlanned = psychEntries.reduce((a, e) => a + (e.trades_planned || 0), 0);
    const planAdherence = tradesPlanned > 0 ? (Math.min(tradesTaken, tradesPlanned) / tradesPlanned) * 100 : 0;

    const moodCounts = {};
    psychEntries.forEach(e => { moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
    const moodData = Object.entries(moodCounts).map(([mood, count]) => ({ mood, count }));

    const qualityCounts = {};
    psychEntries.forEach(e => { qualityCounts[e.session_quality] = (qualityCounts[e.session_quality] || 0) + 1; });

    const radarData = [
      { metric: 'Discipline', score: avgDiscipline },
      { metric: 'Plan Adherence', score: planAdherence },
      { metric: 'Rules Followed', score: rulesPct },
      { metric: 'No FOMO', score: 100 - avgFomo * 10 },
      { metric: 'No Fatigue', score: 100 - avgFatigue * 10 },
      { metric: 'No Overtrading', score: 100 - (overtradingCount / total) * 100 },
    ];
    const overallScore = radarData.reduce((a, d) => a + d.score, 0) / radarData.length;

    const tradesByDate = {};
    trades.forEach(t => {
      const d = new Date(t.entry_time || t.created_date).toISOString().split('T')[0];
      if (!tradesByDate[d]) tradesByDate[d] = { pnl: 0, count: 0 };
      tradesByDate[d].pnl += t.pnl || 0;
      tradesByDate[d].count++;
    });
    const correlation = psychEntries.map(e => {
      const tradeDay = tradesByDate[e.date];
      return { discipline: e.discipline_score, pnl: tradeDay?.pnl || 0 };
    }).filter(c => c.discipline != null);

    return { avgDiscipline, avgFomo, avgFatigue, rulesPct, overtradingCount, revengeCount, tradesTaken, tradesPlanned, planAdherence, moodData, radarData, overallScore, total, correlation };
  }, [psychEntries, trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Psychology Score: Overall=${data.overallScore.toFixed(0)}/100, Discipline=${data.avgDiscipline.toFixed(0)}, FOMO=${data.avgFomo.toFixed(1)}/10, Fatigue=${data.avgFatigue.toFixed(1)}/10, Rules followed=${data.rulesPct.toFixed(0)}%, Overtrading=${data.overtradingCount}/${data.total}, Revenge=${data.revengeCount}/${data.total}. Analyse: 1) État psychologique, 2) Risques comportementaux, 3) Plan d'amélioration. Court.`,
        response_json_schema: { type: 'object', properties: { state: { type: 'string' }, risks: { type: 'string' }, improvement: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ state: 'Erreur', risks: '', improvement: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 3 entrées psychologie requises</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <HeartPulse className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Psychology Score</h1><p className="text-sm text-muted-foreground">Score psychologique global et corrélations</p></div>
      </div>

      <Card className={`card-trading ${data.overallScore > 70 ? 'glow-green' : data.overallScore < 40 ? 'glow-red' : ''}`}>
        <CardContent className="py-6 text-center">
          <div className="text-xs text-muted-foreground mb-1">Score Psychologique Global</div>
          <div className={`text-5xl font-mono font-bold ${data.overallScore > 70 ? 'text-primary' : data.overallScore < 40 ? 'text-danger-red' : 'text-warning-yellow'}`}>{data.overallScore.toFixed(0)}</div>
          <div className="text-sm text-muted-foreground">/ 100</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Discipline avg</div><div className="text-2xl font-mono font-bold text-primary">{data.avgDiscipline.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">FOMO avg</div><div className="text-2xl font-mono font-bold text-danger-red">{data.avgFomo.toFixed(1)}/10</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Fatigue avg</div><div className="text-2xl font-mono font-bold text-warning-yellow">{data.avgFatigue.toFixed(1)}/10</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Plan adherence</div><div className="text-2xl font-mono font-bold text-accent">{data.planAdherence.toFixed(0)}%</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Radar Psychologique</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="hsl(222 47% 16%)" />
                <PolarAngleAxis dataKey="metric" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Distribution des Humeurs</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.moodData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="mood" stroke="hsl(215 20% 55%)" width={80} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>{data.moodData.map((e, i) => <Cell key={i} fill={e.mood === 'confident' ? '#00FF88' : e.mood === 'tilt' || e.mood === 'frustrated' ? '#EF4444' : '#F59E0B'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">État:</span> {ai.state}</div><div><span className="text-primary font-bold">Risques:</span> {ai.risks}</div><div><span className="text-primary font-bold">Amélioration:</span> {ai.improvement}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}