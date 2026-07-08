import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Award, TrendingUp, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GRADES = {
  A: { color: 'text-primary', bg: 'bg-primary/20', label: 'Excellente exécution' },
  B: { color: 'text-accent', bg: 'bg-accent/20', label: 'Bonne exécution' },
  C: { color: 'text-warning-yellow', bg: 'bg-warning-yellow/20', label: 'Exécution moyenne' },
  D: { color: 'text-orange-400', bg: 'bg-orange-400/20', label: 'Mauvaise exécution' },
  F: { color: 'text-danger-red', bg: 'bg-danger-red/20', label: "Échec d'exécution" },
};

function gradeTrade(trade) {
  let score = 50;
  if (trade.result === 'win') score += 20;
  if (trade.result === 'loss') score -= 15;
  if (trade.risk_reward && trade.risk_reward >= 2) score += 15;
  if (trade.risk_reward && trade.risk_reward < 1) score -= 10;
  if (trade.mistakes) score -= 20;
  if (trade.improvements) score -= 5;
  if (trade.news_impact === 'high' || trade.news_impact === 'medium') score -= 5;
  if (trade.session === 'Overlap London-NY') score += 5;
  if (trade.signal_source === 'agent' || trade.signal_source === 'auto') score += 5;
  if (trade.strategy === 'ICT/SMC' || trade.strategy === 'AMD/IFVG') score += 5;
  score = Math.max(0, Math.min(100, score));
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export default function TradeGrading() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGrade, setFilterGrade] = useState('all');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 100).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const graded = useMemo(() => {
    return trades.map(t => ({ ...t, grade: gradeTrade(t) }));
  }, [trades]);

  const distribution = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    graded.forEach(t => { dist[t.grade]++; });
    return dist;
  }, [graded]);

  const avgScore = useMemo(() => {
    if (graded.length === 0) return 0;
    const points = { A: 90, B: 75, C: 60, D: 45, F: 20 };
    return graded.reduce((a, t) => a + points[t.grade], 0) / graded.length;
  }, [graded]);

  const filtered = filterGrade === 'all' ? graded : graded.filter(t => t.grade === filterGrade);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse grading des trades: Distribution A=${distribution.A}, B=${distribution.B}, C=${distribution.C}, D=${distribution.D}, F=${distribution.F}. Score moyen=${avgScore.toFixed(0)}/100 sur ${graded.length} trades. Analyse: 1) Qualité globale d'exécution, 2) Patterns d'erreurs récurrents, 3) Plan d'amélioration du grading. Court.`,
        response_json_schema: { type: 'object', properties: { execution_quality: { type: 'string' }, error_patterns: { type: 'string' }, improvement_plan: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ execution_quality: 'Erreur', error_patterns: '', improvement_plan: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Award className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Trade Grading System</h1>
          <p className="text-sm text-muted-foreground">Évaluation automatique A-F de la qualité d'exécution</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {['A', 'B', 'C', 'D', 'F'].map(g => (
          <Card key={g} className={`card-trading ${filterGrade === g ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="pt-4 text-center cursor-pointer" onClick={() => setFilterGrade(filterGrade === g ? 'all' : g)}>
              <div className={`text-3xl font-mono font-bold ${GRADES[g].color}`}>{g}</div>
              <div className="text-2xl font-mono font-bold">{distribution[g]}</div>
              <div className="text-xs text-muted-foreground mt-1">{GRADES[g].label}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="card-trading glow-green">
          <CardContent className="pt-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">Score Moyen</div>
            <div className={`text-3xl font-mono font-bold ${avgScore > 70 ? 'text-primary' : avgScore > 50 ? 'text-warning-yellow' : 'text-danger-red'}`}>{avgScore.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground mt-1">/ 100</div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Filter className="w-4 h-4" /> Trades Gradés ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filtered.slice(0, 50).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded bg-secondary/50 row-hover">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-lg ${GRADES[t.grade].bg} ${GRADES[t.grade].color}`}>
                  {t.grade}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{t.symbol}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${t.direction === 'LONG' ? 'bg-primary/20 text-primary' : 'bg-danger-red/20 text-danger-red'}`}>{t.direction}</span>
                    <span className={`text-xs ${t.result === 'win' ? 'text-primary' : t.result === 'loss' ? 'text-danger-red' : 'text-warning-yellow'}`}>{t.result}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{t.strategy} · {t.session} · {t.timeframe}</div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm font-bold ${t.pnl > 0 ? 'text-primary' : 'text-danger-red'}`}>{t.pnl > 0 ? '+' : ''}{t.pnl?.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">{t.risk_reward?.toFixed(1)}R</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA du Grading</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analyser la qualité d'exécution
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Qualité:</span> {aiAnalysis.execution_quality}</div>
              <div><span className="text-primary font-bold">Erreurs:</span> {aiAnalysis.error_patterns}</div>
              <div><span className="text-primary font-bold">Plan:</span> {aiAnalysis.improvement_plan}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}