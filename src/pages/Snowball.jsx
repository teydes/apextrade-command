import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Snowflake, TrendingUp, Zap, Target, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const ROADMAP = [
  { step: 1, label: 'Backtest validé (WR≥60%, 30+ trades)', pnl: 0, capital: 2000, cumul: 2000, duration: '3 sem' },
  { step: 2, label: '1er compte MFF 50K — Phase Demo', pnl: 0, capital: 480, cumul: 2480, duration: '1 mois' },
  { step: 3, label: 'Passage Live MFF 50K — Objectif 3000€', pnl: 3000, capital: 0, cumul: 5480, duration: '1 mois' },
  { step: 4, label: '1er Payout + 2e compte Tradefy 25K', pnl: 2500, capital: 150, cumul: 7830, duration: '6 sem' },
  { step: 5, label: '3 comptes en copy — 100K géré', pnl: 5000, capital: 330, cumul: 12500, duration: '2 mois' },
  { step: 6, label: '6 comptes — 250K géré — 12K+/mois', pnl: 12000, capital: 1000, cumul: 23500, duration: '3 mois' },
  { step: 7, label: '10 comptes — 500K géré — 20K+/mois', pnl: 20000, capital: 0, cumul: 43500, duration: '6 mois' },
  { step: 8, label: '15 comptes — 900K+ — Hedgefund Mode', pnl: 35000, capital: 0, cumul: 78500, duration: '12 mois' },
];

function simulateSnowball({ startCapital, dailyTarget, reinvestPct, months, riskPct }) {
  const data = [{ month: 0, balance: startCapital, accounts: 1, monthly: 0 }];
  let balance = startCapital;
  let accounts = 1;

  for (let m = 1; m <= months; m++) {
    const tradingDays = 20;
    const monthly = Math.round(accounts * dailyTarget * tradingDays * (1 - riskPct / 100));
    const reinvested = Math.round(monthly * (reinvestPct / 100));
    balance += reinvested;

    // Scale new account every ~4500€ gain
    if (reinvested > 4500) {
      accounts = Math.min(accounts + Math.floor(reinvested / 4500), 15);
    }

    data.push({ month: m, balance: Math.round(balance), accounts, monthly });
  }
  return data;
}

export default function Snowball() {
  const [params, setParams] = useState({ startCapital: 2000, dailyTarget: 500, reinvestPct: 80, months: 24, riskPct: 0.5 });
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const data = useMemo(() => simulateSnowball(params), [params]);
  const last = data[data.length - 1];
  const set = (k, v) => setParams(p => ({ ...p, [k]: parseFloat(v) || 0 }));

  const getAIProjection = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert en scaling de capital trading institutionnel. Analyse ce plan de croissance "boule de neige" et identifie les risques et optimisations.

Paramètres: Capital départ=${params.startCapital}€, Objectif journalier=${params.dailyTarget}€/compte, Réinvestissement=${params.reinvestPct}%, Durée=${params.months} mois
Projection: Balance finale=${last.balance.toLocaleString()}€, Comptes=${last.accounts}, Revenue mensuel=${last.monthly}€

Retourne UNIQUEMENT JSON:
{
  "feasibility": "réaliste"|"optimiste"|"ambitieux",
  "score": <0-100>,
  "key_risks": ["<risque 1>","<risque 2>","<risque 3>"],
  "milestones": [{"month":<n>,"target":"<objectif clé>"}],
  "recommendation": "<conseil principal en 2 phrases>"
}`,
      response_json_schema: {
        type: "object", properties: {
          feasibility: { type: "string" }, score: { type: "number" },
          key_risks: { type: "array", items: { type: "string" } },
          milestones: { type: "array", items: { type: "object", properties: { month: { type: "number" }, target: { type: "string" } } } },
          recommendation: { type: "string" }
        }
      }
    });
    setAiAnalysis(res);
    setLoadingAI(false);
  };

  const feasColor = { réaliste: 'text-primary', optimiste: 'text-yellow-400', ambitieux: 'text-orange-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-400" />
            Plan Boule de Neige
          </h1>
          <p className="text-xs text-muted-foreground">Simulation de croissance composée · Scaling PropFirm · Objectif 1M€</p>
        </div>
        <Button size="sm" onClick={getAIProjection} disabled={loadingAI} className="gap-1 text-xs">
          <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
          {loadingAI ? 'IA...' : 'Analyse IA'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-trading text-center py-2">
          <div className="text-xl font-bold font-mono text-primary">{last.balance.toLocaleString()}€</div>
          <div className="text-[10px] text-muted-foreground">Balance M{params.months}</div>
        </div>
        <div className="card-trading text-center py-2">
          <div className="text-xl font-bold font-mono text-blue-400">{last.accounts}</div>
          <div className="text-[10px] text-muted-foreground">Comptes actifs</div>
        </div>
        <div className="card-trading text-center py-2">
          <div className="text-xl font-bold font-mono text-yellow-400">{last.monthly.toLocaleString()}€</div>
          <div className="text-[10px] text-muted-foreground">Revenue/mois</div>
        </div>
        <div className="card-trading text-center py-2">
          <div className="text-xl font-bold font-mono text-primary">{((last.balance / params.startCapital - 1) * 100).toFixed(0)}%</div>
          <div className="text-[10px] text-muted-foreground">ROI total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Params */}
        <div className="card-trading space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Paramètres</div>
          {[
            { key: 'startCapital', label: 'Capital départ (€)', min: 500, max: 50000, step: 500 },
            { key: 'dailyTarget', label: 'Objectif / compte / jour (€)', min: 100, max: 2000, step: 50 },
            { key: 'reinvestPct', label: `Réinvestissement: ${params.reinvestPct}%`, min: 20, max: 100, step: 5 },
            { key: 'months', label: `Durée: ${params.months} mois`, min: 6, max: 36, step: 1 },
          ].map(f => (
            <div key={f.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">{f.label}</span>
                {f.key !== 'reinvestPct' && f.key !== 'months' && (
                  <span className="font-mono font-bold text-foreground">{params[f.key].toLocaleString()}€</span>
                )}
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step}
                value={params[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full accent-primary" />
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="lg:col-span-3 card-trading">
          <span className="text-xs font-semibold block mb-3">Projection Boule de Neige — {params.months} mois</span>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="sbGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => `M${v}`} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }}
                formatter={(v, n) => [n === 'balance' ? `${v.toLocaleString()}€` : v, n === 'balance' ? 'Balance' : 'Comptes']} />
              <ReferenceLine y={1000000} stroke="#F59E0B" strokeDasharray="4 2" strokeWidth={1} label={{ value: '1M€', fill: '#F59E0B', fontSize: 9 }} />
              <Area type="monotone" dataKey="balance" stroke="#00FF88" fill="url(#sbGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className="card-trading border border-blue-400/30 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className={`text-2xl font-bold font-mono ${aiAnalysis.score >= 70 ? 'text-primary' : 'text-yellow-400'}`}>{aiAnalysis.score}</div>
              <div className="text-[10px] text-muted-foreground">Score</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-blue-400">Analyse IA Plan Snowball</span>
                <span className={`text-xs font-bold capitalize ${feasColor[aiAnalysis.feasibility]}`}>{aiAnalysis.feasibility}</span>
              </div>
              <p className="text-xs text-muted-foreground">{aiAnalysis.recommendation}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiAnalysis(null)}>✕</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Risques identifiés</div>
              {aiAnalysis.key_risks?.map((r, i) => (
                <div key={i} className="flex gap-2 text-xs p-1.5 bg-destructive/5 border border-destructive/20 rounded mb-1">
                  <span className="text-destructive">⚠</span><span className="text-muted-foreground">{r}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5">Milestones clés</div>
              {aiAnalysis.milestones?.map((m, i) => (
                <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 border border-primary/20 rounded mb-1">
                  <span className="text-primary font-mono font-bold w-8">M{m.month}</span>
                  <span className="text-muted-foreground">{m.target}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Roadmap */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Roadmap vers 1M€</span>
        </div>
        <div className="space-y-2">
          {ROADMAP.map((step, i) => (
            <div key={step.step} className="flex items-center gap-3 text-xs">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${i < 3 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                {step.step}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${i < 3 ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</div>
              </div>
              {step.pnl > 0 && <span className="text-primary font-mono font-bold">+{step.pnl.toLocaleString()}€</span>}
              <span className="text-muted-foreground text-[10px]">{step.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}