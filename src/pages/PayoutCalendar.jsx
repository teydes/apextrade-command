import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays, DollarSign, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Download, RefreshCw, Zap, Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const PROPFIRMS_PAYOUT = [
  { id: 'mff', name: 'MyFundedFutures', split: 0.80, minPayout: 500, freq: 'biweekly', freqDays: 14, minDays: 5 },
  { id: 'tradefy', name: 'Tradefy', split: 0.85, minPayout: 100, freq: 'weekly', freqDays: 7, minDays: 3 },
  { id: 'lucid', name: 'Lucid Trading', split: 0.80, minPayout: 200, freq: 'monthly', freqDays: 30, minDays: 10 },
  { id: 'ufunded', name: 'UFunded', split: 0.75, minPayout: 500, freq: 'monthly', freqDays: 30, minDays: 15 },
  { id: 'topstep', name: 'TopStep', split: 0.90, minPayout: 100, freq: 'weekly', freqDays: 7, minDays: 1 },
];

function generatePayoutSchedule(accountSize, currentBalance, pfId, startDate) {
  const pf = PROPFIRMS_PAYOUT.find(p => p.id === pfId) || PROPFIRMS_PAYOUT[0];
  const profit = currentBalance - accountSize;
  const eligible = profit >= pf.minPayout;
  const dates = [];
  let d = new Date(startDate);
  d.setDate(d.getDate() + pf.freqDays);
  for (let i = 0; i < 12; i++) {
    const projectedProfit = profit * (1 + Math.random() * 0.1 * (i + 1));
    const payoutAmt = projectedProfit > 0 ? projectedProfit * pf.split : 0;
    dates.push({
      date: d.toISOString().slice(0, 10),
      projected: Math.round(payoutAmt),
      eligible: i === 0 ? eligible : projectedProfit >= pf.minPayout,
      pfName: pf.name,
      cumulative: 0,
    });
    d = new Date(d); d.setDate(d.getDate() + pf.freqDays);
  }
  let cum = 0;
  dates.forEach(d => { if (d.eligible) { cum += d.projected; } d.cumulative = cum; });
  return { dates, pf, eligible, nextPayout: eligible ? Math.round(profit * pf.split) : 0, profit };
}

export default function PayoutCalendar() {
  const [selectedPF, setSelectedPF] = useState('mff');
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [activeView, setActiveView] = useState('calendar');

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-payout-cal'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades-payout-cal'],
    queryFn: () => base44.entities.Trade.filter({ status: 'closed' }, '-created_date', 100),
  });

  const propfirmAccounts = accounts.filter(a => a.account_type === 'propfirm' || !a.account_type);

  const schedules = useMemo(() => {
    return propfirmAccounts.map(acc => {
      const pfId = PROPFIRMS_PAYOUT.find(p => acc.propfirm?.toLowerCase().includes(p.id))?.id || selectedPF;
      return generatePayoutSchedule(acc.account_size || 50000, acc.current_balance || acc.account_size || 50000, pfId, new Date().toISOString().slice(0, 10));
    });
  }, [propfirmAccounts, selectedPF]);

  const totalNextPayout = schedules.reduce((s, sc) => s + sc.nextPayout, 0);
  const totalEligible = schedules.filter(sc => sc.eligible).length;
  const totalProfit = schedules.reduce((s, sc) => s + sc.profit, 0);

  // Calendrier consolidé sur 90 jours
  const consolidated = useMemo(() => {
    const map = {};
    schedules.forEach(sc => {
      sc.dates.slice(0, 6).forEach(d => {
        if (!map[d.date]) map[d.date] = { date: d.date, amount: 0, count: 0 };
        if (d.eligible) { map[d.date].amount += d.projected; map[d.date].count++; }
      });
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [schedules]);

  const cumulativeChart = consolidated.reduce((acc, d) => {
    const last = acc.length ? acc[acc.length - 1].cumul : 0;
    acc.push({ date: d.date.slice(5), cumul: last + d.amount, amount: d.amount });
    return acc;
  }, []);

  // Auto-analyse IA au montage
  useEffect(() => {
    const t = setTimeout(() => runAI(true), 4000);
    return () => clearTimeout(t);
  }, [propfirmAccounts]);

  const runAI = async (silent = false) => {
    if (propfirmAccounts.length === 0 && !silent) { toast.error('Aucun compte PropFirm'); return; }
    setLoadingAI(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Expert PropFirm payouts. Analyse le calendrier de paiements et optimise la stratégie.

Comptes: ${propfirmAccounts.length} | Profit total: ${totalProfit.toLocaleString()}€
Prochain payout estimé: ${totalNextPayout.toLocaleString()}€ | Comptes éligibles: ${totalEligible}/${propfirmAccounts.length}
Schedule: ${JSON.stringify(consolidated.slice(0, 6).map(d => ({ date: d.date, amount: d.amount })))}

Retourne UNIQUEMENT JSON:
{
  "strategie_optimale": "<stratégie payout 2 phrases>",
  "prochain_montant_cible": <€>,
  "optimisations": ["<opt 1>", "<opt 2>"],
  "risques_payout": ["<risque>"],
  "reinvestissement_conseil": "<conseil réinvestissement>",
  "objectif_3_mois": <€>,
  "objectif_6_mois": <€>,
  "meilleure_propfirm_payout": "<nom>",
  "actions_immediates": ["<action>"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            strategie_optimale: { type: "string" }, prochain_montant_cible: { type: "number" },
            optimisations: { type: "array", items: { type: "string" } },
            risques_payout: { type: "array", items: { type: "string" } },
            reinvestissement_conseil: { type: "string" }, objectif_3_mois: { type: "number" },
            objectif_6_mois: { type: "number" }, meilleure_propfirm_payout: { type: "string" },
            actions_immediates: { type: "array", items: { type: "string" } }
          }
        }
      });
      setAiInsights(res);
    } catch(e) {}
    setLoadingAI(false);
  };

  const exportCSV = () => {
    const rows = [['Date', 'Montant', 'Comptes', 'Cumulatif'], ...consolidated.map(d => [d.date, d.amount, d.count, ''])];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'calendrier_payouts.csv'; a.click();
    toast.success('Calendrier exporté');
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-green-400" />
            Calendrier Payouts
          </h1>
          <p className="text-xs text-muted-foreground">Planning paiements PropFirm · Projections revenus · Optimisation IA automatique</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />Export
          </Button>
          {loadingAI && <div className="flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="w-3 h-3 animate-spin" />IA...</div>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Prochain Payout', value: `${totalNextPayout.toLocaleString()}€`, icon: DollarSign, color: 'text-primary' },
          { label: 'Comptes Éligibles', value: `${totalEligible}/${propfirmAccounts.length}`, icon: CheckCircle2, color: totalEligible > 0 ? 'text-primary' : 'text-muted-foreground' },
          { label: 'Profit Cumulé', value: `${totalProfit > 0 ? '+' : ''}${totalProfit.toLocaleString()}€`, icon: TrendingUp, color: totalProfit > 0 ? 'text-primary' : 'text-muted-foreground' },
          { label: 'Projection 3 mois', value: aiInsights ? `${aiInsights.objectif_3_mois?.toLocaleString()}€` : '—', icon: Target, color: 'text-yellow-400' },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card-trading text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${k.color} opacity-70`} />
              <div className={`text-lg font-bold font-mono ${k.color}`}>{k.value}</div>
              <div className="text-[10px] text-muted-foreground">{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* IA Insights auto */}
      {aiInsights && (
        <div className="card-trading border border-green-400/20 bg-green-400/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Stratégie Payout IA</span>
              {aiInsights.meilleure_propfirm_payout && <span className="text-xs text-muted-foreground">· Meilleure: <strong className="text-primary">{aiInsights.meilleure_propfirm_payout}</strong></span>}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAiInsights(null)} className="h-6 text-xs">✕</Button>
          </div>
          <p className="text-xs text-muted-foreground">{aiInsights.strategie_optimale}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-primary/5 border border-primary/20">
              <div className="text-[10px] text-muted-foreground">Objectif 3 mois</div>
              <div className="font-bold text-primary">{aiInsights.objectif_3_mois?.toLocaleString()}€</div>
            </div>
            <div className="p-2 rounded bg-primary/5 border border-primary/20">
              <div className="text-[10px] text-muted-foreground">Objectif 6 mois</div>
              <div className="font-bold text-primary">{aiInsights.objectif_6_mois?.toLocaleString()}€</div>
            </div>
          </div>
          {aiInsights.reinvestissement_conseil && (
            <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs">
              <span className="text-blue-400 font-semibold">Réinvestissement: </span>
              <span className="text-muted-foreground">{aiInsights.reinvestissement_conseil}</span>
            </div>
          )}
          {aiInsights.actions_immediates?.map((a, i) => (
            <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 border border-primary/20 rounded">
              <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'calendar', label: 'Calendrier' },
          { id: 'projection', label: 'Projections' },
          { id: 'accounts', label: 'Par Compte' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveView(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeView === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeView === 'calendar' && (
        <div className="space-y-2">
          {consolidated.length === 0 && (
            <div className="card-trading text-center py-8 text-xs text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Créez des comptes PropFirm pour voir le calendrier de payouts
            </div>
          )}
          {consolidated.map((entry, i) => {
            const isPast = entry.date < today;
            const isToday = entry.date === today;
            const daysUntil = Math.ceil((new Date(entry.date) - new Date()) / (1000 * 60 * 60 * 24));
            return (
              <div key={entry.date} className={`flex items-center gap-3 p-3 rounded border text-xs transition-all ${
                isToday ? 'border-primary/50 bg-primary/5' :
                isPast ? 'border-border opacity-50' :
                entry.amount > 0 ? 'border-green-400/20 bg-green-400/5' :
                'border-border'}`}>
                <div className="text-center flex-shrink-0 w-10">
                  <div className="text-sm font-bold font-mono">{entry.date.slice(8)}</div>
                  <div className="text-[9px] text-muted-foreground">{new Date(entry.date).toLocaleString('fr-FR', { month: 'short' })}</div>
                </div>
                <div className="flex-1">
                  {entry.amount > 0 ? (
                    <>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        <span className="font-semibold text-green-400">+{entry.amount.toLocaleString()}€</span>
                        <span className="text-muted-foreground">({entry.count} compte{entry.count > 1 ? 's' : ''})</span>
                      </div>
                      {!isPast && <div className="text-[10px] text-muted-foreground mt-0.5">Dans {daysUntil} jours</div>}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Aucun payout prévu</span>
                  )}
                </div>
                {!isPast && entry.amount > 0 && (
                  <div className="text-[10px] font-mono text-muted-foreground">
                    Cum: +{entry.amount}€
                  </div>
                )}
                {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">AUJOURD'HUI</span>}
              </div>
            );
          })}
        </div>
      )}

      {activeView === 'projection' && (
        <div className="card-trading">
          <div className="text-sm font-semibold mb-3">Courbe Revenus Cumulés (90 jours)</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulativeChart}>
              <defs>
                <linearGradient id="payGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v.toLocaleString()}€`, '']} />
              <Area type="monotone" dataKey="cumul" stroke="#00FF88" fill="url(#payGrad)" strokeWidth={2} name="Cumulé" />
              <Bar dataKey="amount" fill="#00FF8840" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeView === 'accounts' && (
        <div className="space-y-3">
          {propfirmAccounts.length === 0 ? (
            <div className="card-trading text-center py-8 text-xs text-muted-foreground">
              Aucun compte PropFirm — Créez des comptes dans la section Comptes
            </div>
          ) : propfirmAccounts.map((acc, i) => {
            const sc = schedules[i];
            if (!sc) return null;
            return (
              <div key={acc.id} className="card-trading border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-sm">{acc.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{acc.propfirm || 'PropFirm'} · {sc.pf.name}</span>
                  </div>
                  <div className={`text-sm font-bold font-mono ${sc.eligible ? 'text-primary' : 'text-muted-foreground'}`}>
                    {sc.eligible ? `+${sc.nextPayout.toLocaleString()}€` : 'Non éligible'}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { l: 'Profit', v: `${sc.profit > 0 ? '+' : ''}${sc.profit.toLocaleString()}€`, c: sc.profit > 0 ? 'text-primary' : 'text-muted-foreground' },
                    { l: 'Split', v: `${sc.pf.split * 100}%`, c: '' },
                    { l: 'Fréquence', v: sc.pf.freq, c: '' },
                  ].map(r => (
                    <div key={r.l} className="p-1.5 rounded bg-secondary/30 text-center">
                      <div className="text-[9px] text-muted-foreground">{r.l}</div>
                      <div className={`font-mono font-bold ${r.c || 'text-foreground'}`}>{r.v}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-1">
                  {sc.dates.slice(0, 3).map(d => (
                    <div key={d.date} className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{d.date}</span>
                      <span className={d.eligible ? 'text-primary font-mono' : 'text-muted-foreground'}>{d.eligible ? `+${d.projected.toLocaleString()}€` : 'En attente'}</span>
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