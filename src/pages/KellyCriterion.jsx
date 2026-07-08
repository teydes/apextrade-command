import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Scale, Percent, TrendingUp, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function KellyCriterion() {
  const [winRate, setWinRate] = useState(55);
  const [avgWin, setAvgWin] = useState(2);
  const [avgLoss, setAvgLoss] = useState(1);
  const [capital, setCapital] = useState(10000);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 200).then(data => {
      setTrades(data || []);
      const closed = (data || []).filter(t => t.status === 'closed');
      if (closed.length > 10) {
        const wins = closed.filter(t => t.result === 'win');
        const wr = (wins.length / closed.length) * 100;
        if (wr > 0) setWinRate(Math.round(wr));
      }
    }).catch(() => {});
  }, []);

  const b = avgWin / avgLoss;
  const p = winRate / 100;
  const q = 1 - p;
  const kelly = Math.max(0, (b * p - q) / b) * 100;
  const halfKelly = kelly / 2;
  const quarterKelly = kelly / 4;
  const fullRisk = (capital * kelly) / 100;
  const halfRisk = (capital * halfKelly) / 100;
  const quarterRisk = (capital * quarterKelly) / 100;

  const curve = useMemo(() => {
    const data = [];
    for (let pct = 0; pct <= 100; pct += 2) {
      const f = pct / 100;
      const edge = (b + 1) * p - 1;
      const growth = f * edge - 0.5 * f * f * (b * b * p + q);
      data.push({ pct, growth: growth * 100, kelly: kelly });
    }
    return data;
  }, [winRate, avgWin, avgLoss]);

  const runAI = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse Kelly Criterion pour un trader: Win rate=${winRate}%, Avg Win R=${avgWin}, Avg Loss R=${avgLoss}, Capital=${capital}. Kelly=${kelly.toFixed(2)}%. Donne: 1) Recommandation de sizing (Full/Half/Quarter Kelly et pourquoi), 2) Risques du full Kelly, 3) Quand ajuster. Format court avec bullet points.`,
        response_json_schema: { type: 'object', properties: { recommendation: { type: 'string' }, risks: { type: 'string' }, adjustments: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ recommendation: 'Erreur API', risks: '', adjustments: '' }); }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Scale className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Kelly Criterion</h1>
          <p className="text-sm text-muted-foreground">Position sizing optimal basé sur l'espérance mathématique</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Paramètres</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Win Rate (%)</Label><Input type="number" value={winRate} onChange={e => setWinRate(+e.target.value)} /></div>
            <div><Label>Avg Win (R)</Label><Input type="number" step="0.1" value={avgWin} onChange={e => setAvgWin(+e.target.value)} /></div>
            <div><Label>Avg Loss (R)</Label><Input type="number" step="0.1" value={avgLoss} onChange={e => setAvgLoss(+e.target.value)} /></div>
            <div><Label>Capital</Label><Input type="number" value={capital} onChange={e => setCapital(+e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Résultats Kelly</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Full Kelly</span><span className="font-mono text-lg text-primary">{kelly.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Half Kelly</span><span className="font-mono text-lg text-accent">{halfKelly.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quarter Kelly</span><span className="font-mono text-lg text-warning-yellow">{quarterKelly.toFixed(2)}%</span></div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground text-sm">Risque Full</span><span className="font-mono text-sm text-primary">€{fullRisk.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-sm">Risque Half</span><span className="font-mono text-sm text-accent">€{halfRisk.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-sm">Risque Quarter</span><span className="font-mono text-sm text-warning-yellow">€{quarterRisk.toFixed(0)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-trading">
          <CardHeader><CardTitle className="text-sm">Analyse IA</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runAI} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              Analyser
            </Button>
            {aiAnalysis && (
              <div className="space-y-2 text-xs">
                <div><span className="text-primary font-bold">Recommandation:</span> {aiAnalysis.recommendation}</div>
                <div><span className="text-primary font-bold">Risques:</span> {aiAnalysis.risks}</div>
                <div><span className="text-primary font-bold">Ajustements:</span> {aiAnalysis.adjustments}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Courbe de Croissance (G vs Fraction)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={curve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
              <XAxis dataKey="pct" label={{ value: 'Fraction (%)', position: 'insideBottom' }} stroke="hsl(215 20% 55%)" />
              <YAxis stroke="hsl(215 20% 55%)" />
              <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
              <Area type="monotone" dataKey="growth" stroke="#00FF88" fill="#00FF8833" />
              <ReferenceLine x={kelly} stroke="#F59E0B" strokeDasharray="5 5" label="Kelly Optimal" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}