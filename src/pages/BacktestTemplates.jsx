import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookMarked, Plus, Play, Copy, Trash2, Star, Zap, Download,
  TrendingUp, Shield, Target, BarChart2, CheckCircle2, Edit2, Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const DEFAULT_TEMPLATES = [
  {
    id: 'ict_ob_ny',
    name: 'ICT Order Block — NY Open',
    category: 'ICT/SMC',
    rating: 5,
    markets: ['Indices', 'Forex'],
    accountType: 'both',
    setup: {
      pattern: 'Order Block (OB)',
      session: 'New York Open 14:30-16:30',
      timeframe: 'M15',
      entry: 'Retournement sur OB bullish/bearish après sweep de liquidité',
      sl: 'En dessous/au dessus de l\'OB (2-5 pips)',
      tp1: '1R - Premier FVG',
      tp2: '2R - Equal Highs/Lows',
      tp3: '3R - Niveau HTF',
      rr_min: 2.0,
      win_rate_hist: 65,
    },
    rules: [
      'Identifier le HOD/LOD de la session asiatique',
      'Attendre sweep des equal highs/lows',
      'Confirmer CHoCH ou BOS sur M5',
      'Entrée sur retour dans l\'OB (M1-M5)',
      'SL sous le corps de la bougie OB',
      'Pas d\'entrée 30min avant/après news'
    ],
    notes: 'Setup le plus fiable en session NY. Excellent sur NQ, ES, EURUSD, XAUUSD.',
    winRate: 65, rr: 2.4, trades: 847
  },
  {
    id: 'fvg_retest',
    name: 'FVG Retest Multi-TF',
    category: 'ICT/SMC',
    rating: 4,
    markets: ['Forex', 'Indices', 'Or'],
    accountType: 'both',
    setup: {
      pattern: 'Fair Value Gap (FVG)',
      session: 'London + NY',
      timeframe: 'H1/M15',
      entry: 'Prix revient dans le FVG sur H1, confirmation M5',
      sl: 'Au-delà du FVG complet',
      tp1: '1.5R - Prochain swing',
      tp2: '2.5R - Structure HTF',
      tp3: '4R - Cible HTF',
      rr_min: 1.8,
      win_rate_hist: 62,
    },
    rules: [
      'FVG validé sur H1 ou H4',
      'Direction alignée avec H4/D1',
      'Volume décroissant sur le retour dans le FVG',
      'Confirmation bougie englobante sur M15',
      'Éviter FVG dans les ranges consolidés'
    ],
    notes: 'Fonctionne sur tout marché liquide. Particulièrement efficace sur XAUUSD et les majors Forex.',
    winRate: 62, rr: 2.2, trades: 634
  },
  {
    id: 'pullback_ema_trend',
    name: 'Pullback EMA Tendance',
    category: 'Classique',
    rating: 4,
    markets: ['Forex', 'Crypto', 'Actions'],
    accountType: 'personal',
    setup: {
      pattern: 'Pullback sur EMA 20/50',
      session: 'Toutes sessions',
      timeframe: 'H4/D1',
      entry: 'Retour sur EMA 20 dans tendance forte',
      sl: 'Sous l\'EMA 50 + 10 pips',
      tp1: '1R',
      tp2: '2R - Swing précédent',
      tp3: '3R+',
      rr_min: 1.5,
      win_rate_hist: 58,
    },
    rules: [
      'Tendance D1 confirmée (EMA 200)',
      'Pullback sur EMA 20 ou 50',
      'RSI 40-60 pour confirmation',
      'Bougie de renversement (englobante, pinbar)',
      'Volume supérieur à la moyenne sur l\'entrée'
    ],
    notes: 'Simple et efficace. Idéal pour débutants et comptes personnels. Marche sur crypto en tendance forte.',
    winRate: 58, rr: 2.0, trades: 1203
  },
  {
    id: 'bos_choch_smc',
    name: 'BOS + CHoCH Structure Break',
    category: 'ICT/SMC',
    rating: 4,
    markets: ['Indices', 'Forex'],
    accountType: 'both',
    setup: {
      pattern: 'BOS + CHoCH',
      session: 'London + NY Open',
      timeframe: 'M30/M15',
      entry: 'Après CHoCH confirmé sur M15, retour sur POI',
      sl: '3-5 pips sous le swing récent',
      tp1: '1R',
      tp2: '2R',
      tp3: '3.5R - Prochain niveau HTF',
      rr_min: 1.8,
      win_rate_hist: 52,
    },
    rules: [
      'Identifier la structure principale H1',
      'Attendre BOS + pull back',
      'CHoCH confirmé sur M15',
      'Entrée sur OB/FVG de la zone de retournement',
      'Taille de position réduite (setup moins fiable)'
    ],
    notes: 'Plus risqué mais excellent R:R. Ne pas forcer si structure H1 n\'est pas claire.',
    winRate: 52, rr: 2.8, trades: 412
  },
  {
    id: 'gold_session_scalp',
    name: 'Gold Session Scalp',
    category: 'Scalping',
    rating: 3,
    markets: ['Or', 'XAUUSD'],
    accountType: 'personal',
    setup: {
      pattern: 'Range + Breakout London',
      session: 'London Open 08:00-10:00',
      timeframe: 'M5/M1',
      entry: 'Breakout du range asiatique sur Gold avec volume',
      sl: '8-12 pips',
      tp1: '0.8R',
      tp2: '1.5R',
      tp3: '—',
      rr_min: 1.0,
      win_rate_hist: 70,
    },
    rules: [
      'Identifier le range 02h-07h sur XAUUSD',
      'Attendre breakout avec clôture M5 hors du range',
      'Volume > 1.5x moyenne',
      'SL retour dans le range',
      'Ne PAS trader avec PropFirm (scalping souvent interdit)'
    ],
    notes: 'UNIQUEMENT comptes personnels. Taux élevé mais R:R faible. Requiert exécution rapide MT4/MT5.',
    winRate: 70, rr: 1.4, trades: 2341
  },
  {
    id: 'crypto_trend_h4',
    name: 'Crypto Trend Following H4',
    category: 'Trend Following',
    rating: 4,
    markets: ['Crypto', 'BTC', 'ETH'],
    accountType: 'personal',
    setup: {
      pattern: 'Tendance + Retracement Fibonacci',
      session: '24h/24',
      timeframe: 'H4/D1',
      entry: 'Retracement 61.8% Fib + bougie de confirmation',
      sl: '78.6% Fib',
      tp1: '127.2% extension',
      tp2: '161.8% extension',
      tp3: '200% extension',
      rr_min: 2.5,
      win_rate_hist: 60,
    },
    rules: [
      'Tendance D1 haussière ou baissière forte',
      'Retracement 50-61.8% Fibonacci',
      'Confirmation sur H4 (bougie englobante ou pinbar)',
      'SL sous/sur le 78.6%',
      'Pas d\'entrée si news crypto majeure dans 4h'
    ],
    notes: 'Excellent sur BTC et ETH en tendance. Utiliser sur comptes perso uniquement (pas PropFirm crypto).',
    winRate: 60, rr: 2.8, trades: 589
  },
];

export default function BacktestTemplates() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [filterMarket, setFilterMarket] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '', category: 'ICT/SMC', markets: [], accountType: 'both',
    setup: { pattern: '', session: '', timeframe: 'H1', entry: '', sl: '', tp1: '', rr_min: 2, win_rate_hist: 60 },
    rules: [''], notes: '', winRate: 60, rr: 2.0, trades: 0
  });

  const categories = ['ICT/SMC', 'Classique', 'Scalping', 'Trend Following', 'Mean Reversion', 'Breakout'];
  const allMarkets = ['Forex', 'Indices', 'Crypto', 'Or', 'Commodités', 'Actions'];

  const analyzeTemplate = async (template) => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert trader. Analyse ce template de stratégie de trading et améliore-le.

Template: ${template.name}
Catégorie: ${template.category} | Marchés: ${template.markets.join(', ')}
Pattern: ${template.setup.pattern} | Session: ${template.setup.session} | TF: ${template.setup.timeframe}
Entrée: ${template.setup.entry}
SL: ${template.setup.sl}
TP: ${template.setup.tp1} / ${template.setup.tp2 || 'N/A'}
WR historique: ${template.winRate}% | R:R min: ${template.setup.rr_min}:1
Règles: ${template.rules?.join(' | ')}

Retourne UNIQUEMENT JSON:
{
  "score": <0-100>,
  "verdict": "<évaluation 2 phrases>",
  "forces": ["<force 1>", "<force 2>"],
  "faiblesses": ["<faiblesse 1>"],
  "ameliorations": ["<amélioration concrète 1>", "<amélioration 2>", "<amélioration 3>"],
  "meilleurs_marches": ["<marché optimal 1>", "<marché 2>"],
  "meilleure_session": "<session optimale>",
  "filtres_supplementaires": ["<filtre 1>", "<filtre 2>"],
  "expected_wr_optimise": <number>,
  "expected_rr_optimise": <number>,
  "compatibilite_propfirm": "oui|non|partiel",
  "compatibilite_perso": "oui",
  "note_coaching": "<conseil personnel>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" }, verdict: { type: "string" },
          forces: { type: "array", items: { type: "string" } },
          faiblesses: { type: "array", items: { type: "string" } },
          ameliorations: { type: "array", items: { type: "string" } },
          meilleurs_marches: { type: "array", items: { type: "string" } },
          meilleure_session: { type: "string" },
          filtres_supplementaires: { type: "array", items: { type: "string" } },
          expected_wr_optimise: { type: "number" }, expected_rr_optimise: { type: "number" },
          compatibilite_propfirm: { type: "string" }, compatibilite_perso: { type: "string" },
          note_coaching: { type: "string" }
        }
      }
    });
    setAiAnalysis({ ...res, templateName: template.name });
    setLoadingAI(false);
  };

  const duplicateTemplate = (template) => {
    const newT = { ...template, id: `custom_${Date.now()}`, name: `${template.name} (copie)` };
    setTemplates(p => [...p, newT]);
    toast.success('Template dupliqué');
  };

  const deleteTemplate = (id) => {
    setTemplates(p => p.filter(t => t.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success('Template supprimé');
  };

  const addTemplate = () => {
    if (!newTemplate.name) { toast.error('Nom requis'); return; }
    setTemplates(p => [...p, { ...newTemplate, id: `custom_${Date.now()}`, rating: 3 }]);
    setShowAdd(false);
    toast.success('Template créé');
  };

  const filtered = templates.filter(t => {
    if (filterCat !== 'all' && t.category !== filterCat) return false;
    if (filterMarket !== 'all' && !t.markets.includes(filterMarket)) return false;
    if (filterType !== 'all' && t.accountType !== filterType && t.accountType !== 'both') return false;
    return true;
  });

  const scoreColor = (s) => s >= 80 ? 'text-primary' : s >= 65 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-indigo-400" />
            Templates de Backtest
          </h1>
          <p className="text-xs text-muted-foreground">Stratégies pré-construites · ICT/SMC · Pullback · Scalping · PropFirm + Perso</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs"><Plus className="w-3 h-3" />Créer Template</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle>Nouveau Template</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <Label className="text-xs">Nom du template</Label>
                <Input value={newTemplate.name} onChange={e => setNewTemplate(p => ({...p, name: e.target.value}))} className="bg-secondary border-border h-8 text-xs mt-1" placeholder="Mon setup ICT..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={newTemplate.category} onValueChange={v => setNewTemplate(p => ({...p, category: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Type de compte</Label>
                  <Select value={newTemplate.accountType} onValueChange={v => setNewTemplate(p => ({...p, accountType: v}))}>
                    <SelectTrigger className="h-8 mt-1 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">PropFirm + Perso</SelectItem>
                      <SelectItem value="propfirm">PropFirm seulement</SelectItem>
                      <SelectItem value="personal">Perso seulement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Pattern / Setup</Label>
                <Input value={newTemplate.setup.pattern} onChange={e => setNewTemplate(p => ({...p, setup: {...p.setup, pattern: e.target.value}}))} className="bg-secondary border-border h-8 text-xs mt-1" />
              </div>
              <div>
                <Label className="text-xs">Description entrée</Label>
                <Textarea value={newTemplate.setup.entry} onChange={e => setNewTemplate(p => ({...p, setup: {...p.setup, entry: e.target.value}}))} className="bg-secondary border-border text-xs h-16 mt-1 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">WR historique (%)</Label>
                  <Input type="number" value={newTemplate.winRate} onChange={e => setNewTemplate(p => ({...p, winRate: parseFloat(e.target.value)}))} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
                </div>
                <div>
                  <Label className="text-xs">R:R minimum</Label>
                  <Input type="number" value={newTemplate.rr} onChange={e => setNewTemplate(p => ({...p, rr: parseFloat(e.target.value)}))} className="bg-secondary border-border h-8 text-xs mt-1 font-mono" />
                </div>
              </div>
              <Button onClick={addTemplate} className="w-full">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-7 w-36 bg-secondary border-border text-xs"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterMarket} onValueChange={setFilterMarket}>
          <SelectTrigger className="h-7 w-36 bg-secondary border-border text-xs"><SelectValue placeholder="Marché" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous marchés</SelectItem>
            {allMarkets.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 w-36 bg-secondary border-border text-xs"><SelectValue placeholder="Type compte" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="propfirm">PropFirm</SelectItem>
            <SelectItem value="personal">Personnel</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{filtered.length} templates</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste templates */}
        <div className="space-y-2">
          {filtered.map(t => (
            <button key={t.id} onClick={() => { setSelected(t); setAiAnalysis(null); }}
              className={`w-full text-left p-3 rounded-lg border transition-all ${selected?.id === t.id ? 'border-indigo-400/50 bg-indigo-400/5' : 'border-border bg-secondary/20 hover:border-border/60'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{t.name}</span>
                <div className="flex">
                  {Array.from({length: t.rating}).map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">{t.category}</span>
                <span className={`text-[10px] px-1 py-0.5 rounded ${t.accountType === 'personal' ? 'bg-cyan-400/10 text-cyan-400' : t.accountType === 'propfirm' ? 'bg-blue-400/10 text-blue-400' : 'bg-primary/10 text-primary'}`}>
                  {t.accountType === 'both' ? 'PropF+Perso' : t.accountType}
                </span>
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                <span>WR: <span className="text-primary">{t.winRate}%</span></span>
                <span>R:R: <span className="text-blue-400">{t.rr}</span></span>
                <span>{t.trades} trades</span>
              </div>
            </button>
          ))}
        </div>

        {/* Détail */}
        {selected ? (
          <div className="lg:col-span-2 space-y-3">
            <div className="card-trading">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="font-bold text-base">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{selected.category}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    {selected.markets.map(m => <span key={m} className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">{m}</span>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => analyzeTemplate(selected)} disabled={loadingAI} className="gap-1 text-xs h-7">
                    <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />IA
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicateTemplate(selected)} className="gap-1 text-xs h-7">
                    <Copy className="w-3 h-3" />Dupliquer
                  </Button>
                  <button onClick={() => deleteTemplate(selected.id)} className="text-muted-foreground hover:text-destructive p-1.5 border border-border rounded text-xs h-7 flex items-center">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                {[
                  { l: 'Win Rate', v: `${selected.winRate}%`, c: 'text-primary' },
                  { l: 'R:R min', v: `${selected.setup.rr_min}:1`, c: 'text-blue-400' },
                  { l: 'Trades hist.', v: selected.trades, c: 'text-yellow-400' },
                  { l: 'Timeframe', v: selected.setup.timeframe, c: '' },
                  { l: 'Session', v: selected.setup.session?.split(' ')[0], c: '' },
                  { l: 'Compte', v: selected.accountType === 'both' ? 'Tous' : selected.accountType, c: 'text-cyan-400' },
                ].map(k => (
                  <div key={k.l} className="p-2 rounded bg-secondary/50 text-center">
                    <div className="text-[10px] text-muted-foreground">{k.l}</div>
                    <div className={`font-bold font-mono ${k.c || 'text-foreground'}`}>{k.v}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: 'Pattern', value: selected.setup.pattern },
                  { label: 'Entrée', value: selected.setup.entry },
                  { label: 'Stop Loss', value: selected.setup.sl },
                  { label: 'TP1', value: selected.setup.tp1 },
                  { label: 'TP2', value: selected.setup.tp2 },
                  { label: 'TP3', value: selected.setup.tp3 },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="grid grid-cols-3 gap-2 p-2 rounded border border-border bg-secondary/20">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="col-span-2 text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>

              {selected.rules?.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Règles de trading</div>
                  {selected.rules.map((r, i) => (
                    <div key={i} className="flex gap-2 text-xs p-1.5 bg-primary/5 border border-primary/20 rounded mb-1">
                      <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {selected.notes && (
                <div className="mt-3 p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs">
                  <span className="text-yellow-400 font-semibold">Notes: </span>
                  <span className="text-muted-foreground">{selected.notes}</span>
                </div>
              )}
            </div>

            {/* Analyse IA */}
            {aiAnalysis && (
              <div className="card-trading border border-indigo-400/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl font-bold font-mono ${scoreColor(aiAnalysis.score)}`}>{aiAnalysis.score}/100</div>
                    <div>
                      <div className="text-xs font-semibold text-indigo-400">Analyse IA — {aiAnalysis.templateName}</div>
                      <div className="text-[10px] text-muted-foreground">{aiAnalysis.verdict}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setAiAnalysis(null)} className="h-6 text-xs">✕</Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] text-primary font-semibold uppercase mb-1">Forces</div>
                    {aiAnalysis.forces?.map((f, i) => <div key={i} className="flex gap-1.5 p-1.5 bg-primary/5 rounded border border-primary/20 mb-1"><CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />{f}</div>)}
                  </div>
                  <div>
                    <div className="text-[10px] text-yellow-400 font-semibold uppercase mb-1">Améliorations</div>
                    {aiAnalysis.ameliorations?.map((a, i) => <div key={i} className="flex gap-1.5 p-1.5 bg-yellow-400/5 rounded border border-yellow-400/20 mb-1 text-muted-foreground">→ {a}</div>)}
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <span>WR optimisé: <strong className="text-primary">{aiAnalysis.expected_wr_optimise}%</strong></span>
                  <span>R:R optimisé: <strong className="text-blue-400">{aiAnalysis.expected_rr_optimise}:1</strong></span>
                  <span>PropFirm: <strong className={aiAnalysis.compatibilite_propfirm === 'oui' ? 'text-primary' : 'text-yellow-400'}>{aiAnalysis.compatibilite_propfirm}</strong></span>
                </div>
                {aiAnalysis.note_coaching && (
                  <div className="p-2 bg-indigo-400/5 border border-indigo-400/20 rounded text-xs">
                    <span className="text-indigo-400 font-semibold">Coach: </span>
                    <span className="text-muted-foreground">{aiAnalysis.note_coaching}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 card-trading text-center py-16">
            <BookMarked className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm text-muted-foreground">Sélectionnez un template pour voir les détails et l'analyse IA</p>
          </div>
        )}
      </div>
    </div>
  );
}