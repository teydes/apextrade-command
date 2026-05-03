import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Zap, Camera, CheckCircle2, AlertTriangle, Minus, RefreshCw, Calendar, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const MOODS = ['🟢 Concentré', '🟡 Distrait', '🔴 Stressé', '🔵 Neutre', '🟠 Surconfiant'];
const MARKET_BIAS = ['Bullish', 'Bearish', 'Neutre', 'Volatile', 'Range'];

const MOCK_ENTRIES = [
  {
    id: 'm1', date: '2026-05-02', mood: '🟢 Concentré', market_bias: 'Bullish',
    pre_analysis: 'NY Open — Liquidity sweep visible sous 18420. Attente OB 18380 pour LONG avec confirmation BOS 5min.',
    trades_summary: '2 trades: +320€ (WIN OB+FVG) / -95€ (LOSS BOS trop tôt)',
    mistakes: 'Deuxième trade entré sans confirmation complète du BOS. Biais émotionnel après le premier win.',
    lessons: 'Attendre 2 closes au-dessus du niveau avant de valider le BOS. Règle anti-surconfiance.',
    net_pnl: 225, ai_score: 72, ai_feedback: null
  },
  {
    id: 'm2', date: '2026-05-01', mood: '🟡 Distrait', market_bias: 'Volatile',
    pre_analysis: 'FOMC day — Pas de trade avant 16h. Attente réaction post-news.',
    trades_summary: '1 trade: 0€ (breakeven AMD expansion interrompue)',
    mistakes: 'Clôture prématurée du trade avant TP2 par peur de reversal.',
    lessons: 'Sur les jours FOMC, si le setup est validé, tenir jusqu\'à TP1 minimum avant de gérer.',
    net_pnl: 0, ai_score: 65, ai_feedback: null
  }
];

export default function JournalIA() {
  const [entries, setEntries] = useState(MOCK_ENTRIES);
  const [selected, setSelected] = useState(MOCK_ENTRIES[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingAI, setLoadingAI] = useState(null);
  const [newEntry, setNewEntry] = useState({ date: new Date().toISOString().slice(0, 10), mood: '🔵 Neutre', market_bias: 'Neutre', pre_analysis: '', trades_summary: '', mistakes: '', lessons: '', net_pnl: '' });

  const getAIFeedback = async (entry) => {
    setLoadingAI(entry.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un coach de trading NQ Futures expert ICT/SMC/Footprint. Analyse ce journal de trading et fournis un feedback coach structuré.

Date: ${entry.date}
Humeur: ${entry.mood} | Biais marché: ${entry.market_bias}
Pré-analyse: ${entry.pre_analysis}
Résumé trades: ${entry.trades_summary}
P&L net: ${entry.net_pnl}€
Erreurs identifiées: ${entry.mistakes}
Leçons: ${entry.lessons}

Retourne UNIQUEMENT un JSON sans markdown:
{
  "score": <0-100>,
  "verdict": "<synthèse coaching en 1 phrase>",
  "strengths": ["<point fort 1>", "<point fort 2>"],
  "errors": [{"type": "<Psychologie|Technique|Risque|Timing>", "detail": "<description>", "fix": "<correction concrète>"}],
  "tomorrow_focus": "<1 priorité précise pour demain>"
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
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, ai_feedback: res, ai_score: res.score } : e));
    setSelected(prev => ({ ...prev, ai_feedback: res, ai_score: res.score }));
    setLoadingAI(null);
  };

  const addEntry = () => {
    if (!newEntry.pre_analysis) { toast.error('La pré-analyse est requise'); return; }
    const e = { ...newEntry, id: `e-${Date.now()}`, net_pnl: parseFloat(newEntry.net_pnl) || 0, ai_score: null, ai_feedback: null };
    setEntries(prev => [e, ...prev]);
    setSelected(e);
    setShowAdd(false);
    toast.success('Entrée journal ajoutée');
  };

  const scoreColor = (s) => s >= 75 ? 'text-primary' : s >= 50 ? 'text-yellow-400' : 'text-destructive';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Journal de Trading IA
          </h1>
          <p className="text-xs text-muted-foreground">Pré-analyse · Post-mortem · Coaching IA · Score de discipline</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Nouvelle Entrée</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Entrée Journal — {newEntry.date}</DialogTitle></DialogHeader>
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
                    <SelectContent>{MARKET_BIAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {[
                { key: 'pre_analysis', label: '🔭 Pré-analyse (avant trading)', placeholder: 'Structure du marché, zones clés, plan de session...' },
                { key: 'trades_summary', label: '📊 Résumé des trades', placeholder: 'Ex: 2 trades - +320€ LONG OB+FVG / -95€ SHORT BOS...' },
                { key: 'mistakes', label: '⚠️ Erreurs identifiées', placeholder: 'Qu\'est-ce qui a mal tourné ? Entrée trop tôt, sortie émotionnelle...' },
                { key: 'lessons', label: '📚 Leçons & Règles à ajouter', placeholder: 'Règle concrète à appliquer demain...' },
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
              <Button onClick={addEntry} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des entrées */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entrées ({entries.length})</div>
          {entries.map(e => (
            <button key={e.id} onClick={() => setSelected(e)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === e.id ? 'border-purple-400/50 bg-purple-400/5' : 'border-border bg-secondary/20 hover:border-border/60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{e.date}</span>
                {e.ai_score !== null && <span className={`text-xs font-mono font-bold ${scoreColor(e.ai_score)}`}>{e.ai_score}/100</span>}
              </div>
              <div className="text-[10px] text-muted-foreground">{e.mood} · {e.market_bias}</div>
              <div className={`text-xs font-mono font-bold mt-1 ${e.net_pnl > 0 ? 'text-green-400' : e.net_pnl < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                {e.net_pnl > 0 ? '+' : ''}{e.net_pnl}€
              </div>
            </button>
          ))}
        </div>

        {/* Détail + IA */}
        {selected && (
          <div className="lg:col-span-2 space-y-3">
            <div className="card-trading">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold">{selected.date}</span>
                    <span className="text-xs text-muted-foreground">{selected.mood}</span>
                    <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{selected.market_bias}</span>
                  </div>
                  <div className={`text-lg font-bold font-mono mt-1 ${selected.net_pnl > 0 ? 'text-primary' : selected.net_pnl < 0 ? 'text-destructive' : 'text-yellow-400'}`}>
                    {selected.net_pnl > 0 ? '+' : ''}{selected.net_pnl}€
                  </div>
                </div>
                <Button size="sm" className="gap-1 text-xs" onClick={() => getAIFeedback(selected)} disabled={loadingAI === selected.id}>
                  <Zap className={`w-3 h-3 ${loadingAI === selected.id ? 'animate-spin' : ''}`} />
                  {loadingAI === selected.id ? 'Analyse...' : 'Coach IA'}
                </Button>
              </div>
              <div className="space-y-3 text-xs">
                {[
                  { label: '🔭 Pré-analyse', val: selected.pre_analysis },
                  { label: '📊 Trades', val: selected.trades_summary },
                  { label: '⚠️ Erreurs', val: selected.mistakes, red: true },
                  { label: '📚 Leçons', val: selected.lessons },
                ].map(f => f.val && (
                  <div key={f.label}>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{f.label}</div>
                    <p className={`text-sm ${f.red ? 'text-orange-300' : 'text-foreground'}`}>{f.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Feedback */}
            {selected.ai_feedback && (
              <div className="card-trading border border-purple-400/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`text-2xl font-bold font-mono ${scoreColor(selected.ai_feedback.score)}`}>{selected.ai_feedback.score}</div>
                    <div className="text-[10px] text-muted-foreground">Score</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-purple-400 mb-1">🎯 Coach IA</div>
                    <div className="text-xs text-muted-foreground">{selected.ai_feedback.verdict}</div>
                  </div>
                </div>
                {selected.ai_feedback.strengths?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] text-primary font-semibold uppercase tracking-wide">Points forts</div>
                    {selected.ai_feedback.strengths.map((s, i) => (
                      <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 rounded border border-primary/20">
                        <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />{s}
                      </div>
                    ))}
                  </div>
                )}
                {selected.ai_feedback.errors?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] text-destructive font-semibold uppercase tracking-wide">Erreurs à corriger</div>
                    {selected.ai_feedback.errors.map((e, i) => (
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
                {selected.ai_feedback.tomorrow_focus && (
                  <div className="p-2 rounded border border-yellow-400/30 bg-yellow-400/5">
                    <div className="text-[10px] text-yellow-400 font-semibold mb-0.5">🎯 Focus demain</div>
                    <div className="text-xs">{selected.ai_feedback.tomorrow_focus}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}