import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BookMarked, ChevronDown, ChevronUp, Zap, CheckCircle2, XCircle, Eye, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const SETUPS = [
  {
    id: 'ict_ob',
    name: 'ICT Order Block',
    category: 'ICT/SMC',
    tags: ['NY Open', 'London KZ', 'Trending'],
    winRate: 68, trades: 47, avgRR: 2.4,
    description: 'Identifier le dernier bearish/bullish candle avant un BOS. Entrer au retest du OB en confluence avec FVG.',
    entry: [
      'BOS validé sur H1 minimum',
      'OB identifié (dernier candle opposé avant le mouvement)',
      'FVG présent entre OB et BOS',
      'Entrée au 50% du OB ou au FVG',
      'Volume confirme (footprint optionnel)',
    ],
    invalidation: [
      'Prix clôture DANS le OB (pas de rejet)',
      'News FOMC/CPI dans les 30 min',
      'Daily drawdown > 50% utilisé',
    ],
    tp: ['TP1: FVG suivant (+1R)', 'TP2: Liquidity pool (+2R)', 'TP3: HTF OB (+3R)'],
    sl: 'En dessous / au-dessus du OB (extrême)',
    session_priority: 'NY Open, London Kill Zone',
    color: 'border-primary/40 bg-primary/3',
    badge: 'bg-primary/20 text-primary',
  },
  {
    id: 'amd',
    name: 'AMD Expansion',
    category: 'AMD/IFVG',
    tags: ['NY Open', 'Directional'],
    winRate: 72, trades: 31, avgRR: 3.1,
    description: 'Accumulation (manipulation Asian lows/highs) → Distribution → Expansion. Trader la phase D uniquement.',
    entry: [
      'Manipulation des lows/highs asiatiques confirmée',
      'CHoCH sur M15 après la manipulation',
      'IFVG créé lors du CHoCH',
      'Entrée au fill du IFVG',
      'Biais daily aligné',
    ],
    invalidation: [
      'Pas de manipulation claire des lows/highs asiatiques',
      'CHoCH sur timeframe trop bas (< M5)',
      'Spread élevé (> 2 ticks NQ)',
    ],
    tp: ['TP1: Old High/Low (+1.5R)', 'TP2: Premium/Discount array (+2.5R)', 'TP3: HTF Target (+3R+)'],
    sl: 'Extrême de la manipulation',
    session_priority: 'NY Open uniquement',
    color: 'border-blue-400/40 bg-blue-400/3',
    badge: 'bg-blue-400/20 text-blue-400',
  },
  {
    id: 'fvg_fill',
    name: 'FVG Fill',
    category: 'ICT/SMC',
    tags: ['Scalp', 'Any Session'],
    winRate: 61, trades: 52, avgRR: 1.9,
    description: 'Trade le fill d\'un Fair Value Gap en confluence avec une structure. Setup plus fréquent mais WR inférieur.',
    entry: [
      'FVG identifié sur M5 ou M15',
      'Prix approche le FVG depuis l\'extérieur',
      'OB ou support/résistance au niveau du FVG',
      'Entrée au 50% du FVG',
    ],
    invalidation: [
      'FVG déjà partiellement fillé (< 25% restant)',
      'Contre-tendance HTF sans confluence',
      'Lunch / Dead Zone (12h-14h30)',
    ],
    tp: ['TP1: Opposite FVG (+1R)', 'TP2: Structure level (+1.8R)'],
    sl: 'Au-delà du FVG (-1R)',
    session_priority: 'London, NY Open',
    color: 'border-cyan-400/40 bg-cyan-400/3',
    badge: 'bg-cyan-400/20 text-cyan-400',
  },
  {
    id: 'bos_choch',
    name: 'BOS + CHoCH Entry',
    category: 'ICT/SMC',
    tags: ['Reversal', 'Caution'],
    winRate: 44, trades: 27, avgRR: 1.3,
    description: 'Entrée sur le premier pullback après un CHoCH (changement de caractère). Setup risqué — à éviter si WR < 50%.',
    entry: [
      'CHoCH sur M15 ou H1 confirmé',
      'Pullback sur le niveau du CHoCH',
      'Volume décroissant sur le pullback',
    ],
    invalidation: [
      'Pas de volume significatif sur le BOS',
      'Multiple CHoCH (marché hésitant)',
      'Toujours actif — considérer DROP de ce setup',
    ],
    tp: ['TP1: Next structure (+1R)'],
    sl: 'Dernier swing high/low',
    session_priority: 'London uniquement',
    color: 'border-destructive/40 bg-destructive/3',
    badge: 'bg-destructive/20 text-destructive',
    warning: true,
  },
];

const RULES = [
  { id: 1, icon: '🔴', label: 'Kill Switch Journalier', text: 'Si DD journalier > 50% → STOP toutes positions, session terminée.' },
  { id: 2, icon: '⚡', label: 'Règle des 2 pertes', text: '2 pertes consécutives → pause 30 min obligatoire avant reprise.' },
  { id: 3, icon: '📰', label: 'Filtre Macro', text: 'Aucun trade 5 min avant / 10 min après FOMC, CPI, NFP.' },
  { id: 4, icon: '🎯', label: 'TP1 = Breakeven', text: 'Dès TP1 touché, SL déplacé au point d\'entrée (breakeven).' },
  { id: 5, icon: '🕐', label: 'Kill Zone Only', text: 'Sessions autorisées uniquement : London KZ (08-10h) et NY Open (14h30-16h30).' },
  { id: 6, icon: '📊', label: 'Consistance MFF', text: 'Aucun trade ne doit représenter > 30% du P&L total de la période.' },
];

export default function Playbook() {
  const [expanded, setExpanded] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [loadingAI, setLoadingAI] = useState(null);

  const toggle = (id) => setExpanded(p => p === id ? null : id);

  const analyzeSetup = async (setup) => {
    setLoadingAI(setup.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un mentor ICT/SMC trading NQ Futures. Analyse ce setup et donne des insights avancés.

Setup: ${setup.name} (${setup.category})
Win Rate actuel: ${setup.winRate}% sur ${setup.trades} trades | Avg R:R: ${setup.avgRR}
Critères d'entrée: ${setup.entry.join(', ')}
Invalidations: ${setup.invalidation.join(', ')}

Donne des insights experts sur:
1. Comment améliorer la précision d'entrée
2. Le meilleur contexte de marché pour ce setup
3. Les erreurs courantes à éviter
4. Comment filtrer les faux signaux

Retourne UNIQUEMENT JSON sans markdown:
{
  "grade": "A"|"B"|"C"|"D",
  "verdict": "<phrase courte>",
  "key_insight": "<insight le plus important>",
  "improvement": "<amélioration concrète>",
  "best_confluence": "<meilleure confluence supplémentaire>",
  "avoid": "<erreur la plus fréquente>"
}`,
      response_json_schema: {
        type: "object", properties: {
          grade: { type: "string" }, verdict: { type: "string" },
          key_insight: { type: "string" }, improvement: { type: "string" },
          best_confluence: { type: "string" }, avoid: { type: "string" }
        }
      }
    });
    setAiAnalysis(p => ({ ...p, [setup.id]: res }));
    setLoadingAI(null);
    toast.success(`Analyse IA — ${setup.name}`);
  };

  const categories = ['all', ...new Set(SETUPS.map(s => s.category))];
  const filtered = activeFilter === 'all' ? SETUPS : SETUPS.filter(s => s.category === activeFilter);

  const gradeColor = { A: 'text-primary', B: 'text-blue-400', C: 'text-yellow-400', D: 'text-destructive' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-cyan-400" />
            Playbook de Trading
          </h1>
          <p className="text-xs text-muted-foreground">Setups validés · Règles de discipline · Analyse IA par setup</p>
        </div>
        <div className="flex gap-1">
          {categories.map(c => (
            <button key={c} onClick={() => setActiveFilter(c)}
              className={`text-xs px-2.5 py-1 rounded transition-all ${activeFilter === c ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Setups Actifs', value: SETUPS.filter(s => !s.warning).length },
          { label: 'Trades Documentés', value: SETUPS.reduce((s, x) => s + x.trades, 0) },
          { label: 'WR Moyen', value: `${(SETUPS.reduce((s, x) => s + x.winRate, 0) / SETUPS.length).toFixed(0)}%`, color: 'text-primary' },
          { label: 'R:R Moyen', value: `${(SETUPS.reduce((s, x) => s + x.avgRR, 0) / SETUPS.length).toFixed(1)}:1`, color: 'text-blue-400' },
        ].map(k => (
          <div key={k.label} className="card-trading text-center py-2">
            <div className={`text-2xl font-bold font-mono ${k.color || 'text-foreground'}`}>{k.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Setups */}
      <div className="space-y-3">
        {filtered.map(s => {
          const ai = aiAnalysis[s.id];
          const isExpanded = expanded === s.id;
          return (
            <div key={s.id} className={`card-trading border ${s.color} transition-all`}>
              {/* Header */}
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggle(s.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{s.name}</span>
                    {s.warning && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive font-bold">⚠️ ÉVITER</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${s.badge}`}>{s.category}</span>
                    {s.tags.map(t => <span key={t} className="text-[10px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center hidden md:block">
                    <div className={`text-sm font-bold font-mono ${s.winRate >= 60 ? 'text-primary' : s.winRate >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{s.winRate}%</div>
                    <div className="text-[9px] text-muted-foreground">WR</div>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="text-sm font-bold font-mono text-blue-400">{s.avgRR}:1</div>
                    <div className="text-[9px] text-muted-foreground">R:R</div>
                  </div>
                  {ai && <span className={`text-sm font-bold ${gradeColor[ai.grade]}`}>{ai.grade}</span>}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Entrée */}
                    <div>
                      <div className="text-xs font-semibold text-primary mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Critères d'Entrée</div>
                      <ul className="space-y-1">
                        {s.entry.map((e, i) => (
                          <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                            <span className="text-primary flex-shrink-0">{i + 1}.</span>{e}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Invalidation */}
                    <div>
                      <div className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1"><XCircle className="w-3 h-3" /> Invalidations</div>
                      <ul className="space-y-1">
                        {s.invalidation.map((inv, i) => (
                          <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                            <span className="text-destructive flex-shrink-0">✗</span>{inv}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* TP/SL */}
                    <div>
                      <div className="text-xs font-semibold mb-2">TP / SL</div>
                      <div className="space-y-1.5 mb-2">
                        {s.tp.map((tp, i) => (
                          <div key={i} className="text-xs p-1.5 bg-primary/5 border border-primary/20 rounded text-primary">{tp}</div>
                        ))}
                      </div>
                      <div className="text-xs p-1.5 bg-destructive/5 border border-destructive/20 rounded text-destructive">SL: {s.sl}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        <span className="font-semibold">Sessions: </span>{s.session_priority}
                      </div>
                    </div>
                  </div>

                  {/* IA Analysis */}
                  {ai ? (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">Analyse IA</span>
                        <span className={`text-lg font-bold font-mono ${gradeColor[ai.grade]}`}>Grade {ai.grade}</span>
                        <span className="text-xs text-muted-foreground flex-1">{ai.verdict}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-primary/5 rounded border border-primary/20">
                          <div className="font-semibold text-primary mb-0.5">💡 Insight clé</div>
                          <div className="text-muted-foreground">{ai.key_insight}</div>
                        </div>
                        <div className="p-2 bg-blue-400/5 rounded border border-blue-400/20">
                          <div className="font-semibold text-blue-400 mb-0.5">🎯 Confluence</div>
                          <div className="text-muted-foreground">{ai.best_confluence}</div>
                        </div>
                        <div className="p-2 bg-destructive/5 rounded border border-destructive/20">
                          <div className="font-semibold text-destructive mb-0.5">⚠️ Éviter</div>
                          <div className="text-muted-foreground">{ai.avoid}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => analyzeSetup(s)} disabled={loadingAI === s.id}>
                      <Zap className={`w-3 h-3 ${loadingAI === s.id ? 'animate-spin text-primary' : ''}`} />
                      {loadingAI === s.id ? 'Analyse IA...' : 'Analyser avec IA'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Règles de discipline */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-yellow-400" />
          Règles de Discipline Absolues
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {RULES.map(r => (
            <div key={r.id} className="flex gap-3 p-2.5 rounded-lg border border-border bg-secondary/20 hover:border-primary/30 transition-colors">
              <span className="text-base flex-shrink-0">{r.icon}</span>
              <div>
                <div className="text-xs font-semibold mb-0.5">{r.label}</div>
                <div className="text-[11px] text-muted-foreground">{r.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}