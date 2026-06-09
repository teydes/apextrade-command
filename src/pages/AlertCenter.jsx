import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, BellOff, Plus, Trash2, CheckCircle2, AlertTriangle, Zap, Clock,
  TrendingUp, TrendingDown, Shield, Target, RefreshCw, Volume2, VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const ALERT_TYPES = [
  { id: 'pnl_target', label: 'Objectif P&L atteint', icon: Target, color: 'text-primary' },
  { id: 'drawdown', label: 'Drawdown critique', icon: Shield, color: 'text-destructive' },
  { id: 'win_streak', label: 'Série de gains', icon: TrendingUp, color: 'text-green-400' },
  { id: 'loss_streak', label: 'Série de pertes', icon: TrendingDown, color: 'text-red-400' },
  { id: 'payout_ready', label: 'Payout disponible', icon: Bell, color: 'text-yellow-400' },
  { id: 'kill_switch', label: 'Kill Switch activé', icon: AlertTriangle, color: 'text-orange-400' },
  { id: 'news_high', label: 'Actualité impact élevé', icon: Zap, color: 'text-purple-400' },
  { id: 'session_start', label: 'Début session trading', icon: Clock, color: 'text-blue-400' },
];

const MOCK_ALERTS = [
  { id: 1, type: 'pnl_target', label: 'Objectif 500€ atteint', value: 500, active: true, triggered: false, date: null, sound: true },
  { id: 2, type: 'drawdown', label: 'Drawdown > 70%', value: 70, active: true, triggered: false, date: null, sound: true },
  { id: 3, type: 'payout_ready', label: 'Payout MFF dispo', value: 500, active: true, triggered: true, date: '2026-05-15', sound: false },
  { id: 4, type: 'kill_switch', label: 'Consécutif 3 pertes', value: 3, active: true, triggered: false, date: null, sound: true },
];

const HISTORY_MOCK = [
  { id: 1, type: 'pnl_target', message: '✅ Objectif 500€ atteint — Session NY Open terminée', time: '2026-06-09 14:32', read: true },
  { id: 2, type: 'drawdown', message: '⚠️ Drawdown 68% du max journalier — Prudence recommandée', time: '2026-06-08 11:15', read: true },
  { id: 3, type: 'kill_switch', message: '🚨 KILL SWITCH: 2 pertes consécutives — Session bloquée', time: '2026-06-07 10:02', read: false },
  { id: 4, type: 'payout_ready', message: '💰 Payout MFF disponible: 2250€ — Transférez dans 48h', time: '2026-06-06 09:00', read: false },
  { id: 5, type: 'news_high', message: '📰 NFP dans 30min — Pensez à couper vos positions ouvertes', time: '2026-06-05 14:30', read: true },
];

export default function AlertCenter() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [history, setHistory] = useState(HISTORY_MOCK);
  const [activeTab, setActiveTab] = useState('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newAlert, setNewAlert] = useState({ type: 'pnl_target', label: '', value: '', sound: true });
  const [showNewForm, setShowNewForm] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);

  const { data: trades = [] } = useQuery({
    queryKey: ['trades-alerts'],
    queryFn: () => base44.entities.Trade.list('-entry_time', 20),
  });
  const { data: reports = [] } = useQuery({
    queryKey: ['reports-alerts'],
    queryFn: () => base44.entities.DailyReport.list('-date', 7),
  });
  const { data: news = [] } = useQuery({
    queryKey: ['news-alerts'],
    queryFn: () => base44.entities.NewsEvent.list('-event_time', 10),
  });

  // Auto-check des alertes toutes les 30s
  useEffect(() => {
    if (!autoCheck) return;
    const checkAlerts = () => {
      const today = new Date().toISOString().slice(0, 10);
      const todayTrades = trades.filter(t => t.entry_time?.startsWith(today));
      const todayPnL = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      const recentLosses = todayTrades.slice(-3).filter(t => (t.pnl || 0) < 0).length;
      const todayReport = reports.find(r => r.date === today);

      alerts.forEach(alert => {
        if (!alert.active || alert.triggered) return;
        let triggered = false;
        let message = '';

        switch (alert.type) {
          case 'pnl_target':
            if (todayPnL >= alert.value) { triggered = true; message = `✅ Objectif P&L ${alert.value}€ atteint! P&L: +${todayPnL}€`; }
            break;
          case 'loss_streak':
            if (recentLosses >= alert.value) { triggered = true; message = `⚠️ ${alert.value} pertes consécutives détectées — Consider stopping`; }
            break;
          case 'kill_switch':
            if (recentLosses >= 3) { triggered = true; message = `🚨 Kill Switch activé: ${recentLosses} pertes de suite`; }
            break;
        }

        if (triggered) {
          setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, triggered: true, date: today } : a));
          const newHist = { id: Date.now(), type: alert.type, message, time: new Date().toLocaleString('fr-FR'), read: false };
          setHistory(prev => [newHist, ...prev]);
          toast.warning(message, { duration: 8000 });
          if (alert.sound && soundEnabled) {
            try { const audio = new AudioContext(); const osc = audio.createOscillator(); osc.connect(audio.destination); osc.frequency.value = 880; osc.start(); setTimeout(() => osc.stop(), 200); } catch (e) {}
          }
        }
      });

      // Alertes news
      const upcomingHigh = news.filter(n => {
        const diff = (new Date(n.event_time) - new Date()) / 60000;
        return diff > 0 && diff < 30 && n.impact === 'high' && !n.impact_alerted;
      });
      upcomingHigh.forEach(n => {
        toast.warning(`📰 ${n.title} dans moins de 30min!`, { duration: 10000 });
      });
    };

    const interval = setInterval(checkAlerts, 30000);
    checkAlerts(); // Vérification immédiate
    return () => clearInterval(interval);
  }, [alerts, trades, reports, news, autoCheck, soundEnabled]);

  const addAlert = () => {
    if (!newAlert.label || !newAlert.value) { toast.error('Remplissez tous les champs'); return; }
    setAlerts(prev => [...prev, { id: Date.now(), ...newAlert, value: parseFloat(newAlert.value), active: true, triggered: false, date: null }]);
    setNewAlert({ type: 'pnl_target', label: '', value: '', sound: true });
    setShowNewForm(false);
    toast.success('Alerte créée');
  };

  const toggleAlert = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  const deleteAlert = (id) => { setAlerts(prev => prev.filter(a => a.id !== id)); toast.success('Alerte supprimée'); };
  const resetAlert = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, triggered: false, date: null } : a));
  const markRead = (id) => setHistory(prev => prev.map(h => h.id === id ? { ...h, read: true } : h));
  const markAllRead = () => setHistory(prev => prev.map(h => ({ ...h, read: true })));

  const unreadCount = history.filter(h => !h.read).length;
  const activeAlertsCount = alerts.filter(a => a.active).length;

  const typeConfig = (type) => ALERT_TYPES.find(t => t.id === type) || ALERT_TYPES[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-400" />
            Centre d'Alertes
            {unreadCount > 0 && <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-mono">{unreadCount}</span>}
          </h1>
          <p className="text-xs text-muted-foreground">Alertes automatiques · Kill switch · Objectifs · Sécurité capital</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Auto-check</span>
            <Switch checked={autoCheck} onCheckedChange={setAutoCheck} />
          </div>
          <div className="flex items-center gap-2 text-xs">
            {soundEnabled ? <Volume2 className="w-3 h-3 text-primary" /> : <VolumeX className="w-3 h-3 text-muted-foreground" />}
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)} className="gap-1 text-xs">
            <Plus className="w-3 h-3" />Nouvelle alerte
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Alertes Actives</div>
          <div className="text-xl font-bold font-mono text-primary">{activeAlertsCount}</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Non lues</div>
          <div className={`text-xl font-bold font-mono ${unreadCount > 0 ? 'text-destructive' : 'text-primary'}`}>{unreadCount}</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Déclenchées (7j)</div>
          <div className="text-xl font-bold font-mono text-yellow-400">{alerts.filter(a => a.triggered).length}</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-[10px] text-muted-foreground mb-1">Statut Monitor</div>
          <div className={`text-sm font-bold ${autoCheck ? 'text-primary' : 'text-muted-foreground'}`}>{autoCheck ? '🟢 Actif' : '⭕ Inactif'}</div>
        </div>
      </div>

      {/* Formulaire nouvelle alerte */}
      {showNewForm && (
        <div className="card-trading border border-primary/30 bg-primary/5 space-y-3">
          <div className="text-sm font-semibold text-primary">Créer une nouvelle alerte</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={newAlert.type} onValueChange={v => setNewAlert(p => ({...p, type: v}))}>
                <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{ALERT_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Libellé</Label>
              <Input value={newAlert.label} onChange={e => setNewAlert(p => ({...p, label: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Mon alerte" />
            </div>
            <div>
              <Label className="text-xs">Valeur seuil</Label>
              <Input type="number" value={newAlert.value} onChange={e => setNewAlert(p => ({...p, value: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" placeholder="500" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={newAlert.sound} onCheckedChange={v => setNewAlert(p => ({...p, sound: v}))} />
                <span className="text-xs text-muted-foreground">Son</span>
              </div>
              <Button onClick={addAlert} className="h-8 text-xs gap-1 ml-auto"><CheckCircle2 className="w-3 h-3" />Créer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'active', label: `🔔 Alertes (${alerts.length})` },
          { id: 'history', label: `📋 Historique${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          { id: 'auto', label: '⚡ Règles Auto' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'active' && (
        <div className="space-y-2">
          {alerts.map(alert => {
            const tc = typeConfig(alert.type);
            const TypeIcon = tc.icon;
            return (
              <div key={alert.id} className={`flex items-center gap-3 p-3 rounded border text-xs transition-all ${
                alert.triggered ? 'border-yellow-400/30 bg-yellow-400/5' :
                alert.active ? 'border-border bg-secondary/20 hover:border-primary/30' :
                'border-border opacity-50'}`}>
                <TypeIcon className={`w-4 h-4 flex-shrink-0 ${tc.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold truncate">{alert.label}</span>
                    {alert.triggered && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-400">Déclenché {alert.date}</span>}
                  </div>
                  <div className="text-muted-foreground">Seuil: {alert.value} · {tc.label}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {alert.sound ? <Volume2 className="w-3 h-3 text-muted-foreground" /> : <VolumeX className="w-3 h-3 text-muted-foreground" />}
                  {alert.triggered && <button onClick={() => resetAlert(alert.id)} className="text-primary hover:text-primary/70 text-[10px] px-1.5 py-0.5 border border-primary/30 rounded">Reset</button>}
                  <Switch checked={alert.active} onCheckedChange={() => toggleAlert(alert.id)} />
                  <button onClick={() => deleteAlert(alert.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-2">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={markAllRead} className="text-xs h-7">Tout marquer lu</Button>
            </div>
          )}
          {history.map(h => {
            const tc = typeConfig(h.type);
            const TypeIcon = tc.icon;
            return (
              <div key={h.id} onClick={() => markRead(h.id)}
                className={`flex items-start gap-3 p-3 rounded border text-xs cursor-pointer transition-all ${!h.read ? 'border-primary/30 bg-primary/5' : 'border-border opacity-60 hover:opacity-80'}`}>
                <TypeIcon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${tc.color}`} />
                <div className="flex-1">
                  <p className={!h.read ? 'text-foreground' : 'text-muted-foreground'}>{h.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground text-[10px]">{h.time}</span>
                    {!h.read && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'auto' && (
        <div className="space-y-3">
          <div className="card-trading">
            <div className="text-sm font-semibold mb-3">Règles d'Automatisation</div>
            <div className="space-y-2 text-xs">
              {[
                { rule: '🎯 Si P&L journalier > objectif → Notification + proposer d\'arrêter la session', active: true },
                { rule: '🚨 Si 2 pertes consécutives → Kill Switch automatique + alerte sonore', active: true },
                { rule: '📉 Si drawdown > 70% du max journalier → Alerte orange + blocage trades', active: true },
                { rule: '💰 Si profit cumulé > 5% du compte → Notification payout éligible', active: true },
                { rule: '📰 Si news impact critique dans 30min → Alerte et rappel de fermer positions', active: true },
                { rule: '📊 Fin de session: rapport auto P&L + suggestions IA Journal', active: false },
                { rule: '🌙 Si no trade dans 2h pendant session → Reminder d\'analyser le marché', active: false },
              ].map((r, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded border ${r.active ? 'border-primary/20 bg-primary/5' : 'border-border opacity-50'}`}>
                  <span className="mt-0.5">{r.active ? '✅' : '⭕'}</span>
                  <span className={r.active ? 'text-foreground' : 'text-muted-foreground'}>{r.rule}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card-trading border border-blue-400/20">
            <div className="text-sm font-semibold text-blue-400 mb-2">Intégrations disponibles</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {['TradingView Webhook', 'Telegram Bot', 'Email (SMTP)', 'Push Browser', 'Discord Webhook', 'WhatsApp API'].map(int => (
                <div key={int} className="flex items-center gap-2 p-2 rounded border border-border text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  {int}
                  <span className="ml-auto text-[10px] text-muted-foreground/60">Bientôt</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}