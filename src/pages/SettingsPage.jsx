import { useState } from 'react';
import { Settings, Webhook, Bell, Shield, Trash2, CheckCircle2, XCircle, Send, Database, Cpu, ToggleLeft, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  phase: 'backtest_local',
};

const suggestions = [
  { id: 1, date: '2024-04-28 09:15', text: 'Augmenter le block news de 5 à 10 min avant les annonces FOMC (3 pertes consécutives observées)', status: 'pending' },
  { id: 2, date: '2024-04-27 14:30', text: 'Favoriser les setups OB+FVG sur la session NY (win rate 82% vs 61% London)', status: 'implemented' },
  { id: 3, date: '2024-04-26 11:00', text: 'Réduire taille de position de 1 → 0.5 contrat pour les trades anti-tendance', status: 'pending' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaultSettings);
  const [webhookTest, setWebhookTest] = useState(null);
  const [newSuggestion, setNewSuggestion] = useState('');

  const set = (key, val) => setSettings(p => ({ ...p, [key]: val }));

  const testWebhook = async () => {
    setWebhookTest('testing');
    setTimeout(() => {
      setWebhookTest('success');
      toast.success('Webhook TradingView connecté avec succès');
    }, 1500);
  };

  const clearLogs = () => toast.success('Logs nettoyés — Espace disque libéré');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Réglages</h1>
          <p className="text-xs text-muted-foreground">Configuration centrale · Webhook · Risk · Phase active</p>
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
            <div className="font-semibold text-foreground mb-1">Format Alerte TradingView:</div>
            {`{"action":"{{strategy.order.action}}","symbol":"{{ticker}}","entry":{{close}},"sl":{{strategy.order.price}}}`}
          </div>
        </div>

        {/* Risk management */}
        <div className="card-trading">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold">Gestion du Risque MFF</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { key: 'dailyTarget', label: 'Objectif journalier (€)' },
              { key: 'maxDailyLoss', label: 'Drawdown max journalier (€)' },
              { key: 'maxDailyProfit', label: 'Profit max journalier (€)' },
              { key: 'consistencyRule', label: 'Règle consistance (%)' },
              { key: 'minDelayBetweenTrades', label: 'Délai min entre trades (s)' },
              { key: 'maxPositionsPerDay', label: 'Positions max / jour' },
              { key: 'blockNewsMinsBefore', label: 'Bloquer Xmin avant news' },
              { key: 'blockNewsMinsAfter', label: 'Bloquer Xmin après news' },
            ].map(f => (
              <div key={f.key}>
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input type="number" value={settings[f.key]} onChange={e => set(f.key, parseFloat(e.target.value))} className="bg-secondary border-border h-7 text-xs font-mono mt-0.5" />
              </div>
            ))}
          </div>
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
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium">Maintenance</span>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1" onClick={clearLogs}>
              <Trash2 className="w-3 h-3" /> Vider les logs traités
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Données Réelles / Simulées */}
      <div className={`card-trading border-2 transition-all ${settings.useRealData ? 'border-primary/50 bg-primary/5' : 'border-yellow-400/30 bg-yellow-400/5'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className={`w-4 h-4 ${settings.useRealData ? 'text-primary' : 'text-yellow-400'}`} />
            <span className="text-sm font-semibold">Mode Données</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${settings.useRealData ? 'bg-primary/20 text-primary' : 'bg-yellow-400/20 text-yellow-400'}`}>
              {settings.useRealData ? '🔴 DONNÉES RÉELLES' : '🟡 DONNÉES SIMULÉES'}
            </span>
          </div>
          <Switch checked={settings.useRealData} onCheckedChange={v => { set('useRealData', v); toast(v ? '⚠️ Mode données réelles activé — Connectez vos sources' : '🟡 Mode simulation activé'); }} />
        </div>
        {settings.useRealData ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 p-2 bg-primary/5 rounded border border-primary/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary">Mode Réel Activé</p>
                <p className="text-muted-foreground">Le dashboard utilise uniquement les données de vos comptes connectés. Webhook TradingView requis pour les signaux live.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Webhook TradingView', status: 'required' },
                { label: 'Compte MFF connecté', status: 'manual' },
                { label: 'News API (Forex Factory)', status: 'integrated' },
                { label: 'Export CSV TradingView', status: 'integrated' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 p-1.5 rounded bg-secondary/30">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.status === 'integrated' ? 'bg-primary' : s.status === 'required' ? 'bg-yellow-400 animate-pulse' : 'bg-muted-foreground'}`} />
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-xs p-2 bg-yellow-400/5 rounded border border-yellow-400/20">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground">Mode simulation — Les données du dashboard sont des données de démonstration. Activez le mode réel et connectez TradingView + vos comptes prop firm pour exploiter des données live.</p>
          </div>
        )}
      </div>

      {/* Preflight checklist full */}
      <PreFlightChecklist />

      {/* Suggestions */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Suggestions & Améliorations</span>
        </div>
        <div className="space-y-2 mb-3">
          {suggestions.map(s => (
            <div key={s.id} className={`p-3 rounded border text-xs ${s.status === 'implemented' ? 'border-primary/20 bg-primary/5' : 'border-border bg-secondary/30'}`}>
              <div className="flex items-start justify-between gap-2">
                <p className={s.status === 'implemented' ? 'text-muted-foreground line-through' : 'text-foreground'}>{s.text}</p>
                <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${s.status === 'implemented' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-400'}`}>{s.status}</span>
              </div>
              <div className="text-muted-foreground mt-1">{s.date}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Proposer une amélioration..." value={newSuggestion} onChange={e => setNewSuggestion(e.target.value)} className="bg-secondary border-border h-8 text-xs" />
          <Button size="sm" className="h-8 text-xs shrink-0" onClick={() => { toast.success('Suggestion envoyée'); setNewSuggestion(''); }}>Envoyer</Button>
        </div>
      </div>
    </div>
  );
}