import { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Shield, AlertTriangle, TrendingDown, BarChart2, Zap, RefreshCw, Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, LineChart, Line } from 'recharts';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const PROPFIRM_LIMITS = [
  { id: 'mff', name: 'MFF', dailyDD: 5, maxDD: 8, consistency: 30 },
  { id: 'tradefy', name: 'Tradefy', dailyDD: 4, maxDD: 8, consistency: 0 },
  { id: 'topstep', name: 'TopStep', dailyDD: 3, maxDD: 6, consistency: 0 },
  { id: 'lucid', name: 'Lucid', dailyDD: 5, maxDD: 8, consistency: 0 },
  { id: 'personal', name: 'Perso (libre)', dailyDD: 0, maxDD: 0, consistency: 0 },
];

function simulateDD({ capital, riskPct, winRate, avgRR, days, consecLossProtection, propfirmId }) {
  const pf = PROPFIRM_LIMITS.find(p => p.id === propfirmId) || PROPFIRM_LIMITS[0];
  let balance = capital, peak = capital, trailingPeak = capital;
  let maxDD = 0, maxDailyDD = 0, killed = false, killedDay = null;
  let consecLosses = 0, maxConsecLosses = 0;
  const curve = [], dailyDDs = [], riskOfRuin = [];

  for (let d = 0; d < days; d++) {
    const dayStart = balance;
    let dayPnl = 0;
    const tradesDay = Math.round(2 + Math.random() * 2);

    for (let t = 0; t < tradesDay; t++) {
      const risk = balance * (riskPct / 100);
      const isWin = Math.random() < winRate / 100;
      const pnl = isWin ? risk * avgRR : -risk;
      if (!isWin) consecLosses++; else consecLosses = 0;
      if (consecLosses > maxConsecLosses) maxConsecLosses = consecLosses;
      balance += pnl; dayPnl += pnl;
      if (balance > peak) peak = balance;
      if (balance > trailingPeak) trailingPeak = balance;
      const dd = ((peak - balance) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
      if (pf.maxDD > 0 && dd >= pf.maxDD && !killed) { killed = true; killedDay = d + 1; }
    }

    const dailyDD = ((dayStart - balance) / dayStart) * 100;
    if (dailyDD > maxDailyDD) maxDailyDD = dailyDD;
    if (pf.dailyDD > 0 && dailyDD >= pf.dailyDD && !killed) { killed = true; killedDay = d + 1; }
    if (consecLossProtection > 0 && consecLosses >= consecLossProtection && !killed) { killed = true; killedDay = d + 1; }

    const rorPct = Math.min(100, (maxDD / Math.max(pf.maxDD || 30, 1)) * 100);
    curve.push({ day: d + 1, balance: Math.round(balance), pnl: Math.round(dayPnl) });
    dailyDDs.push({ day: d + 1, dd: parseFloat(dailyDD.toFixed(2)), maxAllowed: pf.dailyDD || 30 });
    riskOfRuin.push({ day: d + 1, ror: parseFloat(rorPct.toFixed(1)) });
    if (killed) break;
  }

  const finalDD = ((capital - balance) / capital) * 100;
  return {
    finalBalance: Math.round(balance), maxDD: parseFloat(maxDD.toFixed(2)), maxDailyDD: parseFloat(maxDailyDD.toFixed(2)),
    finalDD: parseFloat(finalDD.toFixed(2)), consecLosses: maxConsecLosses, killed, killedDay,
    survivalRate: killed ? 0 : 100, curve, dailyDDs: dailyDDs.slice(-30), riskOfRuin: riskOfRuin.slice(-20),
    pf, totalPnl: Math.round(balance - capital),
  };
}

export default function DrawdownSimulator() {
  const [params, setParams] = useState({
    capital: 50000, riskPct: 1, winRate: 60, avgRR: 2.0,
    days: 30, consecLossProtection: 3, propfirmId: 'mff',
    autoRefresh: true,
  });
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('simulation');
  const [monteCarloRuns, setMonteCarloRuns] = useState([]);

  const { data: trades = [] } = useQuery({
    queryKey: ['trades-dd-sim'],
    queryFn: () => base44.entities.Trade.filter({ status: 'closed' }, '-created_date', 100),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-dd-sim'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const realStats = useMemo(() => {
    if (trades.length < 5) return null;
    const wins = trades.filter(t => t.result === 'win').length;
    const avgRR = trades.reduce((s, t) => s + (t.risk_reward || 0), 0) / trades.length;
    return { winRate: Math.round((wins / trades.length) * 100), avgRR: parseFloat(avgRR.toFixed(2)) };
  }, [trades]);

  // Chargement auto des stats réelles si disponibles
  useEffect(() => {
    if (realStats && params.autoRefresh) {
      setParams(p => ({ ...p, winRate: realStats.winRate, avgRR: realStats.avgRR }));
    }
  }, [realStats]);

  // Auto-analyse IA au chargement
  useEffect(() => {
    const t = setTimeout(() => runAIAnalysis(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const result = useMemo(() => simulateDD(params), [params]);

  // Monte Carlo : 50 runs automatiques
  const runMonteCarlo = () => {
    const runs = Array.from({ length: 50 }, () => simulateDD({ ...params, days: params.days }));
    setMonteCarloRuns(runs);
    const blown = runs.filter(r => r.killed).length;
    toast.success(`Monte Carlo: ${50 - blown}/50 comptes survivent (${100 - blown * 2}% survie)`);
  };

  const runAIAnalysis = async (silent = false) => {
    setLoadingAI(true);
    const pf = PROPFIRM_LIMITS.find(p => p.id === params.propfirmId);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Expert gestion risque trading. Analyse de drawdown et protection capital.

Paramètres: Capital ${params.capital}€ | Risque ${params.riskPct}%/trade | WR ${params.winRate}% | RR ${params.avgRR}:1
Durée: ${params.days}j | PropFirm: ${pf?.name} | DD Max autorisé: ${pf?.maxDD || 'illimité'}%
Résultats simulation: DD Max ${result.maxDD}% | Killed: ${result.killed} | Série pertes max: ${result.consecLosses} | PnL: ${result.totalPnl}€

${realStats ? `Stats réelles: WR ${realStats.winRate}%, RR ${realStats.avgRR}` : ''}

Retourne UNIQUEMENT JSON:
{
  "verdict": "<évaluation 2 phrases>",
  "risk_level": "faible|modere|eleve|critique",
  "risk_score": <0-100>,
  "optimal_risk_pct": <number>,
  "optimal_consecutive_stop": <number>,
  "survival_probability": <0-100>,
  "expected_max_dd": <pct>,
  "protections": ["<règle protection 1>", "<règle 2>", "<règle 3>"],
  "warnings": ["<avertissement>"],
  "monthly_profit_realistic": <€>,
  "kelly_criterion": <pct>,
  "position_sizing_advice": "<conseil taille>",
  "next_action": "<action immédiate>"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            verdict: { type: "string" }, risk_level: { type: "string" }, risk_score: { type: "number" },
            optimal_risk_pct: { type: "number" }, optimal_consecutive_stop: { type: "number" },
            survival_probability: { type: "number" }, expected_max_dd: { type: "number" },
            protections: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
            monthly_profit_realistic: { type: "number" }, kelly_criterion: { type: "number" },
            position_sizing_advice: { type: "string" }, next_action: { type: "string" }
          }
        }
      });
      setAiReport(res);
    } catch(e) {}
    setLoadingAI(false);
    if (!silent) toast.success('Analyse risque IA générée');
  };

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const pf = PROPFIRM_LIMITS.find(p => p.id === params.propfirmId);
  const ddPct = result.maxDD / (pf?.maxDD || 30) * 100;

  const mcSurvival = monteCarloRuns.length ? Math.round((monteCarloRuns.filter(r => !r.killed).length / monteCarloRuns.length) * 100) : null;
  const mcAvgDD = monteCarloRuns.length ? (monteCarloRuns.reduce((s, r) => s + r.maxDD, 0) / monteCarloRuns.length).toFixed(1) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Simulateur Drawdown
          </h1>
          <p className="text-xs text-muted-foreground">
            Protection capital · Kill switch · Monte Carlo · Critère de Kelly · Analyse IA automatique
            {realStats && <span className="ml-2 text-primary">● Stats réelles chargées</span>}
          </p>
        </div>
        {loadingAI && <div className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="w-3 h-3 animate-spin" />Analyse IA...</div>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'DD Maximum', value: `${result.maxDD}%`, color: result.maxDD < 4 ? 'text-primary' : result.maxDD < 7 ? 'text-yellow-400' : 'text-destructive' },
          { label: 'DD Journalier Max', value: `${result.maxDailyDD}%`, color: result.maxDailyDD < (pf?.dailyDD || 5) ? 'text-primary' : 'text-destructive' },
          { label: 'Série Pertes Max', value: result.consecLosses, color: result.consecLosses <= 3 ? 'text-primary' : 'text-destructive' },
          { label: 'Statut Compte', value: result.killed ? `Blown J${result.killedDay}` : 'Survie ✓', color: result.killed ? 'text-destructive' : 'text-primary' },
          { label: 'PnL Simulé', value: `${result.totalPnl >= 0 ? '+' : ''}${result.totalPnl.toLocaleString()}€`, color: result.totalPnl >= 0 ? 'text-primary' : 'text-destructive' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* IA Auto-Report */}
      {aiReport && (
        <div className={`card-trading border ${aiReport.risk_level === 'critique' ? 'border-destructive/50 bg-destructive/5' : aiReport.risk_level === 'eleve' ? 'border-orange-400/30 bg-orange-400/5' : 'border-primary/30 bg-primary/5'} space-y-2`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className={`text-2xl font-bold font-mono ${aiReport.risk_score <= 30 ? 'text-primary' : aiReport.risk_score <= 60 ? 'text-yellow-400' : 'text-destructive'}`}>{aiReport.risk_score}</div>
                <div className="text-[9px] text-muted-foreground">Risque</div>
              </div>
              <div>
                <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded ${aiReport.risk_level === 'faible' ? 'bg-primary/20 text-primary' : aiReport.risk_level === 'modere' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-destructive/20 text-destructive'}`}>{aiReport.risk_level}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{aiReport.verdict}</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="text-muted-foreground">Kelly: <strong className="text-primary">{aiReport.kelly_criterion}%</strong></div>
              <div className="text-muted-foreground">Survie: <strong className="text-primary">{aiReport.survival_probability}%</strong></div>
              <div className="text-muted-foreground">Risque optimal: <strong className="text-primary">{aiReport.optimal_risk_pct}%</strong></div>
            </div>
          </div>
          {aiReport.protections?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {aiReport.protections.map((p, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary">{p}</span>
              ))}
            </div>
          )}
          {aiReport.warnings?.map((w, i) => (
            <div key={i} className="flex gap-2 text-xs p-1.5 bg-destructive/5 border border-destructive/20 rounded">
              <AlertTriangle className="w-3 h-3 text-destructive flex-shrink-0" />{w}
            </div>
          ))}
          {aiReport.next_action && (
            <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs">
              <span className="text-yellow-400 font-semibold">Action: </span>{aiReport.next_action}
            </div>
          )}
        </div>
      )}

      {/* Jauge DD */}
      {pf?.maxDD > 0 && (
        <div className="card-trading">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">Utilisation DD Max ({pf.name})</span>
            <span className={`font-mono font-bold ${ddPct > 80 ? 'text-destructive' : ddPct > 60 ? 'text-yellow-400' : 'text-primary'}`}>{result.maxDD}% / {pf.maxDD}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${Math.min(ddPct, 100)}%`, background: ddPct > 80 ? '#EF4444' : ddPct > 60 ? '#F59E0B' : '#00FF88' }} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'simulation', label: 'Courbe' },
          { id: 'params', label: 'Paramètres' },
          { id: 'montecarlo', label: `Monte Carlo${mcSurvival !== null ? ` (${mcSurvival}%)` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === 'montecarlo' && !monteCarloRuns.length) runMonteCarlo(); }}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'simulation' && (
        <div className="space-y-3">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-2">Courbe Balance + Drawdown</div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={result.curve}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={result.killed ? '#EF4444' : '#00FF88'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={result.killed ? '#EF4444' : '#00FF88'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v.toLocaleString()}€`, 'Balance']} />
                <ReferenceLine y={params.capital} stroke="#64748b" strokeDasharray="3 3" />
                {pf?.maxDD > 0 && <ReferenceLine y={params.capital * (1 - pf.maxDD / 100)} stroke="#EF4444" strokeDasharray="3 3" label={{ value: `DD Max ${pf.maxDD}%`, fill: '#EF4444', fontSize: 9 }} />}
                <Area type="monotone" dataKey="balance" stroke={result.killed ? '#EF4444' : '#00FF88'} fill="url(#ddGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="card-trading">
            <div className="text-xs font-semibold mb-2">Drawdown Journalier</div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={result.dailyDDs}>
                <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                {pf?.dailyDD > 0 && <ReferenceLine y={pf.dailyDD} stroke="#EF4444" strokeDasharray="3 3" />}
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 9, borderRadius: 4 }} formatter={v => [`${v}%`, 'DD Journalier']} />
                <Bar dataKey="dd" radius={[2, 2, 0, 0]}>
                  {result.dailyDDs.map((d, i) => <Cell key={i} fill={d.dd > (pf?.dailyDD || 30) ? '#EF4444' : '#F59E0B'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'params' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading space-y-4">
            <div className="text-sm font-semibold">Configuration</div>
            <div>
              <Label className="text-xs">PropFirm / Type compte</Label>
              <Select value={params.propfirmId} onValueChange={v => set('propfirmId', v)}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PROPFIRM_LIMITS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[
              { key: 'capital', label: 'Capital (€)', unit: '€', min: 500, max: 200000, step: 500, mult: 1 },
              { key: 'riskPct', label: 'Risque/trade', unit: '%', min: 0.1, max: 5, step: 0.1, mult: 10 },
              { key: 'winRate', label: 'Win Rate', unit: '%', min: 30, max: 90, step: 1 },
              { key: 'avgRR', label: 'Risk:Reward', unit: ':1', min: 0.5, max: 5, step: 0.5, mult: 10 },
              { key: 'days', label: 'Jours', unit: 'j', min: 5, max: 90, step: 5 },
              { key: 'consecLossProtection', label: 'Arrêt après N pertes', unit: '', min: 1, max: 8, step: 1 },
            ].map(f => {
              const mult = f.mult || 1;
              const val = f.mult ? params[f.key] * mult : params[f.key];
              const display = params[f.key];
              return (
                <div key={f.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <Label className="text-xs">{f.label}</Label>
                    <span className="font-mono font-bold text-primary">{display}{f.unit}</span>
                  </div>
                  <Slider value={[val]} onValueChange={([v]) => set(f.key, f.mult ? v / f.mult : v)} min={f.min * (f.mult || 1)} max={f.max * (f.mult || 1)} step={f.step * (f.mult || 1)} />
                </div>
              );
            })}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Charger stats réelles auto</span>
              <Switch checked={params.autoRefresh} onCheckedChange={v => set('autoRefresh', v)} />
            </div>
          </div>
          <div className="card-trading space-y-3">
            <div className="text-sm font-semibold">Règles {pf?.name}</div>
            {[
              { label: 'DD Max Total', value: pf?.maxDD > 0 ? `${pf.maxDD}%` : 'Illimité', danger: result.maxDD >= (pf?.maxDD || 999) },
              { label: 'DD Max Journalier', value: pf?.dailyDD > 0 ? `${pf.dailyDD}%` : 'Illimité', danger: result.maxDailyDD >= (pf?.dailyDD || 999) },
              { label: 'Règle Consistance', value: pf?.consistency > 0 ? `Max ${pf.consistency}%/j` : 'Aucune' },
              { label: 'Kill Switch Pertes', value: `${params.consecLossProtection} consécutives` },
              { label: 'DD Simulé Max', value: `${result.maxDD}%`, danger: result.killed },
              { label: 'DD Journalier Max', value: `${result.maxDailyDD}%` },
            ].map(r => (
              <div key={r.label} className={`flex justify-between text-xs p-2 rounded border ${r.danger ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/20'}`}>
                <span className="text-muted-foreground">{r.label}</span>
                <span className={`font-mono font-bold ${r.danger ? 'text-destructive' : 'text-foreground'}`}>{r.value}</span>
              </div>
            ))}
            {aiReport && (
              <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs">
                <div className="text-primary font-semibold mb-1">Critère de Kelly: {aiReport.kelly_criterion}%</div>
                <div className="text-muted-foreground">{aiReport.position_sizing_advice}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'montecarlo' && (
        <div className="space-y-3">
          {monteCarloRuns.length > 0 && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Taux Survie', value: `${mcSurvival}%`, color: mcSurvival >= 80 ? 'text-primary' : mcSurvival >= 60 ? 'text-yellow-400' : 'text-destructive' },
                  { label: 'DD Moyen', value: `${mcAvgDD}%`, color: 'text-yellow-400' },
                  { label: 'Comptes Blown', value: `${monteCarloRuns.filter(r => r.killed).length}/50`, color: 'text-destructive' },
                  { label: 'PnL Médian', value: `${monteCarloRuns.sort((a, b) => a.totalPnl - b.totalPnl)[25]?.totalPnl?.toLocaleString()}€`, color: 'text-primary' },
                ].map(k => (
                  <div key={k.label} className="card-trading text-center">
                    <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
                    <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>
              <div className="card-trading">
                <div className="text-xs font-semibold mb-2">Distribution PnL Final (50 simulations)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={monteCarloRuns.map((r, i) => ({ i, pnl: r.totalPnl, blown: r.killed }))}>
                    <XAxis hide />
                    <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 9, borderRadius: 4 }} formatter={v => [`${v}€`, 'PnL']} />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                      {monteCarloRuns.map((r, i) => <Cell key={i} fill={r.killed ? '#EF4444' : r.totalPnl > 0 ? '#00FF88' : '#F59E0B'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}