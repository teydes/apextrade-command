import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap, Target, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

// Données mock de capital
const MOCK_ACCOUNTS = [
  {
    id: 'mff-1', name: 'MFF 50K #1', propfirm: 'MyFundedFutures', phase: 'live',
    account_size: 50000, current_balance: 52340, daily_drawdown_limit: 1000, max_drawdown_limit: 3000,
    daily_profit_target: 500, overall_profit_target: 5000, status: 'active',
    history: [50000, 50420, 50180, 51200, 51800, 52100, 51900, 52340],
  },
  {
    id: 'mff-2', name: 'MFF 50K #2', propfirm: 'MyFundedFutures', phase: 'demo',
    account_size: 50000, current_balance: 49100, daily_drawdown_limit: 1000, max_drawdown_limit: 3000,
    daily_profit_target: 500, overall_profit_target: 5000, status: 'active',
    history: [50000, 50300, 49800, 50100, 49500, 49200, 49400, 49100],
  },
  {
    id: 'ftuk-1', name: 'FTUK 100K', propfirm: 'FTUK', phase: 'backtest_local',
    account_size: 100000, current_balance: 100000, daily_drawdown_limit: 2000, max_drawdown_limit: 6000,
    daily_profit_target: 1000, overall_profit_target: 10000, status: 'active',
    history: [100000, 100000, 100000, 100000, 100000, 100000, 100000, 100000],
  },
];

const PHASE_COLORS = {
  backtest_local: 'text-muted-foreground border-muted',
  demo: 'text-blue-400 border-blue-400/40',
  live: 'text-primary border-primary/40',
};

const PHASE_LABELS = { backtest_local: 'Backtest', demo: 'Demo', live: 'LIVE' };

function AccountCard({ acc, onSelect, selected }) {
  const pnl = acc.current_balance - acc.account_size;
  const pnlPct = ((pnl / acc.account_size) * 100).toFixed(2);
  const ddUsed = ((acc.account_size - acc.current_balance) / acc.max_drawdown_limit * 100).toFixed(0);
  const progressToTarget = Math.min((pnl / acc.overall_profit_target) * 100, 100).toFixed(0);

  return (
    <button onClick={() => onSelect(acc)}
      className={`card-trading text-left w-full transition-all border-2 ${selected ? PHASE_COLORS[acc.phase].split(' ')[1] : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-bold">{acc.name}</div>
          <div className="text-[10px] text-muted-foreground">{acc.propfirm}</div>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${PHASE_COLORS[acc.phase]}`}>
          {PHASE_LABELS[acc.phase]}
        </span>
      </div>
      <div className={`text-2xl font-bold font-mono ${pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
        {pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}€
        <span className="text-xs ml-1 opacity-60">({pnl >= 0 ? '+' : ''}{pnlPct}%)</span>
      </div>
      <div className="text-[10px] text-muted-foreground mb-2">{acc.current_balance.toLocaleString()}€ / {acc.account_size.toLocaleString()}€</div>

      {/* Progress vers objectif */}
      <div className="mb-1">
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-muted-foreground">Objectif {acc.overall_profit_target.toLocaleString()}€</span>
          <span className="text-primary font-mono">{progressToTarget}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill bg-primary" style={{ width: `${progressToTarget}%` }} />
        </div>
      </div>

      {/* DD utilisé */}
      {pnl < 0 && (
        <div>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-muted-foreground">Drawdown utilisé</span>
            <span className={`font-mono ${parseInt(ddUsed) > 70 ? 'text-destructive' : 'text-yellow-400'}`}>{ddUsed}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${ddUsed}%`, background: parseInt(ddUsed) > 70 ? '#EF4444' : '#F59E0B' }} />
          </div>
        </div>
      )}
    </button>
  );
}

export default function PropCapital() {
  const [accounts] = useState(MOCK_ACCOUNTS);
  const [selected, setSelected] = useState(MOCK_ACCOUNTS[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [newAcc, setNewAcc] = useState({ name: '', propfirm: 'MyFundedFutures', account_size: 50000, phase: 'demo', daily_drawdown_limit: 1000, max_drawdown_limit: 3000, daily_profit_target: 500, overall_profit_target: 5000 });

  const totalCapital = accounts.reduce((s, a) => s + a.account_size, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);
  const totalPnL = totalBalance - totalCapital;
  const liveAccounts = accounts.filter(a => a.phase === 'live').length;

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert gestion de capital prop trading. Analyse ce portefeuille de comptes et donne des recommandations stratégiques.

Portefeuille:
${accounts.map(a => {
  const pnl = a.current_balance - a.account_size;
  const pct = ((pnl / a.account_size) * 100).toFixed(2);
  return `- ${a.name} (${a.propfirm}, ${PHASE_LABELS[a.phase]}): ${a.account_size.toLocaleString()}€ → ${a.current_balance.toLocaleString()}€ (${pnl >= 0 ? '+' : ''}${pct}%)`;
}).join('\n')}

Capital total: ${totalCapital.toLocaleString()}€ | Balance: ${totalBalance.toLocaleString()}€ | PnL: ${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}€

Retourne UNIQUEMENT JSON sans markdown:
{
  "portfolio_health": "excellent"|"bon"|"attention"|"critique",
  "health_score": <0-100>,
  "summary": "<analyse 2 phrases>",
  "recommendations": [{"type":"Allocation"|"Risque"|"Scaling"|"PropFirm","action":"<action concrète>","urgency":"immédiat"|"court terme"|"moyen terme"}],
  "next_scaling_trigger": "<quand passer au compte suivant>",
  "risk_alert": "<alerte ou null>"
}`,
      response_json_schema: {
        type: "object", properties: {
          portfolio_health: { type: "string" }, health_score: { type: "number" },
          summary: { type: "string" },
          recommendations: { type: "array", items: { type: "object", properties: { type: { type: "string" }, action: { type: "string" }, urgency: { type: "string" } } } },
          next_scaling_trigger: { type: "string" }, risk_alert: { type: "string" }
        }
      }
    });
    setAiAnalysis(res);
    setLoadingAI(false);
  };

  const healthColor = { excellent: 'text-primary', bon: 'text-primary', attention: 'text-yellow-400', critique: 'text-destructive' };
  const urgencyColor = { 'immédiat': 'bg-destructive/20 text-destructive', 'court terme': 'bg-yellow-400/20 text-yellow-400', 'moyen terme': 'bg-primary/20 text-primary' };

  // Courbe equity du compte sélectionné
  const equityCurve = (selected?.history || []).map((v, i) => ({ t: i, eq: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Landmark className="w-5 h-5 text-yellow-400" />
            Suivi Capital PropFirm
          </h1>
          <p className="text-xs text-muted-foreground">Portefeuille multi-comptes · Drawdown live · Scaling IA</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs">
            <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Analyse IA'}
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="w-3 h-3" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Ajouter un Compte PropFirm</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { key: 'name', label: 'Nom du compte' },
                  { key: 'propfirm', label: 'PropFirm' },
                  { key: 'account_size', label: 'Taille (€)', type: 'number' },
                  { key: 'daily_drawdown_limit', label: 'DD journalier (€)', type: 'number' },
                  { key: 'max_drawdown_limit', label: 'DD max (€)', type: 'number' },
                  { key: 'overall_profit_target', label: 'Objectif profit (€)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type={f.type || 'text'} value={newAcc[f.key]} onChange={e => setNewAcc(p => ({...p, [f.key]: f.type === 'number' ? parseFloat(e.target.value) : e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" />
                  </div>
                ))}
                <div className="col-span-2">
                  <Label className="text-xs">Phase</Label>
                  <Select value={newAcc.phase} onValueChange={v => setNewAcc(p => ({...p, phase: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="backtest_local">Backtest</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full mt-2" onClick={() => { toast.success('Compte ajouté'); setShowAdd(false); }}>Enregistrer</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Capital Total', value: `${totalCapital.toLocaleString()}€` },
          { label: 'Balance Totale', value: `${totalBalance.toLocaleString()}€` },
          { label: 'PnL Global', value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}€`, color: totalPnL >= 0 ? 'text-primary' : 'text-destructive' },
          { label: 'Comptes Live', value: `${liveAccounts} / ${accounts.length}`, color: 'text-primary' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center py-2">
            <div className={`text-xl font-bold font-mono ${k.color || 'text-foreground'}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* AI Analysis */}
      {aiAnalysis && (
        <div className={`card-trading border ${aiAnalysis.portfolio_health === 'critique' ? 'border-destructive/40' : aiAnalysis.portfolio_health === 'attention' ? 'border-yellow-400/40' : 'border-primary/40'} space-y-3`}>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold font-mono ${healthColor[aiAnalysis.portfolio_health]}`}>{aiAnalysis.health_score}</div>
              <div className={`text-[10px] font-bold uppercase ${healthColor[aiAnalysis.portfolio_health]}`}>{aiAnalysis.portfolio_health}</div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-yellow-400 mb-1">Analyse Portefeuille IA</div>
              <p className="text-xs text-muted-foreground">{aiAnalysis.summary}</p>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiAnalysis(null)}>✕</Button>
          </div>
          {aiAnalysis.risk_alert && (
            <div className="flex gap-2 text-xs p-2 bg-destructive/10 border border-destructive/30 rounded">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
              <span>{aiAnalysis.risk_alert}</span>
            </div>
          )}
          {aiAnalysis.next_scaling_trigger && (
            <div className="flex gap-2 text-xs p-2 bg-primary/5 border border-primary/20 rounded">
              <Target className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span><span className="font-semibold text-primary">Scaling: </span>{aiAnalysis.next_scaling_trigger}</span>
            </div>
          )}
          <div className="space-y-1.5">
            {aiAnalysis.recommendations?.map((r, i) => (
              <div key={i} className="flex gap-2 text-xs p-2 bg-secondary/20 rounded border border-border">
                <span className={`text-[10px] px-1.5 rounded font-bold flex-shrink-0 ${urgencyColor[r.urgency]}`}>{r.type}</span>
                <span className="text-muted-foreground flex-1">{r.action}</span>
                <span className={`text-[10px] flex-shrink-0 ${urgencyColor[r.urgency]}`}>{r.urgency}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Comptes */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comptes ({accounts.length})</div>
          {accounts.map(a => <AccountCard key={a.id} acc={a} onSelect={setSelected} selected={selected?.id === a.id} />)}
        </div>

        {/* Détail compte sélectionné */}
        {selected && (
          <div className="lg:col-span-2 space-y-4">
            <div className="card-trading">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-bold">{selected.name}</div>
                  <div className="text-xs text-muted-foreground">{selected.propfirm} · {PHASE_LABELS[selected.phase]}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${PHASE_COLORS[selected.phase]}`}>{selected.status}</span>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }} formatter={v => [`${v.toLocaleString()}€`, 'Balance']} />
                  <Area type="monotone" dataKey="eq" stroke="#F59E0B" fill="url(#pcGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Règles MFF */}
            <div className="card-trading">
              <div className="text-xs font-semibold mb-3">Règles & Limites Compte</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'DD Journalier Max', limit: selected.daily_drawdown_limit, current: Math.abs(Math.min(0, selected.current_balance - selected.account_size)), isDD: true },
                  { label: 'DD Global Max', limit: selected.max_drawdown_limit, current: Math.abs(Math.min(0, selected.current_balance - selected.account_size)), isDD: true },
                  { label: 'Objectif Journalier', limit: selected.daily_profit_target, current: Math.max(0, selected.current_balance - selected.account_size), isDD: false },
                  { label: 'Objectif Global', limit: selected.overall_profit_target, current: Math.max(0, selected.current_balance - selected.account_size), isDD: false },
                ].map((r, i) => {
                  const pct = Math.min((r.current / r.limit) * 100, 100).toFixed(0);
                  const danger = r.isDD && parseInt(pct) > 70;
                  const ok = !r.isDD && parseInt(pct) >= 100;
                  return (
                    <div key={i} className="p-2 rounded border border-border bg-secondary/10">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className={`font-mono font-bold ${danger ? 'text-destructive' : ok ? 'text-primary' : 'text-foreground'}`}>{r.current.toLocaleString()}€ / {r.limit.toLocaleString()}€</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{
                          width: `${pct}%`,
                          background: danger ? '#EF4444' : ok ? '#00FF88' : r.isDD ? '#F59E0B' : '#0088FF'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}