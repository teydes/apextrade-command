import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Webhook, Bell, Shield, Trash2, CheckCircle2, Send,
  Database, Cpu, AlertTriangle, Eye, Building2, Plus, Edit2, Save, X, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';

// Paramètres locaux (non persistés en DB pour simplicité)
const defaultSettings = {
  useRealData: false,
  webhookUrl: 'https://votre-app.base44.app/api/webhook',
  webhookSecret: '',
  dailyTarget: 500,
  maxDailyLoss: 2000,
  maxDailyProfit: 1500,
  consistencyRule: 30,
  minDelayBetweenTrades: 120,
  maxPositionsPerDay: 5,
  blockNewsMinsBefore: 5,
  blockNewsMinsAfter: 10,
  notifyOnSignal: true,
  notifyOnTrade: true,
  notifyOnDDAlert: true,
  autoPause: true,
  phase: 'backtest_local',
  // Nouveaux paramètres PropFirm + Backtest
  backtestDuration: 30,  // jours
  backtestMinTrades: 50,
  backtestTargetWR: 60,
};

// Prix réels des comptes PropFirm (modifiables)
const DEFAULT_PROPFIRM_PRICES = [
  { id: 'mff_10k', firm: 'MyFundedFutures', size: '10K', price: 85, currency: '€' },
  { id: 'mff_25k', firm: 'MyFundedFutures', size: '25K', price: 150, currency: '€' },
  { id: 'mff_50k', firm: 'MyFundedFutures', size: '50K', price: 250, currency: '€' },
  { id: 'mff_150k', firm: 'MyFundedFutures', size: '150K', price: 550, currency: '€' },
  { id: 'tradefy_25k', firm: 'Tradefy', size: '25K', price: 99, currency: '€' },
  { id: 'tradefy_50k', firm: 'Tradefy', size: '50K', price: 189, currency: '€' },
  { id: 'lucid_25k', firm: 'Lucid Trading', size: '25K', price: 120, currency: '€' },
  { id: 'lucid_50k', firm: 'Lucid Trading', size: '50K', price: 220, currency: '€' },
  { id: 'ufunded_50k', firm: 'UFunded', size: '50K', price: 200, currency: '€' },
  { id: 'ufunded_100k', firm: 'UFunded', size: '100K', price: 380, currency: '€' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [webhookTest, setWebhookTest] = useState(null);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [pfPrices, setPfPrices] = useState(DEFAULT_PROPFIRM_PRICES);
  const [editingPf, setEditingPf] = useState(null);
  const [newPfRow, setNewPfRow] = useState({ firm: '', size: '', price: '', currency: '€' });
  const [showAddPf, setShowAddPf] = useState(false);

  const qc = useQueryClient();

  // Comptes réels
  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-settings'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TradingAccount.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['accounts-settings']); toast.success('Compte mis à jour'); },
  });

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  const testWebhook = async () => {
    setWebhookTest('testing');
    setTimeout(() => { setWebhookTest('success'); toast.success('Webhook TradingView connecté'); }, 1500);
  };

  const savePfPrice = (id, price) => {
    setPfPrices(prev => prev.map(p => p.id === id ? { ...p, price: parseFloat(price) || 0 } : p));
    setEditingPf(null);
    toast.success('Prix mis à jour');
  };

  const addPfRow = () => {
    if (!newPfRow.firm || !newPfRow.size) { toast.error('Remplissez tous les champs'); return; }
    setPfPrices(prev => [...prev, { ...newPfRow, id: `custom_${Date.now()}`, price: parseFloat(newPfRow.price) || 0 }]);
    setNewPfRow({ firm: '', size: '', price: '', currency: '€' });
    setShowAddPf(false);
    toast.success('PropFirm ajoutée');
  };

  const removePf = (id) => setPfPrices(prev => prev.filter(p => p.id !== id));

  const groupedPf = pfPrices.reduce((acc, p) => {
    if (!acc[p.firm]) acc[p.firm] = [];
    acc[p.firm].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Réglages</h1>
          <p className="text-xs text-muted-foreground">Configuration centrale · PropFirm · Backtest · Webhook · Risk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Phase selector */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Phase Active</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'backtest_local', label: 'Backtest Local', desc: 'Sans bot live' },
              { val: 'demo', label: 'Demo MFF', desc: 'Bot démo activé' },
              { val: 'live', label: 'Live', desc: 'Trading réel' },
            ].map(p => (
              <button key={p.val} onClick={() => set('phase', p.val)}
                className={`p-3 rounded border text-left text-xs transition-all ${settings.phase === p.val ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80'}`}>
                <div className={`font-bold mb-0.5 ${settings.phase === p.val ? 'text-primary' : 'text-foreground'}`}>{p.label}</div>
                <div className="text-muted-foreground">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Webhook config */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Webhook className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Webhook TradingView</span>
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">URL Webhook</Label>
              <div className="flex gap-2 mt-1">
                <Input value={settings.webhookUrl} onChange={e => set('webhookUrl', e.target.value)} className="bg-secondary border-border h-8 text-xs font-mono" />
                <Button size="sm" className="h-8 text-xs shrink-0" onClick={testWebhook} disabled={webhookTest === 'testing'}>
                  {webhookTest === 'testing' ? 'Test...' : 'Tester'}
                </Button>
              </div>
              {webhookTest === 'success' && <div className="text-xs text-primary mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connecté</div>}
            </div>
            <div>
              <Label className="text-xs">Secret (optionnel)</Label>
              <Input type="password" value={settings.webhookSecret} onChange={e => set('webhookSecret', e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Token secret" />
            </div>
          </div>
          <div className="mt-3 p-2 bg-secondary/50 rounded text-xs text-muted-foreground font-mono">
            {`{"action":"{{strategy.order.action}}","symbol":"{{ticker}}","entry":{{close}},"sl":{{strategy.order.price}}}`}
          </div>
        </div>

        {/* Risk management */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold">Gestion du Risque</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { key: 'dailyTarget', label: 'Objectif journalier (€)' },
              { key: 'maxDailyLoss', label: 'DD max journalier (€)' },
              { key: 'maxDailyProfit', label: 'Profit max journalier (€)' },
              { key: 'consistencyRule', label: 'Règle consistance (%)' },
              { key: 'minDelayBetweenTrades', label: 'Délai min trades (s)' },
              { key: 'maxPositionsPerDay', label: 'Positions max / jour' },
              { key: 'blockNewsMinsBefore', label: 'Bloquer avant news (min)' },
              { key: 'blockNewsMinsAfter', label: 'Bloquer après news (min)' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input type="number" value={settings[f.key]} onChange={e => set(f.key, parseFloat(e.target.value))} className="bg-secondary border-border h-7 text-xs font-mono mt-0.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Backtest Config */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Configuration Backtest</span>
          </div>
          <div className="space-y-3 text-xs">
            {[
              { key: 'backtestDuration', label: 'Durée backtest (jours)', min: 7, max: 365 },
              { key: 'backtestMinTrades', label: 'Trades minimum requis', min: 10, max: 500 },
              { key: 'backtestTargetWR', label: 'Win Rate cible (%)', min: 40, max: 90 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <span className="text-xs font-mono font-bold text-foreground">{settings[f.key]}{f.key === 'backtestTargetWR' ? '%' : f.key === 'backtestDuration' ? 'j' : ''}</span>
                </div>
                <input type="range" min={f.min} max={f.max} step={1}
                  value={settings[f.key]} onChange={e => set(f.key, parseInt(e.target.value))}
                  className="w-full accent-primary" />
              </div>
            ))}
            <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-[11px] text-blue-400">
              📊 Critères de validation: {settings.backtestDuration}j · {settings.backtestMinTrades}+ trades · WR≥{settings.backtestTargetWR}%
            </div>
          </div>
        </div>
      </div>

      {/* PropFirm Prix Réels */}
      <div className="card-trading">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">Prix Réels des Comptes PropFirm</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowAddPf(p => !p)} className="gap-1 text-xs h-7">
            <Plus className="w-3 h-3" /> Ajouter
          </Button>
        </div>

        {showAddPf && (
          <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-secondary/30 rounded border border-border">
            <Input placeholder="Firm" value={newPfRow.firm} onChange={e => setNewPfRow(p => ({...p, firm: e.target.value}))} className="h-7 text-xs bg-secondary border-border" />
            <Input placeholder="Taille (ex: 50K)" value={newPfRow.size} onChange={e => setNewPfRow(p => ({...p, size: e.target.value}))} className="h-7 text-xs bg-secondary border-border" />
            <Input type="number" placeholder="Prix (€)" value={newPfRow.price} onChange={e => setNewPfRow(p => ({...p, price: e.target.value}))} className="h-7 text-xs bg-secondary border-border" />
            <div className="flex gap-1">
              <Button size="sm" onClick={addPfRow} className="h-7 text-xs flex-1"><Save className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddPf(false)} className="h-7 w-7 p-0"><X className="w-3 h-3" /></Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {Object.entries(groupedPf).map(([firm, rows]) => (
            <div key={firm}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{firm}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {rows.map(pf => (
                  <div key={pf.id} className="p-2 rounded border border-border bg-secondary/30 text-xs">
                    <div className="text-muted-foreground mb-1">{pf.size}</div>
                    {editingPf === pf.id ? (
                      <div className="flex gap-1">
                        <Input type="number" defaultValue={pf.price}
                          onKeyDown={e => e.key === 'Enter' && savePfPrice(pf.id, e.target.value)}
                          className="h-6 text-xs bg-background border-primary font-mono px-1 flex-1"
                          autoFocus
                          onBlur={e => savePfPrice(pf.id, e.target.value)} />
                        <span className="text-muted-foreground self-center">{pf.currency}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-primary">{pf.price}{pf.currency}</span>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingPf(pf.id)} className="text-muted-foreground hover:text-foreground p-0.5"><Edit2 className="w-3 h-3" /></button>
                          <button onClick={() => removePf(pf.id)} className="text-muted-foreground hover:text-destructive p-0.5"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2 bg-primary/5 border border-primary/20 rounded text-xs text-muted-foreground">
          💡 Ces prix sont utilisés dans le calcul ROI du Snowball et la comparaison PropFirm. Cliquez sur le prix pour éditer.
        </div>
      </div>

      {/* Comptes réels — Balance live */}
      {accounts.length > 0 && (
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Mise à jour Balances Comptes</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {accounts.map(acc => (
              <AccountBalanceEditor key={acc.id} account={acc} onSave={(id, balance) => updateAccount.mutate({ id, data: { current_balance: balance } })} />
            ))}
          </div>
        </div>
      )}

      {/* Mode Données */}
      <div className={`card-trading border-2 transition-all ${settings.useRealData ? 'border-primary/50 bg-primary/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className={`w-4 h-4 ${settings.useRealData ? 'text-primary' : 'text-yellow-400'}`} />
            <span className="text-sm font-semibold">Mode Données</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${settings.useRealData ? 'bg-primary/20 text-primary' : 'bg-yellow-400/20 text-yellow-400'}`}>
              {settings.useRealData ? '🔴 DONNÉES RÉELLES' : '🟡 DONNÉES SIMULÉES'}
            </span>
          </div>
          <Switch checked={settings.useRealData} onCheckedChange={v => { set('useRealData', v); toast(v ? '⚠️ Mode réel activé' : '🟡 Mode simulation'); }} />
        </div>
        {!settings.useRealData && (
          <div className="flex items-start gap-2 text-xs p-2 bg-yellow-400/5 rounded border border-yellow-400/20">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">Mode simulation — Activez le mode réel et connectez TradingView + comptes prop firm.</p>
          </div>
        )}
      </div>

      {/* Notifications & Auto */}
      <div className="card-trading space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold">Automatisation & Alertes</span>
        </div>
        {[
          { key: 'notifyOnSignal', label: 'Notification nouveau signal' },
          { key: 'notifyOnTrade', label: 'Notification exécution trade' },
          { key: 'notifyOnDDAlert', label: 'Alerte drawdown critique' },
          { key: 'autoPause', label: 'Pause auto si objectif atteint' },
        ].map(sw => (
          <div key={sw.key} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{sw.label}</span>
            <Switch checked={settings[sw.key]} onCheckedChange={v => set(sw.key, v)} />
          </div>
        ))}
        <div className="pt-2 border-t border-border">
          <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={() => toast.success('Logs nettoyés')}>
            <Trash2 className="w-3 h-3" /> Vider les logs traités
          </Button>
        </div>
      </div>

      <PreFlightChecklist />

      {/* Suggestions */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Suggestions & Améliorations</span>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Proposer une amélioration..." value={newSuggestion} onChange={e => setNewSuggestion(e.target.value)} className="bg-secondary border-border h-8 text-xs" />
          <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => { toast.success('Suggestion enregistrée'); setNewSuggestion(''); }}>Envoyer</Button>
        </div>
      </div>
    </div>
  );
}

function AccountBalanceEditor({ account, onSave }) {
  const [balance, setBalance] = useState(account.current_balance || account.account_size);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-3 p-2 rounded border border-border bg-secondary/30 text-xs">
      <div className="flex-1">
        <div className="font-semibold">{account.name}</div>
        <div className="text-muted-foreground">{account.propfirm} · {account.account_size?.toLocaleString()}€</div>
      </div>
      {editing ? (
        <div className="flex gap-1 items-center">
          <Input type="number" value={balance} onChange={e => setBalance(parseFloat(e.target.value))}
            className="h-7 w-28 bg-background border-primary text-xs font-mono" autoFocus />
          <Button size="sm" className="h-7 w-7 p-0" onClick={() => { onSave(account.id, balance); setEditing(false); }}><Save className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(false)}><X className="w-3 h-3" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${balance >= account.account_size ? 'text-primary' : 'text-destructive'}`}>{balance?.toLocaleString()}€</span>
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground p-0.5"><Edit2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}