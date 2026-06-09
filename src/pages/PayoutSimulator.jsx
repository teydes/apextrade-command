import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Calculator, TrendingUp, Zap, Download, RefreshCw, Target,
  AlertTriangle, CheckCircle2, ArrowRight, Layers
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const PROPFIRMS_CONFIG = [
  { id: 'mff', name: 'MFF', accountSizes: [10000, 25000, 50000, 100000, 200000], payout: 0.80, minPayout: 500, freq: 'biweekly', fee: 480 },
  { id: 'tradefy', name: 'Tradefy', accountSizes: [5000, 10000, 25000, 50000], payout: 0.85, minPayout: 100, freq: 'weekly', fee: 150 },
  { id: 'lucid', name: 'Lucid Trading', accountSizes: [10000, 25000, 50000], payout: 0.80, minPayout: 200, freq: 'monthly', fee: 180 },
  { id: 'ufunded', name: 'UFunded', accountSizes: [15000, 25000, 50000, 100000], payout: 0.75, minPayout: 500, freq: 'monthly', fee: 350 },
  { id: 'topstep', name: 'TopStep', accountSizes: [50000, 100000, 150000], payout: 0.90, minPayout: 100, freq: 'weekly', fee: 165 },
];

function simulateGrowth(params) {
  const { accountSize, winRate, avgRR, tradesPerDay, riskPct, tradingDays, payoutSplit, reinvestPct } = params;
  const data = [];
  let balance = accountSize;
  let totalPayout = 0;
  let totalTrades = 0;
  let wins = 0;
  let maxBalance = balance;
  let maxDD = 0;

  for (let day = 0; day <= tradingDays; day++) {
    for (let t = 0; t < tradesPerDay; t++) {
      const isWin = Math.random() < winRate / 100;
      const risk = balance * (riskPct / 100);
      const pnl = isWin ? risk * avgRR : -risk;
      balance = Math.max(0, balance + pnl);
      totalTrades++;
      if (isWin) wins++;
    }
    const dd = ((maxBalance - balance) / maxBalance) * 100;
    if (dd > maxDD) maxDD = dd;
    if (balance > maxBalance) maxBalance = balance;

    const monthlyProfit = balance - accountSize;
    const payoutAmount = monthlyProfit > 0 && day % 22 === 0 && day > 0 ? monthlyProfit * payoutSplit / 100 : 0;
    if (payoutAmount > 0) {
      totalPayout += payoutAmount;
      const reinvested = payoutAmount * reinvestPct / 100;
      balance = accountSize + (balance - accountSize) * (1 - payoutSplit / 100) + reinvested;
    }

    if (day % Math.max(1, Math.round(tradingDays / 50)) === 0) {
      data.push({ day, balance: Math.round(balance), profit: Math.round(balance - accountSize), payout: Math.round(payoutAmount) });
    }
  }

  return { data, finalBalance: Math.round(balance), totalPayout: Math.round(totalPayout), totalProfit: Math.round(balance - accountSize), maxDD: maxDD.toFixed(1), realWinRate: totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0 };
}

export default function PayoutSimulator() {
  const [params, setParams] = useState({
    accountSize: 50000, winRate: 65, avgRR: 2.2, tradesPerDay: 3,
    riskPct: 0.5, tradingDays: 90, payoutSplit: 80, reinvestPct: 60, propfirm: 'mff',
  });
  const [scenarios, setScenarios] = useState([]);
  const [aiReport, setAiReport] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('sim');

  const { data: trades = [] } = useQuery({
    queryKey: ['trades-payout-sim'],
    queryFn: () => base44.entities.Trade.filter({ status: 'closed' }, '-created_date', 100),
  });

  const realStats = useMemo(() => {
    if (trades.length < 5) return null;
    const wins = trades.filter(t => t.result === 'win').length;
    const avgRR = trades.reduce((s, t) => s + (t.risk_reward || 0), 0) / trades.length;
    return { winRate: Math.round((wins / trades.length) * 100), avgRR: avgRR.toFixed(2), totalPnl: trades.reduce((s, t) => s + (t.pnl || 0), 0) };
  }, [trades]);

  const loadRealStats = () => {
    if (!realStats) { toast.error('Pas assez de trades en base'); return; }
    setParams(p => ({ ...p, winRate: realStats.winRate, avgRR: parseFloat(realStats.avgRR) }));
    toast.success(`Stats réelles chargées: WR ${realStats.winRate}%`);
  };

  const result = useMemo(() => simulateGrowth(params), [params]);

  const addScenario = () => {
    const selectedPF = PROPFIRMS_CONFIG.find(p => p.id === params.propfirm);
    setScenarios(prev => [...prev.slice(-3), {
      id: Date.now(),
      label: `${selectedPF?.name} ${params.accountSize / 1000}K — WR${params.winRate}% RR${params.avgRR}`,
      ...result, params: { ...params },
      color: ['#00FF88', '#0088FF', '#F59E0B', '#EF4444'][prev.length % 4],
    }]);
    toast.success('Scénario sauvegardé');
  };

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    const selectedPF = PROPFIRMS_CONFIG.find(p => p.id === params.propfirm);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert PropFirm. Analyse ce scénario de simulation de payout.

PARAMETRES: PropFirm: ${selectedPF?.name} | Compte: ${params.accountSize.toLocaleString()}€ | WR: ${params.winRate}% | RR: ${params.avgRR}:1 | Trades/jour: ${params.tradesPerDay} | Risque: ${params.riskPct}%

RESULTATS: Balance finale: ${result.finalBalance.toLocaleString()}€ | Profit: ${result.totalProfit.toLocaleString()}€ | Payouts: ${result.totalPayout.toLocaleString()}€ | MaxDD: ${result.maxDD}%

Reponds UNIQUEMENT JSON:
{"score_viabilite":<0-100>,"verdict":"<2 phrases>","risque_propfirm":"faible|modere|eleve","optimisations":[{"param":"<param>","valeur_actuelle":"<val>","valeur_optimale":"<val>","gain_estime":"<val>","raison":"<raison>"}],"strategie_payout_optimale":"<strategie>","objectifs_mensuels":{"mois_1":<€>,"mois_3":<€>,"mois_6":<€>,"mois_12":<€>},"conseil_scaling":"<conseil>"}`,
      response_json_schema: {
        type: "object",
        properties: {
          score_viabilite: { type: "number" }, verdict: { type: "string" }, risque_propfirm: { type: "string" },
          optimisations: { type: "array", items: { type: "object", properties: { param: { type: "string" }, valeur_actuelle: { type: "string" }, valeur_optimale: { type: "string" }, gain_estime: { type: "string" }, raison: { type: "string" } } } },
          strategie_payout_optimale: { type: "string" },
          objectifs_mensuels: { type: "object", properties: { mois_1: { type: "number" }, mois_3: { type: "number" }, mois_6: { type: "number" }, mois_12: { type: "number" } } },
          conseil_scaling: { type: "string" }
        }
      }
    });
    setAiReport(res);
    setLoadingAI(false);
  };

  const exportReport = () => {
    const rows = [['Jour', 'Balance', 'Profit', 'Payout'], ...result.data.map(d => [d.day, d.balance, d.profit, d.payout])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'payout_simulation.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedPF = PROPFIRMS_CONFIG.find(p => p.id === params.propfirm);
  const monthlyTarget = Math.round(result.totalProfit / (params.tradingDays / 22));
  const roi = params.accountSize > 0 ? ((result.totalProfit / params.accountSize) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-400" />
            Simulateur de Payouts PropFirm
          </h1>
          <p className="text-xs text-muted-foreground">Simulation probabiliste · Optimisation paramètres · Projection croissance · Conseil IA</p>
        </div>
        <div className="flex gap-2">
          {realStats && (
            <Button size="sm" variant="outline" onClick={loadRealStats} className="gap-1 text-xs h-8">
              <RefreshCw className="w-3 h-3" />Stats réelles
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={exportReport} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />Export
          </Button>
          <Button size="sm" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs">
            <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Optimiser IA'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Balance Finale', value: `${result.finalBalance.toLocaleString()}€`, color: result.finalBalance > params.accountSize ? 'text-primary' : 'text-destructive' },
          { label: 'Profit Total', value: `+${result.totalProfit.toLocaleString()}€`, color: 'text-primary' },
          { label: 'Payouts Reçus', value: `${result.totalPayout.toLocaleString()}€`, color: 'text-yellow-400' },
          { label: 'ROI', value: `${roi}%`, color: parseFloat(roi) > 10 ? 'text-primary' : 'text-yellow-400' },
          { label: 'Max Drawdown', value: `${result.maxDD}%`, color: parseFloat(result.maxDD) < 5 ? 'text-primary' : 'text-destructive' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center">
            <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
            <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* AI Report */}
      {aiReport && (
        <div className="card-trading border border-orange-400/30 bg-orange-400/5 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-center">
              <div className={`text-2xl font-bold font-mono ${aiReport.score_viabilite >= 70 ? 'text-primary' : aiReport.score_viabilite >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{aiReport.score_viabilite}</div>
              <div className="text-[10px] text-muted-foreground">Viabilité</div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-orange-400 mb-1">Analyse IA PropFirm</div>
              <p className="text-xs text-muted-foreground">{aiReport.verdict}</p>
            </div>
            <div className={`px-3 py-1 rounded border text-xs font-bold ${aiReport.risque_propfirm === 'faible' ? 'border-primary/30 text-primary' : aiReport.risque_propfirm === 'modere' ? 'border-yellow-400/30 text-yellow-400' : 'border-destructive/30 text-destructive'}`}>
              {aiReport.risque_propfirm}
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiReport(null)}>✕</Button>
          </div>
          {aiReport.objectifs_mensuels && (
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(aiReport.objectifs_mensuels).map(([k, v]) => (
                <div key={k} className="p-2 rounded bg-primary/5 border border-primary/20 text-center">
                  <div className="text-[10px] text-muted-foreground">{k.replace('_', ' ')}</div>
                  <div className="font-mono font-bold text-primary text-sm">{v?.toLocaleString()}€</div>
                </div>
              ))}
            </div>
          )}
          {aiReport.optimisations?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {aiReport.optimisations.slice(0, 4).map((o, i) => (
                <div key={i} className="p-2 rounded border border-border bg-secondary/20 text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-primary">{o.param}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="line-through text-muted-foreground">{o.valeur_actuelle}</span>
                    <span className="text-primary font-bold">{o.valeur_optimale}</span>
                    <span className="ml-auto text-primary">+{o.gain_estime}</span>
                  </div>
                  <p className="text-muted-foreground">{o.raison}</p>
                </div>
              ))}
            </div>
          )}
          {aiReport.strategie_payout_optimale && (
            <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs">
              <span className="text-blue-400 font-semibold">Stratégie:</span> <span className="text-muted-foreground">{aiReport.strategie_payout_optimale}</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border flex-wrap">
        {[
          { id: 'sim', label: 'Simulation' },
          { id: 'params', label: 'Parametres' },
          { id: 'compare', label: 'Comparaison' },
          { id: 'propfirms', label: 'PropFirms' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'sim' && (
        <div className="space-y-4">
          <div className="card-trading">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Courbe de Croissance — {params.tradingDays} jours</span>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Moy/mois: <strong className="text-primary">+{monthlyTarget.toLocaleString()}€</strong></span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={result.data}>
                <defs>
                  <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `J${v}`} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v.toLocaleString()}€`, '']} />
                <ReferenceLine y={params.accountSize} stroke="#64748b" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="balance" stroke="#00FF88" fill="url(#simGrad)" strokeWidth={2} name="Balance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Projections par Période</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[30, 60, 90, 180].map(days => {
                const sim = simulateGrowth({ ...params, tradingDays: days });
                return (
                  <div key={days} className={`p-3 rounded border text-center ${days === params.tradingDays ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="text-xs text-muted-foreground mb-1">{days} jours</div>
                    <div className={`text-lg font-bold font-mono ${sim.totalProfit > 0 ? 'text-primary' : 'text-destructive'}`}>+{sim.totalProfit.toLocaleString()}€</div>
                    <div className="text-[10px] text-muted-foreground">{sim.totalPayout.toLocaleString()}€ payouts</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={addScenario} variant="outline" className="gap-1 text-xs">
              <Layers className="w-3 h-3" />Sauvegarder scénario
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'params' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading space-y-4">
            <div className="text-sm font-semibold">Compte et Stratégie</div>
            <div>
              <Label className="text-xs">PropFirm</Label>
              <Select value={params.propfirm} onValueChange={v => setParams(p => ({ ...p, propfirm: v, accountSize: PROPFIRMS_CONFIG.find(pf => pf.id === v)?.accountSizes[0] || p.accountSize }))}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PROPFIRMS_CONFIG.map(pf => <SelectItem key={pf.id} value={pf.id}>{pf.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Taille de compte</Label>
              <Select value={String(params.accountSize)} onValueChange={v => setParams(p => ({ ...p, accountSize: parseInt(v) }))}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{selectedPF?.accountSizes.map(s => <SelectItem key={s} value={String(s)}>{(s/1000).toFixed(0)}K€</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[
              { key: 'winRate', label: 'Win Rate', unit: '%', min: 40, max: 90, step: 1, color: 'text-primary' },
              { key: 'avgRR', label: 'Avg R:R', unit: ':1', min: 10, max: 50, step: 1, mult: 10, color: 'text-blue-400' },
              { key: 'riskPct', label: 'Risque/trade', unit: '%', min: 1, max: 30, step: 1, mult: 10, color: 'text-yellow-400' },
              { key: 'tradesPerDay', label: 'Trades/jour', unit: '', min: 1, max: 10, step: 1, color: 'text-muted-foreground' },
            ].map(s => {
              const mult = s.mult || 1;
              const val = s.mult ? params[s.key] * mult : params[s.key];
              const display = s.mult ? (params[s.key]).toFixed(s.key === 'avgRR' ? 1 : 1) : params[s.key];
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <Label className="text-xs">{s.label}</Label>
                    <span className={`font-mono ${s.color}`}>{display}{s.unit}</span>
                  </div>
                  <Slider value={[val]} onValueChange={([v]) => setParams(p => ({...p, [s.key]: s.mult ? v / s.mult : v}))} min={s.min} max={s.max} step={s.step} />
                </div>
              );
            })}
          </div>
          <div className="card-trading space-y-4">
            <div className="text-sm font-semibold">Payout et Durée</div>
            {[
              { key: 'tradingDays', label: 'Durée simulation', unit: ' jours', min: 30, max: 365, step: 5, color: 'text-muted-foreground' },
              { key: 'payoutSplit', label: 'Split payout trader', unit: '%', min: 70, max: 90, step: 5, color: 'text-primary' },
              { key: 'reinvestPct', label: 'Réinvestissement payouts', unit: '%', min: 0, max: 100, step: 5, color: 'text-blue-400' },
            ].map(s => (
              <div key={s.key}>
                <div className="flex justify-between text-xs mb-1">
                  <Label className="text-xs">{s.label}</Label>
                  <span className={`font-mono ${s.color}`}>{params[s.key]}{s.unit}</span>
                </div>
                <Slider value={[params[s.key]]} onValueChange={([v]) => setParams(p => ({...p, [s.key]: v}))} min={s.min} max={s.max} step={s.step} />
              </div>
            ))}
            <div className="border-t border-border pt-3 space-y-1.5 text-xs">
              {[
                { label: 'Fee compte', value: `${selectedPF?.fee}€`, color: 'text-destructive' },
                { label: 'Split PropFirm', value: `${selectedPF?.payout * 100}%`, color: 'text-primary' },
                { label: 'Payout minimum', value: `${selectedPF?.minPayout}€`, color: '' },
                { label: 'Fréquence', value: selectedPF?.freq || '—', color: 'text-blue-400' },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className={`font-mono ${r.color || 'text-foreground'}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-4">
          {scenarios.length === 0 ? (
            <div className="card-trading text-center py-12">
              <Layers className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Simulez des scénarios et sauvegardez-les pour comparer</p>
              <Button className="mt-3 text-xs" onClick={() => setActiveTab('sim')}>← Simulation</Button>
            </div>
          ) : (
            <>
              <div className="card-trading">
                {scenarios.map(sc => (
                  <div key={sc.id} className="flex items-center gap-3 p-3 rounded border border-border bg-secondary/20 text-xs mb-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                    <span className="flex-1 font-medium">{sc.label}</span>
                    <span className="font-mono text-primary">+{sc.totalProfit.toLocaleString()}€</span>
                    <span className="font-mono text-yellow-400">{sc.totalPayout.toLocaleString()}€</span>
                    <span className={`font-mono ${parseFloat(sc.maxDD) < 5 ? 'text-primary' : 'text-destructive'}`}>DD:{sc.maxDD}%</span>
                    <button onClick={() => setScenarios(prev => prev.filter(s => s.id !== sc.id))} className="text-muted-foreground hover:text-destructive">✕</button>
                  </div>
                ))}
              </div>
              <div className="card-trading">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart>
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `J${v}`} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v.toLocaleString()}€`, '']} />
                    {scenarios.map(sc => (
                      <Line key={sc.id} type="monotone" data={sc.data} dataKey="balance" stroke={sc.color} strokeWidth={2} dot={false} name={sc.label} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'propfirms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {PROPFIRMS_CONFIG.map(pf => {
            const midSize = pf.accountSizes[Math.floor(pf.accountSizes.length / 2)];
            const sim = simulateGrowth({ ...params, accountSize: midSize, payoutSplit: Math.round(pf.payout * 100), tradingDays: 90 });
            const roiPf = Math.round((sim.totalProfit / midSize) * 100);
            return (
              <div key={pf.id}
                className={`card-trading border cursor-pointer transition-all hover:border-primary/40 ${params.propfirm === pf.id ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
                onClick={() => { setParams(p => ({ ...p, propfirm: pf.id, accountSize: midSize, payoutSplit: Math.round(pf.payout * 100) })); setActiveTab('sim'); }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{pf.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${roiPf > 20 ? 'bg-primary/20 text-primary' : 'bg-yellow-400/20 text-yellow-400'}`}>ROI ~{roiPf}%</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  {[
                    { l: 'Comptes', v: pf.accountSizes.map(s => `${s/1000}K`).join(', ') + '€' },
                    { l: 'Split', v: `${pf.payout * 100}%` },
                    { l: 'Fee', v: `${pf.fee}€` },
                    { l: 'Profit 90j', v: `+${sim.totalProfit.toLocaleString()}€` },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between">
                      <span className="text-muted-foreground">{r.l}</span>
                      <span className="font-mono">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}