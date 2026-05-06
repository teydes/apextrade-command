import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  PiggyBank, Zap, Plus, Trash2, CheckCircle2, AlertTriangle, TrendingUp,
  TrendingDown, ArrowUpRight, ArrowDownRight, Calculator, RefreshCw, Shield, DollarSign
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

const DEBT_TYPES = ['Personnel', 'Professionnel', 'PropFirm', 'Équipement', 'Autre'];
const PRIORITY_LABELS = { 1: 'Urgente', 2: 'Haute', 3: 'Normale', 4: 'Basse' };
const PRIORITY_COLORS = { 1: 'text-destructive border-destructive/30', 2: 'text-yellow-400 border-yellow-400/30', 3: 'text-blue-400 border-blue-400/30', 4: 'text-muted-foreground border-border' };

const DEFAULT_DEBTS = [
  { id: 1, name: 'Compte MFF 50K', amount: 480, remaining: 480, type: 'PropFirm', priority: 1, interestRate: 0, dueDate: '2026-06-01', note: 'Compte principal' },
  { id: 2, name: 'TradingView Pro+ mensuel', amount: 60, remaining: 60, type: 'Équipement', priority: 2, interestRate: 0, dueDate: 'Récurrent', note: '' },
  { id: 3, name: 'VPS Hébergement Bot', amount: 20, remaining: 20, type: 'Professionnel', priority: 3, interestRate: 0, dueDate: 'Récurrent', note: '' },
  { id: 4, name: 'Prêt personnel matériel', amount: 1500, remaining: 1200, type: 'Personnel', priority: 2, interestRate: 3.5, dueDate: '2027-01-01', note: 'PC trading' },
];

const DEFAULT_PAYOUTS = [
  { id: 1, date: '2026-05-01', source: 'MFF', gross: 2500, net: 2250, reinvested: 1350, debtsRepaid: 480, withdrawn: 420 },
];

// Règles de répartition intelligente du capital
function calculateAllocation(netPayout, totalDebts, monthlyExpenses, capitalBuffer, withdrawalPct) {
  const safeBuffer = capitalBuffer; // buffer entreprise minimal
  const available = netPayout;
  const debtRepayment = Math.min(totalDebts * 0.4, available * 0.3); // max 30% pour dettes
  const expenses = Math.min(monthlyExpenses, available * 0.25);
  const remaining = available - debtRepayment - expenses;
  const reinvest = remaining * (1 - withdrawalPct / 100);
  const personalWithdrawal = remaining * (withdrawalPct / 100);
  return {
    debtRepayment: Math.round(debtRepayment),
    monthlyExpenses: Math.round(expenses),
    reinvest: Math.round(reinvest),
    personalWithdrawal: Math.round(personalWithdrawal),
    buffer: safeBuffer,
  };
}

export default function FinancePersonnelle() {
  const [debts, setDebts] = useState(DEFAULT_DEBTS);
  const [payouts, setPayouts] = useState(DEFAULT_PAYOUTS);
  const [activeTab, setActiveTab] = useState('overview');
  const [newDebt, setNewDebt] = useState({ name: '', amount: '', type: 'Personnel', priority: 2, interestRate: 0, dueDate: '', note: '' });
  const [newPayout, setNewPayout] = useState({ source: 'MFF', gross: '', reinvested_pct: 60, debt_pct: 20 });
  const [withdrawalPct, setWithdrawalPct] = useState(25);
  const [monthlyExpenses, setMonthlyExpenses] = useState(285);
  const [capitalBuffer, setCapitalBuffer] = useState(2000);
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const { data: reports = [] } = useQuery({
    queryKey: ['reports-finance'],
    queryFn: () => base44.entities.DailyReport.list('-date', 30),
  });

  const totalDebts = debts.filter(d => d.remaining > 0).reduce((s, d) => s + d.remaining, 0);
  const totalPayoutsNet = payouts.reduce((s, p) => s + p.net, 0);
  const totalWithdrawn = payouts.reduce((s, p) => s + (p.withdrawn || 0), 0);
  const totalReinvested = payouts.reduce((s, p) => s + (p.reinvested || 0), 0);
  const totalDebtsRepaid = payouts.reduce((s, p) => s + (p.debtsRepaid || 0), 0);

  // Revenu mensuel estimé depuis les reports
  const monthlyPnl = reports.reduce((s, r) => s + (r.net_pnl || 0), 0);

  const lastPayoutNet = payouts.length > 0 ? payouts[payouts.length - 1].net : 0;
  const allocation = useMemo(() =>
    calculateAllocation(lastPayoutNet || 2250, totalDebts, monthlyExpenses, capitalBuffer, withdrawalPct),
    [lastPayoutNet, totalDebts, monthlyExpenses, capitalBuffer, withdrawalPct]
  );

  // Calcul retrait personnel sécurisé
  const safeWithdrawal = useMemo(() => {
    if (totalPayoutsNet <= 0) return 0;
    const afterDebts = totalPayoutsNet - totalDebtsRepaid;
    const afterExpenses = afterDebts - (monthlyExpenses * payouts.length);
    const afterBuffer = afterExpenses - capitalBuffer;
    return Math.max(0, Math.round(afterBuffer * (withdrawalPct / 100)));
  }, [totalPayoutsNet, totalDebtsRepaid, monthlyExpenses, capitalBuffer, withdrawalPct, payouts]);

  const addDebt = () => {
    if (!newDebt.name || !newDebt.amount) { toast.error('Nom et montant requis'); return; }
    setDebts(prev => [...prev, { ...newDebt, id: Date.now(), amount: parseFloat(newDebt.amount), remaining: parseFloat(newDebt.amount) }]);
    setNewDebt({ name: '', amount: '', type: 'Personnel', priority: 2, interestRate: 0, dueDate: '', note: '' });
    toast.success('Dette ajoutée');
  };

  const repayDebt = (id, amount) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, remaining: Math.max(0, d.remaining - amount) } : d));
    toast.success(`Remboursement de ${amount}€ enregistré`);
  };

  const addPayout = () => {
    if (!newPayout.gross) { toast.error('Montant requis'); return; }
    const gross = parseFloat(newPayout.gross);
    const net = Math.round(gross * 0.9);
    const reinvested = Math.round(net * (newPayout.reinvested_pct / 100));
    const debtsRepaid = Math.round(net * (newPayout.debt_pct / 100));
    const withdrawn = net - reinvested - debtsRepaid;
    setPayouts(prev => [...prev, { id: Date.now(), date: new Date().toISOString().slice(0, 10), source: newPayout.source, gross, net, reinvested, debtsRepaid, withdrawn: Math.max(0, withdrawn) }]);
    // Auto-rembourser les dettes prioritaires
    let remaining = debtsRepaid;
    setDebts(prev => prev.map(d => {
      if (remaining <= 0 || d.remaining <= 0) return d;
      const repay = Math.min(d.remaining, remaining);
      remaining -= repay;
      return { ...d, remaining: d.remaining - repay };
    }));
    setNewPayout({ source: 'MFF', gross: '', reinvested_pct: 60, debt_pct: 20 });
    toast.success('Payout enregistré et dettes mises à jour automatiquement');
  };

  const getAIAdvice = async () => {
    setLoadingAI(true);
    const sortedDebts = [...debts].sort((a, b) => a.priority - b.priority);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un conseiller financier expert pour traders indépendants. Analyse la situation financière et donne des recommandations concrètes.

SITUATION FINANCIÈRE:
- Total payouts reçus: ${totalPayoutsNet}€
- Total dettes restantes: ${totalDebts}€
- Charges fixes/mois: ${monthlyExpenses}€
- Buffer capital entreprise: ${capitalBuffer}€
- % de retrait personnel souhaité: ${withdrawalPct}%
- PnL trading ce mois: ${monthlyPnl}€

DETTES DÉTAIL:
${sortedDebts.map(d => `- ${d.name}: ${d.remaining}€ restant (priorité ${d.priority}, taux ${d.interestRate}%)`).join('\n')}

PAYOUTS HISTORIQUE:
${payouts.map(p => `${p.date}: net=${p.net}€ | réinvesti=${p.reinvested}€ | dettes=${p.debtsRepaid}€ | retiré=${p.withdrawn}€`).join('\n')}

Réponds UNIQUEMENT en JSON:
{
  "verdict": "<analyse globale 2 phrases>",
  "health_score": <0-100>,
  "safe_withdrawal_monthly": <montant retrait mensuel sécurisé>,
  "debt_priority_order": ["<dette 1>", "<dette 2>"],
  "recommendations": [
    {"title": "<titre>", "detail": "<action concrète>", "impact": "élevé|moyen|faible", "urgent": true|false}
  ],
  "allocation_optimal": {
    "reinvestissement_pct": <number>,
    "remboursement_dettes_pct": <number>,
    "retrait_personnel_pct": <number>,
    "reserve_pct": <number>
  },
  "risk_warning": "<risque principal à surveiller>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          verdict: { type: "string" },
          health_score: { type: "number" },
          safe_withdrawal_monthly: { type: "number" },
          debt_priority_order: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, impact: { type: "string" }, urgent: { type: "boolean" } } } },
          allocation_optimal: { type: "object", properties: { reinvestissement_pct: { type: "number" }, remboursement_dettes_pct: { type: "number" }, retrait_personnel_pct: { type: "number" }, reserve_pct: { type: "number" } } },
          risk_warning: { type: "string" }
        }
      }
    });
    setAiAdvice(res);
    setLoadingAI(false);
  };

  const ALLOC_COLORS = ['#00FF88', '#EF4444', '#F59E0B', '#0088FF'];
  const pieData = [
    { name: 'Réinvesti', value: allocation.reinvest },
    { name: 'Dettes', value: allocation.debtRepayment },
    { name: 'Charges', value: allocation.monthlyExpenses },
    { name: 'Retrait perso', value: allocation.personalWithdrawal },
  ];

  const healthScore = aiAdvice?.health_score ?? (totalDebts === 0 ? 90 : totalDebts < 500 ? 70 : 50);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-yellow-400" />
            Gestion Financière Personnelle
          </h1>
          <p className="text-xs text-muted-foreground">Dettes · Retraits intelligents · Allocation IA · Capital protégé</p>
        </div>
        <Button size="sm" onClick={getAIAdvice} disabled={loadingAI} className="gap-1 text-xs">
          <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
          {loadingAI ? 'Analyse...' : 'Conseil IA'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Payouts Total Net</div>
          <div className="text-xl font-bold font-mono text-primary">{totalPayoutsNet.toLocaleString()}€</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Dettes Restantes</div>
          <div className={`text-xl font-bold font-mono ${totalDebts > 0 ? 'text-destructive' : 'text-primary'}`}>{totalDebts.toLocaleString()}€</div>
        </div>
        <div className={`card-trading text-center border ${safeWithdrawal > 0 ? 'border-primary/30' : 'border-yellow-400/30'}`}>
          <div className="text-[10px] text-muted-foreground mb-1">Retrait Perso Sécurisé</div>
          <div className={`text-xl font-bold font-mono ${safeWithdrawal > 0 ? 'text-primary' : 'text-yellow-400'}`}>{safeWithdrawal.toLocaleString()}€</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Santé Financière</div>
          <div className={`text-xl font-bold font-mono ${healthScore >= 70 ? 'text-primary' : healthScore >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{healthScore}/100</div>
        </div>
      </div>

      {/* AI Advice Banner */}
      {aiAdvice && (
        <div className="card-trading border border-yellow-400/30 bg-yellow-400/5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-center flex-shrink-0">
              <div className={`text-2xl font-bold font-mono ${aiAdvice.health_score >= 70 ? 'text-primary' : aiAdvice.health_score >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{aiAdvice.health_score}</div>
              <div className="text-[10px] text-muted-foreground">Score</div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-yellow-400 mb-1">🧠 Conseil IA Financier</div>
              <p className="text-xs text-muted-foreground">{aiAdvice.verdict}</p>
              {aiAdvice.risk_warning && (
                <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />{aiAdvice.risk_warning}
                </div>
              )}
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-lg font-bold font-mono text-primary">{aiAdvice.safe_withdrawal_monthly?.toLocaleString()}€</div>
              <div className="text-[10px] text-muted-foreground">Retrait/mois OK</div>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs flex-shrink-0" onClick={() => setAiAdvice(null)}>✕</Button>
          </div>
          {aiAdvice.recommendations?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {aiAdvice.recommendations.map((r, i) => (
                <div key={i} className={`p-2 rounded border text-xs ${r.urgent ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-secondary/30'}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {r.urgent && <AlertTriangle className="w-3 h-3 text-destructive" />}
                    <span className="font-semibold">{r.title}</span>
                    <span className={`ml-auto text-[10px] px-1 py-0.5 rounded ${r.impact === 'élevé' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>{r.impact}</span>
                  </div>
                  <p className="text-muted-foreground">{r.detail}</p>
                </div>
              ))}
            </div>
          )}
          {aiAdvice.allocation_optimal && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(aiAdvice.allocation_optimal).map(([k, v]) => (
                <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {k.replace(/_/g, ' ')}: <strong>{v}%</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border flex-wrap">
        {[
          { id: 'overview', label: '📊 Vue d\'ensemble' },
          { id: 'debts', label: '💳 Dettes' },
          { id: 'withdrawal', label: '💰 Simulateur Retrait' },
          { id: 'payouts', label: '🎯 Payouts & Répartition' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Allocation Recommandée du Prochain Payout</div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="45%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={ALLOC_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}€`, '']} contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ALLOC_COLORS[i] }} />
                    <span className="text-muted-foreground flex-1">{d.name}</span>
                    <span className="font-mono font-bold">{d.value.toLocaleString()}€</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card-trading space-y-3">
            <div className="text-sm font-semibold">Progression Remboursement Dettes</div>
            {debts.sort((a, b) => a.priority - b.priority).map(d => {
              const pct = d.amount > 0 ? Math.round(((d.amount - d.remaining) / d.amount) * 100) : 100;
              return (
                <div key={d.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${d.remaining === 0 ? 'text-primary line-through' : 'text-foreground'}`}>{d.name}</span>
                    <span className={`font-mono font-bold ${d.remaining === 0 ? 'text-primary' : 'text-destructive'}`}>{d.remaining.toLocaleString()}€</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#00FF88' : '#F59E0B' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historique graphique */}
          {payouts.length > 1 && (
            <div className="card-trading lg:col-span-2">
              <div className="text-sm font-semibold mb-3">Historique des Payouts</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={payouts}>
                  <XAxis dataKey="source" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 10, borderRadius: 6 }} formatter={v => [`${v}€`, '']} />
                  <Bar dataKey="reinvested" name="Réinvesti" fill="#00FF88" stackId="a" />
                  <Bar dataKey="debtsRepaid" name="Dettes" fill="#EF4444" stackId="a" />
                  <Bar dataKey="withdrawn" name="Retiré" fill="#F59E0B" stackId="a" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* TAB: Dettes */}
      {activeTab === 'debts' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card-trading">
              <div className="text-sm font-semibold mb-3">Dettes par priorité de remboursement</div>
              <div className="space-y-3">
                {debts.sort((a, b) => a.priority - b.priority).map(d => (
                  <div key={d.id} className={`p-3 rounded border text-xs ${d.remaining === 0 ? 'opacity-50 border-border' : PRIORITY_COLORS[d.priority]}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {d.remaining === 0 && <CheckCircle2 className="w-3 h-3 text-primary" />}
                          <span className={`font-semibold ${d.remaining === 0 ? 'line-through text-muted-foreground' : ''}`}>{d.name}</span>
                          <span className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">{d.type}</span>
                        </div>
                        <div className="text-muted-foreground">{PRIORITY_LABELS[d.priority]} · {d.dueDate}</div>
                        {d.interestRate > 0 && <div className="text-orange-400">Taux: {d.interestRate}%</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-mono font-bold text-sm ${d.remaining === 0 ? 'text-primary' : 'text-destructive'}`}>{d.remaining.toLocaleString()}€</div>
                        <div className="text-muted-foreground text-[10px]">/ {d.amount.toLocaleString()}€</div>
                      </div>
                    </div>
                    <div className="progress-bar mb-2">
                      <div className="progress-bar-fill" style={{ width: `${Math.round(((d.amount - d.remaining) / d.amount) * 100)}%`, background: d.remaining === 0 ? '#00FF88' : '#F59E0B' }} />
                    </div>
                    {d.remaining > 0 && (
                      <div className="flex gap-2">
                        {[50, 100, d.remaining].filter((v, i, a) => a.indexOf(v) === i && v <= d.remaining).map(amt => (
                          <button key={amt} onClick={() => repayDebt(d.id, amt)}
                            className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                            Rembourser {amt}€
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card-trading">
              <div className="text-sm font-semibold mb-3">Ajouter une Dette</div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nom</Label>
                  <Input value={newDebt.name} onChange={e => setNewDebt(p => ({...p, name: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Ex: Prêt voiture" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Montant (€)</Label>
                    <Input type="number" value={newDebt.amount} onChange={e => setNewDebt(p => ({...p, amount: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Taux d'intérêt (%)</Label>
                    <Input type="number" step="0.1" value={newDebt.interestRate} onChange={e => setNewDebt(p => ({...p, interestRate: parseFloat(e.target.value)}))} className="bg-secondary border-border h-8 text-xs mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={newDebt.type} onValueChange={v => setNewDebt(p => ({...p, type: v}))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{DEBT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Priorité</Label>
                    <Select value={String(newDebt.priority)} onValueChange={v => setNewDebt(p => ({...p, priority: parseInt(v)}))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{[1,2,3,4].map(p => <SelectItem key={p} value={String(p)}>{PRIORITY_LABELS[p]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Échéance</Label>
                  <Input type="date" value={newDebt.dueDate} onChange={e => setNewDebt(p => ({...p, dueDate: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" />
                </div>
                <Button onClick={addDebt} className="w-full gap-1 text-xs h-8"><Plus className="w-3 h-3" />Ajouter la dette</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Simulateur Retrait */}
      {activeTab === 'withdrawal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Simulateur de Retrait Personnel Sécurisé</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <Label className="text-xs text-muted-foreground">% Retrait personnel sur bénéfices</Label>
                <span className="font-mono font-bold text-primary">{withdrawalPct}%</span>
              </div>
              <Slider value={[withdrawalPct]} onValueChange={([v]) => setWithdrawalPct(v)} min={5} max={50} step={5} className="accent-primary" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Charges fixes mensuelles (€)</Label>
              <Input type="number" value={monthlyExpenses} onChange={e => setMonthlyExpenses(parseInt(e.target.value) || 0)} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Buffer capital entreprise minimal (€)</Label>
              <Input type="number" value={capitalBuffer} onChange={e => setCapitalBuffer(parseInt(e.target.value) || 0)} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
            </div>

            <div className="border-t border-border pt-3 space-y-2 text-xs">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Résultat (sur prochain payout estimé)</div>
              {[
                { label: 'Charges fixes', value: `-${allocation.monthlyExpenses}€`, color: 'text-muted-foreground' },
                { label: 'Remboursement dettes', value: `-${allocation.debtRepayment}€`, color: 'text-destructive' },
                { label: 'Réinvestissement', value: `+${allocation.reinvest}€`, color: 'text-blue-400' },
                { label: '💰 Retrait personnel', value: `+${allocation.personalWithdrawal}€`, color: 'text-primary', bold: true },
              ].map(r => (
                <div key={r.label} className={`flex justify-between ${r.bold ? 'font-bold text-sm border-t border-border pt-2' : ''}`}>
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className={`font-mono ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>

            <div className={`p-3 rounded border text-xs ${allocation.personalWithdrawal > 0 ? 'border-primary/30 bg-primary/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${allocation.personalWithdrawal > 0 ? 'text-primary' : 'text-yellow-400'}`} />
                <div>
                  <div className="font-semibold">{allocation.personalWithdrawal > 0 ? '✅ Retrait sécurisé possible' : '⚠️ Capital insuffisant pour retrait'}</div>
                  <div className="text-muted-foreground mt-0.5">
                    {allocation.personalWithdrawal > 0
                      ? `Vous pouvez retirer ${allocation.personalWithdrawal}€ sans mettre en danger votre capital entreprise (buffer: ${capitalBuffer}€)`
                      : `Remboursez d'abord les dettes prioritaires avant tout retrait personnel`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Règles de Protection du Capital</div>
            <div className="space-y-3 text-xs">
              {[
                { rule: 'Ne jamais retirer si dettes urgentes > 0', ok: debts.filter(d => d.priority === 1 && d.remaining > 0).length === 0, color: 'destructive' },
                { rule: `Buffer minimum ${capitalBuffer}€ toujours présent`, ok: totalPayoutsNet - totalDebts >= capitalBuffer, color: 'primary' },
                { rule: `Charges fixes (${monthlyExpenses}€/mois) couvertes sur 3 mois`, ok: totalPayoutsNet >= monthlyExpenses * 3, color: 'primary' },
                { rule: 'Retrait max 50% du bénéfice net du mois', ok: allocation.personalWithdrawal <= (lastPayoutNet || 2250) * 0.5, color: 'yellow-400' },
                { rule: 'Min 50% réinvesti en PropFirms', ok: allocation.reinvest >= (lastPayoutNet || 2250) * 0.5, color: 'blue-400' },
              ].map((r, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded ${r.ok ? 'bg-primary/5 border border-primary/20' : 'bg-destructive/5 border border-destructive/20'}`}>
                  {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />}
                  <span className={r.ok ? 'text-foreground' : 'text-muted-foreground'}>{r.rule}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-3">
          <div className="card-trading border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Enregistrer un Payout & Répartir automatiquement</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
              <div>
                <Label className="text-xs">PropFirm</Label>
                <Input value={newPayout.source} onChange={e => setNewPayout(p => ({...p, source: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="MFF" />
              </div>
              <div>
                <Label className="text-xs">Montant brut (€)</Label>
                <Input type="number" value={newPayout.gross} onChange={e => setNewPayout(p => ({...p, gross: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
              </div>
              <div>
                <Label className="text-xs">% Réinvesti: {newPayout.reinvested_pct}%</Label>
                <input type="range" min={0} max={90} step={5} value={newPayout.reinvested_pct} onChange={e => setNewPayout(p => ({...p, reinvested_pct: parseInt(e.target.value)}))} className="w-full accent-primary mt-2" />
              </div>
              <div>
                <Label className="text-xs">% Dettes: {newPayout.debt_pct}%</Label>
                <input type="range" min={0} max={50} step={5} value={newPayout.debt_pct} onChange={e => setNewPayout(p => ({...p, debt_pct: parseInt(e.target.value)}))} className="w-full accent-primary mt-2" />
              </div>
            </div>
            {newPayout.gross && (
              <div className="flex gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                <span>Net (90%): <strong className="text-foreground">{Math.round(parseFloat(newPayout.gross) * 0.9)}€</strong></span>
                <span>Réinvesti: <strong className="text-blue-400">{Math.round(parseFloat(newPayout.gross) * 0.9 * newPayout.reinvested_pct / 100)}€</strong></span>
                <span>Dettes: <strong className="text-destructive">{Math.round(parseFloat(newPayout.gross) * 0.9 * newPayout.debt_pct / 100)}€</strong></span>
                <span>Retrait: <strong className="text-primary">{Math.max(0, Math.round(parseFloat(newPayout.gross) * 0.9 * (1 - newPayout.reinvested_pct / 100 - newPayout.debt_pct / 100)))}€</strong></span>
              </div>
            )}
            <Button onClick={addPayout} className="gap-1 text-xs h-8" disabled={!newPayout.gross}>
              <ArrowUpRight className="w-3 h-3" />Enregistrer & Répartir automatiquement
            </Button>
          </div>

          {payouts.map((p, i) => (
            <div key={p.id || i} className="card-trading text-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{p.source}</span>
                  <span className="text-muted-foreground">{p.date}</span>
                </div>
                <span className="font-mono font-bold text-primary">{p.net.toLocaleString()}€ net</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Brut', val: `${p.gross}€`, color: 'text-foreground' },
                  { label: 'Réinvesti', val: `${p.reinvested}€`, color: 'text-blue-400' },
                  { label: 'Dettes', val: `${p.debtsRepaid || 0}€`, color: 'text-destructive' },
                  { label: 'Retiré', val: `${p.withdrawn || 0}€`, color: 'text-primary' },
                ].map(s => (
                  <div key={s.label} className="p-2 rounded bg-secondary/40 text-center">
                    <div className="text-muted-foreground text-[10px]">{s.label}</div>
                    <div className={`font-mono font-bold ${s.color}`}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}