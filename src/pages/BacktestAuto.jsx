import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Bot, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Zap,
  BarChart2, Download, Target, TrendingUp, Save, Layers, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const SETUPS = [
  { id: 'ICT_OB', name: 'ICT Order Block', winRate: 0.68, rr: 2.4, frequency: 3.2 },
  { id: 'AMD_EXP', name: 'AMD Expansion', winRate: 0.72, rr: 3.1, frequency: 1.8 },
  { id: 'FVG_FILL', name: 'FVG Fill', winRate: 0.61, rr: 1.9, frequency: 4.5 },
  { id: 'BOS_CHOCH', name: 'BOS + CHoCH', winRate: 0.44, rr: 1.3, frequency: 5.1 },
  { id: 'IFVG', name: 'IFVG Retest', winRate: 0.65, rr: 2.1, frequency: 2.3 },
  { id: 'POC', name: 'POC Retest', winRate: 0.55, rr: 1.6, frequency: 3.8 },
  { id: 'ASIA_RANGE', name: 'Asia Range Break', winRate: 0.58, rr: 2.0, frequency: 1.5 },
  { id: 'BREAKER', name: 'Breaker Block', winRate: 0.63, rr: 2.8, frequency: 2.1 },
];

const SESSIONS = [
  { id: 'NY_OPEN', name: 'NY Open 14:30-16:30', mult: 1.2 },
  { id: 'LONDON', name: 'London 09:00-12:00', mult: 0.9 },
  { id: 'AFTERNOON', name: 'NY Afternoon 16:30-18:00', mult: 0.7 },
  { id: 'ASIA', name: 'Asian 02:00-05:00', mult: 0.5 },
];

const PROPFIRM_RULES = [
  { id: 'MFF', name: 'MFF', profitTarget: 10, maxDD: 8, dailyDD: 5, consistency: 30 },
  { id: 'Tradefy', name: 'Tradefy', profitTarget: 8, maxDD: 8, dailyDD: 4, consistency: 0 },
  { id: 'Lucid', name: 'Lucid', profitTarget: 10, maxDD: 8, dailyDD: 5, consistency: 0 },
  { id: 'TopStep', name: 'TopStep', profitTarget: 6, maxDD: 6, dailyDD: 3, consistency: 0 },
];

function runBacktest({ setup, session, riskPct, capital, days, newsFilter, propfirmRules, trailingDD, maxTradesPerDay }) {
  const s = SETUPS.find(x => x.id === setup) || SETUPS[0];
  const sess = SESSIONS.find(x => x.id === session) || SESSIONS[0];
  const pf = PROPFIRM_RULES.find(x => x.id === propfirmRules) || PROPFIRM_RULES[0];
  const tradesPerDay = Math.min(maxTradesPerDay, Math.round(s.frequency * sess.mult * (newsFilter ? 0.8 : 1)));

  let equity = capital;
  let peak = capital;
  let trailingPeak = capital;
  let maxDD = 0;
  let wins = 0, losses = 0, breakevens = 0;
  let dayDD = 0;
  let killed = false;
  const curve = [{ day: 0, eq: equity }];
  const daily = [];
  let consecLosses = 0, maxConsecLosses = 0;

  for (let d = 0; d < days && !killed; d++) {
    let dayPnl = 0;
    const dayStartEq = equity;
    dayDD = 0;
    const dayTrades = Math.round(tradesPerDay + (Math.random() - 0.5) * 2);

    for (let t = 0; t < dayTrades; t++) {
      const risk = equity * (riskPct / 100);
      const roll = Math.random();
      let pnl;
      if (roll < s.winRate) { pnl = risk * s.rr; wins++; consecLosses = 0; }
      else if (roll < s.winRate + 0.07) { pnl = 0; breakevens++; }
      else { pnl = -risk; losses++; consecLosses++; }
      if (consecLosses > maxConsecLosses) maxConsecLosses = consecLosses;
      equity += pnl; dayPnl += pnl;
      if (equity > peak) peak = equity;
      if (trailingDD && equity > trailingPeak) trailingPeak = equity;
      const dd = ((peak - equity) / peak) * 100;
      const trailDD = ((trailingPeak - equity) / trailingPeak) * 100;
      const usedDD = trailingDD ? trailDD : dd;
      if (usedDD > maxDD) maxDD = usedDD;
      // Kill switch PropFirm
      dayDD = ((dayStartEq - equity) / dayStartEq) * 100;
      if (dayDD >= pf.dailyDD || usedDD >= pf.maxDD) { killed = true; break; }
    }
    curve.push({ day: d + 1, eq: Math.round(equity) });
    daily.push({ day: `J${d + 1}`, pnl: Math.round(dayPnl) });
  }

  const totalTr = wins + losses + breakevens;
  const profitFactor = losses > 0 ? (wins * s.rr) / losses : wins * s.rr;
  const profitPct = ((equity - capital) / capital) * 100;
  const passTarget = profitPct >= pf.profitTarget;
  const passDD = maxDD < pf.maxDD;
  const passConsistency = pf.consistency === 0 || true;
  const passed = passTarget && passDD && !killed;

  return {
    finalEquity: Math.round(equity), totalReturn: profitPct.toFixed(2),
    totalTrades: totalTr, wins, losses, breakevens,
    winRate: totalTr ? ((wins / totalTr) * 100).toFixed(1) : 0,
    maxDD: maxDD.toFixed(2), profitFactor: profitFactor.toFixed(2),
    avgDailyPnl: Math.round((equity - capital) / days),
    maxConsecLosses, killed, passed,
    curve: curve.filter((_, i) => i % Math.max(1, Math.ceil(days / 40)) === 0 || i === curve.length - 1),
    daily: daily.slice(-30),
    setup: s, session: sess, pf,
  };
}

export default function BacktestAuto() {
  const [params, setParams] = useState({
    setup: 'ICT_OB', session: 'NY_OPEN', riskPct: 0.5, capital: 50000,
    days: 20, newsFilter: true, propfirmRules: 'MFF',
    trailingDD: false, maxTradesPerDay: 5,
  });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [activeTab, setActiveTab] = useState('result');

  const { data: realTrades = [] } = useQuery({
    queryKey: ['trades-backtest-auto'],
    queryFn: () => base44.entities.Trade.filter({ status: 'closed' }, '-created_date', 100),
  });

  const realStats = useMemo(() => {
    if (realTrades.length < 5) return null;
    const wins = realTrades.filter(t => t.result === 'win').length;
    const avgRR = realTrades.reduce((s, t) => s + (t.risk_reward || 0), 0) / realTrades.length;
    return { winRate: Math.round((wins / realTrades.length) * 100), avgRR: avgRR.toFixed(2) };
  }, [realTrades]);

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));

  const run = () => {
    setRunning(true); setAiReport(null);
    setTimeout(() => {
      const res = runBacktest(params);
      setResult(res);
      setRunning(false);
      const status = res.killed ? '💀 Compte soufflé!' : res.passed ? '✅ Phase passée!' : '⏳ Objectif non atteint';
      toast(status + ` — ${res.totalTrades} trades, ${res.totalReturn}%`);
    }, 500);
  };

  const allSetupResults = useMemo(() =>
    SETUPS.map(s => runBacktest({ ...params, setup: s.id })),
    [params]
  );

  const getAIAnalysis = async () => {
    if (!result) return;
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert backtest NQ Futures PropFirm. Analyse critique approfondie.

Setup: ${result.setup.name} | Session: ${result.session.name} | PropFirm: ${result.pf.name}
Capital: ${params.capital}€ | Risque/trade: ${params.riskPct}% | Jours: ${params.days}
Résultats: Return=${result.totalReturn}% | WR=${result.winRate}% | PF=${result.profitFactor} | MaxDD=${result.maxDD}%
Trades: ${result.totalTrades} (${result.wins}W/${result.losses}L) | Avg/jour=${result.avgDailyPnl}€
Killed: ${result.killed} | Passed: ${result.passed} | MaxConsecLosses=${result.maxConsecLosses}

Comparaison setups: ${allSetupResults.map(r => `${r.setup.name}: WR=${r.winRate}%, PF=${r.profitFactor}, DD=${r.maxDD}%, Pass=${r.passed}`).join(' | ')}

${realStats ? `Stats réelles (${realTrades.length} trades): WR=${realStats.winRate}%, RR=${realStats.avgRR}` : ''}

Retourne UNIQUEMENT JSON:
{
  "verdict": "<phrase directe>",
  "score": <0-100>,
  "propfirm_pass_probability": <0-100>,
  "best_setup": "<nom>",
  "optimal_risk_pct": <number>,
  "optimal_trades_per_day": <number>,
  "optimizations": [{"area":"Setup|Risque|Session|Timing|PropFirm","action":"<action>","impact":"élevé|moyen|faible","gain_estime":"<gain>"}],
  "risk_warnings": ["<warning>"],
  "next_steps": ["<étape concrète 1>", "<étape 2>"]
}`,
      response_json_schema: {
        type: "object", properties: {
          verdict: { type: "string" }, score: { type: "number" }, propfirm_pass_probability: { type: "number" },
          best_setup: { type: "string" }, optimal_risk_pct: { type: "number" }, optimal_trades_per_day: { type: "number" },
          optimizations: { type: "array", items: { type: "object", properties: { area: { type: "string" }, action: { type: "string" }, impact: { type: "string" }, gain_estime: { type: "string" } } } },
          risk_warnings: { type: "array", items: { type: "string" } },
          next_steps: { type: "array", items: { type: "string" } }
        }
      }
    });
    setAiReport(res);
    setLoadingAI(false);
  };

  const saveScenario = () => {
    if (!result) return;
    setSavedScenarios(prev => [...prev.slice(-4), {
      id: Date.now(), label: `${result.setup.name} ${params.days}j ${params.riskPct}%`,
      result: { ...result }, params: { ...params },
      color: ['#00FF88', '#0088FF', '#F59E0B', '#EF4444', '#8B5CF6'][prev.length % 5]
    }]);
    toast.success('Scénario sauvegardé');
  };

  const exportResults = () => {
    if (!result) return;
    const rows = [['Jour', 'Équité', 'PnL'], ...result.curve.map(d => [d.day, d.eq, ''])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'backtest_results.csv'; a.click();
  };

  const c = (v, good, warn) => v >= good ? 'text-primary' : v >= warn ? 'text-yellow-400' : 'text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Backtest Automatisé Avancé
          </h1>
          <p className="text-xs text-muted-foreground">Simulation paramétrique · Règles PropFirm intégrées · Kill switch · Optimisation IA</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {realStats && (
            <button onClick={() => toast.info(`Stats réelles: WR ${realStats.winRate}% RR ${realStats.avgRR}`)}
              className="text-xs px-2 py-1 rounded border border-primary/30 text-primary bg-primary/5">
              Stats réelles: WR {realStats.winRate}%
            </button>
          )}
          {result && <Button size="sm" variant="outline" onClick={saveScenario} className="text-xs gap-1 h-8"><Save className="w-3 h-3" />Sauvegarder</Button>}
          {result && <Button size="sm" variant="outline" onClick={exportResults} className="text-xs gap-1 h-8"><Download className="w-3 h-3" />Export</Button>}
          {result && (
            <Button size="sm" variant="outline" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs h-8">
              <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? 'IA...' : 'Analyse IA'}
            </Button>
          )}
          <Button size="sm" onClick={run} disabled={running} className="gap-1 text-xs">
            <Play className={`w-3 h-3 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Simulation...' : 'Lancer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Paramètres */}
        <div className="card-trading space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paramètres</div>
          <div>
            <Label className="text-xs text-muted-foreground">Setup ICT/SMC</Label>
            <Select value={params.setup} onValueChange={v => set('setup', v)}>
              <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{SETUPS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Session</Label>
            <Select value={params.session} onValueChange={v => set('session', v)}>
              <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{SESSIONS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">PropFirm (règles)</Label>
            <Select value={params.propfirmRules} onValueChange={v => set('propfirmRules', v)}>
              <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{PROPFIRM_RULES.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {[
            { key: 'capital', label: 'Capital (€)', type: 'number' },
            { key: 'days', label: 'Jours', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input type="number" value={params[f.key]} onChange={e => set(f.key, parseFloat(e.target.value))} className="bg-secondary border-border h-8 text-xs font-mono mt-1" />
            </div>
          ))}
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Risque/trade</Label>
              <span className="text-xs font-mono font-bold text-yellow-400">{params.riskPct}%</span>
            </div>
            <Slider value={[params.riskPct * 10]} onValueChange={([v]) => set('riskPct', v / 10)} min={1} max={30} step={1} />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <Label className="text-xs text-muted-foreground">Max trades/jour</Label>
              <span className="text-xs font-mono">{params.maxTradesPerDay}</span>
            </div>
            <Slider value={[params.maxTradesPerDay]} onValueChange={([v]) => set('maxTradesPerDay', v)} min={1} max={10} step={1} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Filtrer news FOMC/CPI</span>
              <Switch checked={params.newsFilter} onCheckedChange={v => set('newsFilter', v)} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Trailing Drawdown</span>
              <Switch checked={params.trailingDD} onCheckedChange={v => set('trailingDD', v)} />
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !running && (
            <div className="card-trading text-center py-16">
              <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground mb-3">Configurez et lancez le backtest</p>
              <Button onClick={run} className="gap-1"><Play className="w-3 h-3" />Lancer maintenant</Button>
            </div>
          )}
          {running && (
            <div className="card-trading text-center py-16">
              <RefreshCw className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Simulation en cours...</p>
            </div>
          )}
          {result && !running && (
            <>
              {/* Status PropFirm */}
              <div className={`p-3 rounded border text-sm font-bold flex items-center gap-3 ${result.killed ? 'border-destructive/50 bg-destructive/10 text-destructive' : result.passed ? 'border-primary/50 bg-primary/10 text-primary' : 'border-yellow-400/50 bg-yellow-400/10 text-yellow-400'}`}>
                {result.killed ? <XCircle className="w-5 h-5" /> : result.passed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {result.killed ? `COMPTE SOUFFLÉ — DD ${result.pf.maxDD}% atteint` : result.passed ? `PHASE ${result.pf.name} PASSÉE — Objectif ${result.totalReturn}% atteint` : `Objectif non atteint — ${result.totalReturn}% / ${result.pf.profitTarget}% requis`}
              </div>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { label: 'Return', value: `${result.totalReturn}%`, color: c(parseFloat(result.totalReturn), result.pf.profitTarget, result.pf.profitTarget / 2) },
                  { label: 'Win Rate', value: `${result.winRate}%`, color: c(parseFloat(result.winRate), 60, 50) },
                  { label: 'Profit Factor', value: result.profitFactor, color: c(parseFloat(result.profitFactor), 1.5, 1.2) },
                  { label: 'Max DD', value: `${result.maxDD}%`, color: parseFloat(result.maxDD) < 4 ? 'text-primary' : parseFloat(result.maxDD) < result.pf.maxDD ? 'text-yellow-400' : 'text-destructive' },
                  { label: 'Trades', value: result.totalTrades },
                  { label: 'Moy/Jour', value: `${result.avgDailyPnl}€`, color: result.avgDailyPnl > 0 ? 'text-primary' : 'text-destructive' },
                ].map(k => (
                  <div key={k.label} className="card-trading py-2 text-center">
                    <div className={`text-lg font-bold font-mono ${k.color || 'text-foreground'}`}>{k.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Tabs résultats */}
              <div className="flex gap-1 border-b border-border">
                {['result', 'compare', 'scenarios'].map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-3 py-1.5 text-xs font-medium transition-all ${activeTab === t ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
                    {t === 'result' ? 'Courbe' : t === 'compare' ? 'Comparaison' : 'Scénarios'}
                  </button>
                ))}
              </div>

              {activeTab === 'result' && (
                <div className="space-y-3">
                  <div className="card-trading">
                    <span className="text-xs font-semibold block mb-2">Courbe d'Équité — {result.setup.name}</span>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={result.curve}>
                        <defs>
                          <linearGradient id="baGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={result.passed ? '#00FF88' : '#EF4444'} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={result.passed ? '#00FF88' : '#EF4444'} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                        <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }} formatter={v => [`${v.toLocaleString()}€`, 'Équité']} />
                        <Area type="monotone" dataKey="eq" stroke={result.passed ? '#00FF88' : '#EF4444'} fill="url(#baGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Critères PropFirm */}
                  <div className="card-trading">
                    <div className="text-xs font-semibold mb-2">Validation Critères {result.pf.name}</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { label: `Profit Target ${result.pf.profitTarget}%`, ok: parseFloat(result.totalReturn) >= result.pf.profitTarget, val: `${result.totalReturn}%` },
                        { label: `Max DD < ${result.pf.maxDD}%`, ok: parseFloat(result.maxDD) < result.pf.maxDD, val: `${result.maxDD}%` },
                        { label: 'Win Rate > 55%', ok: parseFloat(result.winRate) >= 55, val: `${result.winRate}%` },
                        { label: 'Profit Factor > 1.3', ok: parseFloat(result.profitFactor) >= 1.3, val: result.profitFactor },
                      ].map((cr, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border border-border bg-secondary/20">
                          {cr.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                          <span className="flex-1 text-muted-foreground text-[10px]">{cr.label}</span>
                          <span className={`font-mono font-bold ${cr.ok ? 'text-primary' : 'text-destructive'}`}>{cr.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'compare' && (
                <div className="card-trading overflow-x-auto">
                  <div className="text-sm font-semibold mb-3">Comparaison Automatique — Tous Setups</div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border">
                        {['Setup', 'WR', 'PF', 'MaxDD', 'Return', 'Moy/J', 'Passed'].map(h => (
                          <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allSetupResults.sort((a, b) => parseFloat(b.totalReturn) - parseFloat(a.totalReturn)).map((r, i) => (
                        <tr key={i} className={`border-b border-border/50 hover:bg-secondary/20 ${r.setup.id === params.setup ? 'bg-primary/5' : ''}`}>
                          <td className="py-2 pr-3 font-medium">{r.setup.name}</td>
                          <td className={`py-2 pr-3 font-mono font-bold ${c(parseFloat(r.winRate), 60, 50)}`}>{r.winRate}%</td>
                          <td className={`py-2 pr-3 font-mono font-bold ${c(parseFloat(r.profitFactor), 1.5, 1.2)}`}>{r.profitFactor}</td>
                          <td className={`py-2 pr-3 font-mono ${parseFloat(r.maxDD) < 4 ? 'text-primary' : parseFloat(r.maxDD) < 8 ? 'text-yellow-400' : 'text-destructive'}`}>{r.maxDD}%</td>
                          <td className={`py-2 pr-3 font-mono font-bold ${parseFloat(r.totalReturn) > 0 ? 'text-primary' : 'text-destructive'}`}>{r.totalReturn}%</td>
                          <td className={`py-2 pr-3 font-mono ${r.avgDailyPnl > 0 ? 'text-primary' : 'text-destructive'}`}>{r.avgDailyPnl}€</td>
                          <td className="py-2 pr-3">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${r.passed ? 'bg-primary/20 text-primary' : r.killed ? 'bg-destructive/20 text-destructive' : 'bg-yellow-400/20 text-yellow-400'}`}>
                              {r.passed ? 'PASS' : r.killed ? 'BLOWN' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'scenarios' && (
                <div className="card-trading">
                  {savedScenarios.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      Sauvegardez des scénarios pour les comparer
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-3">
                        {savedScenarios.map(sc => (
                          <div key={sc.id} className="flex items-center gap-3 p-2 rounded border border-border bg-secondary/20 text-xs">
                            <div className="w-3 h-3 rounded-full" style={{ background: sc.color }} />
                            <span className="flex-1">{sc.label}</span>
                            <span className={`font-mono ${parseFloat(sc.result.totalReturn) > 0 ? 'text-primary' : 'text-destructive'}`}>{sc.result.totalReturn}%</span>
                            <span className={sc.result.passed ? 'text-primary' : 'text-destructive'}>{sc.result.passed ? 'PASS' : 'FAIL'}</span>
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart>
                          <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                          <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 9, borderRadius: 4 }} formatter={v => [`${v.toLocaleString()}€`, '']} />
                          {savedScenarios.map(sc => (
                            <Line key={sc.id} type="monotone" data={sc.result.curve} dataKey="eq" stroke={sc.color} strokeWidth={1.5} dot={false} name={sc.label} />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </>
                  )}
                </div>
              )}

              {/* AI Report */}
              {aiReport && (
                <div className="card-trading border border-blue-400/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className={`text-2xl font-bold font-mono ${c(aiReport.score, 70, 50)}`}>{aiReport.score}</div>
                      <div className="text-[10px] text-muted-foreground">Score</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-2">
                        Analyse IA
                        <span className={`font-mono font-bold ${c(aiReport.propfirm_pass_probability, 70, 50)}`}>{aiReport.propfirm_pass_probability}% pass {result.pf.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{aiReport.verdict}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiReport(null)}>✕</Button>
                  </div>
                  {(aiReport.optimal_risk_pct || aiReport.optimal_trades_per_day) && (
                    <div className="flex gap-3 text-xs">
                      <span className="text-muted-foreground">Risque optimal: <strong className="text-primary">{aiReport.optimal_risk_pct}%</strong></span>
                      <span className="text-muted-foreground">Trades/jour optimal: <strong className="text-primary">{aiReport.optimal_trades_per_day}</strong></span>
                      <span className="text-muted-foreground">Meilleur setup: <strong className="text-primary">{aiReport.best_setup}</strong></span>
                    </div>
                  )}
                  {aiReport.risk_warnings?.length > 0 && (
                    <div className="space-y-1">
                      {aiReport.risk_warnings.map((w, i) => (
                        <div key={i} className="flex gap-2 text-xs p-1.5 bg-destructive/5 border border-destructive/20 rounded">
                          <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />{w}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {aiReport.optimizations?.map((o, i) => (
                      <div key={i} className="flex gap-2 text-xs p-2 bg-blue-400/5 border border-blue-400/20 rounded">
                        <span className={`text-[10px] px-1 rounded flex-shrink-0 font-bold ${o.impact === 'élevé' ? 'bg-destructive/20 text-destructive' : o.impact === 'moyen' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-primary/20 text-primary'}`}>{o.area}</span>
                        <span className="text-muted-foreground flex-1">{o.action}</span>
                        {o.gain_estime && <span className="text-primary font-mono">{o.gain_estime}</span>}
                      </div>
                    ))}
                  </div>
                  {aiReport.next_steps?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-primary font-semibold uppercase mb-1">Prochaines étapes</div>
                      {aiReport.next_steps.map((s, i) => (
                        <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 border border-primary/20 rounded mb-1">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <span className="text-muted-foreground">{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}