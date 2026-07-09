import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Star, Brain, Loader2, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SetupQualityScore() {
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
    const scored = trades.map(t => {
      let score = 50;
      if (t.result === 'win') score += 15;
      else if (t.result === 'loss') score -= 10;
      if (t.risk_reward >= 3) score += 15;
      else if (t.risk_reward >= 2) score += 10;
      else if (t.risk_reward < 1) score -= 10;
      if (t.strategy === 'ICT/SMC' || t.strategy === 'AMD/IFVG') score += 5;
      if (t.session === 'Overlap London-NY') score += 5;
      if (t.session === 'London' || t.session === 'New York') score += 3;
      if (t.timeframe === 'M5' || t.timeframe === 'M15' || t.timeframe === 'H1') score += 5;
      if (t.news_impact === 'high') score -= 5;
      if (t.mistakes) score -= 15;
      if (t.signal_source === 'agent' || t.signal_source === 'auto') score += 5;
      if (t.screenshot_url) score += 3;
      score = Math.max(0, Math.min(100, score));
      let grade = 'D';
      if (score >= 80) grade = 'A+';
      else if (score >= 70) grade = 'A';
      else if (score >= 60) grade = 'B';
      else if (score >= 50) grade = 'C';
      return { ...t, qualityScore: score, qualityGrade: grade };
    });
    const byStrategy = {};
    scored.forEach(t => {
      if (!t.strategy) return;
      if (!byStrategy[t.strategy]) byStrategy[t.strategy] = { strategy: t.strategy, scores: [], trades: 0, wins: 0 };
      byStrategy[t.strategy].scores.push(t.qualityScore);
      byStrategy[t.strategy].trades++;
      if (t.result === 'win') byStrategy[t.strategy].wins++;
    });
    const strategyData = Object.values(byStrategy).map(s => ({
      ...s,
      avgScore: s.scores.reduce((a, b) => a + b, 0) / s.scores.length,
      wr: (s.wins / s.trades) * 100,
    })).sort((a, b) => b.avgScore - a.avgScore);
    const avgQuality = scored.reduce((a, t) => a + t.qualityScore, 0) / scored.length;
    const aPlus = scored.filter(t => t.qualityGrade === 'A+').length;
    const aGrade = scored.filter(t => t.qualityGrade === 'A').length;
    const bGrade = scored.filter(t => t.qualityGrade === 'B').length;
    const gradeDistribution = [
      { grade: 'A+', count: aPlus, color: '#00FF88' },
      { grade: 'A', count: aGrade, color: '#00CC66' },
      { grade: 'B', count: bGrade, color: '#0088FF' },
      { grade: 'C', count: scored.filter(t => t.qualityGrade === 'C').length, color: '#F59E0B' },
      { grade: 'D', count: scored.filter(t => t.qualityGrade === 'D').length, color: '#EF4444' },
    ];
    const radarData = strategyData.slice(0, 6).map(s => ({ strategy: s.strategy, score: s.avgScore }));
    return { scored, strategyData, avgQuality, gradeDistribution, radarData, total: scored.length };
  }, [trades]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Setup Quality: Avg score=${data.avgQuality.toFixed(0)}/100, ${data.total} trades. Grades: A+=${data.gradeDistribution[0].count}, A=${data.gradeDistribution[1].count}, B=${data.gradeDistribution[2].count}, C=${data.gradeDistribution[3].count}, D=${data.gradeDistribution[4].count}. Top strategy: ${data.strategyData[0]?.strategy} (${data.strategyData[0]?.avgScore.toFixed(0)}). Analyse: 1) Qualité globale, 2) Meilleurs setups, 3) Recommandation. Court.`,
        response_json_schema: { type: 'object', properties: { quality: { type: 'string' }, best_setups: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAi(res);
    } catch { setAi({ quality: 'Erreur', best_setups: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">Minimum 10 trades requis</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Star className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Setup Quality Score</h1><p className="text-sm text-muted-foreground">Score composite de qualité par setup</p></div>
      </div>

      <Card className={`card-trading ${data.avgQuality > 70 ? 'glow-green' : data.avgQuality < 50 ? 'glow-red' : ''}`}>
        <CardContent className="py-6 text-center">
          <div className="text-xs text-muted-foreground mb-1">Score Qualité Moyen</div>
          <div className={`text-5xl font-mono font-bold ${data.avgQuality > 70 ? 'text-primary' : data.avgQuality < 50 ? 'text-danger-red' : 'text-warning-yellow'}`}>{data.avgQuality.toFixed(0)}</div>
          <div className="text-sm text-muted-foreground">/ 100</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-5 gap-3">
        {data.gradeDistribution.map(g => (
          <Card key={g.grade} className="card-trading">
            <CardContent className="pt-4 text-center">
              <div className="text-2xl font-mono font-bold" style={{ color: g.color }}>{g.grade}</div>
              <div className="text-xl font-mono font-bold">{g.count}</div>
              <div className="text-xs text-muted-foreground">trades</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Score par Stratégie</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.strategyData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(215 20% 55%)" />
                <YAxis type="category" dataKey="strategy" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} width={80} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>{data.strategyData.map((e, i) => <Cell key={i} fill={e.avgScore > 70 ? '#00FF88' : e.avgScore > 50 ? '#F59E0B' : '#EF4444'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Radar Qualité</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="hsl(222 47% 16%)" />
                <PolarAngleAxis dataKey="strategy" stroke="hsl(215 20% 55%)" tick={{ fontSize: 9 }} />
                <Radar dataKey="score" stroke="#00FF88" fill="#00FF8833" strokeWidth={2} />
                <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} Analyser</Button>
          {ai && <div className="space-y-2 text-sm"><div><span className="text-primary font-bold">Qualité:</span> {ai.quality}</div><div><span className="text-primary font-bold">Meilleurs setups:</span> {ai.best_setups}</div><div><span className="text-primary font-bold">Recommandation:</span> {ai.recommendation}</div></div>}
        </CardContent>
      </Card>
    </div>
  );
}