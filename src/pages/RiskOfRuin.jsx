import { useState, useMemo } from 'react';
import { Skull, TrendingUp, Shield, AlertTriangle, Brain, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, ReferenceLine } from 'recharts';
import { toast } from 'sonner';

export default function RiskOfRuin() {
  const [winRate, setWinRate] = useState(55);
  const [rr, setRr] = useState(2);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [accountSize, setAccountSize] = useState(10000);
  const [simulations, setSimulations] = useState(1000);
  const [ruinDef, setRuinDef] = useState(50);

  const edge = (winRate / 100) * rr - (1 - winRate / 100);
  const kelly = edge > 0 ? (winRate / 100 - (1 - winRate / 100) / rr) * 100 : 0;
  const kellyFraction = kelly * 0.5;

  // Risk of Ruin formula (simplified)
  const riskOfRuin = useMemo(() => {
    if (edge <= 0) return 100;
    const a = 1 + rr;
    const b = 1;
    const p = winRate / 100;
    const q = 1 - p;
    const ruinProb = Math.pow(q / p, accountSize * ruinDef / 100 / (riskPerTrade * accountSize / 100));
    return Math.min(Math.round(ruinProb * 100), 100);
  }, [winRate, rr, riskPerTrade, accountSize, ruinDef]);

  // Monte Carlo simulation
  const mcResults = useMemo(() => {
    const runs = [];
    const ruinCount = { 1: 0, 2: 0, 3: 0 };
    const maxDDs = [];
    for (let s = 0; s < simulations; s++) {
      let balance = accountSize;
      let peak = balance;
      let maxDD = 0;
      let bankrupt = false;
      const path = [balance];
      for (let i = 0; i < 200; i++) {
        const win = Math.random() * 100 < winRate;
        const pnl = win ? balance * riskPerTrade / 100 * rr : -balance * riskPerTrade / 100;
        balance += pnl;
        if (balance > peak) peak = balance;
        const dd = ((peak - balance) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
        path.push(Math.round(balance));
        if (balance <= accountSize * (1 - ruinDef / 100)) { bankrupt = true; break; }
        if (balance <= 0) { bankrupt = true; break; }
      }
      runs.push(path);
      maxDDs.push(maxDD);
      if (bankrupt) { ruinCount[1]++; }
      if (maxDD >= 20) ruinCount[2]++;
      if (maxDD >= 30) ruinCount[3]++;
    }
    const avgMaxDD = Math.round(maxDDs.reduce((a, b) => a + b, 0) / maxDDs.length);
    const medianDD = maxDDs.sort((a, b) => a - b)[Math.floor(maxDDs.length / 2)];
    const worstDD = Math.max(...maxDDs);
    const p95DD = maxDDs[Math.floor(maxDDs.length * 0.95)];
    return { runs, ruinCount, avgMaxDD, medianDD, worstDD, p95DD, prob20: Math.round(ruinCount[2] / simulations * 100), prob30: Math.round(ruinCount[3] / simulations * 100) };
  }, [winRate, rr, riskPerTrade, accountSize, ruinDef, simulations]);

  const samplePaths = mcResults.runs.slice(0, 50);
  const chartData = samplePaths[0]?.map((_, i) => {
    const obj = { i };
    samplePaths.forEach((p, idx) => { obj[`s${idx}`] = p[i] || null; });
    return obj;
  }) || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Skull className="w-5 h-5 text-destructive" />Risk of Ruin Calculator</h1>
        <p className="text-xs text-muted-foreground">Monte Carlo · Probabilité de ruine · Drawdown max · {simulations} simulations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inputs */}
        <div className="card-trading space-y-3">
          <div className="text-sm font-semibold">Paramètres</div>
          {[
            { l: 'Win Rate %', v: winRate, set: setWinRate, min: 0, max: 100 },
            { l: 'Risk:Reward', v: rr, set: setRr, min: 0.5, max: 10, step: 0.1 },
            { l: 'Risque par trade %', v: riskPerTrade, set: setRiskPerTrade, min: 0.1, max: 5, step: 0.1 },
            { l: 'Capital (€)', v: accountSize, set: setAccountSize, min: 100 },
            { l: 'Définition Ruine (% DD)', v: ruinDef, set: setRuinDef, min: 10, max: 100 },
            { l: 'Nb Simulations', v: simulations, set: setSimulations, min: 100, max: 5000 },
          ].map(f => (
            <div key={f.l}>
              <Label className="text-[10px] text-muted-foreground">{f.l}</Label>
              <Input type="number" value={f.v} onChange={e => f.set(+e.target.value)} min={f.min} max={f.max} step={f.step || 1} className="h-8 bg-secondary text-xs" />
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`card-trading text-center ${riskOfRuin > 20 ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-primary/5'}`}>
              <Skull className={`w-5 h-5 mx-auto mb-1 ${riskOfRuin > 20 ? 'text-destructive' : 'text-primary'}`} />
              <div className={`text-2xl font-bold font-mono ${riskOfRuin > 20 ? 'text-destructive' : 'text-primary'}`}>{riskOfRuin}%</div>
              <div className="text-[10px] text-muted-foreground">Risk of Ruin</div>
            </div>
            <div className="card-trading text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <div className={`text-2xl font-bold font-mono ${edge > 0 ? 'text-primary' : 'text-destructive'}`}>{edge.toFixed(3)}</div>
              <div className="text-[10px] text-muted-foreground">Edge math.</div>
            </div>
            <div className="card-trading text-center">
              <Shield className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
              <div className="text-2xl font-bold font-mono text-yellow-400">{kelly.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">Kelly %</div>
            </div>
            <div className="card-trading text-center">
              <Activity className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <div className="text-2xl font-bold font-mono text-purple-400">{mcResults.avgMaxDD}%</div>
              <div className="text-[10px] text-muted-foreground">DD Max Moy.</div>
            </div>
          </div>

          {/* Monte Carlo equity curves */}
          <div className="card-trading">
            <div className="text-sm font-semibold mb-2">Monte Carlo — 50 trajectoires simulées (200 trades)</div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <XAxis dataKey="i" tick={{ fontSize: 9, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} domain={['auto', 'auto']} />
                <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
                <ReferenceLine y={accountSize} stroke="#6B7280" strokeDasharray="3 3" />
                <ReferenceLine y={accountSize * (1 - ruinDef / 100)} stroke="#EF4444" strokeDasharray="3 3" />
                {samplePaths.map((_, idx) => (
                  <Area key={idx} type="monotone" dataKey={`s${idx}`} stroke={idx % 3 === 0 ? '#00FF8866' : idx % 3 === 1 ? '#0088FF44' : '#F59E0B33'} strokeWidth={0.5} fill="none" />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* DD Distribution */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[{ l: 'DD Médian', v: `${mcResults.medianDD}%`, c: 'text-yellow-400' },
              { l: 'DD P95', v: `${mcResults.p95DD}%`, c: 'text-orange-400' },
              { l: 'DD Pire cas', v: `${mcResults.worstDD}%`, c: 'text-destructive' },
              { l: 'Prob. DD≥20%', v: `${mcResults.prob20}%`, c: mcResults.prob20 > 30 ? 'text-destructive' : 'text-primary' }
            ].map(s => (
              <div key={s.l} className="card-trading text-center"><div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
            ))}
          </div>

          {/* Warning */}
          {(riskOfRuin > 10 || edge <= 0) && (
            <div className="card-trading border border-destructive/30 bg-destructive/5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="text-destructive font-semibold">ATTENTION: </span>
                <span className="text-muted-foreground">
                  {edge <= 0 ? `Votre edge mathématique est négatif (${edge.toFixed(3)}). Aucune gestion du risque ne peut sauver une stratégie perdante. Améliorez votre win rate ou votre R:R.` :
                   riskOfRuin > 20 ? `Risk of Ruin de ${riskOfRuin}% est DANGEREUX. Réduisez votre risque par trade à ${Math.max(0.5, riskPerTrade * 0.5).toFixed(1)}% ou améliorez votre edge.` :
                   `Risk of Ruin de ${riskOfRuin}% reste élevé. Consider réduire le risque par trade.`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}