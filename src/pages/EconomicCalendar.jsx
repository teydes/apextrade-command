import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertTriangle, Brain, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const IMPACT_COLORS = {
  critical: { bg: 'bg-danger-red/20', text: 'text-danger-red', label: 'CRITIQUE' },
  high: { bg: 'bg-warning-yellow/20', text: 'text-warning-yellow', label: 'ÉLEVÉ' },
  medium: { bg: 'bg-accent/20', text: 'text-accent', label: 'MOYEN' },
  low: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'FAIBLE' },
};

const MOCK_EVENTS = [
  { title: 'CPI US', category: 'CPI', impact: 'critical', event_time: new Date(Date.now() + 2 * 3600000).toISOString(), forecast: '3.1%', previous: '3.2%', notes: 'Inflation US' },
  { title: 'FOMC Rate Decision', category: 'FOMC', impact: 'critical', event_time: new Date(Date.now() + 6 * 3600000).toISOString(), forecast: '5.25-5.50%', previous: '5.25-5.50%', notes: 'Decision de taux Fed' },
  { title: 'NFP Report', category: 'NFP', impact: 'critical', event_time: new Date(Date.now() + 24 * 3600000).toISOString(), forecast: '180K', previous: '175K', notes: 'Emploi non-agricole US' },
  { title: 'GDP Q/Q', category: 'GDP', impact: 'high', event_time: new Date(Date.now() + 48 * 3600000).toISOString(), forecast: '2.1%', previous: '2.4%' },
  { title: 'PPI US', category: 'PPI', impact: 'medium', event_time: new Date(Date.now() + 72 * 3600000).toISOString(), forecast: '0.3%', previous: '0.2%' },
  { title: 'Fed Speech - Powell', category: 'Fed Speech', impact: 'high', event_time: new Date(Date.now() + 96 * 3600000).toISOString(), notes: 'Discours du chairman Fed' },
  { title: 'PMI Manufacturing', category: 'PMI', impact: 'medium', event_time: new Date(Date.now() + 120 * 3600000).toISOString(), forecast: '49.5', previous: '49.0' },
];

export default function EconomicCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    base44.entities.NewsEvent.list('event_time', 50).then(data => {
      const all = [...(data || []), ...MOCK_EVENTS];
      all.sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
      setEvents(all.filter(e => new Date(e.event_time) > new Date(Date.now() - 3600000)));
      setLoading(false);
    }).catch(() => { setEvents(MOCK_EVENTS); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter(e => e.impact === filter);
  }, [events, filter]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const upcoming = events.slice(0, 5).map(e => `${e.title} (${e.impact}, ${new Date(e.event_time).toLocaleString()})`).join('; ');
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Calendrier économique: ${upcoming}. Analyse: 1) Impact sur les marchés (indices, forex, commodities), 2) Volatilité attendue, 3) Recommandation de trading (éviter, hedge, ou opportunity). Court.`,
        response_json_schema: { type: 'object', properties: { market_impact: { type: 'string' }, volatility: { type: 'string' }, recommendation: { type: 'string' } } }
      });
      setAiAnalysis(res);
    } catch (e) { setAiAnalysis({ market_impact: 'Erreur', volatility: '', recommendation: '' }); }
    setAiLoading(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Calendar className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Economic Calendar</h1>
          <p className="text-sm text-muted-foreground">Événements macro avec impact et recommandations de trading</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'critical', 'high', 'medium', 'low'].map(f => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Tous' : IMPACT_COLORS[f]?.label || f}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((event, i) => {
          const impact = IMPACT_COLORS[event.impact] || IMPACT_COLORS.medium;
          const eventDate = new Date(event.event_time);
          const hoursUntil = (eventDate - new Date()) / 3600000;
          return (
            <Card key={i} className="card-trading">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-sm">{event.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${impact.bg} ${impact.text}`}>{impact.label}</span>
                      {event.trading_blocked && <Badge variant="destructive" className="text-xs">Trading bloqué</Badge>}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      {event.forecast && <div><span className="text-muted-foreground">Forecast:</span> <span className="font-mono text-accent">{event.forecast}</span></div>}
                      {event.previous && <div><span className="text-muted-foreground">Previous:</span> <span className="font-mono text-muted-foreground">{event.previous}</span></div>}
                      <div><span className="text-muted-foreground">Catégorie:</span> <span className="font-mono">{event.category}</span></div>
                    </div>
                    {event.notes && <p className="text-xs text-muted-foreground mt-2">{event.notes}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><Clock className="w-3 h-3" /> {eventDate.toLocaleString()}</div>
                    <div className={`text-sm font-mono font-bold ${hoursUntil < 2 ? 'text-danger-red' : hoursUntil < 6 ? 'text-warning-yellow' : 'text-primary'}`}>
                      {hoursUntil < 24 ? `Dans ${hoursUntil.toFixed(1)}h` : `Dans ${(hoursUntil / 24).toFixed(1)}j`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Analyse IA du Calendrier</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Analyser l'impact marché
          </Button>
          {aiAnalysis && (
            <div className="space-y-2 text-sm">
              <div><span className="text-primary font-bold">Impact marché:</span> {aiAnalysis.market_impact}</div>
              <div><span className="text-primary font-bold">Volatilité:</span> {aiAnalysis.volatility}</div>
              <div><span className="text-primary font-bold">Recommandation:</span> {aiAnalysis.recommendation}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}