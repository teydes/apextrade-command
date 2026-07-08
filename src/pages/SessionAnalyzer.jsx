import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie } from 'recharts';
import { Clock, Sun, Moon, Sunrise, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const SESSIONS = [
  { name: 'Sydney', icon: Sunrise, color: '#F59E0B' },
  { name: 'Asian', icon: Moon, color: '#0088FF' },
  { name: 'London', icon: Sun, color: '#00FF88' },
  { name: 'New York', icon: Sun, color: '#00FF88' },
  { name: 'Overlap London-NY', icon: Sun, color: '#A855F7' },
];

export default function SessionAnalyzer() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState('all');

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sessionStats = useMemo(() => {
    if (trades.length < 3) return null;
    const bySession = {};
    SESSIONS.forEach(s => {
      const sessionTrades = trades.filter(t => t.session === s.name);
      if (sessionTrades.length === 0) return;
      const wins = sessionTrades.filter(t => t.result === 'win');
      const totalPnL = sessionTrades.reduce((a, t) => a + (t.pnl || 0), 0);
      const avgR = sessionTrades.reduce((a, t) => a + (t.risk_reward || 1), 0) / sessionTrades.length;
      bySession[s.name] = {
        name: s.name,
        color: s.color,
        trades: sessionTrades.length,
        wins: wins.length,
        winRate: (wins.length / sessionTrades.length) * 100,
        totalPnL,
        avgR,
        expectancy: totalPnL / sessionTrades.length,
      };
    });
    return Object.values(bySession);
  }, [trades]);

  const radarData = useMemo(() => {
    if (!sessionStats) return [];
    return sessionStats.map(s => ({ session: s.name, winRate: s.winRate, pnl: Math.max(0, s.totalPnL), trades: s.trades }));
  }, [sessionStats]);

  const runAI = async () => {
    if (!sessionStats) return;
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse performance par session: ${sessionStats.map(s => `${s.name}=${s.winRate.toFixed(0)}% WR, ${s.trades} trades, PnL=${s.totalPnL.toFixed(0)}, Expectancy=${s.expectancy.toFixed(0)}`).join('; ')}. Identifie: 1) Meilleure et pire session, 2) Recommandation d'allocation horaire, 3) Sessions à éviter. Court.`,
        response_json_schema: { type: 'object', properties: { best_worst: { type: 'string' }, allocation: { type: 'string' }, avoid: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ best_worst: 'Erreur', allocation: '', avoid: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Session Analyzer</h1>
          <p className="text-sm text-muted-foreground">Performance détaillée par session de trading</p>
        </div>
      </div>

      {!sessionStats || sessionStats.length === 0 ? (
        <Card className="card-trading"><CardContent className="py-12 text-center text-muted-foreground">Pas de données de session</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessionStats.map(s => (
              <Card key={s.name} className="card-trading">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm">{s.name}</span>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: `${s.color}22`, color: s.color }}>{s.trades} trades</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><div className="text-xs text-muted-foreground">Win Rate</div><div className="font-mono font-bold text-primary">{s.winRate.toFixed(1)}%</div></div>
                    <div><div className="text-xs text-muted-foreground">Total PnL</div><div className={`font-mono font-bold ${s.totalPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.totalPnL > 0 ? '+' : ''}{s.totalPnL.toFixed(0)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Avg R</div><div className="font-mono font-bold text-accent">{s.avgR.toFixed(2)}</div></div>
                    <div><div className="text-xs text-muted-foreground">Expectancy</div><div className={`font-mono font-bold ${s.expectancy > 0 ? 'text-primary' : 'text-danger-red'}`}>{s.expectancy > 0 ? '+' : ''}{s.expectancy.toFixed(0)}</div></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Win Rate par Session</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sessionStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 16%)" />
                    <XAxis dataKey="name" stroke="hsl(215 20% 55%)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="hsl(215 20% 55%)" />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                    <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]}>
                      {sessionStats.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="card-trading">
              <CardHeader><CardTitle className="text-sm">Radar Performance</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(222 47% 16%)" />
                    <PolarAngleAxis dataKey="session" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} />
                    <PolarRadiusAxis stroke="hsl(215 20% 55%)" />
                    <Radar name="Win Rate" dataKey="winRate" stroke="#00FF88" fill="#00FF8833" />
                    <Tooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="card-trading">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA par Session</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={runAI} disabled={aiLoading}>
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                Analyser l'allocation horaire optimale
              </Button>
              {aiAnalysis && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-primary font-bold">Meilleure/Pire:</span> {aiAnalysis.best_worst}</div>
                  <div><span className="text-primary font-bold">Allocation:</span> {aiAnalysis.allocation}</div>
                  <div><span className="text-primary font-bold">À éviter:</span> {aiAnalysis.avoid}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}