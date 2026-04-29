import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Newspaper, AlertTriangle, Clock, RefreshCw, Zap, Plus } from 'lucide-react';
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

export default function News() {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-yellow-400" />
            Actualités & Macro
          </h1>
          <p className="text-xs text-muted-foreground">Calendrier économique · Analyse IA · Blocages automatiques</p>
        </div>
        <div className="flex gap-2">
          {anyBlocked && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-destructive/20 border border-destructive/30 text-destructive text-xs font-bold animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" /> TRADING BLOQUÉ — NEWS
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

        {/* AI Analysis */}
        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Analyse Macro IA</span>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={getAIAnalysis} disabled={loadingAI}>
              <RefreshCw className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
              {loadingAI ? 'Analyse...' : 'Analyser'}
            </Button>
          </div>
          {aiAnalysis ? (
            <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{aiAnalysis}</div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8">
              Cliquez sur "Analyser" pour obtenir une analyse macro IA des événements du jour et leur impact sur le NQ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}