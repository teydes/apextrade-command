import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, AlertTriangle, RefreshCw, Zap, Plus, TrendingUp, TrendingDown, Minus, Globe, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, addMinutes, isWithinInterval, subMinutes } from 'date-fns';

const upcomingEvents = [
  { id: 1, title: 'FOMC Meeting Minutes', category: 'FOMC', impact: 'critical', event_time: new Date(Date.now() + 3600000 * 2).toISOString(), forecast: '--', previous: '5.25%', trading_blocked: true, block_minutes_before: 10, block_minutes_after: 20 },
  { id: 2, title: 'Initial Jobless Claims', category: 'NFP', impact: 'high', event_time: new Date(Date.now() + 3600000 * 5).toISOString(), forecast: '225K', previous: '220K', trading_blocked: true, block_minutes_before: 5, block_minutes_after: 10 },
  { id: 3, title: 'Core PPI m/m', category: 'PPI', impact: 'medium', event_time: new Date(Date.now() + 3600000 * 8).toISOString(), forecast: '0.2%', previous: '0.3%', trading_blocked: false, block_minutes_before: 5, block_minutes_after: 5 },
  { id: 4, title: 'Fed Chair Powell Speech', category: 'Fed Speech', impact: 'critical', event_time: new Date(Date.now() + 3600000 * 24).toISOString(), forecast: '--', previous: '--', trading_blocked: true, block_minutes_before: 15, block_minutes_after: 30 },
];

const impactColors = {
  low: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  critical: 'text-red-400 bg-red-400/10 border-red-400/20',
};

function isBlocked(event) {
  if (!event.trading_blocked) return false;
  const now = new Date();
  const evTime = new Date(event.event_time);
  const blockStart = subMinutes(evTime, event.block_minutes_before || 5);
  const blockEnd = addMinutes(evTime, event.block_minutes_after || 10);
  return isWithinInterval(now, { start: blockStart, end: blockEnd });
}

function timeUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff < 0) return 'Passé';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `dans ${h}h${m}m`;
  return `dans ${m}m`;
}

// Contexte macro global
const MACRO_CONTEXT = {
  biais: 'bearish',
  fedRate: '5.25-5.50%',
  inflationTrend: 'declining',
  nqWeeklyBias: 'distribution',
  vix: 18.4,
  dxy: 104.2,
  sp500Trend: 'sideways',
  keyLevels: ['19 450 (support majeur)', '19 900 (résistance)', '20 200 (ATH zone)'],
  weeklyNote: 'Semaine FOMC — réduction de taille recommandée. Éviter NY Afternoon.',
};

export default function News() {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState('calendar');
  const [newEvent, setNewEvent] = useState({ title: '', category: 'FOMC', impact: 'high', event_time: '' });
  const qc = useQueryClient();

  const { data: dbEvents = [] } = useQuery({
    queryKey: ['news-events'],
    queryFn: () => base44.entities.NewsEvent.list('-event_time', 20)
  });

  const addEvent = useMutation({
    mutationFn: d => base44.entities.NewsEvent.create(d),
    onSuccess: () => { qc.invalidateQueries(['news-events']); setShowAdd(false); toast.success('Événement ajouté'); }
  });

  const allEvents = [...upcomingEvents, ...dbEvents];
  const anyBlocked = allEvents.some(isBlocked);
  const blockedCount = allEvents.filter(e => e.trading_blocked).length;

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un expert macro-économiste spécialisé dans les marchés futures NQ (Nasdaq). 
      Analyse les événements économiques suivants pour aujourd'hui et donne ton analyse d'impact sur le NQ Futures:
      ${allEvents.slice(0, 5).map(e => `- ${e.title} (${e.category}, impact: ${e.impact})`).join('\n')}
      
      Donne:
      1. Le biais du marché aujourd'hui (bullish/bearish/neutre)
      2. Les niveaux clés à surveiller
      3. Les fenêtres de trading recommandées
      4. Les risques principaux
      
      Sois concis et actionnable pour un trader scalping NQ.`,
      add_context_from_internet: true,
    });
    setAiAnalysis(res);
    setLoadingAI(false);
  };

  const biasBadge = MACRO_CONTEXT.biais === 'bearish'
    ? { icon: TrendingDown, cls: 'text-destructive bg-destructive/10 border-destructive/30', label: 'BEARISH' }
    : MACRO_CONTEXT.biais === 'bullish'
    ? { icon: TrendingUp, cls: 'text-primary bg-primary/10 border-primary/30', label: 'BULLISH' }
    : { icon: Minus, cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', label: 'NEUTRE' };
  const BiasIcon = biasBadge.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-yellow-400" />
            Actualités & Macro
          </h1>
          <p className="text-xs text-muted-foreground">Calendrier économique · Contexte macro · Analyse IA</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Biais global rapide */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-bold ${biasBadge.cls}`}>
            <BiasIcon className="w-3.5 h-3.5" /> {biasBadge.label}
          </div>
          <div className="text-xs text-muted-foreground font-mono">VIX {MACRO_CONTEXT.vix} · DXY {MACRO_CONTEXT.dxy}</div>
          {anyBlocked && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> TRADING BLOQUÉ
            </div>
          )}
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="w-3 h-3" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Ajouter un Événement</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <div><Label className="text-xs">Titre</Label><Input value={newEvent.title} onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))} className="bg-secondary border-border mt-1 h-8" /></div>
                <div><Label className="text-xs">Date/Heure</Label><Input type="datetime-local" value={newEvent.event_time} onChange={e => setNewEvent(p => ({ ...p, event_time: e.target.value }))} className="bg-secondary border-border mt-1 h-8" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Catégorie</Label>
                    <Select value={newEvent.category} onValueChange={v => setNewEvent(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{['FOMC','CPI','NFP','GDP','PPI','PMI','Fed Speech','Other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">Impact</Label>
                    <Select value={newEvent.impact} onValueChange={v => setNewEvent(p => ({ ...p, impact: v }))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>{['low','medium','high','critical'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button onClick={() => addEvent.mutate(newEvent)} className="w-full mt-2">Enregistrer</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'calendar', label: '📅 Calendrier' },
          { id: 'macro', label: '🌍 Contexte Macro' },
          { id: 'ai', label: '🤖 Analyse IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB MACRO */}
      {activeTab === 'macro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Fed Rate', value: MACRO_CONTEXT.fedRate, note: 'Stable depuis Nov 2023', color: 'text-yellow-400' },
              { label: 'Inflation', value: MACRO_CONTEXT.inflationTrend === 'declining' ? '↘ Déclin' : '↗ Hausse', note: 'CPI sous 3.5%', color: 'text-primary' },
              { label: 'VIX', value: MACRO_CONTEXT.vix, note: 'Volatilité modérée', color: MACRO_CONTEXT.vix > 20 ? 'text-destructive' : 'text-primary' },
              { label: 'DXY', value: MACRO_CONTEXT.dxy, note: 'Dollar fort', color: 'text-yellow-400' },
            ].map(m => (
              <div key={m.label} className="card-trading text-center">
                <div className="text-[10px] text-muted-foreground mb-1">{m.label}</div>
                <div className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{m.note}</div>
              </div>
            ))}
          </div>
          <div className="card-trading">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Niveaux clés NQ — Semaine</span>
            </div>
            <div className="space-y-2">
              {MACRO_CONTEXT.keyLevels.map((lvl, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${i === 0 ? 'bg-primary' : i === 1 ? 'bg-yellow-400' : 'bg-destructive'}`} />
                  <span className="font-mono text-foreground">{lvl}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-yellow-400/10 border border-yellow-400/20 rounded text-xs text-yellow-400">
              📌 {MACRO_CONTEXT.weeklyNote}
            </div>
          </div>
        </div>
      )}

      {/* TAB AI */}
      {activeTab === 'ai' && (
        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Analyse Macro IA — NQ Futures</span>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={getAIAnalysis} disabled={loadingAI}>
              <RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? 'Analyse...' : 'Analyser'}
            </Button>
          </div>
          {aiAnalysis ? (
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/20 rounded p-3">{aiAnalysis}</div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-10">
              <Zap className="w-8 h-8 mx-auto mb-3 opacity-20" />
              Cliquez sur "Analyser" pour une analyse macro IA complète : biais, niveaux, fenêtres, risques
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Events list */}
        <div className="lg:col-span-2 space-y-2">
          {allEvents.map((ev, i) => {
            const blocked = isBlocked(ev);
            return (
              <div key={ev.id || i} className={`card-trading flex items-center gap-3 ${blocked ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                <div className={`w-1 self-stretch rounded-full ${ev.impact === 'critical' ? 'bg-red-500' : ev.impact === 'high' ? 'bg-orange-400' : ev.impact === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{ev.title}</span>
                    {blocked && <span className="text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded animate-pulse">BLOQUÉ</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{format(new Date(ev.event_time), 'dd/MM HH:mm')}</span>
                    <span>·</span>
                    <span className={`${impactColors[ev.impact]} px-1.5 py-0.5 rounded border text-[10px]`}>{ev.impact}</span>
                    <span>{ev.category}</span>
                    {ev.trading_blocked && <span className="text-destructive">±{ev.block_minutes_before}m bloqué</span>}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono text-primary">{timeUntil(ev.event_time)}</div>
                  {ev.forecast && <div className="text-muted-foreground">Prev: {ev.previous}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="card-trading space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Résumé du jour</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Événements total</span><span className="font-mono">{allEvents.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">À impact critique/high</span><span className="font-mono text-destructive">{allEvents.filter(e => e.impact === 'critical' || e.impact === 'high').length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bloquants actifs</span><span className="font-mono">{blockedCount}</span></div>
          </div>
          <div className={`p-2 rounded border text-xs ${biasBadge.cls}`}>
            <BiasIcon className="w-3 h-3 inline mr-1" />
            Biais NQ: <strong>{biasBadge.label}</strong> — {MACRO_CONTEXT.nqWeeklyBias}
          </div>
          <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={getAIAnalysis} disabled={loadingAI}>
            <RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse IA...' : 'Analyse IA rapide'}
          </Button>
          {aiAnalysis && <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/20 rounded p-2 max-h-48 overflow-y-auto">{aiAnalysis}</div>}
        </div>
      </div>
      )}
    </div>
  );
}