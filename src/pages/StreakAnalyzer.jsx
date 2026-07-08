import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { Flame, TrendingUp, TrendingDown, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function StreakAnalyzer() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed').reverse());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const streaks = useMemo(() => {
    if (trades.length < 3) return null;
    let current = trades[0].result === 'win' ? 'win' : 'loss';
    let count = 1;
    const allStreaks = [];
    for (let i = 1; i < trades.length; i++) {
      const r = trades[i].result === 'win' ? 'win' : 'loss';
      if (r === current) { count++; }
      else { allStreaks.push({ type: current, length: count, endIdx: i }); current = r; count = 1; }
    }
    allStreaks.push({ type: current, length: count, endIdx: trades.length });

    const winStreaks = allStreaks.filter(s => s.type === 'win');
    const lossStreaks = allStreaks.filter(s => s.type === 'loss');
    const maxWin = Math.max(0, ...winStreaks.map(s => s.length));
    const maxLoss = Math.max(0, ...lossStreaks.map(s => s.length));
    const avgWin = winStreaks.length > 0 ? winStreaks.reduce((a, s) => a + s.length, 0) / winStreaks.length : 0;
    const avgLoss = lossStreaks.length > 0 ? lossStreaks.reduce((a, s) => a + s.length, 0) / lossStreaks.length : 0;
    const currentStreak = allStreaks[allStreaks.length - 1];
    const winStreakDistribution = {};
    winStreaks.forEach(s => { winStreakDistribution[s.length] = (winStreakDistribution[s.length] || 0) + 1; });
    const lossStreakDistribution = {};
    lossStreaks.forEach(s => { lossStreakDistribution[s.length] = (lossStreakDistribution[s.length] || 0) + 1; });
    return { allStreaks, winStreaks, lossStreaks, maxWin, maxLoss, avgWin, avgLoss, currentStreak, winStreakDistribution, lossStreakDistribution };
  }, [trades]);

  const timelineData = useMemo(() => {
    if (!streaks) return [];
    return streaks.allStreaks.map((s, i) => ({ idx: i + 1, length: s.type === 'win' ? s.length : -s.length, type: s.type }));
  }, [streaks]);

  const distData = useMemo(() => {
    if (!streaks) return [];
    const maxLen = Math.max(streaks.maxWin, streaks.maxLoss);
    const data = [];
    for (let i = 1; i <= maxLen; i++) {
      data.push({ length: i, wins: streaks.winStreakDistribution[i] || 0, losses: streaks.lossStreakDistribution[i] || 0 });
    }
    return data;
  }, [streaks]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse des streaks de trading: Max win streak=${streaks.maxWin}, Max loss streak=${streaks.maxLoss}, Avg win streak=${streaks.avgWin.toFixed(1)}, Avg loss streak=${streaks.avgLoss.toFixed(1)}, Streak actuel=${streaks.currentStreak.type} (${streaks.currentStreak.length}). Donne: 1) Signification psychologique des patterns, 2) Risque après longue série de gains (overconfidence), 3) Plan d'action après série de pertes. Court.`,
        response_json_schema: { type: 'object', properties: { psychology: { type: 'string' }, risk: { type: 'string' }, action_plan: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ psychology: 'Erreur', risk: '', action_plan: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Flame className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Streak Analyzer</h1>
          <p className="text-sm text-muted-foreground">Analyse des séries de gains et pertes consécutives</p>
        </div>
      </div>

      {!streaks ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Win Streak</div><div className="text-3xl font-mono font-bold text-primary flex items-center gap-2"><TrendingUp className="w-6 h-6" />{streaks.maxWin}</div></CardContent></Card>
            <Card className="card-trading glow-red"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Max Loss Streak</div><div className="text-3xl font-mono font-bold text-danger-red flex items-center gap-2"><TrendingDown className="w-6 h-6" />{streaks.maxLoss}</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Win Streak</div><div className="text-2xl font-mono font-bold text-primary">{streaks.avgWin.toFixed(1)}</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Avg Loss Streak</div><div className="text-2xl font-mono font-bold text-danger-red">{streaks.avgLoss.toFixed(1)}</div></CardContent></Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Timeline des Streaks</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis dataKey="idx" stroke="hsl(215 20% 55%)" />
                    <YAxis stroke="hsl(215 20% 55%)" />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="length" radius={[4, 4, 0, 0]}>
                      {timelineData.map((entry, i) => <Cell key={i} fill={entry.type === 'win' ? '#00FF88' : '#EF4444'} />)}
                    </Bar>
                    <ReferenceLine y={0} stroke="hsl(215 20% 55%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Distribution des Streaks</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={distData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis dataKey="length" stroke="hsl(215 20% 55%)" label={{ value: 'Longueur streak', position: 'insideBottom' }} />
                    <YAxis stroke="hsl(215 20% 55%)" />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="wins" name="Win streaks" fill="#00FF88" />
                    <Bar dataKey="losses" name="Loss streaks" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA des Patterns</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyser les patterns psychologiques
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Psychologie:</span> {aiAnalysis.psychology}</div>
                  <div><span className="text-primary font-bold">Risque:</span> {aiAnalysis.risk}</div>
                  <div><span className="text-primary font-bold">Plan d'action:</span> {aiAnalysis.action_plan}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}