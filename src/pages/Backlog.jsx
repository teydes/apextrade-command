import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ListChecks, Zap, Plus, ChevronUp, ChevronDown, RefreshCw, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const INITIAL_BACKLOG = [
  { id: 1, title: 'Connexion Webhook TradingView → bot Python auto-exec', priority: 'critical', category: 'automation', status: 'in_progress', effort: 'high', impact: 10, notes: 'Bloquant pour le live trading automatisé' },
  { id: 2, title: 'Système de scoring signaux multi-confluence (score 0-100)', priority: 'critical', category: 'signal', status: 'done', effort: 'medium', impact: 9, notes: 'OB + FVG + Delta + volume' },
  { id: 3, title: 'Kill switch automatique si DD > 70%', priority: 'high', category: 'risk', status: 'done', effort: 'low', impact: 9, notes: 'Règle de survie non négociable' },
  { id: 4, title: 'Backtests automatisés par setup (stats WR / R:R)', priority: 'high', category: 'backtest', status: 'done', effort: 'medium', impact: 8, notes: 'Identifier les setups à abandonner' },
  { id: 5, title: 'Intégration calendrier news + blocage auto trading', priority: 'high', category: 'news', status: 'in_progress', effort: 'medium', impact: 8, notes: 'FOMC, CPI, NFP' },
  { id: 6, title: 'Copy-trading vers 5 comptes MFF simultanés', priority: 'high', category: 'scaling', status: 'todo', effort: 'high', impact: 9, notes: 'Levier × 5 du PnL journalier' },
  { id: 7, title: 'Journal automatique horodaté avec classification des événements', priority: 'medium', category: 'journal', status: 'done', effort: 'low', impact: 7, notes: 'trade / risk / filter / info' },
  { id: 8, title: 'Module Snowball multi-comptes avec projection visuelle', priority: 'medium', category: 'finance', status: 'done', effort: 'medium', impact: 7, notes: 'Cible 1M€ — roadmap MFF' },
  { id: 9, title: 'Rapport hebdomadaire IA (audit performance + recommandations)', priority: 'medium', category: 'ai', status: 'todo', effort: 'low', impact: 7, notes: 'Envoi email automatique chaque vendredi' },
  { id: 10, title: 'Passage phase Demo MFF (50K)', priority: 'medium', category: 'propfirm', status: 'todo', effort: 'medium', impact: 8, notes: 'Conditionné à WR ≥ 60% + PnL > 500€' },
  { id: 11, title: 'Optimisation lot automatique selon DD restant', priority: 'medium', category: 'risk', status: 'todo', effort: 'medium', impact: 7, notes: 'Réduction 0.5x après 1 perte' },
  { id: 12, title: 'Alertes Telegram pour signaux haute conviction (score ≥ 85)', priority: 'low', category: 'notification', status: 'todo', effort: 'low', impact: 6, notes: 'Webhook Telegram' },
  { id: 13, title: 'Dashboard fiscal SASU — simulation charges réelles', priority: 'low', category: 'fiscal', status: 'in_progress', effort: 'low', impact: 5, notes: 'IS + cotisations + dividendes' },
  { id: 14, title: 'Module conseil IA — débat multi-agents sur le marché', priority: 'low', category: 'ai', status: 'done', effort: 'high', impact: 6, notes: 'ICT + Footprint + Market Profile + Risk' },
];

const priorityConfig = {
  critical: { cls: 'text-red-400 bg-red-400/10 border-red-400/30', label: 'CRITIQUE', order: 0 },
  high:     { cls: 'text-orange-400 bg-orange-400/10 border-orange-400/30', label: 'HAUTE', order: 1 },
  medium:   { cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'MOYENNE', order: 2 },
  low:      { cls: 'text-muted-foreground bg-secondary border-border', label: 'BASSE', order: 3 },
};

const statusConfig = {
  done:        { cls: 'text-primary bg-primary/10', label: '✅ Done', icon: CheckCircle2 },
  in_progress: { cls: 'text-blue-400 bg-blue-400/10', label: '🔄 En cours', icon: RefreshCw },
  todo:        { cls: 'text-muted-foreground bg-secondary', label: '⏳ À faire', icon: Clock },
};

const categoryColors = {
  automation: 'bg-purple-400/20 text-purple-400',
  signal: 'bg-primary/20 text-primary',
  risk: 'bg-red-400/20 text-red-400',
  backtest: 'bg-blue-400/20 text-blue-400',
  news: 'bg-yellow-400/20 text-yellow-400',
  scaling: 'bg-green-500/20 text-green-400',
  journal: 'bg-cyan-400/20 text-cyan-400',
  finance: 'bg-emerald-400/20 text-emerald-400',
  ai: 'bg-violet-400/20 text-violet-400',
  propfirm: 'bg-orange-400/20 text-orange-400',
  notification: 'bg-pink-400/20 text-pink-400',
  fiscal: 'bg-indigo-400/20 text-indigo-400',
};

export default function Backlog() {
  const [items, setItems] = useState(INITIAL_BACKLOG);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', priority: 'medium', category: 'automation', notes: '' });
  const [aiSuggestions, setAiSuggestions] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const filtered = items
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .filter(i => filterPriority === 'all' || i.priority === filterPriority)
    .sort((a, b) => priorityConfig[a.priority].order - priorityConfig[b.priority].order || b.impact - a.impact);

  const toggleStatus = (id) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
      return { ...i, status: cycle[i.status] };
    }));
  };

  const addItem = () => {
    if (!newItem.title) return;
    setItems(prev => [...prev, { ...newItem, id: Date.now(), status: 'todo', effort: 'medium', impact: 6 }]);
    setNewItem({ title: '', priority: 'medium', category: 'automation', notes: '' });
    setShowAdd(false);
    toast.success('Tâche ajoutée au backlog');
  };

  const getAIPrioritization = async () => {
    setLoadingAI(true);
    const todoItems = items.filter(i => i.status !== 'done');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un chef de projet technique spécialisé en trading algorithmique.
Voici le backlog d'un trader automatisé qui développe un système de trading institutionnel sur NQ Futures:

${todoItems.map(i => `- [${i.priority.toUpperCase()}] ${i.title} | Impact: ${i.impact}/10 | Notes: ${i.notes}`).join('\n')}

Analyse ce backlog et donne:
1. Top 3 tâches à faire IMMÉDIATEMENT (bloquantes ou ROI maximal)
2. Tâches pouvant être parallélisées
3. Tâches à déléguer ou automatiser
4. Estimation semaines pour atteindre le live trading complet
5. Risques si certaines tâches sont skippées

Sois direct et actionnable.`,
    });
    setAiSuggestions(res);
    setLoadingAI(false);
  };

  const done = items.filter(i => i.status === 'done').length;
  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const todo = items.filter(i => i.status === 'todo').length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Backlog IA — Feuille de Route
          </h1>
          <p className="text-xs text-muted-foreground">Priorisé par impact · Suivi de progression · Recommandations IA</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={getAIPrioritization} disabled={loadingAI} className="gap-1 text-xs">
            <Zap className={`w-3.5 h-3.5 ${loadingAI ? 'animate-pulse text-primary' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Prioriser par IA'}
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" />Ajouter
          </Button>
        </div>
      </div>

      {/* Progression globale */}
      <div className="card-trading">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Progression globale</span>
          <span className="font-mono text-primary font-bold">{pct}%</span>
        </div>
        <div className="progress-bar mb-2">
          <div className="progress-bar-fill" style={{ width: `${pct}%`, background: '#00FF88' }} />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-primary">✅ {done} terminés</span>
          <span className="text-blue-400">🔄 {inProgress} en cours</span>
          <span className="text-muted-foreground">⏳ {todo} à faire</span>
        </div>
      </div>

      {/* Formulaire ajout rapide */}
      {showAdd && (
        <div className="card-trading border-primary/20 space-y-2">
          <div className="text-xs font-semibold text-primary">Nouvelle tâche</div>
          <Input placeholder="Titre de la tâche..." value={newItem.title} onChange={e => setNewItem(p => ({ ...p, title: e.target.value }))}
            className="bg-secondary border-border text-sm h-8" />
          <Input placeholder="Notes / contexte..." value={newItem.notes} onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))}
            className="bg-secondary border-border text-sm h-8" />
          <div className="flex gap-2">
            {['critical', 'high', 'medium', 'low'].map(p => (
              <button key={p} onClick={() => setNewItem(prev => ({ ...prev, priority: p }))}
                className={`text-[10px] px-2 py-1 rounded border ${newItem.priority === p ? priorityConfig[p].cls : 'text-muted-foreground border-border'}`}>
                {priorityConfig[p].label}
              </button>
            ))}
            <Button size="sm" onClick={addItem} className="ml-auto text-xs h-7">Ajouter</Button>
          </div>
        </div>
      )}

      {/* IA Suggestions */}
      {aiSuggestions && (
        <div className="card-trading border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">Recommandations IA</span>
          </div>
          <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/20 rounded p-3">{aiSuggestions}</div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {['all', 'todo', 'in_progress', 'done'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-[10px] px-2 py-1 rounded ${filterStatus === s ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {s === 'all' ? 'Tous' : s === 'in_progress' ? 'En cours' : s === 'done' ? 'Terminés' : 'À faire'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['all', 'critical', 'high', 'medium', 'low'].map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`text-[10px] px-2 py-1 rounded border ${filterPriority === p ? (p === 'all' ? 'bg-secondary text-foreground border-border' : priorityConfig[p]?.cls) : 'text-muted-foreground border-transparent hover:text-foreground'}`}>
              {p === 'all' ? 'Toutes' : priorityConfig[p]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map(item => {
          const pc = priorityConfig[item.priority];
          const sc = statusConfig[item.status];
          const StatusIcon = sc.icon;
          return (
            <div key={item.id} className={`card-trading flex items-start gap-3 ${item.status === 'done' ? 'opacity-60' : ''}`}>
              <button onClick={() => toggleStatus(item.id)} className="flex-shrink-0 mt-0.5 hover:opacity-80 transition-opacity">
                <StatusIcon className={`w-4 h-4 ${item.status === 'done' ? 'text-primary' : item.status === 'in_progress' ? 'text-blue-400' : 'text-muted-foreground'}`} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${item.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.title}</span>
                </div>
                {item.notes && <div className="text-[11px] text-muted-foreground mt-0.5">{item.notes}</div>}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${pc.cls}`}>{pc.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColors[item.category] || 'bg-secondary text-muted-foreground'}`}>{item.category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${sc.cls}`}>{sc.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">Impact: <span className="text-foreground font-mono">{item.impact}/10</span></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}