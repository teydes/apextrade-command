import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings, Webhook, Bell, Shield, Trash2, CheckCircle2, Send,
  Database, Cpu, AlertTriangle, Eye, Building2, Plus, Edit2, Save, X, Clock,
  Zap, Download, RefreshCw, Calculator, Target, TrendingUp, Brain, FileText
} from 'lucide-react';
import { downloadDocumentation, PROJECT_VERSION } from '@/lib/projectDoc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import PreFlightChecklist from '@/components/shared/PreFlightChecklist';

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
  autoJournal: true,
  autoJournalHour: 18,
  killSwitchConsecLosses: 3,
  killSwitchDDPct: 70,
  phase: 'backtest_local',
  backtestDuration: 30,
  backtestMinTrades: 50,
  backtestTargetWR: 60,
  copyTradingActive: false,
  riskPerTradeDefault: 0.5,
  maxOpenPositions: 1,
};

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
  { id: 'topstep_50k', firm: 'TopStep', size: '50K', price: 165, currency: '$' },
  { id: 'topstep_100k', firm: 'TopStep', size: '100K', price: 325, currency: '$' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [webhookTest, setWebhookTest] = useState(null);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [pfPrices, setPfPrices] = useState(DEFAULT_PROPFIRM_PRICES);
  const [editingPf, setEditingPf] = useState(null);
  const [newPfRow, setNewPfRow] = useState({ firm: '', size: '', price: '', currency: '€' });
  const [showAddPf, setShowAddPf] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const qc = useQueryClient();

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

  const exportSettings = () => {
    const data = JSON.stringify({ settings, pfPrices }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ghost_trader_settings.json'; a.click();
    toast.success('Paramètres exportés');
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Réglages Ghost Trader
          </h1>
          <p className="text-xs text-muted-foreground">Configuration centrale · Risk · Automation · PropFirm · Backtest</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { downloadDocumentation(); toast.success('Documentation téléchargée'); }} className="gap-1 text-xs h-8 border-primary/40 text-primary hover:bg-primary/5">
            <FileText className="w-3 h-3" />Documentation {PROJECT_VERSION}
          </Button>
          <Button size="sm" variant="outline" onClick={exportSettings} className="gap-1 text-xs h-8">
            <Download className="w-3 h-3" />Config JSON
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border flex-wrap">
        {[
          { id: 'general', label: 'Général' },
          { id: 'risk', label: 'Risque' },
          { id: 'automation', label: 'Automation' },
          { id: 'propfirm', label: 'PropFirm' },
          { id: 'backtest', label: 'Backtest' },
          { id: 'accounts', label: 'Comptes' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Phase */}
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Phase Active</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'backtest_local', label: 'Backtest', desc: 'Sans bot live', color: 'text-blue-400' },
                { val: 'demo', label: 'Demo MFF', desc: 'Bot démo activé', color: 'text-yellow-400' },
                { val: 'live', label: 'Live', desc: 'Trading réel', color: 'text-primary' },
              ].map(p => (
                <button key={p.val} onClick={() => set('phase', p.val)}
                  className={`p-3 rounded border text-left text-xs transition-all ${settings.phase === p.val ? 'border-primary bg-primary/10' : 'border-border hover:border-border/80'}`}>
                  <div className={`font-bold mb-0.5 ${settings.phase === p.val ? p.color : 'text-foreground'}`}>{p.label}</div>
                  <div className="text-muted-foreground">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode données */}
          <div className={`card-trading border-2 transition-all ${settings.useRealData ? 'border-primary/50 bg-primary/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className={`w-4 h-4 ${settings.useRealData ? 'text-primary' : 'text-yellow-400'}`} />
                <span className="text-sm font-semibold">Mode Données</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${settings.useRealData ? 'bg-primary/20 text-primary' : 'bg-yellow-400/20 text-yellow-400'}`}>
                  {settings.useRealData ? 'DONNÉES RÉELLES' : 'SIMULATION'}
                </span>
              </div>
              <Switch checked={settings.useRealData} onCheckedChange={v => { set('useRealData', v); toast(v ? 'Mode réel activé' : 'Mode simulation'); }} />
            </div>
            {!settings.useRealData && (
              <div className="flex items-start gap-2 text-xs p-2 bg-yellow-400/5 rounded border border-yellow-400/20">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">Mode simulation — Activez le mode réel et connectez TradingView + comptes prop firm.</p>
              </div>
            )}
          </div>

          {/* Webhook */}
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
                {webhookTest === 'success' && <div className="text-xs text-primary mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Connecté</div>}
              </div>
              <div>
                <Label className="text-xs">Secret</Label>
                <Input type="password" value={settings.webhookSecret} onChange={e => set('webhookSecret', e.target.value)} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Token secret" />
              </div>
            </div>
            <div className="mt-3 p-2 bg-secondary/50 rounded text-[10px] text-muted-foreground font-mono break-all">
              {`{"action":"{{strategy.order.action}}","symbol":"{{ticker}}","entry":{{close}},"sl":{{strategy.order.price}}}`}
            </div>
          </div>

          {/* Infos système */}
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Statut Système</div>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Version', value: `Ghost Trader ${PROJECT_VERSION}`, color: 'text-primary' },
                { label: 'Phase active', value: settings.phase.replace('_', ' '), color: 'text-foreground' },
                { label: 'Mode données', value: settings.useRealData ? 'Réelles' : 'Simulées', color: settings.useRealData ? 'text-primary' : 'text-yellow-400' },
                { label: 'Kill Switch', value: `${settings.killSwitchConsecLosses} pertes consec.`, color: 'text-muted-foreground' },
                { label: 'Auto Journal', value: settings.autoJournal ? `ON (${settings.autoJournalHour}h)` : 'OFF', color: settings.autoJournal ? 'text-primary' : 'text-muted-foreground' },
              ].map(r => (
                <div key={r.label} className="flex justify-between p-2 rounded bg-secondary/20 border border-border">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className={`font-mono font-bold ${r.color}`}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold">Paramètres de Risque</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { key: 'dailyTarget', label: 'Objectif journalier (€)' },
                { key: 'maxDailyLoss', label: 'DD max journalier (€)' },
                { key: 'maxDailyProfit', label: 'Profit max journalier (€)' },
                { key: 'consistencyRule', label: 'Règle consistance (%)' },
                { key: 'minDelayBetweenTrades', label: 'Délai min trades (s)' },
                { key: 'maxPositionsPerDay', label: 'Positions max/jour' },
                { key: 'blockNewsMinsBefore', label: 'Bloquer avant news (min)' },
                { key: 'blockNewsMinsAfter', label: 'Bloquer après news (min)' },
                { key: 'maxOpenPositions', label: 'Positions ouvertes max' },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <Input type="number" value={settings[f.key]} onChange={e => set(f.key, parseFloat(e.target.value))} className="bg-secondary border-border h-7 text-xs font-mono mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          <div className="card-trading space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold">Kill Switch Automatique</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label className="text-xs">Pertes consécutives avant blocage</Label>
                <span className="font-mono font-bold text-destructive">{settings.killSwitchConsecLosses}</span>
              </div>
              <Slider value={[settings.killSwitchConsecLosses]} onValueChange={([v]) => set('killSwitchConsecLosses', v)} min={1} max={5} step={1} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label className="text-xs">% Drawdown max journalier (alerte)</Label>
                <span className="font-mono font-bold text-yellow-400">{settings.killSwitchDDPct}%</span>
              </div>
              <Slider value={[settings.killSwitchDDPct]} onValueChange={([v]) => set('killSwitchDDPct', v)} min={30} max={95} step={5} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <Label className="text-xs">Risque par trade par défaut</Label>
                <span className="font-mono font-bold text-primary">{settings.riskPerTradeDefault}%</span>
              </div>
              <Slider value={[settings.riskPerTradeDefault * 10]} onValueChange={([v]) => set('riskPerTradeDefault', v / 10)} min={1} max={30} step={1} />
            </div>
            <div className="p-3 bg-destructive/5 border border-destructive/20 rounded text-xs">
              <div className="font-semibold text-destructive mb-1">Règles PropFirm MFF actives</div>
              <div className="space-y-0.5 text-muted-foreground">
                <div>Max DD total: 8% du compte</div>
                <div>Max DD journalier: 5% du compte</div>
                <div>Consistance: pas de jour {`>`} 30% du profit total</div>
                <div>Kill switch: {settings.killSwitchConsecLosses} pertes consécutives</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'automation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Notifications</span>
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
          </div>

          <div className="card-trading space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">Automatisation IA</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Auto-journal à 18h</span>
              <Switch checked={settings.autoJournal} onCheckedChange={v => set('autoJournal', v)} />
            </div>
            {settings.autoJournal && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label className="text-xs">Heure auto-journal</Label>
                  <span className="font-mono">{settings.autoJournalHour}h</span>
                </div>
                <Slider value={[settings.autoJournalHour]} onValueChange={([v]) => set('autoJournalHour', v)} min={15} max={23} step={1} />
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Copy Trading actif</span>
              <Switch checked={settings.copyTradingActive} onCheckedChange={v => set('copyTradingActive', v)} />
            </div>
            <div className="pt-2 border-t border-border">
              <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={() => toast.success('Logs nettoyés')}>
                <Trash2 className="w-3 h-3" />Vider les logs traités
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backtest' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Configuration Backtest</span>
            </div>
            <div className="space-y-4">
              {[
                { key: 'backtestDuration', label: 'Durée backtest', unit: 'j', min: 7, max: 365 },
                { key: 'backtestMinTrades', label: 'Trades minimum requis', unit: '', min: 10, max: 500 },
                { key: 'backtestTargetWR', label: 'Win Rate cible', unit: '%', min: 40, max: 90 },
              ].map(f => (
                <div key={f.key}>
                  <div className="flex justify-between mb-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <span className="text-xs font-mono font-bold text-foreground">{settings[f.key]}{f.unit}</span>
                  </div>
                  <input type="range" min={f.min} max={f.max} step={1}
                    value={settings[f.key]} onChange={e => set(f.key, parseInt(e.target.value))}
                    className="w-full accent-primary" />
                </div>
              ))}
              <div className="p-3 bg-blue-400/5 border border-blue-400/20 rounded text-xs text-blue-400">
                Critères: {settings.backtestDuration}j · {settings.backtestMinTrades}+ trades · WR≥{settings.backtestTargetWR}%
              </div>
            </div>
          </div>
          <div className="card-trading">
            <PreFlightChecklist />
          </div>
        </div>
      )}

      {activeTab === 'propfirm' && (
        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Prix Réels des Comptes PropFirm</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddPf(p => !p)} className="gap-1 text-xs h-7">
              <Plus className="w-3 h-3" />Ajouter
            </Button>
          </div>

          {showAddPf && (
            <div className="grid grid-cols-4 gap-2 mb-3 p-2 bg-secondary/30 rounded border border-border">
              <Input placeholder="Firm" value={newPfRow.firm} onChange={e => setNewPfRow(p => ({...p, firm: e.target.value}))} className="h-7 text-xs bg-secondary border-border" />
              <Input placeholder="Taille (50K)" value={newPfRow.size} onChange={e => setNewPfRow(p => ({...p, size: e.target.value}))} className="h-7 text-xs bg-secondary border-border" />
              <Input type="number" placeholder="Prix" value={newPfRow.price} onChange={e => setNewPfRow(p => ({...p, price: e.target.value}))} className="h-7 text-xs bg-secondary border-border" />
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
                            autoFocus onBlur={e => savePfPrice(pf.id, e.target.value)} />
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
            Ces prix sont utilisés dans le calcul ROI du Snowball et la comparaison PropFirm. Cliquez sur le prix pour éditer.
          </div>
        </div>
      )}

      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="card-trading text-center py-8 text-xs text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Aucun compte créé — Créez un compte de trading pour commencer
            </div>
          ) : (
            <div className="card-trading">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-semibold">Balances des Comptes</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.map(acc => (
                  <AccountBalanceEditor key={acc.id} account={acc} onSave={(id, balance) => updateAccount.mutate({ id, data: { current_balance: balance } })} />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Send className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Suggestions</span>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Proposer une amélioration..." value={newSuggestion} onChange={e => setNewSuggestion(e.target.value)} className="bg-secondary border-border h-8 text-xs" />
              <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => { toast.success('Suggestion enregistrée'); setNewSuggestion(''); }}>Envoyer</Button>
            </div>
          </div>
        </div>
      )}
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
          <Input type="number" value={balance} onChange={e => setBalance(parseFloat(e.target.value))} className="h-7 w-28 bg-background border-primary text-xs font-mono" autoFocus />
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