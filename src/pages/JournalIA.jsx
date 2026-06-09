import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, Plus, Zap, CheckCircle2, AlertTriangle, RefreshCw, Calendar,
  TrendingUp, Bot, Download, BarChart2, Clock, Brain, Target, Flame, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { toast } from 'sonner';

const MOODS = ['🟢 Concentré', '🟡 Distrait', '🔴 Stressé', '🔵 Neutre', '🟠 Surconfiant'];
const MARKET_BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutre', 'Volatile', 'Range'];

export default function JournalIA() {
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingAI, setLoadingAI] = useState(null);
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [filterPhase, setFilterPhase] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    mood: '🔵 Neutre', market_bias: 'Neutre',
    pre_analysis: '', trades_summary: '', mistakes: '', lessons: '', net_pnl: ''
  });

  const qc = useQueryClient();

  const { data: dbReports = [], isLoading } = useQuery({
    queryKey: ['daily-reports-journal'],
    queryFn: () => base44.entities.DailyReport.list('-date', 100),
  });

  const { data: todayTrades = [] } = useQuery({
    queryKey: ['today-trades-journal'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 30),
    refetchInterval: autoSchedule ? 60000 : false,
  });

  const { data: allTrades = [] } = useQuery({
    queryKey: ['all-trades-journal'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 200),
  });

  const createReport = useMutation({
    mutationFn: (data) => base44.entities.DailyReport.create(data),
    onSuccess: () => { qc.invalidateQueries(['daily-reports-journal']); setShowAdd(false); toast.success('Entrée sauvegardée'); },
  });

  const updateReport = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyReport.update(id, data),
    onSuccess: () => qc.invalidateQueries(['daily-reports-journal']),
  });

  // Auto-schedule: génère le journal à 18h si autoSchedule activé
  useEffect(() => {
    if (!autoSchedule) return;
    const check = setInterval(() => {
      const h = new Date().getHours();
      const today = new Date().toISOString().slice(0, 10);
      const alreadyLogged = dbReports.some(r => r.date === today);
      if (h >= 18 && !alreadyLogged && todayTrades.length > 0) {
        autoGenerateFromTrades();
      }
    }, 60000);
    return () => clearInterval(check);
  }, [autoSchedule, dbReports, todayTrades]);

  const autoGenerateFromTrades = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const dayTrades = todayTrades.filter(t => t.entry_time?.startsWith(today));
    if (dayTrades.length === 0) { toast.error('Aucun trade aujourd\'hui'); return; }
    setAutoGenLoading(true);

    const wins = dayTrades.filter(t => t.result === 'win').length;
    const losses = dayTrades.filter(t => t.result === 'loss').length;
    const breakevens = dayTrades.filter(t => t.result === 'breakeven').length;
    const totalPnl = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const avgRR = dayTrades.filter(t => t.risk_reward).reduce((s, t) => s + t.risk_reward, 0) / (dayTrades.filter(t => t.risk_reward).length || 1);
    const summary = dayTrades.map(t => `${t.direction} ${t.symbol} [${t.setup || t.strategy || 'N/A'}] → ${t.pnl > 0 ? '+' : ''}${t.pnl}€ (${t.result})`).join(' | ');
    const mistakes = dayTrades.filter(t => t.mistakes).map(t => t.mistakes).join('; ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach de trading NQ Futures ICT/SMC. Génère automatiquement un journal de trading complet et coaching.

Trades du jour (${today}):
${summary}

Stats: ${wins}W / ${losses}L / ${breakevens}BE | PnL: ${totalPnl}€ | WR: ${dayTrades.length ? Math.round(wins/dayTrades.length*100) : 0}% | Avg RR: ${avgRR.toFixed(2)}
Erreurs notées: ${mistakes || 'Aucune'}

Génère un journal complet. Retourne UNIQUEMENT JSON:
{
  "trades_summary": "<résumé structuré des trades>",
  "mistakes": "<erreurs observées, patterns à éviter>",
  "lessons": "<leçon principale actionnable>",
  "score": <0-100>,
  "verdict": "<coaching 1 phrase directe>",
  "market_bias": "<Bullish|Bearish|Neutre|Volatile|Range>",
  "tomorrow_focus": "<1 priorité concrète pour demain>",
  "strengths": ["<force 1>", "<force 2>"],
  "discipline_score": <0-100>,
  "risk_score": <0-100>,
  "execution_score": <0-100>
}`,
      response_json_schema: {
        type: "object",
        properties: {
          trades_summary: { type: "string" }, mistakes: { type: "string" },
          lessons: { type: "string" }, score: { type: "number" }, verdict: { type: "string" },
          market_bias: { type: "string" }, tomorrow_focus: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          discipline_score: { type: "number" }, risk_score: { type: "number" }, execution_score: { type: "number" }
        }
      }
    });

    await createReport.mutateAsync({
      date: today, phase: 'live',
      total_trades: dayTrades.length, wins, losses, breakevens,
      net_pnl: totalPnl, gross_pnl: totalPnl,
      win_rate: dayTrades.length ? Math.round((wins / dayTrades.length) * 100) : 0,
      avg_rr: parseFloat(avgRR.toFixed(2)),
      market_conditions: res.market_bias,
      analysis: `[Score:${res.score}] ${res.verdict}\n\nRésumé: ${res.trades_summary}\n\nFocus demain: ${res.tomorrow_focus}`,
      improvements: `Erreurs: ${res.mistakes}\n\nLeçons: ${res.lessons}`,
    });
    setAutoGenLoading(false);
    toast.success(`Journal auto-généré! Score: ${res.score}/100`);
  };

  const getAIFeedback = async (report) => {
    setLoadingAI(report.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Coach trading NQ Futures expert ICT/SMC. Analyse approfondie de ce journal.

Date: ${report.date} | Phase: ${report.phase}
Trades: ${report.total_trades} | W:${report.wins} L:${report.losses} BE:${report.breakevens || 0}
PnL: ${report.net_pnl}€ | WR: ${report.win_rate}% | Avg RR: ${report.avg_rr || 'N/A'}
Conditions: ${report.market_conditions || 'N/A'}
Analyse: ${report.analysis || 'N/A'}
Améliorations: ${report.improvements || 'N/A'}

Retourne UNIQUEMENT JSON:
{
  "score": <0-100>,
  "discipline_score": <0-100>,
  "risk_score": <0-100>,
  "execution_score": <0-100>,
  "verdict": "<coaching direct 2 phrases>",
  "strengths": ["<force 1>", "<force 2>", "<force 3>"],
  "errors": [{"type": "Psychologie|Technique|Risque|Timing|Setup", "detail": "<description>", "fix": "<correction concrète>"}],
  "tomorrow_focus": "<1 priorité actionnable pour demain>",
  "pattern_alert": "<pattern négatif récurrent à surveiller ou null>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" }, discipline_score: { type: "number" },
          risk_score: { type: "number" }, execution_score: { type: "number" },
          verdict: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          errors: { type: "array", items: { type: "object", properties: { type: { type: "string" }, detail: { type: "string" }, fix: { type: "string" } } } },
          tomorrow_focus: { type: "string" }, pattern_alert: { type: "string" }
        }
      }
    });
    await updateReport.mutateAsync({ id: report.id, data: { analysis: `[Score:${res.score}] ${res.verdict}` } });
    setSelected(prev => ({ ...prev, _aiFeedback: res }));
    setLoadingAI(null);
    toast.success(`Feedback coach IA — Score: ${res.score}/100`);
  };

  const generateWeeklyReport = async () => {
    const last7 = dbReports.slice(0, 7);
    if (last7.length < 3) { toast.error('Pas assez de données (min 3 jours)'); return; }
    setLoadingAI('weekly');
    const summary = last7.map(r => `${r.date}: PnL ${r.net_pnl}€ WR ${r.win_rate}% (${r.total_trades} trades)`).join(' | ');
    const totalPnl = last7.reduce((s, r) => s + (r.net_pnl || 0), 0);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Coach trading expert. Génère un rapport hebdomadaire complet.

Données 7 derniers jours: ${summary}
Total PnL: ${totalPnl}€ | Jours profitables: ${last7.filter(r => (r.net_pnl || 0) > 0).length}/${last7.length}

Retourne UNIQUEMENT JSON:
{
  "weekly_score": <0-100>,
  "weekly_verdict": "<résumé semaine 2 phrases>",
  "best_day": "<date + raison>",
  "worst_day": "<date + raison>",
  "key_pattern": "<pattern récurrent observé>",
  "week_improvements": ["<amélioration 1>", "<amélioration 2>"],
  "next_week_objectives": ["<objectif 1>", "<objectif 2>", "<objectif 3>"]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          weekly_score: { type: "number" }, weekly_verdict: { type: "string" },
          best_day: { type: "string" }, worst_day: { type: "string" },
          key_pattern: { type: "string" },
          week_improvements: { type: "array", items: { type: "string" } },
          next_week_objectives: { type: "array", items: { type: "string" } }
        }
      }
    });
    setSelected({ _weeklyReport: res, date: 'Rapport Semaine', id: 'weekly' });
    setLoadingAI(null);
    toast.success('Rapport hebdomadaire généré');
  };

  const addManualEntry = () => {
    if (!newEntry.pre_analysis && !newEntry.trades_summary) { toast.error('Remplissez au moins un champ'); return; }
    createReport.mutate({
      date: newEntry.date, phase: 'backtest_local',
      net_pnl: parseFloat(newEntry.net_pnl) || 0,
      market_conditions: newEntry.market_bias,
      analysis: newEntry.pre_analysis,
      improvements: newEntry.lessons,
    });
  };

  const exportCSV = () => {
    const rows = [['Date', 'Phase', 'Trades', 'Wins', 'Losses', 'PnL', 'WR', 'RR', 'Conditions', 'Analyse']];
    dbReports.forEach(r => rows.push([r.date, r.phase, r.total_trades, r.wins, r.losses, r.net_pnl, r.win_rate, r.avg_rr, r.market_conditions, (r.analysis || '').replace(/,/g, ';')]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'journal_trading.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Journal exporté');
  };

  // Stats globales
  const totalPnl = dbReports.reduce((s, r) => s + (r.net_pnl || 0), 0);
  const avgWR = dbReports.filter(r => r.win_rate).length
    ? Math.round(dbReports.filter(r => r.win_rate).reduce((s, r) => s + r.win_rate, 0) / dbReports.filter(r => r.win_rate).length)
    : 0;
  const bestDay = dbReports.length ? Math.max(...dbReports.map(r => r.net_pnl || 0)) : 0;
  const streak = (() => {
    let s = 0;
    for (const r of dbReports) { if ((r.net_pnl || 0) > 0) s++; else break; }
    return s;
  })();

  // Filtres
  const filtered = useMemo(() => {
    let r = dbReports;
    if (filterPhase !== 'all') r = r.filter(rr => rr.phase === filterPhase);
    if (searchQuery) r = r.filter(rr => rr.date?.includes(searchQuery) || rr.analysis?.toLowerCase().includes(searchQuery.toLowerCase()));
    return r;
  }, [dbReports, filterPhase, searchQuery]);

  // Chart PnL
  const pnlChartData = dbReports.slice(0, 30).reverse().map(r => ({ date: r.date?.slice(5), pnl: r.net_pnl || 0 }));
  const equityCurve = (() => {
    let eq = 50000;
    return dbReports.slice(0, 30).reverse().map(r => { eq += (r.net_pnl || 0); return { date: r.date?.slice(5), eq }; });
  })();

  const scoreColor = (s) => !s ? 'text-muted-foreground' : s >= 75 ? 'text-primary' : s >= 50 ? 'text-yellow-400' : 'text-destructive';

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Journal de Trading IA
          </h1>
          <p className="text-xs text-muted-foreground">
            Auto-génération · Coaching IA · Score discipline · {dbReports.length} entrées
            {autoSchedule && <span className="ml-2 text-primary animate-pulse">● Auto 18h</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setAutoSchedule(p => !p)}
            className={`text-xs px-2 py-1 rounded border transition-all ${autoSchedule ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
            <Clock className="w-3 h-3 inline mr-1" />{autoSchedule ? 'Auto ON' : 'Auto OFF'}
          </button>
          <Button size="sm" variant="outline" onClick={generateWeeklyReport} disabled={loadingAI === 'weekly'} className="gap-1 text-xs h-8">
            <BarChart2 className={`w-3 h-3 ${loadingAI === 'weekly' ? 'animate-spin' : ''}`} />
            Rapport hebdo
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />Export
          </Button>
          <Button size="sm" variant="outline" onClick={autoGenerateFromTrades} disabled={autoGenLoading} className="gap-1 text-xs">
            <Bot className={`w-3 h-3 ${autoGenLoading ? 'animate-spin' : ''}`} />
            {autoGenLoading ? 'Génération...' : 'Auto-générer'}
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Manuel</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Entrée Journal Manuelle — {newEntry.date}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={newEntry.date} onChange={e => setNewEntry(p => ({...p, date: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Humeur</Label>
                    <Select value={newEntry.mood} onValueChange={v => setNewEntry(p => ({...p, mood: v}))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MOODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Biais</Label>
                    <Select value={newEntry.market_bias} onValueChange={v => setNewEntry(p => ({...p, market_bias: v}))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MARKET_BIAS_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {[
                  { key: 'pre_analysis', label: 'Pre-analyse', placeholder: 'Structure du marché, zones clés...' },
                  { key: 'trades_summary', label: 'Résumé trades', placeholder: '2 trades - +320€ LONG / -95€ SHORT...' },
                  { key: 'mistakes', label: 'Erreurs', placeholder: 'Entrée trop tôt, sortie émotionnelle...' },
                  { key: 'lessons', label: 'Leçons', placeholder: 'Règle concrète à appliquer demain...' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Textarea value={newEntry[f.key]} onChange={e => setNewEntry(p => ({...p, [f.key]: e.target.value}))} placeholder={f.placeholder} className="bg-secondary border-border text-xs h-16 mt-1 resize-none" />
                  </div>
                ))}
                <div>
                  <Label className="text-xs">PnL Net (€)</Label>
                  <Input type="number" value={newEntry.net_pnl} onChange={e => setNewEntry(p => ({...p, net_pnl: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="ex: 225" />
                </div>
                <Button onClick={addManualEntry} className="w-full" disabled={createReport.isPending}>Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Jours loggés', value: dbReports.length, icon: Calendar, color: 'text-primary' },
          { label: 'PnL Total', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}€`, icon: TrendingUp, color: totalPnl >= 0 ? 'text-primary' : 'text-destructive' },
          { label: 'WR Moyen', value: `${avgWR}%`, icon: Target, color: avgWR >= 60 ? 'text-primary' : 'text-yellow-400' },
          { label: 'Meilleur Jour', value: `+${bestDay.toLocaleString()}€`, icon: Award, color: 'text-yellow-400' },
          { label: 'Série Gagnante', value: `${streak}j`, icon: Flame, color: streak >= 3 ? 'text-orange-400' : 'text-muted-foreground' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-trading text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color} opacity-70`} />
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'list', label: 'Journal' },
          { id: 'charts', label: 'Analyse' },
          { id: 'patterns', label: 'Patterns IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'charts' && dbReports.length > 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Courbe d'Équité (30 derniers jours)</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="jGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v.toLocaleString()}€`, 'Équité']} />
                <Area type="monotone" dataKey="eq" stroke="#8B5CF6" fill="url(#jGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">PnL par Jour</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={pnlChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v}€`, 'PnL']} />
                <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                  {pnlChartData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#00FF88' : '#EF4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold">Analyse Patterns sur {dbReports.length} jours</span>
          </div>
          {dbReports.length < 5 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Minimum 5 entrées pour détecter des patterns</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {[
                { label: 'Jours positifs', value: dbReports.filter(r => (r.net_pnl || 0) > 0).length, total: dbReports.length, color: 'text-primary' },
                { label: 'Jours négatifs', value: dbReports.filter(r => (r.net_pnl || 0) < 0).length, total: dbReports.length, color: 'text-destructive' },
                { label: 'Jours breakeven', value: dbReports.filter(r => (r.net_pnl || 0) === 0).length, total: dbReports.length, color: 'text-yellow-400' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded border border-border bg-secondary/20 text-center">
                  <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
                  <div className="text-muted-foreground">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{Math.round(s.value / s.total * 100)}% du temps</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Liste avec filtres */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Rechercher..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-secondary border-border h-7 text-xs flex-1" />
              <Select value={filterPhase} onValueChange={setFilterPhase}>
                <SelectTrigger className="h-7 bg-secondary border-border text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                  <SelectItem value="backtest_local">Backtest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {filtered.length} entrées
            </div>
            {filtered.length === 0 ? (
              <div className="card-trading text-center py-8 text-xs text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucune entrée — Cliquez "Auto-générer" pour créer le journal du jour
              </div>
            ) : filtered.map(r => (
              <button key={r.id} onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === r.id ? 'border-purple-400/50 bg-purple-400/5' : 'border-border bg-secondary/20 hover:border-border/60'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold">{r.date}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${r.phase === 'live' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{r.phase?.replace('_', ' ')}</span>
                </div>
                {r.total_trades != null && <div className="text-[10px] text-muted-foreground">{r.total_trades} trades · {r.win_rate || 0}% WR</div>}
                <div className={`text-xs font-mono font-bold mt-1 ${(r.net_pnl || 0) > 0 ? 'text-green-400' : (r.net_pnl || 0) < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {(r.net_pnl || 0) > 0 ? '+' : ''}{(r.net_pnl || 0).toLocaleString()}€
                </div>
              </button>
            ))}
          </div>

          {/* Détail */}
          {selected ? (
            <div className="lg:col-span-2 space-y-3">
              {/* Rapport hebdomadaire */}
              {selected._weeklyReport && (
                <div className="card-trading border border-purple-400/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-center">
                      <div className={`text-2xl font-bold font-mono ${scoreColor(selected._weeklyReport.weekly_score)}`}>{selected._weeklyReport.weekly_score}</div>
                      <div className="text-[10px] text-muted-foreground">Score Semaine</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-purple-400 mb-1">Rapport Hebdomadaire IA</div>
                      <p className="text-xs text-muted-foreground">{selected._weeklyReport.weekly_verdict}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="p-2 rounded bg-primary/5 border border-primary/20">
                      <div className="text-[10px] text-primary mb-0.5">Meilleur jour</div>
                      <div className="text-muted-foreground">{selected._weeklyReport.best_day}</div>
                    </div>
                    <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
                      <div className="text-[10px] text-destructive mb-0.5">Pire jour</div>
                      <div className="text-muted-foreground">{selected._weeklyReport.worst_day}</div>
                    </div>
                  </div>
                  {selected._weeklyReport.key_pattern && (
                    <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs mb-2">
                      <span className="text-yellow-400 font-semibold">Pattern: </span>
                      <span className="text-muted-foreground">{selected._weeklyReport.key_pattern}</span>
                    </div>
                  )}
                  {selected._weeklyReport.next_week_objectives?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase mb-1">Objectifs semaine prochaine</div>
                      {selected._weeklyReport.next_week_objectives.map((o, i) => (
                        <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 border border-primary/20 rounded mb-1">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <span className="text-muted-foreground">{o}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Entrée normale */}
              {!selected._weeklyReport && (
                <>
                  <div className="card-trading">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <span className="font-semibold">{selected.date}</span>
                          <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{selected.phase?.replace('_', ' ')}</span>
                        </div>
                        <div className={`text-lg font-bold font-mono mt-1 ${(selected.net_pnl || 0) > 0 ? 'text-primary' : (selected.net_pnl || 0) < 0 ? 'text-destructive' : 'text-yellow-400'}`}>
                          {(selected.net_pnl || 0) > 0 ? '+' : ''}{(selected.net_pnl || 0).toLocaleString()}€
                        </div>
                      </div>
                      <Button size="sm" className="gap-1 text-xs" onClick={() => getAIFeedback(selected)} disabled={loadingAI === selected.id}>
                        <Zap className={`w-3 h-3 ${loadingAI === selected.id ? 'animate-spin' : ''}`} />
                        {loadingAI === selected.id ? 'Analyse...' : 'Coach IA'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs mb-3">
                      {[
                        ['Trades', selected.total_trades ?? '—'],
                        ['Wins', selected.wins ?? '—'],
                        ['Losses', selected.losses ?? '—'],
                        ['WR', selected.win_rate ? `${selected.win_rate}%` : '—'],
                        ['RR', selected.avg_rr ?? '—'],
                        ['Marché', selected.market_conditions || '—'],
                      ].map(([l, v]) => (
                        <div key={l} className="p-2 rounded bg-secondary/50 text-center">
                          <div className="text-[10px] text-muted-foreground">{l}</div>
                          <div className="font-mono font-bold text-xs">{v}</div>
                        </div>
                      ))}
                    </div>
                    {selected.analysis && (
                      <div className="text-xs">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Analyse</div>
                        <p className="text-foreground whitespace-pre-wrap">{selected.analysis}</p>
                      </div>
                    )}
                    {selected.improvements && (
                      <div className="text-xs mt-2">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Améliorations</div>
                        <p className="text-foreground whitespace-pre-wrap">{selected.improvements}</p>
                      </div>
                    )}
                  </div>

                  {/* Feedback IA */}
                  {selected._aiFeedback && (
                    <div className="card-trading border border-purple-400/30 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <div className={`text-2xl font-bold font-mono ${scoreColor(selected._aiFeedback.score)}`}>{selected._aiFeedback.score}</div>
                          <div className="text-[10px] text-muted-foreground">Score</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-purple-400 mb-1">Coach IA</div>
                          <div className="text-xs text-muted-foreground">{selected._aiFeedback.verdict}</div>
                        </div>
                      </div>
                      {/* Scores détaillés */}
                      {(selected._aiFeedback.discipline_score || selected._aiFeedback.risk_score) && (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Discipline', value: selected._aiFeedback.discipline_score },
                            { label: 'Risque', value: selected._aiFeedback.risk_score },
                            { label: 'Exécution', value: selected._aiFeedback.execution_score },
                          ].map(s => (
                            <div key={s.label} className="text-center">
                              <div className={`text-lg font-bold font-mono ${scoreColor(s.value)}`}>{s.value ?? '—'}</div>
                              <div className="text-[10px] text-muted-foreground">{s.label}</div>
                              <div className="progress-bar mt-1">
                                <div className="progress-bar-fill" style={{ width: `${s.value || 0}%`, background: s.value >= 75 ? '#00FF88' : s.value >= 50 ? '#F59E0B' : '#EF4444' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {selected._aiFeedback.pattern_alert && (
                        <div className="flex gap-2 p-2 rounded border border-orange-400/30 bg-orange-400/5 text-xs">
                          <AlertTriangle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{selected._aiFeedback.pattern_alert}</span>
                        </div>
                      )}
                      {selected._aiFeedback.strengths?.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-primary font-semibold uppercase">Points forts</div>
                          {selected._aiFeedback.strengths.map((s, i) => (
                            <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 rounded border border-primary/20">
                              <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />{s}
                            </div>
                          ))}
                        </div>
                      )}
                      {selected._aiFeedback.errors?.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-destructive font-semibold uppercase">Erreurs</div>
                          {selected._aiFeedback.errors.map((e, i) => (
                            <div key={i} className="p-2 rounded border border-destructive/30 bg-destructive/5">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                                <span className="text-xs font-semibold">{e.type}</span>
                                <span className="text-[10px] text-muted-foreground">— {e.detail}</span>
                              </div>
                              <div className="text-xs text-green-400 pl-4">→ {e.fix}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {selected._aiFeedback.tomorrow_focus && (
                        <div className="p-2 rounded border border-yellow-400/30 bg-yellow-400/5">
                          <div className="text-[10px] text-yellow-400 font-semibold mb-0.5">Focus demain</div>
                          <div className="text-xs">{selected._aiFeedback.tomorrow_focus}</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="lg:col-span-2 card-trading text-center py-16">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Sélectionnez une entrée ou générez le journal du jour</p>
              <Button className="mt-4 gap-1 text-xs" onClick={autoGenerateFromTrades} disabled={autoGenLoading}>
                <Bot className={`w-3 h-3 ${autoGenLoading ? 'animate-spin' : ''}`} />
                Auto-générer maintenant
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}