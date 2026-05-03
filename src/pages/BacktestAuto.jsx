import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Zap, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

// === Moteur Backtest Automatisé ===
const SETUPS = [
  { id: 'ICT_OB', name: 'ICT Order Block', winRate: 0.68, rr: 2.4, frequency: 3.2 },
  { id: 'AMD_EXP', name: 'AMD Expansion', winRate: 0.72, rr: 3.1, frequency: 1.8 },
  { id: 'FVG_FILL', name: 'FVG Fill', winRate: 0.61, rr: 1.9, frequency: 4.5 },
  { id: 'BOS_CHOCH', name: 'BOS + CHoCH', winRate: 0.44, rr: 1.3, frequency: 5.1 },
  { id: 'IFVG', name: 'IFVG Retest', winRate: 0.65, rr: 2.1, frequency: 2.3 },
  { id: 'POC', name: 'POC Retest', winRate: 0.55, rr: 1.6, frequency: 3.8 },
];

const SESSIONS = [
  { id: 'NY_OPEN', name: 'NY Open 14:30-16:30', mult: 1.2 },
  { id: 'LONDON', name: 'London 09:00-12:00', mult: 0.9 },
  { id: 'AFTERNOON', name: 'NY Afternoon 16:30-18:00', mult: 0.7 },
];

function simulateBacktest({ setup, session, riskPct, capital, days, newsFilter }) {
  const s = SETUPS.find(x => x.id === setup) || SETUPS[0];
  const sess = SESSIONS.find(x => x.id === session) || SESSIONS[0];
  const tradesPerDay = s.frequency * sess.mult * (newsFilter ? 0.8 : 1);
  const totalTrades = Math.round(tradesPerDay * days);

  let equity = capital;
  let peak = capital;
  let maxDD = 0;
  let wins = 0, losses = 0, breakevens = 0;
  const curve = [{ day: 0, eq: equity }];
  const daily = [];

  for (let d = 0; d < days; d++) {
    let dayPnl = 0;
    const dayTrades = Math.round(tradesPerDay + (Math.random() - 0.5) * 2);
    for (let t = 0; t < dayTrades; t++) {
      const risk = equity * (riskPct / 100);
      const roll = Math.random();
      let pnl;
      if (roll < s.winRate) { pnl = risk * s.rr; wins++; }
      else if (roll < s.winRate + 0.08) { pnl = 0; breakevens++; }
      else { pnl = -risk; losses++; }
      equity += pnl;
      dayPnl += pnl;
      if (equity > peak) peak = equity;
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    }
    curve.push({ day: d + 1, eq: Math.round(equity) });
    daily.push({ day: `J${d + 1}`, pnl: Math.round(dayPnl) });
  }

  const totalTr = wins + losses + breakevens;
  const profitFactor = losses > 0 ? (wins * s.rr) / losses : wins * s.rr;

  return {
    finalEquity: Math.round(equity),
    totalReturn: (((equity - capital) / capital) * 100).toFixed(2),
    totalTrades: totalTr,
    wins, losses, breakevens,
    winRate: totalTr ? ((wins / totalTr) * 100).toFixed(1) : 0,
    maxDD: maxDD.toFixed(2),
    profitFactor: profitFactor.toFixed(2),
    avgDailyPnl: Math.round((equity - capital) / days),
    curve: curve.filter((_, i) => i % Math.ceil(days / 30) === 0 || i === curve.length - 1),
    daily: daily.slice(-20),
    setup: s, session: sess,
  };
}

export default function BacktestAuto() {
  const [params, setParams] = useState({ setup: 'ICT_OB', session: 'NY_OPEN', riskPct: 0.5, capital: 50000, days: 20, newsFilter: true });
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSetupComparison, setShowSetupComparison] = useState(false);

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));

  const run = () => {
    setRunning(true);
    setAiReport(null);
    setTimeout(() => {
      const res = simulateBacktest(params);
      setResult(res);
      setRunning(false);
      toast.success(`Backtest terminé — ${res.totalTrades} trades simulés`);
    }, 600);
  };

  // Comparaison tous setups
  const allSetupResults = SETUPS.map(s => simulateBacktest({ ...params, setup: s.id }));

  const getAIAnalysis = async () => {
    if (!result) return;
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert backtest NQ Futures prop trading. Analyse ces résultats et identifie les forces, faiblesses et optimisations.

Setup: ${result.setup.name} | Session: ${result.session.name}
Capital: ${params.capital}€ | Risque/trade: ${params.riskPct}% | Durée: ${params.days} jours
Résultats:
- Return: ${result.totalReturn}% (${result.finalEquity}€)
- Win Rate: ${result.winRate}% | Trades: ${result.totalTrades} (${result.wins}W/${result.losses}L)
- Max DD: ${result.maxDD}% | Profit Factor: ${result.profitFactor}
- Moy. journalière: ${result.avgDailyPnl}€

Comparaison setups (même params): ${allSetupResults.map(r => `${r.setup.name}: WR=${r.winRate}%, PF=${r.profitFactor}, DD=${r.maxDD}%`).join(' | ')}

Retourne UNIQUEMENT JSON sans markdown:
{
  "verdict": "<phrase>",
  "score": <0-100>,
  "propfirm_pass_probability": <0-100>,
  "best_setup": "<nom>",
  "optimizations": [{"area":"<Setup|Risque|Session|Timing>","action":"<action concrète>","impact":"<élevé|moyen|faible>"}],
  "risk_warnings": ["<warning 1>","<warning 2>"]
}`,
      response_json_schema: {
        type: "object", properties: {
          verdict: { type: "string" }, score: { type: "number" },
          propfirm_pass_probability: { type: "number" }, best_setup: { type: "string" },
          optimizations: { type: "array", items: { type: "object", properties: { area: { type: "string" }, action: { type: "string" }, impact: { type: "string" } } } },
          risk_warnings: { type: "array", items: { type: "string" } }
        }
      }
    });
    setAiReport(res);
    setLoadingAI(false);
  };

  const c = (v, good, warn) => v >= good ? 'text-primary' : v >= warn ? 'text-yellow-400' : 'text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-400" />
            Backtest Automatisé
          </h1>
          <p className="text-xs text-muted-foreground">Simulation paramétrique · Comparaison setups · Optimisation IA</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSetupComparison(p => !p)} className="text-xs gap-1">
            <BarChart2 className="w-3 h-3" /> Comparaison
          </Button>
          <Button size="sm" onClick={run} disabled={running} className="gap-1 text-xs">
            <Play className={`w-3 h-3 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Simulation...' : 'Lancer'}
          </Button>
          {result && (
            <Button size="sm" variant="outline" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs">
              <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? 'IA...' : 'Analyse IA'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Paramètres */}
        <div className="card-trading space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paramètres</div>
          <div>
            <Label className="text-xs text-muted-foreground">Setup</Label>
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
          {[
            { key: 'capital', label: 'Capital (€)', type: 'number' },
            { key: 'days', label: 'Jours de trading', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input type="number" value={params[f.key]} onChange={e => set(f.key, parseFloat(e.target.value))} className="bg-secondary border-border h-8 text-xs font-mono mt-1" />
            </div>
          ))}
          <div>
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Risque / trade</Label>
              <span className="text-xs font-mono font-bold text-foreground">{params.riskPct}%</span>
            </div>
            <input type="range" min={0.1} max={3} step={0.1} value={params.riskPct} onChange={e => set('riskPct', parseFloat(e.target.value))} className="w-full mt-1 accent-primary" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={params.newsFilter} onChange={e => set('newsFilter', e.target.checked)} className="accent-primary" id="nf" />
            <label htmlFor="nf" className="text-xs text-muted-foreground cursor-pointer">Filtrer news FOMC/CPI</label>
          </div>
        </div>

        {/* Résultats */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !running && (
            <div className="card-trading text-center py-16">
              <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Configurez et lancez le backtest automatisé</p>
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
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {[
                  { label: 'Return', value: `${result.totalReturn}%`, color: c(parseFloat(result.totalReturn), 8, 4) },
                  { label: 'Win Rate', value: `${result.winRate}%`, color: c(parseFloat(result.winRate), 60, 50) },
                  { label: 'Profit Factor', value: result.profitFactor, color: c(parseFloat(result.profitFactor), 1.5, 1.2) },
                  { label: 'Max DD', value: `${result.maxDD}%`, color: parseFloat(result.maxDD) < 4 ? 'text-primary' : parseFloat(result.maxDD) < 7 ? 'text-yellow-400' : 'text-destructive' },
                  { label: 'Trades', value: result.totalTrades },
                  { label: 'Moy/Jour', value: `${result.avgDailyPnl}€`, color: result.avgDailyPnl > 0 ? 'text-primary' : 'text-destructive' },
                ].map(k => (
                  <div key={k.label} className="card-trading py-2 text-center">
                    <div className={`text-lg font-bold font-mono ${k.color || 'text-foreground'}`}>{k.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{k.label}</div>
                  </div>
                ))}
              </div>

              <div className="card-trading">
                <span className="text-xs font-semibold block mb-2">Courbe d'Équité — {result.setup.name}</span>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={result.curve}>
                    <defs>
                      <linearGradient id="baGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }} formatter={v => [`${v.toLocaleString()}€`, 'Équité']} />
                    <Area type="monotone" dataKey="eq" stroke="#3b82f6" fill="url(#baGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card-trading">
                <span className="text-xs font-semibold block mb-2">P&L Journalier (20 derniers jours)</span>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={result.daily}>
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }} formatter={v => [`${v}€`, 'P&L']} />
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]} fill="#00FF88"
                      label={false}
                      cells={result.daily.map((d, i) => <cell key={i} fill={d.pnl >= 0 ? '#00FF88' : '#EF4444'} />)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* MFF Pass Check */}
              <div className="card-trading">
                <div className="text-xs font-semibold mb-2">Vérification Critères MFF Phase 1</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Profit Target 10%', ok: parseFloat(result.totalReturn) >= 10, val: `${result.totalReturn}%` },
                    { label: 'Max DD < 8%', ok: parseFloat(result.maxDD) < 8, val: `${result.maxDD}%` },
                    { label: 'Win Rate > 60%', ok: parseFloat(result.winRate) >= 60, val: `${result.winRate}%` },
                    { label: 'Profit Factor > 1.5', ok: parseFloat(result.profitFactor) >= 1.5, val: result.profitFactor },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border border-border bg-secondary/20">
                      {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                      <span className="flex-1 text-muted-foreground">{c.label}</span>
                      <span className={`font-mono font-bold ${c.ok ? 'text-primary' : 'text-destructive'}`}>{c.val}</span>
                    </div>
                  ))}
                </div>
              </div>

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
                        <span className={`font-mono font-bold ${c(aiReport.propfirm_pass_probability, 70, 50)}`}>{aiReport.propfirm_pass_probability}% pass MFF</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{aiReport.verdict}</p>
                    </div>
                  </div>
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
                        <span className="text-muted-foreground">{o.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Comparaison setups */}
      {showSetupComparison && (
        <div className="card-trading">
          <div className="text-sm font-semibold mb-3">Comparaison Automatique — Tous Setups (mêmes paramètres)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  {['Setup', 'Win Rate', 'Profit Factor', 'Max DD', 'Return', 'Moy/Jour', 'Verdict'].map(h => (
                    <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allSetupResults.sort((a, b) => parseFloat(b.totalReturn) - parseFloat(a.totalReturn)).map((r, i) => {
                  const pass = parseFloat(r.winRate) >= 60 && parseFloat(r.profitFactor) >= 1.5 && parseFloat(r.maxDD) < 8;
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="py-2 pr-4 font-medium">{r.setup.name}</td>
                      <td className={`py-2 pr-4 font-mono font-bold ${c(parseFloat(r.winRate), 60, 50)}`}>{r.winRate}%</td>
                      <td className={`py-2 pr-4 font-mono font-bold ${c(parseFloat(r.profitFactor), 1.5, 1.2)}`}>{r.profitFactor}</td>
                      <td className={`py-2 pr-4 font-mono ${parseFloat(r.maxDD) < 4 ? 'text-primary' : parseFloat(r.maxDD) < 7 ? 'text-yellow-400' : 'text-destructive'}`}>{r.maxDD}%</td>
                      <td className={`py-2 pr-4 font-mono font-bold ${parseFloat(r.totalReturn) > 0 ? 'text-primary' : 'text-destructive'}`}>{r.totalReturn}%</td>
                      <td className={`py-2 pr-4 font-mono ${r.avgDailyPnl > 0 ? 'text-primary' : 'text-destructive'}`}>{r.avgDailyPnl}€</td>
                      <td className="py-2 pr-4">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${pass ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>{pass ? 'VALID' : 'DROP'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}