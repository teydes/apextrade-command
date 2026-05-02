import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Plus, Trash2, Edit2, Save, X, CheckCircle2, XCircle, Zap, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DEFAULT_SESSIONS = [
  {
    id: 'asian',
    name: 'Asian Session',
    color: 'text-purple-400',
    border: 'border-purple-400/30',
    bg: 'bg-purple-400/5',
    open: '00:00', close: '08:00', tz: 'UTC+1',
    active: false,
    trading_allowed: false,
    note: 'Faible volume — éviter sauf setup spécifique',
    stats: { wr: 32, trades: 5, pnl: -280 },
  },
  {
    id: 'london_open',
    name: 'London Open (Kill Zone)',
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    open: '08:00', close: '10:00', tz: 'UTC+1',
    active: true,
    trading_allowed: true,
    note: 'BOS/CHoCH + FVG. Bonne liquidité, sweep des lows asiatiques',
    stats: { wr: 63, trades: 19, pnl: 1240 },
  },
  {
    id: 'london',
    name: 'London Session',
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/5',
    open: '10:00', close: '12:00', tz: 'UTC+1',
    active: true,
    trading_allowed: true,
    note: 'Réduction de volatilité — trader si setup clair uniquement',
    stats: { wr: 55, trades: 11, pnl: 420 },
  },
  {
    id: 'lunch',
    name: 'Lunch / Dead Zone',
    color: 'text-muted-foreground',
    border: 'border-border',
    bg: 'bg-secondary/30',
    open: '12:00', close: '14:30', tz: 'UTC+1',
    active: false,
    trading_allowed: false,
    note: '⚠️ Volume bas, faux breakouts fréquents — NE PAS TRADER',
    stats: { wr: 28, trades: 7, pnl: -560 },
  },
  {
    id: 'ny_open',
    name: 'NY Open (Kill Zone)',
    color: 'text-primary',
    border: 'border-primary/30',
    bg: 'bg-primary/5',
    open: '14:30', close: '16:30', tz: 'UTC+1',
    active: true,
    trading_allowed: true,
    note: '🔥 Session principale NQ. Volume max, setups AMD + ICT OB. Priorité absolue.',
    stats: { wr: 78, trades: 32, pnl: 4820 },
  },
  {
    id: 'ny_afternoon',
    name: 'NY Afternoon',
    color: 'text-yellow-400',
    border: 'border-yellow-400/30',
    bg: 'bg-yellow-400/5',
    open: '16:30', close: '18:00', tz: 'UTC+1',
    active: true,
    trading_allowed: true,
    note: 'Continuation possible si trend fort. Risque: retournement fin de journée',
    stats: { wr: 48, trades: 14, pnl: -180 },
  },
  {
    id: 'ny_close',
    name: 'NY Close',
    color: 'text-orange-400',
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/5',
    open: '18:00', close: '22:00', tz: 'UTC+1',
    active: false,
    trading_allowed: false,
    note: 'Positions à éviter — risque gap overnight',
    stats: { wr: 35, trades: 6, pnl: -120 },
  },
];

const RULE_PRESETS = [
  { label: 'Stop après 2 pertes consécutives', icon: '🛑', id: 'stop_2_losses' },
  { label: 'Kill switch si DD > 50% journalier', icon: '⚡', id: 'dd_kill' },
  { label: 'Pause obligatoire 15 min après news', icon: '📰', id: 'news_pause' },
  { label: 'Max 4 trades par session active', icon: '🎯', id: 'max_trades' },
  { label: 'TP1 → SL à BE obligatoire', icon: '🔒', id: 'be_lock' },
  { label: 'Aucun trade 30 min avant clôture', icon: '🕐', id: 'no_trade_close' },
];

export default function Sessions() {
  const [sessions, setSessions] = useState(DEFAULT_SESSIONS);
  const [rules, setRules] = useState({ stop_2_losses: true, dd_kill: true, news_pause: true, max_trades: true, be_lock: true, no_trade_close: false });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', open: '', close: '', note: '', trading_allowed: true });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState(null);

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const isActive = (s) => {
    if (!s.open || !s.close) return false;
    return currentTime >= s.open && currentTime <= s.close;
  };

  const toggleSessionActive = (id) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const toggleTradingAllowed = (id) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, trading_allowed: !s.trading_allowed } : s));
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ name: s.name, open: s.open, close: s.close, note: s.note });
  };

  const saveEdit = (id) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...editForm } : s));
    setEditingId(null);
    toast.success('Session mise à jour');
  };

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    toast.success('Session supprimée');
  };

  const addSession = () => {
    if (!newSession.name || !newSession.open || !newSession.close) {
      toast.error('Nom, heure d\'ouverture et fermeture requis');
      return;
    }
    setSessions(prev => [...prev, {
      ...newSession,
      id: `custom-${Date.now()}`,
      color: 'text-foreground',
      border: 'border-border',
      bg: 'bg-secondary/20',
      active: true,
      stats: { wr: 0, trades: 0, pnl: 0 },
    }]);
    setNewSession({ name: '', open: '', close: '', note: '', trading_allowed: true });
    setShowAdd(false);
    toast.success('Session ajoutée');
  };

  const getAISessionAdvice = async () => {
    setAiLoading(true);
    const activeSessions = sessions.filter(s => s.active);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach de trading NQ Futures expert ICT/SMC.
Voici mes sessions actives avec leurs statistiques:
${activeSessions.map(s => `- ${s.name} (${s.open}-${s.close}): WR ${s.stats?.wr || 0}%, ${s.stats?.trades || 0} trades, PnL ${s.stats?.pnl || 0}€, trading_allowed: ${s.trading_allowed}`).join('\n')}

Règles actives: ${Object.entries(rules).filter(([,v]) => v).map(([k]) => k).join(', ')}

Retourne UNIQUEMENT un JSON sans markdown:
{
  "optimal_sessions": ["<session à prioriser>"],
  "avoid_sessions": ["<session à éviter>"],
  "adjustments": [
    { "session": "<nom>", "action": "<recommandation concrète>", "priority": "haute"|"moyenne"|"basse" }
  ],
  "global_advice": "<conseil global en 2 phrases>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          optimal_sessions: { type: "array", items: { type: "string" } },
          avoid_sessions: { type: "array", items: { type: "string" } },
          adjustments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                session: { type: "string" },
                action: { type: "string" },
                priority: { type: "string" }
              }
            }
          },
          global_advice: { type: "string" }
        }
      }
    });
    setAiAdvice(res);
    setAiLoading(false);
  };

  const activeNow = sessions.find(s => isActive(s));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Gestionnaire de Sessions
          </h1>
          <p className="text-xs text-muted-foreground">Plages horaires · Règles de trading · Optimisation IA</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={getAISessionAdvice} disabled={aiLoading} className="gap-1 text-xs">
            <Zap className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Analyse...' : 'Optimiser avec IA'}
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Ajouter Session</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Nouvelle Session Personnalisée</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div><Label className="text-xs">Nom de la session</Label><Input value={newSession.name} onChange={e => setNewSession(p => ({ ...p, name: e.target.value }))} className="bg-secondary border-border h-8 mt-1 text-sm" placeholder="Ex: Pre-Market NY" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Heure ouverture (HH:MM)</Label><Input value={newSession.open} onChange={e => setNewSession(p => ({ ...p, open: e.target.value }))} className="bg-secondary border-border h-8 mt-1 text-sm" placeholder="09:30" /></div>
                  <div><Label className="text-xs">Heure fermeture (HH:MM)</Label><Input value={newSession.close} onChange={e => setNewSession(p => ({ ...p, close: e.target.value }))} className="bg-secondary border-border h-8 mt-1 text-sm" placeholder="11:00" /></div>
                </div>
                <div><Label className="text-xs">Note / stratégie</Label><Input value={newSession.note} onChange={e => setNewSession(p => ({ ...p, note: e.target.value }))} className="bg-secondary border-border h-8 mt-1 text-sm" placeholder="Description du setup attendu..." /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={newSession.trading_allowed} onCheckedChange={v => setNewSession(p => ({ ...p, trading_allowed: v }))} />
                  <Label className="text-xs">Trading autorisé dans cette session</Label>
                </div>
                <Button onClick={addSession} className="w-full">Créer la session</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Session active maintenant */}
      {activeNow && (
        <div className={`card-trading border-2 ${activeNow.trading_allowed ? 'border-primary/50 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${activeNow.trading_allowed ? 'bg-primary' : 'bg-destructive'}`} />
            <div className="flex-1">
              <span className="text-sm font-semibold">MAINTENANT : {activeNow.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{activeNow.open} → {activeNow.close}</span>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${activeNow.trading_allowed ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
              {activeNow.trading_allowed ? '✅ TRADING OK' : '🚫 TRADING BLOQUÉ'}
            </span>
          </div>
          {activeNow.note && <p className="text-xs text-muted-foreground mt-2 pl-5">{activeNow.note}</p>}
        </div>
      )}

      {/* Sessions list */}
      <div className="space-y-2">
        {sessions.map(s => {
          const live = isActive(s);
          const isEditing = editingId === s.id;
          return (
            <div key={s.id} className={`card-trading border ${s.border} ${live ? 'ring-1 ring-primary/40' : ''}`}>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1"><Label className="text-xs">Nom</Label><Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="bg-secondary border-border h-7 text-xs mt-1" /></div>
                    <div><Label className="text-xs">Ouverture</Label><Input value={editForm.open} onChange={e => setEditForm(p => ({ ...p, open: e.target.value }))} className="bg-secondary border-border h-7 text-xs mt-1" /></div>
                    <div><Label className="text-xs">Fermeture</Label><Input value={editForm.close} onChange={e => setEditForm(p => ({ ...p, close: e.target.value }))} className="bg-secondary border-border h-7 text-xs mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Note</Label><Input value={editForm.note} onChange={e => setEditForm(p => ({ ...p, note: e.target.value }))} className="bg-secondary border-border h-7 text-xs mt-1" /></div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => saveEdit(s.id)}><Save className="w-3 h-3" />Sauver</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Live indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${live ? 'bg-primary animate-pulse' : s.active ? 'bg-muted-foreground' : 'bg-muted'}`} />

                  {/* Infos session */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${s.color}`}>{s.name}</span>
                      {live && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">EN COURS</span>}
                      <span className="font-mono text-xs text-muted-foreground">{s.open} – {s.close}</span>
                      {s.tz && <span className="text-[10px] text-muted-foreground">{s.tz}</span>}
                    </div>
                    {s.note && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{s.note}</p>}
                  </div>

                  {/* Stats */}
                  {s.stats?.trades > 0 && (
                    <div className="hidden md:flex items-center gap-4 text-xs">
                      <div className="text-center">
                        <div className={`font-bold font-mono ${s.stats.wr >= 60 ? 'text-primary' : s.stats.wr >= 45 ? 'text-yellow-400' : 'text-destructive'}`}>{s.stats.wr}%</div>
                        <div className="text-[10px] text-muted-foreground">WR</div>
                      </div>
                      <div className="text-center">
                        <div className={`font-bold font-mono ${s.stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{s.stats.pnl >= 0 ? '+' : ''}{s.stats.pnl}€</div>
                        <div className="text-[10px] text-muted-foreground">{s.stats.trades} trades</div>
                      </div>
                    </div>
                  )}

                  {/* Toggles */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex flex-col items-center gap-0.5">
                      <Switch checked={s.trading_allowed} onCheckedChange={() => toggleTradingAllowed(s.id)} className="scale-75" />
                      <span className="text-[9px] text-muted-foreground">Trading</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <Switch checked={s.active} onCheckedChange={() => toggleSessionActive(s.id)} className="scale-75" />
                      <span className="text-[9px] text-muted-foreground">Actif</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(s)}><Edit2 className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteSession(s.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Règles de trading */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Règles de Discipline par Session</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {RULE_PRESETS.map(r => (
            <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${rules[r.id] ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'}`}
              onClick={() => setRules(p => ({ ...p, [r.id]: !p[r.id] }))}>
              <span className="text-base">{r.icon}</span>
              <span className="text-xs flex-1">{r.label}</span>
              {rules[r.id]
                ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                : <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* IA Advice */}
      {aiAdvice && (
        <div className="card-trading border border-primary/30 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Recommandations IA Sessions</span>
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => setAiAdvice(null)}>✕</Button>
          </div>
          <p className="text-xs text-muted-foreground">{aiAdvice.global_advice}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-primary mb-1.5">✅ Sessions à prioriser</div>
              <div className="space-y-1">
                {aiAdvice.optimal_sessions?.map((s, i) => (
                  <div key={i} className="text-xs p-2 bg-primary/5 border border-primary/20 rounded flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />{s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-destructive mb-1.5">🚫 Sessions à éviter</div>
              <div className="space-y-1">
                {aiAdvice.avoid_sessions?.map((s, i) => (
                  <div key={i} className="text-xs p-2 bg-destructive/5 border border-destructive/20 rounded flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-destructive flex-shrink-0" />{s}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {aiAdvice.adjustments?.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ajustements recommandés</div>
              {aiAdvice.adjustments.map((a, i) => {
                const cls = a.priority === 'haute' ? 'border-destructive/40 bg-destructive/5' : a.priority === 'moyenne' ? 'border-yellow-400/40 bg-yellow-400/5' : 'border-primary/30 bg-primary/5';
                const bdg = a.priority === 'haute' ? 'bg-destructive/20 text-destructive' : a.priority === 'moyenne' ? 'bg-yellow-400/20 text-yellow-400' : 'bg-primary/20 text-primary';
                return (
                  <div key={i} className={`flex gap-2 p-2 rounded border ${cls}`}>
                    <span className="text-xs font-semibold text-muted-foreground flex-shrink-0 w-24 truncate">{a.session}</span>
                    <span className="text-xs flex-1">{a.action}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded self-start flex-shrink-0 ${bdg}`}>{a.priority}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}