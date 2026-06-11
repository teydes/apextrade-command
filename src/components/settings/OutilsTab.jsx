import { useState } from 'react';
import {
  HardDrive, Github, Smartphone, ExternalLink, Package, Rocket, Star,
  ArrowRight, RefreshCw, CheckCircle2, Download, Copy, Terminal,
  FileCode, Zap, Globe, Shield, Brain, Cpu, BarChart3, Bell,
  TrendingUp, Lock, Code2, Layers, GitBranch, Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// ─── Améliorations v4.1 déjà intégrées ─────────────────────────────────────
const DONE = [
  { icon: Cpu, label: 'Scanner Multi-Marchés 100% Auto', desc: 'Scan ICT/SMC + Market Profile + Footprint toutes les 2min, IA global 10min' },
  { icon: Brain, label: 'Journal IA Automatisé', desc: 'Auto-génération 18h, rapport hebdo, coaching personnalisé par stratégie' },
  { icon: BarChart3, label: 'Monte Carlo + Drawdown Simulator', desc: 'Critère de Kelly, 50 simulations, analyse de risque IA intégrée' },
  { icon: TrendingUp, label: 'Calendrier Payouts PropFirm', desc: 'Planning automatique + projections 90j + courbe cumulative' },
  { icon: Bell, label: 'Alertes Risques Automatiques', desc: 'Check toutes les 30s, kill switch auto, historique notifications' },
  { icon: Shield, label: 'Calendrier Fiscal 2026', desc: '11 deadlines, simulateur multi-régimes TVA/IS/PFU, optimisation IA' },
  { icon: FileCode, label: 'Templates Backtest (6+)', desc: 'ICT OB, FVG, Pullback EMA, BOS/CHoCH, Gold Scalp, Crypto Trend' },
  { icon: Layers, label: 'Gestion Comptes Personnels', desc: 'MT4/MT5 sans restrictions, multi-broker, levier libre jusqu\'à 1:500' },
  { icon: GitBranch, label: 'Documentation Auto-Générée', desc: 'Export complet .txt mis à jour à chaque version du projet' },
  { icon: Globe, label: 'App Mobile PWA', desc: 'Installation iOS/Android depuis Safari/Chrome sans App Store' },
  { icon: Lock, label: 'Pre-Flight Checklist', desc: '5 critères de validation avant chaque trade, vérification risk + news' },
  { icon: Zap, label: 'PropFirm Connect + Copy Trading', desc: 'Pont MT4/MT5 WebSocket, réplication multi-comptes automatique' },
];

// ─── Roadmap ─────────────────────────────────────────────────────────────────
const ROADMAP = [
  { eta: 'v4.2', label: 'Alertes Telegram/WhatsApp', desc: 'Notifications push trading directement sur mobile via agent IA', priority: 'high' },
  { eta: 'v4.2', label: 'Rapport Fiscal PDF Auto', desc: 'Génération PDF signable pour comptable avec récap annuel complet', priority: 'high' },
  { eta: 'v4.3', label: 'Connexion API MT5 Réelle', desc: 'Via MQL5 DLL bridge + WebSocket pour trades live full automatisés', priority: 'high' },
  { eta: 'v4.3', label: 'IA Adaptative par Stratégie', desc: 'Score d\'efficacité par setup sur 30j glissants, ajustement automatique des pondérations', priority: 'medium' },
  { eta: 'v4.3', label: 'Backtesting Vectoriel Avancé', desc: 'Simulation tick-by-tick sur données OHLCV importées, slippage réaliste', priority: 'medium' },
  { eta: 'v4.4', label: 'Dashboard Liquidations Crypto', desc: 'Heatmap liquidations BTC/ETH en temps réel, zones de chasse institutionnelle', priority: 'medium' },
  { eta: 'v4.4', label: 'Optimiseur RR Dynamique', desc: 'Ajustement du Risk/Reward optimal par marché selon contexte de volatilité', priority: 'medium' },
  { eta: 'v5.0', label: 'IA Prédictive Personnalisée', desc: 'Apprentissage sur historique perso 6 mois pour anticiper les patterns récurrents', priority: 'low' },
  { eta: 'v5.0', label: 'Multi-Devise & Hedging', desc: 'Corrélation EUR/USD + GBP/USD + DXY pour hedging automatique inter-comptes', priority: 'low' },
  { eta: 'v5.0', label: 'Rapport Mensuel Auto PDF/Excel', desc: 'Synthèse complète: PnL, stats, tax, projections envoyée par email chaque mois', priority: 'low' },
];

// ─── Script d'installation local ─────────────────────────────────────────────
const INSTALL_SCRIPT = `#!/bin/bash
# Ghost Trader — Script d'installation locale (macOS/Linux)
# Exécuter: bash install.sh

echo "🚀 Installation Ghost Trader..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js non trouvé. Installez depuis https://nodejs.org (v18+)"
  exit 1
fi

echo "✅ Node.js $(node -v) détecté"

# Installer les dépendances
npm install

# Créer fichier .env si absent
if [ ! -f .env ]; then
  echo "VITE_BASE44_APP_ID=votre_app_id" > .env
  echo "📝 Fichier .env créé — remplacez votre_app_id"
fi

echo "✅ Installation terminée!"
echo "▶️  Lancez: npm run dev"
echo "🌍 Application disponible sur http://localhost:5173"`;

const INSTALL_BAT = `@echo off
REM Ghost Trader — Script d'installation locale (Windows)
REM Double-cliquez pour exécuter

echo Installation Ghost Trader...

node --version >nul 2>&1
IF ERRORLEVEL 1 (
  echo Node.js non trouve. Installez depuis https://nodejs.org
  pause
  exit /b 1
)

npm install

IF NOT EXIST .env (
  echo VITE_BASE44_APP_ID=votre_app_id > .env
  echo Fichier .env cree
)

echo Installation terminee!
echo Lancez: npm run dev
pause`;

// ─── Export snapshot de configuration ────────────────────────────────────────
async function exportAppSnapshot() {
  try {
    const [accounts, trades, reports] = await Promise.all([
      base44.entities.TradingAccount.list(),
      base44.entities.Trade.list('-entry_time', 100),
      base44.entities.DailyReport.list('-date', 30),
    ]);
    const snapshot = {
      exportDate: new Date().toISOString(),
      version: 'Ghost Trader v4.1',
      accounts,
      recentTrades: trades,
      recentReports: reports,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ghost_trader_backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    return false;
  }
}

export default function OutilsTab() {
  const [pwaCopied, setPwaCopied] = useState(false);
  const [scriptMode, setScriptMode] = useState('mac');
  const [exporting, setExporting] = useState(false);
  const appUrl = window.location.origin;

  const copyPwa = () => {
    navigator.clipboard.writeText(appUrl);
    setPwaCopied(true);
    setTimeout(() => setPwaCopied(false), 2000);
    toast.success('URL copiée — Ouvrez-la sur mobile pour installer l\'app');
  };

  const copyScript = () => {
    const script = scriptMode === 'mac' ? INSTALL_SCRIPT : INSTALL_BAT;
    navigator.clipboard.writeText(script);
    toast.success(`Script ${scriptMode === 'mac' ? 'macOS/Linux' : 'Windows'} copié dans le presse-papier`);
  };

  const downloadScript = () => {
    const script = scriptMode === 'mac' ? INSTALL_SCRIPT : INSTALL_BAT;
    const ext = scriptMode === 'mac' ? 'sh' : 'bat';
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `install_ghost_trader.${ext}`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Script téléchargé: install_ghost_trader.${ext}`);
  };

  const handleExportData = async () => {
    setExporting(true);
    const ok = await exportAppSnapshot();
    setExporting(false);
    if (ok) toast.success('Backup complet téléchargé (comptes + trades + rapports)');
    else toast.error('Erreur export — réessayez');
  };

  const priorityColor = (p) => p === 'high' ? 'text-red-400 border-red-400/30 bg-red-400/5'
    : p === 'medium' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5'
    : 'text-muted-foreground border-border bg-secondary/10';

  return (
    <div className="space-y-4">

      {/* ══ Mise en Local — SANS CONNAISSANCES TECHNIQUES ══ */}
      <div className="card-trading border border-primary/40 bg-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">Mettre en Local — Guide Simplifié</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">RECOMMANDÉ</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Même sans expérience technique, suivez ces 3 étapes et votre app tourne en local en 5 minutes.</p>

        {/* Étapes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            {
              num: '1', title: 'Installer Node.js', color: 'text-blue-400 border-blue-400/30',
              steps: ['Allez sur nodejs.org', 'Téléchargez "LTS" (version stable)', 'Installez normalement (suivant → suivant)'],
              link: 'https://nodejs.org', linkLabel: 'Ouvrir nodejs.org'
            },
            {
              num: '2', title: 'Connecter GitHub', color: 'text-purple-400 border-purple-400/30',
              steps: ['Créez un compte sur github.com (gratuit)', 'Cliquez l\'icône GitHub en haut de l\'éditeur', 'Connectez votre repo — le code se sync auto'],
              link: 'https://github.com', linkLabel: 'Ouvrir github.com'
            },
            {
              num: '3', title: 'Lancer l\'App', color: 'text-primary border-primary/30',
              steps: ['Dans votre dossier cloné: double-cliquez install_ghost_trader.bat (Win) ou .sh (Mac)', 'Puis: npm run dev', 'Ouvrez http://localhost:5173 🎉'],
              link: null, linkLabel: null
            },
          ].map(step => (
            <div key={step.num} className={`p-3 rounded border ${step.color} space-y-2`}>
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.color}`}>{step.num}</span>
                <span className="text-xs font-semibold">{step.title}</span>
              </div>
              <ul className="space-y-1">
                {step.steps.map((s, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5 items-start">
                    <ArrowRight className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 opacity-60" />{s}
                  </li>
                ))}
              </ul>
              {step.link && (
                <Button size="sm" variant="outline" className={`w-full text-[11px] h-6 gap-1`}
                  onClick={() => window.open(step.link, '_blank')}>
                  <ExternalLink className="w-2.5 h-2.5" />{step.linkLabel}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Script d'installation */}
        <div className="p-3 rounded border border-border bg-background/50 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold">Script d'installation automatique</span>
            </div>
            <div className="flex gap-1">
              {['mac', 'win'].map(m => (
                <button key={m} onClick={() => setScriptMode(m)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${scriptMode === m ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'}`}>
                  {m === 'mac' ? '🍎 Mac/Linux' : '🪟 Windows'}
                </button>
              ))}
            </div>
          </div>
          <pre className="text-[9px] font-mono text-muted-foreground bg-secondary/50 p-2 rounded overflow-x-auto max-h-24 leading-relaxed">
            {(scriptMode === 'mac' ? INSTALL_SCRIPT : INSTALL_BAT).slice(0, 300)}...
          </pre>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs h-7 gap-1" onClick={downloadScript}>
              <Download className="w-3 h-3" />Télécharger le script
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={copyScript}>
              <Copy className="w-3 h-3" />Copier
            </Button>
          </div>
        </div>
      </div>

      {/* ══ Options alternatives ══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* GitHub Sync */}
        <div className="card-trading space-y-2">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold">GitHub Auto-Sync</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Chaque modif online → sync instantané en local via <span className="font-mono text-foreground">git pull</span>.</p>
          <div className="space-y-1 text-[10px]">
            <div className="flex gap-1 items-center text-primary"><CheckCircle2 className="w-2.5 h-2.5" />Bidirectionnel</div>
            <div className="flex gap-1 items-center text-primary"><CheckCircle2 className="w-2.5 h-2.5" />Historique versionné</div>
            <div className="flex gap-1 items-center text-primary"><CheckCircle2 className="w-2.5 h-2.5" />Rollback possible</div>
          </div>
          <Button size="sm" variant="outline" className="w-full text-[11px] h-7 gap-1"
            onClick={() => window.open('https://docs.base44.com/developers/app-code/local-development/github', '_blank')}>
            <ExternalLink className="w-2.5 h-2.5" />Guide GitHub Sync
          </Button>
        </div>

        {/* Export Data Backup */}
        <div className="card-trading space-y-2">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold">Backup Données</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Exportez tous vos comptes, trades et rapports en JSON pour backup ou migration.</p>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5" />Comptes + balances</div>
            <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5" />100 derniers trades</div>
            <div className="flex gap-1 items-center"><ArrowRight className="w-2.5 h-2.5" />30 derniers rapports</div>
          </div>
          <Button size="sm" className="w-full text-[11px] h-7 gap-1" onClick={handleExportData} disabled={exporting}>
            <Download className="w-2.5 h-2.5" />{exporting ? 'Export...' : 'Exporter Backup JSON'}
          </Button>
        </div>

        {/* PWA Mobile */}
        <div className="card-trading space-y-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold">App Mobile (PWA)</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Installez Ghost Trader sur votre iPhone/Android comme une app native.</p>
          <div className="space-y-1 text-[10px] text-muted-foreground">
            <div className="flex gap-1 items-start"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">iPhone:</strong> Safari → Partager → Écran d'accueil</span></div>
            <div className="flex gap-1 items-start"><ArrowRight className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" /><span><strong className="text-foreground">Android:</strong> Chrome → ⋮ → Ajouter à l'écran</span></div>
          </div>
          <div className="flex gap-1">
            <div className="flex-1 bg-secondary rounded px-2 py-1 text-[9px] font-mono text-muted-foreground truncate">{appUrl}</div>
            <button onClick={copyPwa}
              className={`text-[10px] px-2 rounded border transition-all flex-shrink-0 ${pwaCopied ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {pwaCopied ? '✓' : 'Copier'}
            </button>
          </div>
        </div>
      </div>

      {/* ══ Workflow mise à jour ══ */}
      <div className="p-3 rounded border border-yellow-400/20 bg-yellow-400/5">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-xs font-semibold text-yellow-400">Workflow mise à jour automatique (une fois GitHub configuré)</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {['Modifier en ligne', 'Auto-push GitHub', 'git pull en local', 'npm run dev', '✅ Synchronisé'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-1.5">
              <span className="bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded">{step}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* ══ Améliorations intégrées ══ */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold">Améliorations Intégrées</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-mono">v4.1 — {DONE.length} fonctionnalités</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {DONE.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-2 p-2 rounded border border-border bg-secondary/20 text-xs">
                <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <div className="font-semibold leading-tight">{item.label}</div>
                  <div className="text-muted-foreground text-[10px] mt-0.5 leading-snug">{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ Roadmap ══ */}
      <div className="card-trading">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold">Roadmap — {ROADMAP.length} Améliorations à Venir</span>
        </div>
        <div className="space-y-1.5">
          {ROADMAP.map(item => (
            <div key={item.label} className={`flex items-center gap-3 p-2 rounded border text-xs ${priorityColor(item.priority)}`}>
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-current font-mono flex-shrink-0 w-9 text-center opacity-80">{item.eta}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{item.label}</span>
                <span className="text-muted-foreground ml-2 text-[10px]">{item.desc}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${
                item.priority === 'high' ? 'bg-red-400/20 text-red-400' :
                item.priority === 'medium' ? 'bg-yellow-400/20 text-yellow-400' :
                'bg-secondary text-muted-foreground'
              }`}>{item.priority === 'high' ? 'PRIORITÉ' : item.priority === 'medium' ? 'PLANIFIÉ' : 'FUTUR'}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}