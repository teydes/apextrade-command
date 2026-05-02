import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Play, Pause, Plus, TrendingUp, Target, Percent, Zap, CheckCircle2, XCircle, BarChart2, RefreshCw, AlertTriangle, ArrowUp, ArrowDown, Minus, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';

const mockEquity = [
  { t: '01/04', eq: 50000, dd: 0 }, { t: '03/04', eq: 50450, dd: -120 },
  { t: '05/04', eq: 50180, dd: -280 }, { t: '07/04', eq: 51200, dd: -90 },
  { t: '09/04', eq: 51800, dd: -60 }, { t: '11/04', eq: 51650, dd: -200 },
  { t: '13/04', eq: 52400, dd: -40 }, { t: '15/04', eq: 53100, dd: -10 },
];

const tradeLogs = [
  { id: 1, date: '2024-04-01', time: '09:47', setup: 'ICT OB + FVG', dir: 'LONG', entry: 19820, sl: 19795, tp1: 19850, tp2: 19875, pnl: 320, rr: 2.4, result: 'win', mistake: null },
  { id: 2, date: '2024-04-01', time: '10:22', setup: 'BOS + CHoCH', dir: 'SHORT', entry: 19865, sl: 19890, tp1: 19835, tp2: 19810, pnl: -95, rr: 1.2, result: 'loss', mistake: 'Entry trop tôt, pas de confirmation' },
  { id: 3, date: '2024-04-02', time: '14:05', setup: 'AMD Expansion', dir: 'LONG', entry: 19780, sl: 19760, tp1: 19820, tp2: 19860, pnl: 540, rr: 3.0, result: 'win', mistake: null },
  { id: 4, date: '2024-04-02', time: '15:15', setup: 'IFVG Fill', dir: 'SHORT', entry: 19845, sl: 19860, tp1: 19820, tp2: 19800, pnl: 210, rr: 1.8, result: 'win', mistake: null },
];

// Statistiques auto par setup
const setupStats = [
  { name: 'ICT OB+FVG', trades: 12, wr: 75, avgRR: 2.6, pnl: 1840 },
  { name: 'AMD Expansion', trades: 8, wr: 87, avgRR: 3.1, pnl: 2210 },
  { name: 'BOS+CHoCH', trades: 9, wr: 44, avgRR: 1.3, pnl: -120 },
  { name: 'IFVG Fill', trades: 6, wr: 67, avgRR: 1.9, pnl: 540 },
  { name: 'POC Retest', trades: 4, wr: 50, avgRR: 1.5, pnl: 80 },
];

const sessionStats = [
  { name: 'London', trades: 11, wr: 63, pnl: 890 },
  { name: 'NY Open', trades: 18, wr: 78, pnl: 2340 },
  { name: 'NY Afternoon', trades: 10, wr: 40, pnl: -230 },
];

export default function Backtest() {
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('journal'); // journal | auto | optimize
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [newTrade, setNewTrade] = useState({ symbol: 'NQ1!', direction: 'LONG', setup: '', pnl: '', rr: '', result: 'win', mistakes: '', improvements: '' });
  const qc = useQueryClient();

  const exportCSV = () => {
    const headers = ['Heure', 'Setup', 'Direction', 'Entry', 'SL', 'TP1', 'P&L', 'R:R', 'Résultat', 'Erreur'];
    const rows = allTrades.map(t => [
      t.time || '', t.setup || '', t.dir || t.direction || '',
      t.entry || '', t.sl || t.stop_loss || '', t.tp1 || t.take_profit_1 || '',
      t.pnl || '', t.rr || '', t.result || '', t.mistake || t.mistakes || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'backtest_trades.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const { data: trades = [] } = useQuery({
    queryKey: ['backtest-trades'],
    queryFn: () => base44.entities.Trade.filter({ phase: 'backtest_local' }, '-created_date', 50)
  });

  const addTrade = useMutation({
    mutationFn: (d) => base44.entities.Trade.create({ ...d, phase: 'backtest_local', pnl: parseFloat(d.pnl), rr: parseFloat(d.rr) }),
    onSuccess: () => { qc.invalidateQueries(['backtest-trades']); setShowAddTrade(false); toast.success('Trade ajouté'); }
  });

  const allTrades = [...tradeLogs, ...trades.map((t, i) => ({ ...t, id: `db-${i}` }))];
  const wins = allTrades.filter(t => t.result === 'win').length;
  const losses = allTrades.filter(t => t.result === 'loss').length;
  const totalPnl = allTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = allTrades.length ? ((wins / allTrades.length) * 100).toFixed(1) : 0;
  const avgRR = allTrades.length ? (allTrades.reduce((s, t) => s + (t.rr || 0), 0) / allTrades.length).toFixed(2) : 0;

  const filtered = filter === 'all' ? allTrades : allTrades.filter(t => t.result === filter);

  const isReadyForDemo = parseFloat(winRate) >= 60 && totalPnl > 500;

  const runAIOptimization = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert en trading algorithmique et backtest NQ Futures.
Voici mes statistiques de backtest:
- Win Rate: ${winRate}%
- P&L Total: ${totalPnl}€
- Avg R:R: ${avgRR}
- Setups: ${setupStats.map(s => `${s.name} (WR:${s.wr}%, RR:${s.avgRR}, PnL:${s.pnl}€)`).join(', ')}
- Sessions: ${sessionStats.map(s => `${s.name} (WR:${s.wr}%, PnL:${s.pnl}€)`).join(', ')}

Retourne UNIQUEMENT un JSON (sans markdown) avec cette structure exacte:
{
  "score": <number 0-100>,
  "verdict": "<une phrase de synthèse>",
  "suggestions": [
    { "category": "Setup"|"Session"|"R:R"|"Entrée"|"Risque", "priority": "haute"|"moyenne"|"basse", "title": "<titre court>", "detail": "<explication concrète en 1-2 phrases>" }
  ]
}
Fournis 5 à 7 suggestions concrètes et actionnables.`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          verdict: { type: "string" },
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                priority: { type: "string" },
                title: { type: "string" },
                detail: { type: "string" }
              }
            }
          }
        }
      }
    });
    setAiReport(res);
    setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Backtest 24/7 — Local
          </h1>
          <p className="text-xs text-muted-foreground">Validation obligatoire avant passage en Demo MFF</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium ${isReadyForDemo ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {isReadyForDemo ? '✅ Prêt pour Demo' : '⏳ Validation en cours...'}
          </div>
          <Button size="sm" variant={running ? 'destructive' : 'default'} onClick={() => setRunning(!running)} className="gap-2">
            {running ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Lancer</>}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'journal', label: '📋 Journal' },
          { id: 'auto', label: '📊 Analyse Auto' },
          { id: 'optimize', label: '⚡ Optimisation IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats always visible */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Trades Total" value={allTrades.length} icon={Target} />
        <StatCard label="Win Rate" value={`${winRate}%`} color={parseFloat(winRate) >= 60 ? 'text-green-400' : 'text-red-400'} icon={Percent} />
        <StatCard label="P&L Total" value={`${totalPnl >= 0 ? '+' : ''}${totalPnl}€`} color={totalPnl >= 0 ? 'text-green-400' : 'text-red-400'} icon={TrendingUp} />
        <StatCard label="Avg R:R" value={`${avgRR}:1`} color="text-blue-400" />
        <StatCard label="Wins / Losses" value={`${wins}W / ${losses}L`} />
      </div>

      {/* TAB: Analyse Auto */}
      {activeTab === 'auto' && (
        <div className="space-y-4">
          {/* Performance par setup */}
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Performance par Setup</span>
            </div>
            <div className="space-y-2">
              {setupStats.sort((a, b) => b.wr - a.wr).map(s => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-muted-foreground truncate flex-shrink-0">{s.name}</div>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${s.wr >= 65 ? 'bg-primary' : s.wr >= 50 ? 'bg-yellow-400' : 'bg-destructive'}`} style={{ width: `${s.wr}%` }} />
                  </div>
                  <span className={`font-mono text-xs font-bold w-10 text-right ${s.wr >= 65 ? 'text-primary' : s.wr >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{s.wr}%</span>
                  <span className="font-mono text-xs text-muted-foreground w-8 text-right">{s.avgRR}:1</span>
                  <span className={`font-mono text-xs font-bold w-16 text-right ${s.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{s.pnl >= 0 ? '+' : ''}{s.pnl}€</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.wr >= 65 ? 'bg-primary/20 text-primary' : s.wr >= 50 ? 'bg-yellow-400/20 text-yellow-400' : 'bg-destructive/20 text-destructive'}`}>
                    {s.wr >= 65 ? 'KEEP' : s.wr >= 50 ? 'WATCH' : 'DROP'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance par session */}
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Performance par Session</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {sessionStats.map(s => (
                <div key={s.name} className={`p-3 rounded-lg border text-center ${s.pnl >= 0 ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                  <div className="text-xs text-muted-foreground mb-1">{s.name}</div>
                  <div className={`text-xl font-bold font-mono ${s.wr >= 60 ? 'text-primary' : 'text-destructive'}`}>{s.wr}%</div>
                  <div className="text-[10px] text-muted-foreground mt-1">{s.trades} trades</div>
                  <div className={`font-mono text-xs font-bold ${s.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{s.pnl >= 0 ? '+' : ''}{s.pnl}€</div>
                </div>
              ))}
            </div>
          </div>

          {/* Critères validation Demo */}
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Validation pour passage Demo MFF</div>
            <div className="space-y-2">
              {[
                { label: 'Win Rate ≥ 60%', ok: parseFloat(winRate) >= 60, val: `${winRate}%` },
                { label: 'P&L Total > 500€', ok: totalPnl > 500, val: `${totalPnl}€` },
                { label: 'Avg R:R ≥ 1.8:1', ok: parseFloat(avgRR) >= 1.8, val: `${avgRR}:1` },
                { label: 'Min 30 trades backtestés', ok: allTrades.length >= 30, val: `${allTrades.length} trades` },
                { label: 'Aucun setup WR < 40% en production', ok: !setupStats.some(s => s.wr < 40), val: setupStats.some(s => s.wr < 40) ? '⚠️ Voir BOS+CHoCH' : '✅ OK' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                  <span className={c.ok ? 'text-foreground' : 'text-muted-foreground flex-1'}>{c.label}</span>
                  <span className={`font-mono ${c.ok ? 'text-primary' : 'text-destructive'}`}>{c.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Optimisation IA */}
      {activeTab === 'optimize' && (
        <div className="space-y-4">
          <div className="card-trading">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Rapport d'Optimisation IA</span>
              </div>
              <Button size="sm" onClick={runAIOptimization} disabled={loadingAI} className="gap-1 text-xs">
                <RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
                {loadingAI ? 'Analyse...' : 'Lancer l\'analyse'}
              </Button>
            </div>
            {aiReport ? (
              <div className="space-y-4">
                {/* Score global + verdict */}
                <div className="flex items-center gap-4 p-3 bg-secondary/30 rounded-lg">
                  <div className="text-center">
                    <div className={`text-3xl font-bold font-mono ${aiReport.score >= 70 ? 'text-primary' : aiReport.score >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{aiReport.score}</div>
                    <div className="text-[10px] text-muted-foreground">Score</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold mb-1">Verdict IA</div>
                    <div className="text-xs text-muted-foreground">{aiReport.verdict}</div>
                  </div>
                </div>
                {/* Suggestions */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggestions ({aiReport.suggestions?.length})</div>
                  {aiReport.suggestions?.map((s, i) => {
                    const priorityColor = s.priority === 'haute' ? 'border-destructive/40 bg-destructive/5' : s.priority === 'moyenne' ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-primary/30 bg-primary/5';
                    const priorityBadge = s.priority === 'haute' ? 'bg-destructive/20 text-destructive' : s.priority === 'moyenne' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-primary/20 text-primary';
                    const PriorityIcon = s.priority === 'haute' ? AlertTriangle : s.priority === 'moyenne' ? Minus : CheckCircle2;
                    return (
                      <div key={i} className={`flex gap-3 p-3 rounded-lg border ${priorityColor}`}>
                        <PriorityIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${s.priority === 'haute' ? 'text-destructive' : s.priority === 'moyenne' ? 'text-yellow-400' : 'text-primary'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold">{s.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityBadge}`}>{s.category}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{s.detail}</div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded self-start flex-shrink-0 ${priorityBadge}`}>{s.priority}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-xs">
                <Zap className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Cliquez sur "Lancer l'analyse" pour obtenir un rapport IA complet basé sur vos statistiques de backtest</p>
                <p className="mt-2 opacity-60">Setups, sessions, R:R, score de robustesse...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Equity curve + journal (journal tab only) */}
      {activeTab === 'journal' && (
      <div className="space-y-4">
      <div className="card-trading">
        <span className="text-sm font-semibold block mb-3">Courbe d'Équité — Backtest Local</span>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={mockEquity}>
            <defs>
              <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF88" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }} />
            <Area type="monotone" dataKey="eq" stroke="#00FF88" fill="url(#btGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="card-trading">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Journal des Trades</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={exportCSV}>
              <Download className="w-3 h-3" />CSV
            </Button>
            <div className="flex gap-1">
              {['all', 'win', 'loss', 'breakeven'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs px-2 py-1 rounded ${filter === f ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {f}
                </button>
              ))}
            </div>
            <Dialog open={showAddTrade} onOpenChange={setShowAddTrade}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="w-3 h-3" />Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Ajouter un Trade Backtest</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { key: 'setup', label: 'Setup (OB, FVG...)' },
                    { key: 'pnl', label: 'P&L (€)', type: 'number' },
                    { key: 'rr', label: 'R:R Ratio', type: 'number' },
                    { key: 'mistakes', label: 'Erreurs identifiées' },
                    { key: 'improvements', label: 'Améliorations' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'mistakes' || f.key === 'improvements' ? 'col-span-2' : ''}>
                      <Label className="text-xs">{f.label}</Label>
                      <Input type={f.type || 'text'} value={newTrade[f.key]} onChange={e => setNewTrade(p => ({ ...p, [f.key]: e.target.value }))} className="bg-secondary border-border text-sm h-8 mt-1" />
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs">Direction</Label>
                    <Select value={newTrade.direction} onValueChange={v => setNewTrade(p => ({ ...p, direction: v }))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="LONG">LONG</SelectItem><SelectItem value="SHORT">SHORT</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Résultat</Label>
                    <Select value={newTrade.result} onValueChange={v => setNewTrade(p => ({ ...p, result: v }))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="win">Win</SelectItem><SelectItem value="loss">Loss</SelectItem><SelectItem value="breakeven">Breakeven</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => addTrade.mutate(newTrade)} className="w-full mt-2">Enregistrer</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                {['Heure', 'Setup', 'Direction', 'Entry', 'SL', 'TP1', 'P&L', 'R:R', 'Résultat', 'Erreur'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{t.time || '--:--'}</td>
                  <td className="py-2 pr-3">{t.setup}</td>
                  <td className="py-2 pr-3"><span className={`px-1.5 py-0.5 rounded font-bold ${t.dir === 'LONG' || t.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.dir || t.direction}</span></td>
                  <td className="py-2 pr-3 font-mono">{t.entry || '--'}</td>
                  <td className="py-2 pr-3 font-mono text-red-400">{t.sl || t.stop_loss || '--'}</td>
                  <td className="py-2 pr-3 font-mono text-green-400">{t.tp1 || t.take_profit_1 || '--'}</td>
                  <td className={`py-2 pr-3 font-mono font-bold ${t.pnl > 0 ? 'text-green-400' : t.pnl < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{t.pnl > 0 ? '+' : ''}{t.pnl}€</td>
                  <td className="py-2 pr-3 font-mono">{t.rr || '--'}:1</td>
                  <td className="py-2 pr-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.result === 'win' ? 'bg-green-500/20 text-green-400' : t.result === 'loss' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.result}</span>
                  </td>
                  <td className="py-2 text-muted-foreground max-w-[150px] truncate">{t.mistake || t.mistakes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}