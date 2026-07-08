import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CalendarDays, TrendingUp, TrendingDown, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function CalendarHeatmap() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    base44.entities.Trade.list('-created_date', 500).then(data => {
      setTrades((data || []).filter(t => t.status === 'closed'));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const dailyData = useMemo(() => {
    const byDate = {};
    trades.forEach(t => {
      const date = new Date(t.entry_time || t.created_date);
      const key = date.toISOString().split('T')[0];
      if (!byDate[key]) byDate[key] = { date: key, pnl: 0, trades: 0, wins: 0 };
      byDate[key].pnl += t.pnl || 0;
      byDate[key].trades++;
      if (t.result === 'win') byDate[key].wins++;
    });
    return byDate;
  }, [trades]);

  const monthData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let currentWeek = [];
    const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) currentWeek.push(null);
    for (let d = 1; d <= days; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const data = dailyData[dateKey] || { date: dateKey, pnl: 0, trades: 0 };
      currentWeek.push({ ...data, day: d });
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    }
    if (currentWeek.length > 0) { while (currentWeek.length < 7) currentWeek.push(null); weeks.push(currentWeek); }
    return weeks;
  }, [selectedMonth, dailyData]);

  const monthStats = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const monthTrades = Object.values(dailyData).filter(d => {
      const d2 = new Date(d.date);
      return d2.getFullYear() === year && d2.getMonth() === month;
    });
    const totalPnL = monthTrades.reduce((a, d) => a + d.pnl, 0);
    const totalTrades = monthTrades.reduce((a, d) => a + d.trades, 0);
    const greenDays = monthTrades.filter(d => d.pnl > 0).length;
    const redDays = monthTrades.filter(d => d.pnl < 0).length;
    const bestDay = monthTrades.reduce((max, d) => d.pnl > max.pnl ? d : max, { pnl: 0, date: '' });
    const worstDay = monthTrades.reduce((min, d) => d.pnl < min.pnl ? d : min, { pnl: 0, date: '' });
    return { totalPnL, totalTrades, greenDays, redDays, bestDay, worstDay, tradingDays: monthTrades.length };
  }, [selectedMonth, dailyData]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse calendrier mensuel: PnL total=${monthStats.totalPnL.toFixed(0)}, Jours verts=${monthStats.greenDays}, Jours rouges=${monthStats.redDays}, Trades=${monthStats.totalTrades}, Meilleur jour=${monthStats.bestDay.pnl.toFixed(0)}, Pire jour=${monthStats.worstDay.pnl.toFixed(0)}. Analyse: 1) Régularité mensuelle, 2) Patterns temporels, 3) Recommandations. Court.`,
        response_json_schema: { type: 'object', properties: { regularity: { type: 'string' }, patterns: { type: 'string' }, recommendations: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ regularity: 'Erreur', patterns: '', recommendations: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  const getPnlColor = (pnl) => {
    if (pnl === 0) return 'bg-secondary/50';
    if (pnl > 500) return 'bg-primary/80';
    if (pnl > 100) return 'bg-primary/50';
    if (pnl > 0) return 'bg-primary/25';
    if (pnl > -100) return 'bg-danger-red/25';
    if (pnl > -500) return 'bg-danger-red/50';
    return 'bg-danger-red/80';
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Calendar Heatmap</h1>
          <p className="text-sm text-muted-foreground">PnL quotidien en heatmap calendrier</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1))}>← Précédent</Button>
        <span className="text-lg font-bold">{selectedMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
        <Button variant="outline" onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1))}>Suivant →</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">PnL du mois</div><div className={`text-2xl font-mono font-bold ${monthStats.totalPnL > 0 ? 'text-primary' : 'text-danger-red'}`}>{monthStats.totalPnL > 0 ? '+' : ''}{monthStats.totalPnL.toFixed(0)}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Jours verts</div><div className="text-2xl font-mono font-bold text-primary">{monthStats.greenDays}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Jours rouges</div><div className="text-2xl font-mono font-bold text-danger-red">{monthStats.redDays}</div></CardContent></Card>
        <Card className="card-trading"><CardContent className="pt-4"><div className="text-xs text-muted-foreground mb-1">Total trades</div><div className="text-2xl font-mono font-bold text-accent">{monthStats.totalTrades}</div></CardContent></Card>
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Heatmap {selectedMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>)}
          </div>
          {monthData.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((day, di) => (
                <div key={di} className={`aspect-square rounded flex flex-col items-center justify-center text-xs ${day ? getPnlColor(day.pnl) : ''}`}>
                  {day && (
                    <>
                      <span className="font-mono opacity-70">{day.day}</span>
                      {day.trades > 0 && <span className="font-mono font-bold text-[10px]">{day.pnl > 0 ? '+' : ''}{day.pnl.toFixed(0)}</span>}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA du Mois</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analyser le mois
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Régularité:</span> {aiAnalysis.regularity}</div>
              <div><span className="text-primary font-bold">Patterns:</span> {aiAnalysis.patterns}</div>
              <div><span className="text-primary font-bold">Recommandations:</span> {aiAnalysis.recommendations}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}