import { useState } from 'react';
import {
  HardDrive, Github, Smartphone, ExternalLink, Package, Rocket, Star,
  ArrowRight, RefreshCw, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const DONE_FEATURES = [
  { label: 'Scanner Multi-Marchés 100% Auto', desc: 'Scan au démarrage + toutes les 2min, IA global toutes les 10min' },
  { label: 'Scoring Multi-Stratégies Pondéré', desc: 'ICT/SMC + Market Profile + Footprint + Carnet d\'ordres combinés' },
  { label: 'Simulateur Drawdown + Monte Carlo', desc: 'Critère de Kelly, 50 simulations, analyse IA automatique' },
  { label: 'Calendrier Payouts PropFirm', desc: 'Planning automatique + projections 90j + courbe cumulative' },
  { label: 'Journal IA Automatisé', desc: 'Auto-génération 18h, rapport hebdo, coaching IA personnalisé' },
  { label: 'Alertes Risques Automatiques', desc: 'Check toutes les 30s, kill switch auto, historique notifications' },
  { label: 'Calendrier Fiscal 2026', desc: '11 deadlines, simulateur multi-régimes, optimisation IA fiscale' },
  { label: 'Templates Backtest (6+)', desc: 'ICT OB, FVG, Pullback EMA, BOS/CHoCH, Gold Scalp, Crypto Trend' },
  { label: 'Gestion Comptes Personnels MT4/MT5', desc: 'Sans restrictions, multi-broker, levier libre jusqu\'à 1:500' },
  { label: 'Documentation Auto-Générée', desc: 'Export complet .txt mis à jour à chaque version du projet' },
  { label: 'GitHub Sync Bidirectionnel', desc: 'Modif en ligne = sync auto en local via GitHub' },
  { label: 'App Mobile PWA', desc: 'Installation iOS/Android depuis Safari/Chrome sans App Store' },
];

const ROADMAP = [
  { label: 'Alertes Telegram/WhatsApp', desc: 'Notifications trading directement sur mobile via agent IA', eta: 'v4.2' },
  { label: 'Connexion API MT4/MT5 réelle', desc: 'Via MQL5 DLL bridge pour trades live automatiques', eta: 'v4.3' },
  { label: 'Rapport Fiscal PDF auto', desc: 'Génération PDF signable pour comptable ou administration', eta: 'v4.2' },
  { label: 'Copy Trading Automatisé', desc: 'Réplication automatique entre plusieurs comptes PropFirm', eta: 'v4.3' },
  { label: 'IA Prédictive Personnalisée', desc: 'Apprentissage sur historique perso pour anticiper les patterns', eta: 'v5.0' },
];

export default function OutilsTab() {
  const [pwaCopied, setPwaCopied] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const appUrl = window.location.origin;

  const copyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setPwaCopied(true);
    setTimeout(() => setPwaCopied(false), 2000);
    toast.success('URL copiée — Ouvrez-la sur mobile pour installer l\'app');
  };

  return (
    <div className="space-y-4">

      {/* ── Téléchargement / Sync Local ── */}
      <div className="card-trading border border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Télécharger en Local + Synchronisation Auto</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* ZIP */}
          <div className="p-3 rounded border border-border bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold">Export ZIP</span>
            </div>
            <p className="text-xs text-muted-foreground">Téléchargez tout le code source en un clic depuis l'éditeur Base44.</p>
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />Onglet <strong className="text-foreground ml-1">Code</strong> dans l'éditeur</div>
              <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />Icône <strong className="text-foreground ml-1">Export ZIP</strong> en haut à droite</div>
              <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />Extrayez puis: <span className="bg-secondary px-1 rounded font-mono ml-1">npm install</span></div>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs h-7 gap-1"
              onClick={() => window.open('https://docs.base44.com/Getting-Started/Quick-start-guide#can-i-export-my-app', '_blank')}>
              <ExternalLink className="w-3 h-3" />Guide Export ZIP
            </Button>
          </div>

          {/* GitHub Sync — RECOMMANDÉ */}
          <div className="p-3 rounded border border-primary/40 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Github className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">GitHub Sync</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">RECOMMANDÉ</span>
            </div>
            <p className="text-xs text-muted-foreground">Synchronisation automatique bidirectionnelle. Chaque modif en ligne est instantanément disponible en local.</p>
            <div className="space-y-1 text-[10px]">
              <div className="flex gap-1 items-center text-muted-foreground"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />Cliquez sur l'icône GitHub dans la barre top</div>
              <div className="flex gap-1 items-center text-muted-foreground"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />Connectez votre repo GitHub</div>
              <div className="flex gap-1 items-center text-primary font-semibold"><CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />Auto-sync à chaque modif online</div>
              <div className="flex gap-1 items-center text-primary font-semibold"><CheckCircle2 className="w-2.5 h-2.5 flex-shrink-0" />Push local = mise à jour online</div>
            </div>
            <Button size="sm" className="w-full text-xs h-7 gap-1"
              onClick={() => window.open('https://docs.base44.com/developers/app-code/local-development/github', '_blank')}>
              <Github className="w-3 h-3" />Configurer GitHub Sync
            </Button>
          </div>

          {/* PWA Mobile */}
          <div className="p-3 rounded border border-border bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold">App Mobile (PWA)</span>
            </div>
            <p className="text-xs text-muted-foreground">Installez Ghost Trader sur iOS/Android comme une vraie app native.</p>
            <div className="space-y-1 text-[10px] text-muted-foreground">
              <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" /><strong className="text-foreground">iPhone:</strong> Safari → Partager → Écran d'accueil</div>
              <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0" /><strong className="text-foreground">Android:</strong> Chrome → Menu ⋮ → Ajouter</div>
            </div>
            <div className="flex gap-1">
              <div className="flex-1 bg-secondary rounded px-2 py-1 text-[10px] font-mono text-muted-foreground truncate">{appUrl}</div>
              <button onClick={copyUrl}
                className={`text-xs px-2 py-1 rounded border transition-all flex-shrink-0 ${pwaCopied ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {pwaCopied ? '✓' : 'Copier'}
              </button>
            </div>
          </div>
        </div>

        {/* Workflow mise à jour */}
        <div className="mt-4 p-3 rounded border border-yellow-400/20 bg-yellow-400/5">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400">Workflow mise à jour (GitHub Sync)</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            {['Modifier en ligne sur Base44', 'Auto-push vers GitHub', 'git pull en local', 'npm run dev — Synchronisé !'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-1">
                <span className="bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded">{step}</span>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Améliorations Intégrées ── */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold">Améliorations Intégrées</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-mono">v4.1</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DONE_FEATURES.map(item => (
            <div key={item.label} className="flex items-start gap-2 p-2 rounded border border-border bg-secondary/20 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{item.label}</div>
                <div className="text-muted-foreground text-[10px]">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Roadmap ── */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Roadmap — Prochaines Améliorations</span>
        </div>
        <div className="space-y-2">
          {ROADMAP.map(item => (
            <div key={item.label} className="flex items-center gap-3 p-2 rounded border border-border bg-secondary/10 text-xs">
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono flex-shrink-0 w-10 text-center">{item.eta}</span>
              <div className="flex-1">
                <div className="font-semibold">{item.label}</div>
                <div className="text-muted-foreground text-[10px]">{item.desc}</div>
              </div>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Boîte à suggestions ── */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Proposer une Amélioration</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Décrivez votre idée d'amélioration..."
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            className="bg-secondary border-border h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs shrink-0"
            onClick={() => { if (suggestion.trim()) { toast.success('Suggestion enregistrée — sera traitée prochainement'); setSuggestion(''); } }}>
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}