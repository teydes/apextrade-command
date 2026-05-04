import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Zap, CheckCircle2, AlertTriangle, RefreshCw, Calendar, TrendingUp, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const MOODS = ['🟢 Concentré', '🟡 Distrait', '🔴 Stressé', '🔵 Neutre', '🟠 Surconfiant'];
const MARKET_BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutre', 'Volatile', 'Range'];

export default function JournalIA() {
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingAI, setLoadingAI] = useState(null);
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().slice(0, 10),
    mood: '🔵 Neutre', market_bias: 'Neutre',
    pre_analysis: '', trades_summary: '', mistakes: '', lessons: '', net_pnl: ''
  });

  const qc = useQueryClient();

  // Données réelles depuis la DB
  const { data: dbReports = [], isLoading } = useQuery({
    queryKey: ['daily-reports-journal'],
    queryFn: () => base44.entities.DailyReport.list('-date', 50),
  });

  const { data: todayTrades = [] } = useQuery({
    queryKey: ['today-trades-journal'],
    queryFn: () => {
      const today = new Date().toISOString().slice(0, 10);
      return base44.entities.Trade.filter({ phase: 'live' }, '-entry_time', 20);
    },
  });

  const createReport = useMutation({
    mutationFn: (data) => base44.entities.DailyReport.create(data),
    onSuccess: () => { qc.invalidateQueries(['daily-reports-journal']); setShowAdd(false); toast.success('Entrée journal sauvegardée'); },
  });

  const updateReport = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyReport.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['daily-reports-journal']); },
  });

  // Auto-génération journal depuis les trades du jour
  const autoGenerateFromTrades = async () => {
    if (todayTrades.length === 0) { toast.error('Aucun trade aujourd\'hui à analyser'); return; }
    setAutoGenLoading(true);
    const wins = todayTrades.filter(t => t.result === 'win').length;
    const losses = todayTrades.filter(t => t.result === 'loss').length;
    const totalPnl = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const summary = todayTrades.map(t => `${t.direction} ${t.symbol} ${t.setup || ''} → ${t.pnl > 0 ? '+' : ''}${t.pnl}€ (${t.result})`).join(' | ');

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach de trading NQ Futures. Génère automatiquement un résumé de journal de trading à partir de ces données:

Trades: ${summary}
Win: ${wins}, Loss: ${losses}, P&L total: ${totalPnl}€

Génère un journal structuré et coaching. Retourne UNIQUEMENT JSON:
{
  "trades_summary": "<résumé concis des trades>",
  "mistakes": "<erreurs observées depuis les trades>",
  "lessons": "<leçon principale à retenir>",
  "score": <0-100>,
  "verdict": "<coaching 1 phrase>",
  "market_bias": "<Bullish|Bearish|Neutre|Volatile|Range>",
  "tomorrow_focus": "<priorité pour demain>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          trades_summary: { type: "string" },
          mistakes: { type: "string" },
          lessons: { type: "string" },
          score: { type: "number" },
          verdict: { type: "string" },
          market_bias: { type: "string" },
          tomorrow_focus: { type: "string" }
        }
      }
    });

    const today = new Date().toISOString().slice(0, 10);
    await createReport.mutateAsync({
      date: today,
      phase: 'live',
      total_trades: todayTrades.length,
      wins,
      losses,
      net_pnl: totalPnl,
      win_rate: todayTrades.length ? Math.round((wins / todayTrades.length) * 100) : 0,
      market_conditions: res.market_bias,
      analysis: res.verdict,
      improvements: res.lessons,
    });
    setAutoGenLoading(false);
    toast.success('Journal généré automatiquement depuis vos trades !');
  };

  const getAIFeedback = async (report) => {
    setLoadingAI(report.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach de trading NQ Futures expert ICT/SMC. Analyse ce journal de trading.

Date: ${report.date}
Trades: ${report.total_trades} | W:${report.wins} L:${report.losses}
P&L: ${report.net_pnl}€ | WR: ${report.win_rate}%
Conditions marché: ${report.market_conditions || 'N/A'}
Analyse: ${report.analysis || 'N/A'}
Améliorations: ${report.improvements || 'N/A'}

Retourne UNIQUEMENT un JSON:
{
  "score": <0-100>,
  "verdict": "<synthèse coaching>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "errors": [{"type": "<Psychologie|Technique|Risque|Timing>", "detail": "<desc>", "fix": "<correction>"}],
  "tomorrow_focus": "<1 priorité demain>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          verdict: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          errors: { type: "array", items: { type: "object", properties: { type: { type: "string" }, detail: { type: "string" }, fix: { type: "string" } } } },
          tomorrow_focus: { type: "string" }
        }
      }
    });
    await updateReport.mutateAsync({ id: report.id, data: { analysis: res.verdict } });
    setSelected(prev => ({ ...prev, _aiFeedback: res }));
    setLoadingAI(null);
    toast.success('Feedback coach IA généré');
  };

  const addManualEntry = () => {
    if (!newEntry.pre_analysis && !newEntry.trades_summary) { toast.error('Remplissez au moins un champ'); return; }
    createReport.mutate({
      date: newEntry.date,
      phase: 'backtest_local',
      net_pnl: parseFloat(newEntry.net_pnl) || 0,
      market_conditions: newEntry.market_bias,
      analysis: newEntry.pre_analysis,
      improvements: newEntry.lessons,
    });
  };

  const scoreColor = (s) => !s ? 'text-muted-foreground' : s >= 75 ? 'text-primary' : s >= 50 ? 'text-yellow-400' : 'text-destructive';

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Journal de Trading IA
          </h1>
          <p className="text-xs text-muted-foreground">Auto-généré depuis vos trades · Coaching IA · Score de discipline · {dbReports.length} entrées</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={autoGenerateFromTrades} disabled={autoGenLoading} className="gap-1 text-xs">
            <Bot className={`w-3 h-3 ${autoGenLoading ? 'animate-spin' : ''}`} />
            {autoGenLoading ? 'Génération...' : 'Auto-générer aujourd\'hui'}
          </Button>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Manuel</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Entrée Journal Manuelle — {newEntry.date}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={newEntry.date} onChange={e => setNewEntry(p => ({...p, date: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Humeur</Label>
                    <Select value={newEntry.mood} onValueChange={v => setNewEntry(p => ({...p, mood: v}))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MOODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Biais Marché</Label>
                    <Select value={newEntry.market_bias} onValueChange={v => setNewEntry(p => ({...p, market_bias: v}))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{MARKET_BIAS_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {[
                  { key: 'pre_analysis', label: '🔭 Pré-analyse', placeholder: 'Structure du marché, zones clés...' },
                  { key: 'trades_summary', label: '📊 Résumé trades', placeholder: '2 trades - +320€ LONG / -95€ SHORT...' },
                  { key: 'mistakes', label: '⚠️ Erreurs', placeholder: 'Entrée trop tôt, sortie émotionnelle...' },
                  { key: 'lessons', label: '📚 Leçons', placeholder: 'Règle concrète à appliquer demain...' },
                ].map(f => (
                  <div key={f.key}>
                    <Label className="text-xs">{f.label}</Label>
                    <Textarea value={newEntry[f.key]} onChange={e => setNewEntry(p => ({...p, [f.key]: e.target.value}))} placeholder={f.placeholder} className="bg-secondary border-border text-xs h-16 mt-1 resize-none" />
                  </div>
                ))}
                <div>
                  <Label className="text-xs">P&L Net (€)</Label>
                  <Input type="number" value={newEntry.net_pnl} onChange={e => setNewEntry(p => ({...p, net_pnl: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="ex: 225" />
                </div>
                <Button onClick={addManualEntry} className="w-full" disabled={createReport.isPending}>Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats rapides */}
      {dbReports.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Jours loggés', value: dbReports.length, color: 'text-primary' },
            { label: 'P&L total', value: `${dbReports.reduce((s, r) => s + (r.net_pnl || 0), 0) > 0 ? '+' : ''}${dbReports.reduce((s, r) => s + (r.net_pnl || 0), 0).toLocaleString()}€`, color: dbReports.reduce((s, r) => s + (r.net_pnl || 0), 0) >= 0 ? 'text-primary' : 'text-destructive' },
            { label: 'WR moyen', value: `${dbReports.filter(r => r.win_rate).length ? Math.round(dbReports.filter(r => r.win_rate).reduce((s, r) => s + r.win_rate, 0) / dbReports.filter(r => r.win_rate).length) : 0}%`, color: 'text-blue-400' },
            { label: 'Meilleur jour', value: `+${Math.max(...dbReports.map(r => r.net_pnl || 0)).toLocaleString()}€`, color: 'text-yellow-400' },
          ].map(s => (
            <div key={s.label} className="card-trading text-center py-2">
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entrées ({dbReports.length})</div>
          {dbReports.length === 0 ? (
            <div className="card-trading text-center py-8 text-xs text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Aucune entrée — Cliquez "Auto-générer" pour créer automatiquement le journal d'aujourd'hui depuis vos trades
            </div>
          ) : dbReports.map(r => (
            <button key={r.id} onClick={() => setSelected(r)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === r.id ? 'border-purple-400/50 bg-purple-400/5' : 'border-border bg-secondary/20 hover:border-border/60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{r.date}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${r.phase === 'live' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{r.phase?.replace('_', ' ')}</span>
              </div>
              {r.total_trades != null && (
                <div className="text-[10px] text-muted-foreground">{r.total_trades} trades · {r.win_rate || 0}% WR</div>
              )}
              <div className={`text-xs font-mono font-bold mt-1 ${(r.net_pnl || 0) > 0 ? 'text-green-400' : (r.net_pnl || 0) < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                {(r.net_pnl || 0) > 0 ? '+' : ''}{(r.net_pnl || 0).toLocaleString()}€
              </div>
            </button>
          ))}
        </div>

        {/* Détail */}
        {selected ? (
          <div className="lg:col-span-2 space-y-3">
            <div className="card-trading">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold">{selected.date}</span>
                    <span className="text-xs bg-secondary px-1.5 py-0.5 rounded capitalize">{selected.phase?.replace('_', ' ')}</span>
                  </div>
                  <div className={`text-lg font-bold font-mono mt-1 ${(selected.net_pnl || 0) > 0 ? 'text-primary' : (selected.net_pnl || 0) < 0 ? 'text-destructive' : 'text-yellow-400'}`}>
                    {(selected.net_pnl || 0) > 0 ? '+' : ''}{(selected.net_pnl || 0).toLocaleString()}€
                  </div>
                </div>
                <Button size="sm" className="gap-1 text-xs" onClick={() => getAIFeedback(selected)} disabled={loadingAI === selected.id}>
                  <Zap className={`w-3 h-3 ${loadingAI === selected.id ? 'animate-spin' : ''}`} />
                  {loadingAI === selected.id ? 'Analyse...' : 'Coach IA'}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                {[
                  ['Trades', selected.total_trades ?? '—'],
                  ['Wins', selected.wins ?? '—'],
                  ['Losses', selected.losses ?? '—'],
                  ['Win Rate', selected.win_rate ? `${selected.win_rate}%` : '—'],
                  ['R:R moyen', selected.avg_rr ?? '—'],
                  ['Conditions', selected.market_conditions || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="p-2 rounded bg-secondary/50 text-center">
                    <div className="text-[10px] text-muted-foreground">{l}</div>
                    <div className="font-mono font-bold text-xs">{v}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 text-xs">
                {selected.analysis && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">🔭 Analyse</div>
                    <p className="text-sm text-foreground">{selected.analysis}</p>
                  </div>
                )}
                {selected.improvements && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">📚 Améliorations</div>
                    <p className="text-sm text-foreground">{selected.improvements}</p>
                  </div>
                )}
              </div>
            </div>

            {selected._aiFeedback && (
              <div className="card-trading border border-purple-400/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold font-mono ${scoreColor(selected._aiFeedback.score)}`}>{selected._aiFeedback.score}</div>
                    <div className="text-[10px] text-muted-foreground">Score</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-purple-400 mb-1">🎯 Coach IA</div>
                    <div className="text-xs text-muted-foreground">{selected._aiFeedback.verdict}</div>
                  </div>
                </div>
                {selected._aiFeedback.strengths?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-primary font-semibold uppercase">Points forts</div>
                    {selected._aiFeedback.strengths.map((s, i) => (
                      <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 rounded border border-primary/20">
                        <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />{s}
                      </div>
                    ))}
                  </div>
                )}
                {selected._aiFeedback.errors?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-destructive font-semibold uppercase">Erreurs à corriger</div>
                    {selected._aiFeedback.errors.map((e, i) => (
                      <div key={i} className="p-2 rounded border border-destructive/30 bg-destructive/5">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                          <span className="text-xs font-semibold">{e.type}</span>
                          <span className="text-[10px] text-muted-foreground">— {e.detail}</span>
                        </div>
                        <div className="text-xs text-green-400 pl-4">→ {e.fix}</div>
                      </div>
                    ))}
                  </div>
                )}
                {selected._aiFeedback.tomorrow_focus && (
                  <div className="p-2 rounded border border-yellow-400/30 bg-yellow-400/5">
                    <div className="text-[10px] text-yellow-400 font-semibold mb-0.5">🎯 Focus demain</div>
                    <div className="text-xs">{selected._aiFeedback.tomorrow_focus}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 card-trading text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">Sélectionnez une entrée ou générez automatiquement le journal du jour</p>
          </div>
        )}
      </div>
    </div>
  );
}