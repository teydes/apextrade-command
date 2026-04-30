import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, TrendingUp, Shield, Zap, Target, AlertTriangle, BarChart3, Globe, Cpu, RefreshCw, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// ── Données statiques d'analyse critique ─────────────────────────────────────
const SECTIONS = [
  {
    id: 'tpsl',
    icon: '🎯',
    color: 'text-primary',
    border: 'border-primary/30',
    bg: 'bg-primary/5',
    label: '1. Analyse TP/SL & Taille de Position',
    critique: [
      { type: 'danger', text: 'NQ Micro (MNQ) sur 50K = sous-optimal. 1 MNQ = 2$/point. Pour 500€/j, il faut 250 points nets — irréaliste en < 5 trades.' },
      { type: 'warning', text: '1 Mini NQ (NQ) = 20$/point. 25 points = 500$. C\'est l\'unité cible pour un compte 50K prop firm.' },
      { type: 'ok', text: 'Approche recommandée : 2–4 trades/jour avec NQ Mini, non 10–20. Moins = qualité > quantité, détection réduite, consistance améliorée.' },
      { type: 'ok', text: 'Configuration TP/SL optimisée : SL fixe 10 pts (200$), TP1 15 pts (300$) → BE, TP2 25 pts (500$), TP3 floating 40–60 pts (800–1200$). RR minimum 1.5.' },
    ],
    config: [
      { label: 'Instrument', value: 'NQ Mini (1 contrat)', note: 'Pas de micro sur PropFirm 50K+' },
      { label: 'SL fixe', value: '10 points (200$)', note: 'Max 5% du daily DD' },
      { label: 'TP1 / BE', value: '15 points → SL à BE', note: 'Sécuriser avant de chercher TP2' },
      { label: 'TP2 target', value: '25–30 points (500–600$)', note: 'Objectif journalier validé ici' },
      { label: 'TP3 float', value: '40–60 pts si contexte fort', note: '1 trade premium max/semaine' },
      { label: 'Trades/jour', value: '2 à 4 max', note: '> 5 trades = sur-trading = détection' },
    ],
  },
  {
    id: 'objectifs',
    icon: '💰',
    color: 'text-yellow-400',
    border: 'border-yellow-400/30',
    bg: 'bg-yellow-400/5',
    label: '2. Objectifs Financiers & Réalisme',
    critique: [
      { type: 'ok', text: '500€/jour = réaliste avec 1 NQ Mini, 2–3 trades bien calibrés, sessions NY/London uniquement.' },
      { type: 'warning', text: '1500€/jour = possible MAIS nécessite 2–3 contrats simultanés. Sur PropFirm : risque détection pattern si quotidien. Réserver aux jours "A+" seulement.' },
      { type: 'danger', text: 'Piège : vouloir 1500€/j tous les jours = violation de consistance MFF (règle 30%). 1 jour à 1500€ = le reste de la semaine limité à ~400€/j max.' },
      { type: 'ok', text: 'Stratégie optimale : objectif plancher 500€, viser 700–1000€ si setup premium, sortir à 1500€ 1x/semaine max sur contrat supplémentaire.' },
    ],
    config: [
      { label: 'Objectif plancher', value: '500€/jour', note: 'Non-négociable, sécuriser d\'abord' },
      { label: 'Objectif cible', value: '700–1000€/jour', note: 'Avec TP3 floating si contexte fort' },
      { label: 'Trade premium', value: '1500€ max 1x/semaine', note: 'Jour "A+" uniquement, 2 contrats' },
      { label: 'Consistance MFF', value: '≤ 30% en 1 jour', note: 'Sur 3000€ cible = 900€ max/jour' },
      { label: 'Stop daily', value: 'Arrêt après 2 pertes', note: 'Règle absolue anti-spiral' },
      { label: 'Heure de sortie', value: '12h NY max', note: 'Ne jamais trader l\'après-midi seul' },
    ],
  },
  {
    id: 'automation',
    icon: '🤖',
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    bg: 'bg-blue-400/5',
    label: '3. Automatisation & Adaptation Dynamique',
    critique: [
      { type: 'ok', text: 'Logique probabiliste correcte : taille de lot adaptée à la volatilité (ATR 14). Faible ATR → micro. Fort ATR → 1 contrat max.' },
      { type: 'warning', text: 'Ne pas automatiser la taille sur PropFirm tant que win rate < 65% en backtest sur 200+ trades. Le bot doit d\'abord observer avant d\'agir.' },
      { type: 'danger', text: 'Lissage PnL = CRITIQUE : ne jamais clôturer une perte pour "rattraper" avec un trade plus gros. L\'algo doit réduire la taille après 1 perte, pas l\'augmenter.' },
      { type: 'ok', text: 'Filtre news obligatoire dans le bot : bloquer 15 min avant / 15 min après FOMC, CPI, NFP. Pas d\'exception.' },
    ],
    config: [
      { label: 'ATR faible (< 15 pts)', value: 'Rester flat ou 0.5 contrat', note: 'Pas de momentum = pas de trade' },
      { label: 'ATR normal (15–30)', value: '1 contrat NQ Mini', note: 'Mode standard' },
      { label: 'ATR fort (> 30)', value: '1 contrat max + SL élargi', note: 'Élargir SL, réduire taille' },
      { label: 'Après 1 perte', value: 'Réduire à 0.5 contrat', note: 'Pas de revenge trading' },
      { label: 'Après 2 pertes', value: 'Arrêt automatique', note: 'Kill switch journalier' },
      { label: 'News impact high', value: 'Bot en pause ±15 min', note: 'Règle hard-codée' },
    ],
  },
  {
    id: 'propfirms',
    icon: '🏦',
    color: 'text-purple-400',
    border: 'border-purple-400/30',
    bg: 'bg-purple-400/5',
    label: '4. Vision Stratégique PropFirms vs Capital Réel',
    critique: [
      { type: 'warning', text: 'PropFirms seules = fragilité systémique. 1 ban = arrêt total. Ne jamais dépendre à 100% d\'une seule source de capital.' },
      { type: 'ok', text: 'Mix optimal long terme : 2–3 PropFirms (MFF + UFunded + FTUK) + 1 compte réel de 2000–5000€ comme "base" psychologique et test stratégie.' },
      { type: 'danger', text: 'UFunded et FTUK ont des règles moins strictes MAIS payouts moins fiables. Toujours diversifier : 1 PropFirm principale + 1–2 backup.' },
      { type: 'ok', text: 'Seuil de rentabilité avant tout nouveau compte : 3 mois consécutifs rentables sur le 1er compte. Pas de scaling avant validation.' },
    ],
    config: [
      { label: 'Compte principal', value: 'MFF 50K (sans éval)', note: 'Règles claires, payout hebdo' },
      { label: 'Compte backup', value: 'UFunded ou FTUK 25K', note: 'Ouvert uniquement si MFF validé 3 mois' },
      { label: 'Compte réel', value: '2000€ — test stratégie', note: 'Pas pour le profit, pour la confiance' },
      { label: 'Max comptes simultanés', value: '3 (dont 1 réel)', note: 'Au-delà = dispersion cognitive' },
      { label: 'Seuil scaling', value: '3 mois + 1er payout', note: 'Pas avant' },
      { label: 'Corrélation risque', value: 'Mêmes trades sur tous les comptes', note: 'Copy trading = risque corrélé' },
    ],
  },
  {
    id: 'process',
    icon: '📋',
    color: 'text-green-400',
    border: 'border-green-400/30',
    bg: 'bg-green-400/5',
    label: '5. Fiabilité, Process & Backtests',
    critique: [
      { type: 'danger', text: 'PRIORITÉ ABSOLUE : Aucun trade live sans 200+ trades en backtest avec win rate ≥ 60% et profit factor ≥ 1.5. Pas de raccourci.' },
      { type: 'ok', text: 'Checklist pré-trade obligatoire : biais H4 confirmé, kill zone active, OB/FVG identifié, volume delta validé, news check, DD journalier < 50%.' },
      { type: 'warning', text: 'Backlog d\'améliorations : prioriser par impact PnL attendu, pas par complexité technique. 1 amélioration/semaine maximum.' },
      { type: 'ok', text: 'Journal de trading quotidien dans l\'app = non-négociable. Sans données = pas d\'amélioration possible.' },
    ],
    backlog: [
      { priority: 'P0', task: 'Backtest 200 trades ICT+Footprint fusionnés', impact: '+++ PnL', status: 'todo' },
      { priority: 'P0', task: 'Win rate validé ≥ 60% avant live', impact: '+++ Survie', status: 'todo' },
      { priority: 'P1', task: 'Calibration bot souris Quantower', impact: '++ Exécution', status: 'in_progress' },
      { priority: 'P1', task: 'Journal trades quotidien rempli', impact: '++ Amélioration', status: 'in_progress' },
      { priority: 'P2', task: 'Filtre ATR dynamique dans le bot', impact: '+ Taille lot', status: 'todo' },
      { priority: 'P2', task: 'Alerte drawdown 50% journalier', impact: '+ Sécurité', status: 'done' },
      { priority: 'P3', task: 'Intégration Market Profile (TPO)', impact: '+ Entrées', status: 'todo' },
    ],
  },
  {
    id: 'maintenance',
    icon: '🔧',
    color: 'text-orange-400',
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/5',
    label: '6. Système & Maintenance Évolutive',
    critique: [
      { type: 'ok', text: 'Fréquence de mise à jour : hebdomadaire max en mode normal. Urgence uniquement si violation de règle PropFirm ou bug critique de sécurité.' },
      { type: 'warning', text: 'Mode maintenance automatique : si drawdown > 70% journalier → bot en pause, notification push, re-analyse manuelle obligatoire avant reprise.' },
      { type: 'ok', text: 'Versioning stratégie (v1.0 → v1.1) : chaque changement documenté avec impact mesuré sur trades suivants. Rollback possible si performance baisse.' },
      { type: 'danger', text: 'Sécurité IA : ne jamais laisser le bot trader sans supervision humaine pendant les 3 premiers mois. Phase semi-auto uniquement.' },
    ],
    schedule: [
      { freq: 'Quotidien', task: 'Vérifier journal + métriques DD', auto: false },
      { freq: 'Hebdo', task: 'Revue des trades + update backlog', auto: false },
      { freq: 'Hebdo', task: 'Check règles PropFirm changées', auto: true },
      { freq: 'Mensuel', task: 'Revue stratégie + version bump si pertinent', auto: false },
      { freq: 'Si urgence', task: 'Patch sécurité / bug critique', auto: true },
      { freq: 'Si DD > 70%', task: 'Mode maintenance automatique', auto: true },
    ],
  },
  {
    id: 'market',
    icon: '🌊',
    color: 'text-cyan-400',
    border: 'border-cyan-400/30',
    bg: 'bg-cyan-400/5',
    label: '7. Stratégie Marché — Smart Money & Institutionnel',
    critique: [
      { type: 'ok', text: 'ICT/SMC = bonne base. Ajouter impérativement : Market Profile (POC/VAH/VAL) pour les niveaux de valeur, Footprint pour le delta de volume réel.' },
      { type: 'warning', text: 'Ne pas se limiter à ICT. Les retail traders ICT sont trop nombreux → les institutions savent où sont leurs stops. Ajouter une couche d\'analyse institutionnelle propre.' },
      { type: 'ok', text: 'Logique prioritaire : Manipulation (sweep des stops) → Distribution (institutional selling) → Direction (suivre le flux, pas le bruit).' },
      { type: 'danger', text: 'Price Action pure sans volume = insuffisant sur NQ en 2026. Le volume delta et le delta cumulatif sont devenus des filtres obligatoires pour éviter les faux breakouts.' },
    ],
    layers: [
      { layer: 'H4/D1', tool: 'Biais marché + niveaux clés', source: 'ICT + Price Action' },
      { layer: 'H1', tool: 'Structure BOS/CHoCH + Kill Zones', source: 'ICT/SMC' },
      { layer: '15m', tool: 'POC, VAH, VAL du jour', source: 'Market Profile (TPO)' },
      { layer: '5m/1m', tool: 'Order Blocks + FVG + Delta Footprint', source: 'Footprint Chart' },
      { layer: 'Entrée', tool: 'Absorption / Imbalance volume', source: 'Depth of Market' },
      { layer: 'Filtre', tool: 'ATR, VWAP, Macros NY/London', source: 'Indicateurs standards' },
    ],
  },
  {
    id: 'context',
    icon: '📖',
    color: 'text-rose-400',
    border: 'border-rose-400/30',
    bg: 'bg-rose-400/5',
    label: '8. Contexte & Reconstruction Post-Pertes',
    critique: [
      { type: 'danger', text: 'Historique de pertes = signal d\'alerte. La priorité n\'est PAS de regagner vite — c\'est de comprendre POURQUOI les pertes ont eu lieu avant de reprendre.' },
      { type: 'ok', text: 'Approche "hedge fund retail" = correct. Cela signifie : processus > intuition, données > émotions, règles > opportunisme.' },
      { type: 'warning', text: 'Backtest = étape BLOQUANTE, pas optionnelle. Aucun capital réel ou PropFirm avant 200+ trades backtestés et validés statistiquement.' },
      { type: 'ok', text: 'Objectif raisonnable J0–J90 : stabilité et cohérence. Pas de profit spectaculaire. Un système profitable à 55% avec RR 2:1 bat 99% des traders retail.' },
    ],
    phases: [
      { phase: 'J0–J30', goal: 'Backtest 200 trades, journal quotidien', risk: 'Zéro capital réel' },
      { phase: 'J30–J60', goal: 'Demo avec règles MFF strictes, calibration bot', risk: 'Aucun trade live' },
      { phase: 'J60–J90', goal: 'Live 1 contrat max, objectif 500€/j', risk: 'DD < 30%' },
      { phase: 'J90+', goal: 'Payout validé, 2e compte si métriques OK', risk: 'Copy trading' },
    ],
  },
  {
    id: 'infra',
    icon: '⚙️',
    color: 'text-slate-400',
    border: 'border-slate-400/30',
    bg: 'bg-slate-400/5',
    label: '9. Vision Entreprise & Infrastructure',
    critique: [
      { type: 'ok', text: 'Priorité 1 : optimiser l\'existant avant d\'acheter du matériel. Un bot bien calibré sur un PC moyen bat un mauvais bot sur un serveur premium.' },
      { type: 'warning', text: 'VPS uniquement si latence > 100ms vers le broker. En dessous, le PC local est suffisant et plus contrôlable.' },
      { type: 'danger', text: 'Seuil rentabilité avant tout investissement hardware : 3 mois de profits constants couvrant le coût en < 2 mois. Sinon = non.' },
      { type: 'ok', text: 'Réseau : Starlink est suffisant pour Quantower. Backup 4G mobile obligatoire (failover automatique). Ne jamais trader sans backup réseau.' },
    ],
    budget: [
      { item: 'VPS trading (si latence > 100ms)', cost: '40–80€/mois', threshold: 'Seulement si latence > 100ms' },
      { item: 'Connexion backup 4G', cost: '20€/mois', threshold: 'Immédiatement — non-négociable' },
      { item: 'Second écran / setup', cost: '200–400€ unique', threshold: 'Quand 1er payout reçu' },
      { item: 'Quantower Pro', cost: '80€/mois ou inclus', threshold: 'Déjà actif — maintenir' },
      { item: 'TradingView Pro+', cost: '50€/mois', threshold: 'Déjà actif — maintenir' },
      { item: 'Serveur dédié', cost: '150–300€/mois', threshold: 'Seulement si > 5 comptes actifs' },
    ],
  },
];

const typeBadge = { danger: { icon: XCircle, cls: 'text-destructive' }, warning: { icon: AlertCircle, cls: 'text-yellow-400' }, ok: { icon: CheckCircle2, cls: 'text-primary' } };
const priorityColor = { P0: 'bg-destructive/20 text-destructive', P1: 'bg-yellow-400/20 text-yellow-400', P2: 'bg-blue-400/20 text-blue-400', P3: 'bg-secondary text-muted-foreground' };
const statusColor = { todo: 'text-muted-foreground', in_progress: 'text-yellow-400', done: 'text-primary' };

export default function Strategy() {
  const [open, setOpen] = useState({ tpsl: true });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const toggle = (id) => setOpen(p => ({ ...p, [id]: !p[id] }));

  const askAI = async (sectionLabel) => {
    setAiLoading(true);
    setAiResult('');
    const prompt = aiPrompt || `En tant que partenaire stratégique critique orienté performance prop trading, analyse en profondeur : "${sectionLabel}". Contexte : compte MFF 50K, capital personnel ~2000€, objectif 500€/jour, NQ Futures. Donne une analyse concise, critique et des actions concrètes prioritaires. Identifie les hypothèses faibles et propose des corrections robustes.`;
    const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
    setAiResult(res);
    setAiLoading(false);
    toast.success('Analyse IA générée');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> Analyse Stratégique Complète
          </h1>
          <p className="text-xs text-muted-foreground">9 axes critiques · Partenaire stratégique orienté performance · PropFirm ~2000€</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded bg-destructive/20 text-destructive font-medium">⚠️ Priorité : Stabilité avant profits</span>
        </div>
      </div>

      {/* Résumé critique global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Win Rate Cible', value: '≥ 60%', sub: 'Avant tout live', color: 'text-primary', icon: Target },
          { label: 'RR Minimum', value: '1.5:1', sub: 'SL 10pts → TP 15pts', color: 'text-yellow-400', icon: TrendingUp },
          { label: 'Trades/Jour Max', value: '4', sub: '> 4 = sur-trading', color: 'text-blue-400', icon: BarChart3 },
          { label: 'Backtest Requis', value: '200+', sub: 'Avant live OBLIGATOIRE', color: 'text-destructive', icon: AlertTriangle },
        ].map(s => (
          <div key={s.label} className="card-trading flex items-center gap-3">
            <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
            <div>
              <div className={`text-lg font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-foreground font-medium">{s.label}</div>
              <div className="text-[10px] text-muted-foreground">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sections accordéon */}
      <div className="space-y-2">
        {SECTIONS.map(s => (
          <div key={s.id} className={`card-trading border ${s.border}`}>
            <button className="w-full flex items-center gap-3 text-left" onClick={() => toggle(s.id)}>
              <span className="text-xl">{s.icon}</span>
              <span className={`text-sm font-semibold flex-1 ${s.color}`}>{s.label}</span>
              {open[s.id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </button>

            {open[s.id] && (
              <div className="mt-4 space-y-4">
                {/* Critique */}
                <div className="space-y-2">
                  {s.critique.map((c, i) => {
                    const { icon: Icon, cls } = typeBadge[c.type];
                    return (
                      <div key={i} className="flex gap-2 text-xs">
                        <Icon className={`w-3.5 h-3.5 ${cls} flex-shrink-0 mt-0.5`} />
                        <span className="text-muted-foreground">{c.text}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Config / table spécifique par section */}
                {s.config && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {s.config.map((c, i) => (
                      <div key={i} className={`p-2 rounded ${s.bg} border ${s.border}`}>
                        <div className="text-[10px] text-muted-foreground">{c.label}</div>
                        <div className={`text-sm font-bold font-mono ${s.color}`}>{c.value}</div>
                        <div className="text-[10px] text-muted-foreground">{c.note}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Backlog (section process) */}
                {s.backlog && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground">Backlog priorisé par impact PnL :</div>
                    {s.backlog.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/40">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${priorityColor[b.priority]}`}>{b.priority}</span>
                        <span className="flex-1 text-foreground">{b.task}</span>
                        <span className="text-primary font-mono text-[10px]">{b.impact}</span>
                        <span className={`text-[10px] ${statusColor[b.status]}`}>{b.status === 'done' ? '✅' : b.status === 'in_progress' ? '⏳' : '○'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Schedule (section maintenance) */}
                {s.schedule && (
                  <div className="space-y-1.5">
                    {s.schedule.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/40">
                        <span className="text-muted-foreground w-20 flex-shrink-0 font-mono text-[10px]">{item.freq}</span>
                        <span className="flex-1 text-foreground">{item.task}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.auto ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          {item.auto ? 'auto' : 'manuel'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Layers (section marché) */}
                {s.layers && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground">Stack d'analyse multi-timeframe :</div>
                    {s.layers.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/40">
                        <span className="font-mono font-bold text-cyan-400 w-10 flex-shrink-0">{l.layer}</span>
                        <span className="flex-1 text-foreground">{l.tool}</span>
                        <span className="text-[10px] text-muted-foreground">{l.source}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Phases (section contexte) */}
                {s.phases && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {s.phases.map((p, i) => (
                      <div key={i} className="p-3 rounded bg-rose-400/5 border border-rose-400/20">
                        <div className="font-bold text-rose-400 text-sm font-mono">{p.phase}</div>
                        <div className="text-xs text-foreground mt-1">{p.goal}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Risque : {p.risk}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Budget (section infra) */}
                {s.budget && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground">Budget Infrastructure :</div>
                    {s.budget.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/40">
                        <span className="flex-1 text-foreground">{b.item}</span>
                        <span className="font-mono text-primary font-bold text-[11px] flex-shrink-0">{b.cost}</span>
                        <span className="text-[10px] text-muted-foreground hidden md:block">{b.threshold}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bouton analyse IA */}
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" className="text-xs h-7 gap-1.5" onClick={() => askAI(s.label)} disabled={aiLoading}>
                    <Zap className="w-3 h-3" />
                    {aiLoading ? 'Analyse en cours...' : 'Approfondir avec IA'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Panel IA */}
      {aiResult && (
        <div className="card-trading border border-primary/30">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Analyse IA Approfondie</span>
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={() => setAiResult('')}>✕</Button>
          </div>
          <ReactMarkdown className="text-xs prose prose-sm prose-invert max-w-none [&_h2]:text-primary [&_h3]:text-yellow-400 [&_strong]:text-foreground [&_p]:my-1.5 [&_li]:my-0.5">
            {aiResult}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}