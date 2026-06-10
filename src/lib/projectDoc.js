// Documentation Ghost Trader — Auto-générée

export const PROJECT_VERSION = 'v4.1';
export const LAST_UPDATED = '2026-06-10';

export function generateProjectDocumentation() {
  return `
GHOST TRADER — DOCUMENTATION COMPLÈTE
${PROJECT_VERSION} | Mise à jour: ${LAST_UPDATED}
${'='.repeat(60)}

## 1. PRÉSENTATION DU PROJET

Ghost Trader est une plateforme de trading algorithmique et assistée par IA conçue pour les traders professionnels et semi-professionnels. Elle centralise l'ensemble des outils nécessaires à la gestion d'un business de trading : analyse multi-marchés, gestion de comptes PropFirm et personnels, journal automatisé, simulation financière, fiscalité et reporting.

**Philosophie:** 99% automatisé. Le trader se concentre uniquement sur les réglages et la validation des décisions stratégiques. Les agents IA font le reste.

## 2. ARCHITECTURE GÉNÉRALE

### 2.1 Stack Technologique
- **Frontend:** React 18 + Vite + TypeScript
- **UI:** Tailwind CSS + shadcn/ui (composants Radix UI)
- **Charts:** Recharts (graphiques temps réel)
- **State management:** TanStack Query (React Query v5)
- **Routing:** React Router DOM v6
- **Animations:** Framer Motion
- **Backend:** Base44 Platform (BaaS — Backend as a Service)
- **IA:** Base44 Integrations Core (LLM multi-modèles)
- **Base de données:** Base44 Entities (NoSQL cloud)

### 2.2 Structure des Fichiers
\`\`\`
src/
├── pages/           # 30+ pages fonctionnelles
├── components/      # Composants réutilisables
│   ├── layout/      # AppLayout, Sidebar, TopBar
│   ├── dashboard/   # Widgets dashboard
│   └── shared/      # StatCard, PreFlightChecklist, PnLGauge...
├── entities/        # Schémas BDD (JSON Schema)
├── agents/          # Agents IA (JSON config)
├── lib/             # Utilitaires, AuthContext, notifications
└── api/             # base44Client (SDK pré-initialisé)
\`\`\`

## 3. ENTITÉS (BASE DE DONNÉES)

| Entité | Description | Champs clés |
|--------|-------------|-------------|
| TradingAccount | Comptes de trading (PropFirm + Perso) | account_type, broker, platform, leverage, currency |
| Trade | Trades exécutés | symbol, asset_class, pattern, lot_size, commission |
| DailyReport | Journal quotidien | date, phase, wins, losses, net_pnl, analysis |
| Signal | Signaux TradingView webhook | source, direction, entry, stop_loss, status |
| PropFirm | Config PropFirms | daily_drawdown_pct, payout_split, trailing_drawdown |
| SnowballPlan | Plans de croissance | monthly_growth_target_pct, milestones |
| NewsEvent | Événements économiques | category, impact, event_time, trading_blocked |
| Settings | Configuration système | key, value, category |

## 4. AGENTS IA AUTONOMES

### 4.1 Market Scanner Agent (market_scanner.json)
- **Rôle:** Scanner automatique multi-marchés toutes les 2 minutes
- **Stratégies combinées:** ICT/SMC (Order Block, FVG, BOS/CHoCH), Market Profile (POC, VAH/VAL), Footprint (Delta, Imbalance), Carnet d'ordres (absorption, résistance)
- **Marchés couverts:** Forex, Indices, Crypto, Commodités, Actions
- **Fonctionnement:** Scoring pondéré multi-stratégies, minimum 2 convergences requises
- **Internet:** Oui (données temps réel via InvokeLLM + add_context_from_internet)

### 4.2 Trading Council Agent (trading_council.json)
- **Rôle:** Conseil stratégique global, analyse de portefeuille
- **Accès entités:** Trades, DailyReport, TradingAccount, Signal
- **Interface:** Chat IA intégré avec historique

## 5. PAGES ET FONCTIONNALITÉS

### 5.1 Dashboard (/)
- KPIs temps réel (PnL, DD, WR, Balance)
- Courbe d'équité automatique
- Raccourcis vers tous les outils
- Widgets Payout et Finance Perso intégrés
- Kill Switch visuel
- Signaux TradingView live
- Biais marché + Mission journalière + Risk Manager

### 5.2 Scanner Multi-Marchés (/scanner) ★ NOUVEAU AUTO
- **100% automatique:** scan au démarrage, puis toutes les 2 minutes
- Scan IA global toutes les 10 minutes (avec internet)
- Scoring multi-stratégies pondéré
- Expansion des détails au clic (niveaux entrée/SL/TP)
- Watchlist personnalisable avec alertes

### 5.3 Comptes Personnels MT4/MT5 (/personal-account) ★ NOUVEAU
- Gestion comptes sans aucune restriction
- Multi-broker (ICMarkets, Pepperstone, XM, etc.)
- Levier libre jusqu'à 1:500
- Coach IA personnalisé par compte
- Comparatif PropFirm vs Perso

### 5.4 Backtest (/backtest)
- Import CSV de trades
- Analyse performance avec courbes
- Rapport IA de validation

### 5.5 Backtest Automatisé (/backtest-auto) ★ AMÉLIORÉ
- 8 setups ICT/SMC + classiques
- 4 PropFirms avec règles intégrées
- Kill switch simulé
- Trailing drawdown
- Comparaison multi-scénarios sauvegardés
- Export CSV

### 5.6 Templates Backtest (/backtest-templates) ★ NOUVEAU
- 6 templates pré-construits (ICT OB, FVG, Pullback EMA, BOS/CHoCH, Gold Scalp, Crypto Trend)
- Création de templates personnalisés
- Analyse IA avec score + optimisations

### 5.7 Journal IA (/journal) ★ AUTOMATISÉ
- Auto-génération à 18h (configurable)
- Rapport hebdomadaire IA automatique
- Scores discipline/risque/exécution
- Détection patterns négatifs récurrents
- Export CSV
- Courbes d'équité et PnL intégrées

### 5.8 Analytics IA (/analytics)
- PnL trends mensuels
- Analyse par setup + session
- Heatmap horaire win rate
- Export CSV/JSON

### 5.9 Simulateur Drawdown (/drawdown-simulator) ★ NOUVEAU
- Simulation paramétrique avec règles PropFirm réelles
- Critère de Kelly automatique
- Monte Carlo 50 runs automatique
- Analyse risque IA automatique au chargement
- Chargement stats réelles depuis DB

### 5.10 Calendrier Payouts (/payout-calendar) ★ NOUVEAU
- Planning automatique de tous les comptes PropFirm
- Projections revenus 90 jours
- Courbe cumulative
- Analyse IA automatique au chargement
- Export CSV

### 5.11 Simulateur Payouts (/payout-simulator)
- Simulation probabiliste croissance
- Comparaison 5 PropFirms
- Optimisation IA paramètres

### 5.12 Calendrier Fiscal (/fiscal-calendar) ★ NOUVEAU
- Deadlines fiscales 2026 avec alertes
- Simulateur multi-régimes (Flat Tax, SASU, Micro, Lux...)
- Optimisation IA avec économies estimées

### 5.13 Rapport Fiscal Auto (/fiscal-auto)
- Simulation comparative statuts juridiques
- Conseil IA optimisation légale

### 5.14 Centre d'Alertes (/alerts) ★ AUTOMATISÉ
- Auto-check toutes les 30 secondes
- Kill switch automatique
- Alertes drawdown, PnL, pertes consécutives
- Historique notifications

### 5.15 Monte Carlo (/montecarlo)
- Simulation probabiliste 1000 scénarios
- Courbes P10/P50/P90
- Analyse risque IA

### 5.16 Corrélations (/correlations)
- Matrice 9x9 inter-marchés
- Régimes Risk-on/Risk-off
- Analyse en temps réel

### 5.17 PropFirms (/propfirms)
- Dashboard validation PropFirms
- Score compatibilité stratégie
- Pièges identifiés

### 5.18 Snowball (/snowball)
- Calcul croissance composée
- Projections long terme
- Roadmap milestones

### 5.19 Finance Personnelle (/finance-perso)
- Gestion dettes
- Calcul retrait sécurisé
- Score santé financière

### 5.20 Flux Live (/livefeed)
- Prix temps réel simulés
- Order book
- Analyse IA marché
- News feed

### 5.21 Sessions (/sessions)
- Gestion sessions trading
- Règles discipline
- Optimisation IA

### 5.22 Playbook (/playbook)
- Règles de trading
- Checklist pré-trade

### 5.23 Rapports (/reports)
- Dashboard performance
- Graphiques multi-périodes
- Export données

### 5.24 PropFirm Capital (/prop-capital)
- Suivi capital multi-comptes
- Projections scaling

### 5.25 Copy Trading (/copy-trading)
- Plan replication comptes
- Gestion multi-comptes simultanés

### 5.26 Connexion PropFirm (/prop-connect)
- Interface connexion comptes PropFirm

### 5.27 Réglages (/settings)
- Configuration phase (Backtest/Demo/Live)
- Webhook TradingView
- Risk management
- Automation IA
- PropFirm prices
- Documentation téléchargeable

## 6. AUTOMATISATION — NIVEAU 99%

### 6.1 Processus Auto (sans intervention)
| Fréquence | Action |
|-----------|--------|
| Au démarrage | Scan marchés + analyse IA |
| Toutes les 2 min | Scan patterns multi-stratégies |
| Toutes les 10 min | Scan IA global (internet) |
| Toutes les 30s | Vérification alertes (DD, PnL, pertes) |
| À 18h | Génération journal automatique |
| Au montage | Analyse risque, payout, fiscal |

### 6.2 Ce que fait le trader (1%)
- Configurer les paramètres de risque
- Choisir les marchés à scanner
- Valider les signaux de trading
- Consulter les rapports IA

## 7. STRATÉGIES INTÉGRÉES

### 7.1 ICT/SMC (30% du scoring)
- Order Block (OB bullish/bearish)
- Fair Value Gap (FVG + IFVG)
- Break of Structure (BOS)
- Change of Character (CHoCH)
- Breaker Block
- Liquidity Sweeps (EQH/EQL)
- Optimal Trade Entry (OTE)

### 7.2 Market Profile (22%)
- Point of Control (POC)
- Value Area High/Low (VAH/VAL)
- Initial Balance
- Distribution journalière

### 7.3 Footprint (8%)
- Delta (différence acheteurs/vendeurs)
- Imbalance (déséquilibre carnet)
- Absorption

### 7.4 Carnet d'Ordres (6%)
- Order Book Imbalance
- Mur acheteur/vendeur
- Spoofing detection

### 7.5 Classiques (34%)
- Pullback EMA 20/50/200
- Support/Résistance
- Breakout range
- Trend following Fibonacci

## 8. MARCHÉS SUPPORTÉS

| Marché | Exemples | Type compte |
|--------|----------|-------------|
| Forex | EURUSD, GBPUSD, XAUUSD, USDJPY | Perso + PropFirm |
| Indices | NQ, ES, DAX40, SPX500, FTSE100 | Perso + PropFirm |
| Crypto | BTCUSD, ETHUSD, SOLUSD | Perso uniquement |
| Commodités | Gold, Silver, Oil, Gas | Perso + PropFirm |
| Actions | AAPL, MSFT, NVDA, LVMH | Perso uniquement |

## 9. PROPFIRMS SUPPORTÉES

| PropFirm | Split | DD Max | Payout Min | Fréquence |
|----------|-------|--------|------------|-----------|
| MyFundedFutures | 80% | 8% | 500€ | Bimensuel |
| Tradefy | 85% | 8% | 100€ | Hebdo |
| Lucid Trading | 80% | 8% | 200€ | Mensuel |
| UFunded | 75% | 8% | 500€ | Mensuel |
| TopStep | 90% | 6% | 100$ | Hebdo |

## 10. COMPTES PERSONNELS MT4/MT5

**Aucune restriction** sur les comptes personnels:
- Pas de DD maximum
- Pas d'objectif de profit
- Pas de règle de consistance
- Levier jusqu'à 1:500
- Tous marchés accessibles
- Scalping autorisé
- News trading autorisé
- Capital minimum: 500€

**Brokers supportés:** ICMarkets, Pepperstone, XM, Exness, Admirals, OANDA, IG Markets, Saxo Bank, Interactive Brokers, et plus

## 11. SÉCURITÉ ET PROTECTION CAPITAL

### Kill Switch Automatique
- Déclenché après N pertes consécutives (configurable)
- Déclenché si DD journalier > seuil configuré
- Déclenché si DD total > règles PropFirm
- Notification sonore + visuelle

### Critère de Kelly (automatique)
- Calcul optimal de la taille de position
- Basé sur WR réel et RR moyen
- Recommandation IA en temps réel

## 12. INTÉGRATIONS

| Service | Usage |
|---------|-------|
| TradingView | Webhooks signaux (JSON payload) |
| Base44 LLM | InvokeLLM pour toutes les analyses IA |
| Base44 Storage | Upload screenshots, fichiers CSV |
| Internet (IA) | Scan marchés en temps réel |

## 13. FISCALITÉ FRANCE

### Régimes supportés
- Micro-Entreprise: Taux effectif ~22.6%
- Flat Tax (PFU): 30% forfait
- SASU + IS: IS 15% jusqu'à 42.5K€
- EURL à l'IR: ~30-40%
- Luxembourg (non-résidents): ~15%

### Calendrier fiscal automatique
- 11 deadlines identifiées pour 2026
- Alertes 30 jours avant échéance
- Export CSV agenda

## 14. ROADMAP ET AMÉLIORATIONS FUTURES

- [ ] Connexion API réelle MT4/MT5 (via MQL5)
- [ ] Alertes Telegram/WhatsApp
- [ ] Copy trading automatisé
- [ ] IA prédictive sur données historiques personnelles
- [ ] Rapport fiscal automatique PDF
- [ ] Mode mobile optimisé
- [ ] Multi-utilisateurs et partage de playbook

---
Documentation générée automatiquement par Ghost Trader ${PROJECT_VERSION}
Dernière mise à jour: ${LAST_UPDATED}
`.trim();
}

export function downloadDocumentation() {
  const doc = generateProjectDocumentation();
  const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `GhostTrader_Documentation_${PROJECT_VERSION}_${LAST_UPDATED}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}