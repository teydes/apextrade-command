import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts';
import { Dices, Play, RefreshCw, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Moteur Monte Carlo pur JS (pas de backend nécessaire)
function runMonteCarlo({ winRate, avgWin, avgLoss, trades, simulations, startCapital, riskPct, maxDD }) {
  const results = [];
  let blown = 0;
  let targets = 0;
  const target = startCapital * 1.1; // +10% = objectif MFF

  for (let s = 0; s < simulations; s++) {
    let equity = startCapital;
    let peak = startCapital;
    let maxDrawdown = 0;
    let blown_flag = false;
    const curve = [{ t: 0, eq: equity }];

    for (let t = 0; t < trades; t++) {
      const risk = equity * (riskPct / 100);
      const isWin = Math.random() < (winRate / 100);
      const pnl = isWin ? risk * avgWin : -risk * avgLoss;
      equity = Math.max(0, equity + pnl);
      if (equity > peak) peak = equity;
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
      if (dd >= maxDD || equity <= 0) { blown_flag = true; break; }
      if ((t + 1) % Math.ceil(trades / 20) === 0) curve.push({ t: t + 1, eq: Math.round(equity) });
    }
    curve.push({ t: trades, eq: Math.round(equity) });

    if (blown_flag) blown++;
    if (equity >= target) targets++;
    results.push({ finalEquity: equity, maxDrawdown, blown: blown_flag, curve });
  }

  results.sort((a, b) => a.finalEquity - b.finalEquity);
  const p10 = results[Math.floor(simulations * 0.1)];
  const p50 = results[Math.floor(simulations * 0.5)];
  const p90 = results[Math.floor(simulations * 0.9)];
  const avgFinal = results.reduce((s, r) => s + r.finalEquity, 0) / simulations;
  const avgDD = results.reduce((s, r) => s + r.maxDrawdown, 0) / simulations;

  // Build percentile curves for chart
  const len = p50.curve.length;
  const chartData = Array.from({ length: len }, (_, i) => ({
    t: p50.curve[i]?.t || i,
    p90: p90.curve[i]?.eq || 0,
    p50: p50.curve[i]?.eq || 0,
    p10: p10.curve[i]?.eq || 0,
  }));

  return {
    blown_pct: (blown / simulations * 100).toFixed(1),
    target_pct: (targets / simulations * 100).toFixed(1),
    avg_final: Math.round(avgFinal),
    avg_dd: avgDD.toFixed(1),
    p10_final: Math.round(p10.finalEquity),
    p50_final: Math.round(p50.finalEquity),
    p90_final: Math.round(p90.finalEquity),
    chartData,
    simulations,
  };
}

const DEFAULT_PARAMS = {
  winRate: 65,
  avgWin: 2.2,
  avgLoss: 1.0,
  trades: 100,
  simulations: 500,
  startCapital: 50000,
  riskPct: 0.5,
  maxDD: 8,
};

export default function MonteCarlo() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const set = (k, v) => setParams(p => ({ ...p, [k]: parseFloat(v) || 0 }));

  const runSim = useCallback(() => {
    setRunning(true);
    setResult(null);
    // Petit délai pour que l'UI se mette à jour
    setTimeout(() => {
      const res = runMonteCarlo(params);
      setResult(res);
      setRunning(false);
      toast.success(`${params.simulations} simulations terminées`);
    }, 100);
  }, [params]);

  const getAIInsight = async () => {
    if (!result) return;
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert en gestion de risque prop trading NQ Futures.
Analyse ces résultats Monte Carlo et donne une recommandation critique:

Paramètres: WR=${params.winRate}%, R:R moyen=${params.avgWin}/${params.avgLoss}, ${params.trades} trades, Risque=${params.riskPct}% par trade, DD max=${params.maxDD}%
Résultats (${params.simulations} simulations):
- Comptes soufflés: ${result.blown_pct}%
- Objectif +10% atteint: ${result.target_pct}%
- P50 final: ${result.p50_final.toLocaleString()}€
- P10/P90: ${result.p10_final.toLocaleString()}€ / ${result.p90_final.toLocaleString()}€
- DD moyen: ${result.avg_dd}%

Retourne UNIQUEMENT un JSON sans markdown:
{
  "verdict": "<verdict global en 1 phrase>",
  "risk_level": "faible"|"modéré"|"élevé"|"critique",
  "optimal_risk_pct": <number>,
  "recommendations": ["<rec 1>", "<rec 2>", "<rec 3>"],
  "propfirm_compatible": true|false,
  "propfirm_note": "<explication compatibilité MFF>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          verdict: { type: "string" },
          risk_level: { type: "string" },
          optimal_risk_pct: { type: "number" },
          recommendations: { type: "array", items: { type: "string" } },
          propfirm_compatible: { type: "boolean" },
          propfirm_note: { type: "string" }
        }
      }
    });
    setAiInsight(res);
    setLoadingAI(false);
  };

  const riskColor = (r) => ({ 'faible': 'text-primary', 'modéré': 'text-yellow-400', 'élevé': 'text-orange-400', 'critique': 'text-destructive' }[r] || 'text-muted-foreground');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Dices className="w-5 h-5 text-yellow-400" />
            Optimiseur Monte Carlo
          </h1>
          <p className="text-xs text-muted-foreground">Simulation probabiliste · Robustesse stratégie · Risque optimal MFF</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={runSim} disabled={running} className="gap-1 text-xs">
            <Play className={`w-3 h-3 ${running ? 'animate-pulse' : ''}`} />
            {running ? `Simulation...` : `Lancer ${params.simulations} sims`}
          </Button>
          {result && (
            <Button size="sm" onClick={getAIInsight} disabled={loadingAI} className="gap-1 text-xs">
              <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? 'Analyse...' : 'Analyse IA'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Params */}
        <div className="card-trading space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paramètres Stratégie</div>
          {[
            { key: 'winRate', label: 'Win Rate (%)', min: 30, max: 90 },
            { key: 'avgWin', label: 'R moyen sur wins', min: 0.5, max: 10 },
            { key: 'avgLoss', label: 'R moyen sur losses', min: 0.5, max: 3 },
            { key: 'riskPct', label: 'Risque / trade (%)', min: 0.1, max: 5 },
            { key: 'maxDD', label: 'DD max autorisé (%)', min: 1, max: 20 },
          ].map(f => (
            <div key={f.key}>
              <div className="flex justify-between">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <span className="text-xs font-mono text-foreground font-bold">{params[f.key]}</span>
              </div>
              <Input type="range" min={f.min} max={f.max} step={f.key === 'winRate' || f.key === 'maxDD' ? 1 : 0.1}
                value={params[f.key]} onChange={e => set(f.key, e.target.value)}
                className="h-5 mt-1 accent-primary" />
            </div>
          ))}
          <div className="border-t border-border pt-2 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Simulation</div>
            {[
              { key: 'trades', label: 'Nb trades par sim' },
              { key: 'simulations', label: 'Nb simulations' },
              { key: 'startCapital', label: 'Capital départ (€)' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input type="number" value={params[f.key]} onChange={e => set(f.key, e.target.value)} className="bg-secondary border-border h-7 text-xs font-mono mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {!result && !running && (
            <div className="card-trading text-center py-16">
              <Dices className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Configurez vos paramètres et lancez la simulation</p>
              <p className="text-xs text-muted-foreground opacity-60 mt-1">Le moteur teste {params.simulations} scénarios aléatoires de {params.trades} trades</p>
            </div>
          )}
          {running && (
            <div className="card-trading text-center py-16">
              <RefreshCw className="w-10 h-10 mx-auto mb-3 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Exécution de {params.simulations} simulations...</p>
            </div>
          )}
          {result && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Comptes soufflés', value: `${result.blown_pct}%`, color: parseFloat(result.blown_pct) < 5 ? 'text-primary' : parseFloat(result.blown_pct) < 20 ? 'text-yellow-400' : 'text-destructive' },
                  { label: 'Objectif +10%', value: `${result.target_pct}%`, color: parseFloat(result.target_pct) > 70 ? 'text-primary' : 'text-yellow-400' },
                  { label: 'Équité médiane', value: `${result.p50_final.toLocaleString()}€`, color: result.p50_final >= params.startCapital ? 'text-primary' : 'text-destructive' },
                  { label: 'DD moyen', value: `${result.avg_dd}%`, color: parseFloat(result.avg_dd) < 4 ? 'text-primary' : parseFloat(result.avg_dd) < 7 ? 'text-yellow-400' : 'text-destructive' },
                ].map(k => (
                  <div key={k.label} className="card-trading">
                    <div className="text-[10px] text-muted-foreground mb-1">{k.label}</div>
                    <div className={`text-xl font-bold font-mono ${k.color}`}>{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Courbe percentiles */}
              <div className="card-trading">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Distribution des Équités (P10 / P50 / P90)</span>
                  <div className="flex gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />P90 (optimiste)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />P50 (médiane)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block" />P10 (pessimiste)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={result.chartData}>
                    <defs>
                      <linearGradient id="g90" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00FF88" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }}
                      formatter={(v, n) => [`${v.toLocaleString()}€`, n]} />
                    <ReferenceLine y={params.startCapital} stroke="#64748b" strokeDasharray="4 2" strokeWidth={1} />
                    <Area type="monotone" dataKey="p90" stroke="#00FF88" fill="url(#g90)" strokeWidth={1.5} dot={false} name="P90" />
                    <Area type="monotone" dataKey="p50" stroke="#F59E0B" fill="none" strokeWidth={2} dot={false} name="P50" />
                    <Area type="monotone" dataKey="p10" stroke="#EF4444" fill="none" strokeWidth={1.5} dot={false} name="P10" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                  <span>P10: <span className="text-destructive font-mono">{result.p10_final.toLocaleString()}€</span></span>
                  <span>P50: <span className="text-yellow-400 font-mono">{result.p50_final.toLocaleString()}€</span></span>
                  <span>P90: <span className="text-primary font-mono">{result.p90_final.toLocaleString()}€</span></span>
                </div>
              </div>

              {/* AI Insight */}
              {aiInsight && (
                <div className="card-trading border border-yellow-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-semibold">Analyse IA Monte Carlo</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${riskColor(aiInsight.risk_level)} bg-current/10`} style={{backgroundColor:'transparent', border:'1px solid currentColor'}}>
                      {aiInsight.risk_level?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{aiInsight.verdict}</p>
                  <div className="flex items-center gap-3 p-2 rounded bg-secondary/30 text-xs">
                    <span className="text-muted-foreground">Risque optimal suggéré:</span>
                    <span className="text-primary font-mono font-bold">{aiInsight.optimal_risk_pct}%</span>
                    <span className={`ml-auto flex items-center gap-1 font-semibold ${aiInsight.propfirm_compatible ? 'text-primary' : 'text-destructive'}`}>
                      {aiInsight.propfirm_compatible ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {aiInsight.propfirm_compatible ? 'Compatible MFF' : 'Non compatible MFF'}
                    </span>
                  </div>
                  {aiInsight.propfirm_note && <p className="text-xs text-muted-foreground">{aiInsight.propfirm_note}</p>}
                  <div className="space-y-1">
                    {aiInsight.recommendations?.map((r, i) => (
                      <div key={i} className="flex gap-2 text-xs p-1.5 bg-yellow-400/5 rounded border border-yellow-400/20">
                        <span className="text-yellow-400 font-bold flex-shrink-0">{i + 1}.</span>{r}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}