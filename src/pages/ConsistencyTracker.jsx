import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart, ReferenceLine } from 'recharts';
import { Repeat, TrendingUp, Brain, Loader2, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export default function ConsistencyTracker() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const analysis = useMemo(() => {
    if (trades.length < 5) return null;
    const byDay = {};
    DAYS.forEach(d => byDay[d] = { day: d, trades: 0, wins: 0, pnl: 0 });
    trades.forEach(t => {
      const date = new Date(t.entry_time || t.created_date);
      const dayName = DAYS[(date.getDay() + 6) % 7];
      if (dayName && byDay[dayName]) {
        byDay[dayName].trades++;
        if (t.result === 'win') byDay[dayName].wins++;
        byDay[dayName].pnl += t.pnl || 0;
      }
    });
    const dayData = Object.values(byDay);

    const byWeek = {};
    trades.forEach(t => {
      const date = new Date(t.entry_time || t.created_date);
      const week = getWeekNumber(date);
      const key = `S${week}`;
      if (!byWeek[key]) byWeek[key] = { week: key, trades: 0, wins: 0, pnl: 0 };
      byWeek[key].trades++;
      if (t.result === 'win') byWeek[key].wins++;
      byWeek[key].pnl += t.pnl || 0;
    });
    const weekData = Object.values(byWeek).slice(-12);

    const pnls = trades.map(t => t.pnl || 0);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const variance = pnls.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / pnls.length;
    const std = Math.sqrt(variance);
    const cv = mean !== 0 ? Math.abs(std / Math.abs(mean)) : 0;
    const consistencyScore = Math.max(0, 100 - cv * 20);

    const profitableDays = dayData.filter(d => d.pnl > 0).length;
    const profitableWeeks = weekData.filter(w => w.pnl > 0).length;

    return { dayData, weekData, mean, std, cv, consistencyScore, profitableDays, profitableWeeks };
  }, [trades]);

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  const runAI = async () => {
    if (!analysis) return;
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse de consistance: Score=${analysis.consistencyScore.toFixed(0)}/100, CV=${analysis.cv.toFixed(2)}, Jours profitables=${analysis.profitableDays}/5, Semaines profitables=${analysis.profitableWeeks}/${analysis.weekData.length}. PnL par jour: ${analysis.dayData.map(d => `${d.day}=${d.pnl.toFixed(0)}`).join(', ')}. Analyse: 1) Niveau de consistance, 2) Jours faibles/forts, 3) Recommandations pour régularité. Court.`,
        response_json_schema: { type: 'object', properties: { consistency_level: { type: 'string' }, day_analysis: { type: 'string' }, recommendations: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ consistency_level: 'Erreur', day_analysis: '', recommendations: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Repeat className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Consistency Tracker</h1>
          <p className="text-sm text-muted-foreground">Régularité quotidienne et hebdomadaire des performances</p>
        </div>
      </div>

      {!analysis ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas assez de trades</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="card-trading glow-green"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Score de Consistance</div><div className={`text-3xl font-mono font-bold ${analysis.consistencyScore > 70 ? 'text-primary' : analysis.consistencyScore > 50 ? 'text-warning-yellow' : 'text-danger-red'}`}>{analysis.consistencyScore.toFixed(0)}/100</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Coefficient Variation</div><div className="text-2xl font-mono font-bold text-accent">{analysis.cv.toFixed(2)}</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Jours Profitables</div><div className="text-2xl font-mono font-bold text-primary">{analysis.profitableDays}/5</div></CardContent></Card>
            <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Semaines Positives</div><div className="text-2xl font-mono font-bold text-accent">{analysis.profitableWeeks}/{analysis.weekData.length}</div></CardContent></Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">PnL par Jour de la Semaine</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analysis.dayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="day" stroke="hsl(215 20% 55%)" />
                  <YAxis stroke="hsl(215 20% 55%)" />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  <Bar dataKey="pnl" name="PnL" radius={[4, 4, 0, 0]}>
                    {analysis.dayData.map((entry, i) => <Cell key={i} fill={entry.pnl > 0 ? '#00FF88' : '#EF4444'} />)}
                  </Bar>
                  <ReferenceLine y={0} stroke="hsl(215 20% 55%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm">Évolution Hebdomadaire</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analysis.weekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                  <XAxis dataKey="week" stroke="hsl(215 20% 55%)" />
                  <YAxis stroke="hsl(215 20% 55%)" />
                  <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  <Area type="monotone" dataKey="pnl" stroke="#00FF88" fill="#00FF8822" />
                  <ReferenceLine y={0} stroke="#F59E0B" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA de Consistance</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyser la régularité
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Niveau:</span> {aiAnalysis.consistency_level}</div>
                  <div><span className="text-primary font-bold">Jours:</span> {aiAnalysis.day_analysis}</div>
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