import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Plus, TrendingUp, TrendingDown, Shield, Zap, Edit2, Save, X,
  BarChart2, Target, Activity, Wallet, RefreshCw, CheckCircle2, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const BROKERS = ['ICMarkets', 'Pepperstone', 'FTMO Broker', 'XM', 'Exness', 'Admirals', 'OANDA', 'IG Markets', 'Saxo Bank', 'Degiro', 'InteractiveBrokers', 'Autre'];
const ASSET_CLASSES = [
  { id: 'forex', label: 'Forex', desc: 'Paires de devises' },
  { id: 'indices', label: 'Indices', desc: 'SP500, DAX, NQ...' },
  { id: 'crypto', label: 'Crypto', desc: 'BTC, ETH...' },
  { id: 'commodities', label: 'Commodités', desc: 'Gold, Oil, Silver' },
  { id: 'stocks', label: 'Actions', desc: 'Actions mondiales' },
];

const STRATEGIES_PERSONAL = [
  { id: 'swing', name: 'Swing Trading', desc: 'Positions 2-5 jours', minCapital: 500 },
  { id: 'daytrading', name: 'Day Trading', desc: 'Entrée/sortie même jour', minCapital: 500 },
  { id: 'scalping', name: 'Scalping', desc: 'Trades 1-30 min', minCapital: 1000 },
  { id: 'position', name: 'Position Trading', desc: 'Semaines/mois', minCapital: 2000 },
  { id: 'ictsmc', name: 'ICT/SMC', desc: 'Smart Money Concepts', minCapital: 500 },
];

export default function PersonalAccount() {
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [newAccount, setNewAccount] = useState({
    name: '', account_type: 'personal', broker: 'ICMarkets', account_size: 1000,
    current_balance: 1000, currency: 'EUR', platform: 'mt5', phase: 'live',
    daily_drawdown_limit: 0, max_drawdown_limit: 0, leverage: 100, notes: ''
  });
  const [riskParams, setRiskParams] = useState({ riskPerTrade: 1, maxDrawdown: 20, dailyLimit: 5, maxPositions: 3 });
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);

  const qc = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['personal-accounts'],
    queryFn: () => base44.entities.TradingAccount.filter({ account_type: 'personal' }),
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['all-accounts-perso'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades-personal'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 50),
  });

  const createAccount = useMutation({
    mutationFn: (data) => base44.entities.TradingAccount.create(data),
    onSuccess: () => { qc.invalidateQueries(['personal-accounts']); setShowAddAccount(false); toast.success('Compte personnel créé'); },
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradingAccount.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['personal-accounts']); setEditingId(null); toast.success('Compte mis à jour'); },
  });

  const deleteAccount = useMutation({
    mutationFn: (id) => base44.entities.TradingAccount.delete(id),
    onSuccess: () => { qc.invalidateQueries(['personal-accounts']); toast.success('Compte supprimé'); },
  });

  const getAIAdvice = async (acc) => {
    setLoadingAI(true);
    const accTrades = trades.filter(t => t.account_id === acc.id);
    const wins = accTrades.filter(t => t.result === 'win').length;
    const pnl = accTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const roi = acc.account_size > 0 ? ((acc.current_balance - acc.account_size) / acc.account_size * 100).toFixed(2) : 0;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert en gestion de compte trading personnel. Conseil personnalisé.

Compte: ${acc.name} | Broker: ${acc.broker} | Plateforme: ${acc.platform}
Capital: ${acc.account_size}€ | Balance actuelle: ${acc.current_balance}€ | ROI: ${roi}%
Levier: 1:${acc.leverage} | Sans restrictions DD
Trades analysés: ${accTrades.length} | WR: ${accTrades.length ? Math.round(wins/accTrades.length*100) : 0}% | PnL: ${pnl}€

Retourne UNIQUEMENT JSON:
{
  "compte_sante": <0-100>,
  "verdict": "<évaluation 2 phrases>",
  "strategie_recommandee": "<stratégie optimale pour ce capital>",
  "risk_per_trade": <pct recommandé>,
  "max_positions": <nombre>,
  "marches_recommandes": ["<marché 1>", "<marché 2>"],
  "objectif_mensuel_realiste": <€>,
  "conseils": ["<conseil 1>", "<conseil 2>", "<conseil 3>"],
  "erreurs_communes": ["<erreur 1>"],
  "prochaine_etape": "<action concrète à faire maintenant>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          compte_sante: { type: "number" }, verdict: { type: "string" }, strategie_recommandee: { type: "string" },
          risk_per_trade: { type: "number" }, max_positions: { type: "number" },
          marches_recommandes: { type: "array", items: { type: "string" } },
          objectif_mensuel_realiste: { type: "number" },
          conseils: { type: "array", items: { type: "string" } },
          erreurs_communes: { type: "array", items: { type: "string" } },
          prochaine_etape: { type: "string" }
        }
      }
    });
    setAiAdvice({ ...res, accountName: acc.name });
    setLoadingAI(false);
  };

  const totalBalance = allAccounts.reduce((s, a) => s + (a.current_balance || a.account_size || 0), 0);
  const personalBalance = accounts.reduce((s, a) => s + (a.current_balance || a.account_size || 0), 0);
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Comptes Personnels MT4/MT5
          </h1>
          <p className="text-xs text-muted-foreground">Comptes réels sans restrictions · Levier libre · Multi-marchés · Multi-broker</p>
        </div>
        <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Nouveau Compte</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Créer un Compte Personnel</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nom du compte</Label>
                  <Input value={newAccount.name} onChange={e => setNewAccount(p => ({...p, name: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Mon compte ICM" />
                </div>
                <div>
                  <Label className="text-xs">Broker</Label>
                  <Select value={newAccount.broker} onValueChange={v => setNewAccount(p => ({...p, broker: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{BROKERS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Plateforme</Label>
                  <Select value={newAccount.platform} onValueChange={v => setNewAccount(p => ({...p, platform: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['mt4', 'mt5', 'ctrader', 'tradingview', 'ninjatrader', 'other'].map(p => <SelectItem key={p} value={p}>{p.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Devise</Label>
                  <Select value={newAccount.currency} onValueChange={v => setNewAccount(p => ({...p, currency: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{['EUR', 'USD', 'GBP', 'CHF'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Capital initial ({newAccount.currency})</Label>
                  <Input type="number" value={newAccount.account_size} onChange={e => setNewAccount(p => ({...p, account_size: parseFloat(e.target.value), current_balance: parseFloat(e.target.value)}))} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Levier (1:X)</Label>
                  <Input type="number" value={newAccount.leverage} onChange={e => setNewAccount(p => ({...p, leverage: parseInt(e.target.value)}))} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" placeholder="100" />
                </div>
              </div>
              <div className="p-3 bg-primary/5 border border-primary/20 rounded text-xs">
                <div className="text-primary font-semibold mb-1">Compte Personnel = Pas de restrictions</div>
                <div className="text-muted-foreground">Pas de DD maximum, pas d'objectif de profit obligatoire, pas de règle de consistance. Vous gérez vous-même votre risque.</div>
              </div>
              <div>
                <Label className="text-xs">Notes (optionnel)</Label>
                <Input value={newAccount.notes} onChange={e => setNewAccount(p => ({...p, notes: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Stratégie, objectifs..." />
              </div>
              <Button onClick={() => createAccount.mutate({...newAccount, phase: 'live'})} className="w-full gap-1" disabled={!newAccount.name || createAccount.isPending}>
                <Plus className="w-3 h-3" />Créer le compte
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Comptes Perso', value: accounts.length, icon: User, color: 'text-cyan-400' },
          { label: 'Capital Perso', value: `${personalBalance.toLocaleString()}€`, icon: Wallet, color: 'text-primary' },
          { label: 'Capital Total', value: `${totalBalance.toLocaleString()}€`, icon: BarChart2, color: 'text-yellow-400' },
          { label: 'PnL Global', value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}€`, icon: TrendingUp, color: totalPnl >= 0 ? 'text-primary' : 'text-destructive' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-trading text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${s.color} opacity-70`} />
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'accounts', label: 'Mes Comptes' },
          { id: 'risk', label: 'Gestion Risque' },
          { id: 'strategies', label: 'Stratégies' },
          { id: 'markets', label: 'Marchés' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'accounts' && (
        <div>
          {aiAdvice && (
            <div className="card-trading border border-cyan-400/30 bg-cyan-400/5 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-cyan-400">Coach IA — {aiAdvice.accountName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold font-mono ${aiAdvice.compte_sante >= 70 ? 'text-primary' : 'text-yellow-400'}`}>{aiAdvice.compte_sante}/100</span>
                  <Button size="sm" variant="ghost" onClick={() => setAiAdvice(null)} className="h-6 text-xs">✕</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{aiAdvice.verdict}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-secondary/30 border border-border text-center">
                  <div className="text-[10px] text-muted-foreground">Stratégie</div>
                  <div className="font-bold text-primary">{aiAdvice.strategie_recommandee}</div>
                </div>
                <div className="p-2 rounded bg-secondary/30 border border-border text-center">
                  <div className="text-[10px] text-muted-foreground">Risque/trade</div>
                  <div className="font-bold text-yellow-400">{aiAdvice.risk_per_trade}%</div>
                </div>
                <div className="p-2 rounded bg-secondary/30 border border-border text-center">
                  <div className="text-[10px] text-muted-foreground">Max positions</div>
                  <div className="font-bold">{aiAdvice.max_positions}</div>
                </div>
                <div className="p-2 rounded bg-secondary/30 border border-border text-center">
                  <div className="text-[10px] text-muted-foreground">Objectif/mois</div>
                  <div className="font-bold text-primary">+{aiAdvice.objectif_mensuel_realiste?.toLocaleString()}€</div>
                </div>
              </div>
              {aiAdvice.conseils?.length > 0 && (
                <div className="space-y-1">
                  {aiAdvice.conseils.map((c, i) => (
                    <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 border border-primary/20 rounded">
                      <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{c}</span>
                    </div>
                  ))}
                </div>
              )}
              {aiAdvice.prochaine_etape && (
                <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs">
                  <span className="text-yellow-400 font-semibold">Action maintenant: </span>
                  <span className="text-muted-foreground">{aiAdvice.prochaine_etape}</span>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : accounts.length === 0 ? (
            <div className="card-trading text-center py-12">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground mb-3">Aucun compte personnel — Créez votre premier compte MT4/MT5</p>
              <Button onClick={() => setShowAddAccount(true)} className="gap-1 text-xs"><Plus className="w-3 h-3" />Créer un compte</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map(acc => {
                const roi = acc.account_size > 0 ? ((acc.current_balance - acc.account_size) / acc.account_size * 100).toFixed(2) : 0;
                const isProfit = acc.current_balance >= acc.account_size;
                return (
                  <div key={acc.id} className="card-trading border border-border hover:border-cyan-400/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{acc.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400">PERSONNEL</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{acc.platform?.toUpperCase()}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{acc.broker} · Levier 1:{acc.leverage || 100}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => getAIAdvice(acc)} disabled={loadingAI} className="h-7 text-xs gap-1">
                          <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Coach IA
                        </Button>
                        <button onClick={() => deleteAccount.mutate(acc.id)} className="text-muted-foreground hover:text-destructive p-1"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div className="text-center">
                        <div className="text-muted-foreground text-[10px]">Capital</div>
                        <div className="font-mono font-bold">{acc.account_size?.toLocaleString()}{acc.currency || '€'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground text-[10px]">Balance</div>
                        <div className={`font-mono font-bold ${isProfit ? 'text-primary' : 'text-destructive'}`}>{acc.current_balance?.toLocaleString()}{acc.currency || '€'}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground text-[10px]">ROI</div>
                        <div className={`font-mono font-bold ${isProfit ? 'text-primary' : 'text-destructive'}`}>{parseFloat(roi) >= 0 ? '+' : ''}{roi}%</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2">
                      <CheckCircle2 className="w-3 h-3 text-primary" />Pas de DD maximum
                      <CheckCircle2 className="w-3 h-3 text-primary" />Pas de target
                      <CheckCircle2 className="w-3 h-3 text-primary" />Levier libre
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold">Paramètres Risque Perso</span>
            </div>
            <p className="text-xs text-muted-foreground">Ces règles sont des recommandations — aucune restriction automatique sur comptes personnels.</p>
            {[
              { key: 'riskPerTrade', label: 'Risque par trade', unit: '%', min: 0.5, max: 10, step: 0.5 },
              { key: 'maxDrawdown', label: 'DD perso max conseillé', unit: '%', min: 5, max: 50, step: 5 },
              { key: 'dailyLimit', label: 'Perte journalière max', unit: '%', min: 1, max: 20, step: 1 },
              { key: 'maxPositions', label: 'Positions simultanées', unit: '', min: 1, max: 10, step: 1 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex justify-between text-xs mb-1">
                  <Label className="text-xs">{f.label}</Label>
                  <span className="font-mono font-bold text-primary">{riskParams[f.key]}{f.unit}</span>
                </div>
                <input type="range" min={f.min} max={f.max} step={f.step}
                  value={riskParams[f.key]} onChange={e => setRiskParams(p => ({...p, [f.key]: parseFloat(e.target.value)}))}
                  className="w-full accent-primary" />
              </div>
            ))}
            <div className="p-3 bg-primary/5 border border-primary/20 rounded text-xs">
              <div className="font-semibold text-primary mb-1">Calcul position pour 1000€:</div>
              <div className="font-mono text-muted-foreground">
                Risque: {Math.round(1000 * riskParams.riskPerTrade / 100)}€ par trade
                · Max journalier: {Math.round(1000 * riskParams.dailyLimit / 100)}€
              </div>
            </div>
          </div>
          <div className="card-trading space-y-3">
            <div className="text-sm font-semibold">Différences PropFirm vs Perso</div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Restrictions Drawdown', propfirm: '✗ Limité (5-8%)', perso: '✓ Libre (vous décidez)' },
                { label: 'Objectif de profit', propfirm: '✗ Obligatoire (8-10%)', perso: '✓ Aucun' },
                { label: 'Règle de consistance', propfirm: '✗ Obligatoire (30%)', perso: '✓ Aucune' },
                { label: 'Levier', propfirm: '✗ Limité (1:10 à 1:50)', perso: '✓ Jusqu\'à 1:500' },
                { label: 'Marchés', propfirm: '✗ Souvent limité', perso: '✓ Tous marchés' },
                { label: 'News trading', propfirm: '✗ Souvent interdit', perso: '✓ Autorisé' },
                { label: 'Scalping', propfirm: '✗ Souvent interdit', perso: '✓ Autorisé' },
                { label: 'Capital requis', propfirm: '✗ Fee 100€-1000€+', perso: '✓ Dès 500€' },
                { label: 'Payout', propfirm: '✓ 80-90% du profit', perso: '✓ 100% du profit' },
              ].map(r => (
                <div key={r.label} className="grid grid-cols-3 gap-2 p-2 rounded border border-border bg-secondary/20">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="text-destructive">{r.propfirm}</span>
                  <span className="text-primary">{r.perso}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'strategies' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {STRATEGIES_PERSONAL.map(s => (
            <div key={s.id} className="card-trading border border-border hover:border-primary/30 transition-all">
              <div className="font-bold mb-1">{s.name}</div>
              <div className="text-xs text-muted-foreground mb-2">{s.desc}</div>
              <div className="text-[10px] text-muted-foreground">Capital minimum: <span className="text-primary font-bold">{s.minCapital}€</span></div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'markets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ASSET_CLASSES.map(ac => (
            <div key={ac.id} className="card-trading border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-bold">{ac.label}</span>
              </div>
              <div className="text-xs text-muted-foreground">{ac.desc}</div>
              <div className="mt-2 text-[10px] text-primary">✓ Disponible sur comptes personnels</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}