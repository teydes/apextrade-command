# GHOST TRADER — Documentation Complète (v13.4)

> **ApexTrade Command / Ghost Trader** — La plateforme de commandement ultime pour traders professionnels et prop-traders : pilotage multi-comptes, journal automatisé, backtesting, gestion du risque, fiscalité, et un laboratoire quantitatif de **plus de 265 modules d'analyse**.

---

## Table des matières

1. [Présentation générale](#1-présentation-générale)
2. [Stack technique & architecture](#2-stack-technique--architecture)
3. [Modèle de données (entités)](#3-modèle-de-données-entités)
4. [Infrastructure & composants partagés](#4-infrastructure--composants-partagés)
5. [Agents IA embarqués](#5-agents-ia-embarqués)
6. [Guide complet des onglets et pages](#6-guide-complet-des-onglets-et-pages)
7. [Authentification & sécurité](#7-authentification--sécurité)
8. [Historique des versions](#8-historique-des-versions)

---

## 1. Présentation générale

Ghost Trader est un poste de commandement de trading professionnel organisé autour de quatre piliers :

- **Pilotage multi-comptes** — suivi simultané de comptes PropFirm (avec leurs règles strictes) et de comptes personnels (MT4/MT5, cTrader, TradingView…), avec surveillance temps réel des limites de drawdown.
- **Exécution assistée** — réception de signaux TradingView par webhook, checklist pré-trade, Trade Guardian, kill switch d'urgence.
- **Analyse quantitative** — un « Quant Lab » de 265+ modules : ratios risque/rendement, tests statistiques, détection de régime, attribution de performance, Monte Carlo, etc.
- **Progression capitalistique** — simulateur « Boule de Neige » pour scaler de compte en compte jusqu'à l'objectif de 1 000 000 €, plus les volets bancaires, de payouts et fiscaux.

Chaque page analytique suit le même gabarit (composant `QuantPage`) : **métriques clés → graphique Recharts → analyse IA on-demand**, toutes alimentées par vos vraies données de trades.

---

## 2. Stack technique & architecture

### 2.1 Frontend

| Technologie | Rôle |
|---|---|
| **React 18 + Vite** | Framework UI et bundler — rechargement instantané en développement, build optimisé en production. |
| **React Router v6** | Routage SPA : chaque module analytique est une route dédiée (265+ routes déclarées dans `src/App.jsx`). |
| **Tailwind CSS** | Système de design utility-first. Thème « terminal de trading » sombre défini par tokens CSS dans `src/index.css` (fond `#0B1020`, vert néon `#00FF88`, bleu électrique `#0088FF`, rouge `#EF4444`, ambre `#F59E0B`). |
| **shadcn/ui** | Bibliothèque de composants accessibles (Card, Dialog, Tabs, Select, Toast, Command, etc.) sur primitives Radix. |
| **Recharts** | Graphiques : barres, lignes, aires, radar, pie, jauges PnL, heatmaps. |
| **TanStack Query (React Query)** | Cache et synchronisation des données : chaque page interroge la base via des queries clées (`trades-quant`, `portfolio-accounts`…), avec revalidation automatique et abonnements temps réel. |
| **Lucide React** | Iconographie (seules icônes réellement existantes du pack). |
| **Framer Motion** | Micro-animations des interfaces interactives. |
| **cmdk** | Moteur de la palette de commandes globale (⌘K / Ctrl+K). |
| **date-fns / moment / lodash** | Manipulation des dates, agrégations et utilitaires. |
| **html2canvas + jsPDF** | Export d'images et de rapports PDF depuis l'application. |
| **react-hook-form + zod** | Formulaires complexes avec validation de schéma. |

### 2.2 Backend (Base44 — Backend-as-a-Service)

La plateforme Base44 fournit, sans code serveur à maintenir :

- **Base de données d'entités** : schémas JSON déclarés dans `base44/entities/*.jsonc`, consommés via le SDK pré-initialisé `base44.entities.<Entité>` (CRUD, filtres, tris, `bulkCreate`, `updateMany`, `deleteMany`).
- **Authentification gérée** : sessions, vérification email, rôles `admin`/`user` — aucun backend d'auth custom (`base44.auth.me()`, `inviteUser`, …).
- **Temps réel** : `base44.entities.<Entité>.subscribe(cb)` pousse chaque création/modification/suppression vers les vues ouvertes (utilisé notamment par la Vue Globale et le flux live).
- **Intégrations IA** : `InvokeLLM` (analyse, scoring, génération de rapports), `GenerateImage`, `TranscribeAudio`, `SendEmail`, `UploadPrivateFile/PublicFile`, extraction de données de fichiers.
- **Analytique produit** : suivi d'événements `base44.analytics.track`.
- **Agents IA** : agents configurables en JSON (entités + fonctions + canaux) hébergés par la plateforme.

### 2.3 Architecture des dossiers

```
src/
  App.jsx                 → routeur : ~266 routes déclarées + providers (Auth, Query, Toaster)
  components/
    layout/               → AppLayout, Sidebar (navigation groupée), TopBar (recherche ⌘K)
    shared/               → QuantPage (gabarit des modules), StatCard, CommandPalette,
                            RiskMonitor (alertes limites temps réel), PnLGauge, KillSwitchBanner…
    dashboard/            → widgets du Dashboard (MultiAccountPanel, RiskManager, NewsCalendar…)
    settings/             → onglets de la page Réglages
    ui/                   → primitives shadcn/ui
  pages/                  → 266 pages, une par module
  lib/                    → AuthContext, stats.js (helpers statistiques), portfolio.js
                            (agrégation multi-comptes), query-client, notifications, projectDoc
base44/
  entities/               → schémas de données (Trade, TradingAccount, PropFirm…)
  agents/                 → agents IA (ghost_coach, market_scanner, trading_council)
```

---

## 3. Modèle de données (entités)

### `Trade` — le trade unitaire (cœur du système)
Symbole, classe d'actif (forex/indices/crypto/commodities/stocks/futures), direction, prix d'entrée/sortie, SL et TP1/TP2/TP3, quantité/lot, PnL et PnL%, statut (open/closed/cancelled), résultat (win/loss/breakeven), stratégie (ICT/SMC, AMD/IFVG, Footprint, Order Book, Pullback, Breakout, Range, Trend Following, Mean Reversion, Scalping, Mixed), pattern détecté (OB, FVG, BOS, CHoCH, EQH/EQL, Liquidity…), session (London, New York, Asian, Pre-Market, Sydney, Overlap), timeframe, R:R, commissions/swap, impact news, capture d'écran, erreurs/améliorations, source du signal (webhook/manual/auto/agent). Chaque trade est rattaché à un `account_id` et à une **phase** (`backtest_local`, `demo`, `live`).

### `TradingAccount` — un compte de trading
Nom, type (propfirm / personnel / démo), PropFirm ou broker, taille, solde courant, devise (EUR/USD/GBP/CHF), plateforme (MT4/MT5/Quantower/NinjaTrader/cTrader/TradingView), phase, statut (active/inactive/blown/passed), limites de drawdown journalier et max, cibles de profit (journalière et globale), règle de consistance (% max d'un jour sur le total), levier, login, notes.

### `PropFirm` — fiche d'une prop firm
Tailles de comptes proposées, drawdowns (journalier/max, trailing), cible de profit, règle de consistance, autorisation des bots, trading de news, fréquence et split des payouts, **score de compatibilité 0-100**, pièges identifiés, statut (testing/validated/avoided/active).

### `Signal` — signal entrant (webhook TradingView / manuel / agent)
Symbole, direction (LONG/SHORT/CLOSE_ALL), entrée, SL, TP1-3, stratégie, timeframe, confiance 0-100, statut (pending/executed/rejected/expired), payload brut brut, motif de rejet, checklist passée.

### `TradingPlan` — plan de trading
Classe d'actif, timeframe, session, stratégie, règles d'entrée/sortie/risque, max trades/jour, perte journalière max, risk par trade, R:R minimum, checklist pré-trade, backtest associé (trades/WR/PF), statut (draft/active/paused/archived).

### `PsychologyEntry` — journal psychologique
Date, humeur (confident → tilt), score de discipline 0-100, FOMO, fatigue, trades pris/prévus, respect des règles, overtrading, revenge trading, qualité de session, notes.

### `NewsEvent` — calendrier économique
Titre, catégorie (FOMC, CPI, NFP, GDP, PPI, PMI, Fed Speech, Geopolitical, Earnings), impact (low→critical), heure, actual/forecast/previous, réaction du marché, blocage de trading (minutes avant/après).

### `SnowballPlan` — plan de capitalisation
Capital de départ, croissance mensuelle cible, objectif quotidien, % de réinvestissement, montant cible (1 M€ par défaut), nombre de comptes, prop firms sélectionnées, jalons mensuels (mois, solde projeté, comptes, atteint?).

### `DailyReport` — rapport journalier automatisé
Date, compte, phase, totaux (trades, wins, losses, breakevens), PnL brut/net, drawdown max, win rate, R:R moyen, meilleure/pire trade, target journalière atteinte, consistance OK, conditions de marché, **analyse IA**, améliorations, prêt pour la phase suivante.

### `Settings` — réglages clé/valeur
Catégories : webhook, risk, notification, system, propfirm — avec description.

### `User` (entité plateforme, non éditable)
Comptes applicatifs avec rôles admin/user, invités via `base44.users.inviteUser`.

---

## 4. Infrastructure & composants partagés

### `QuantPage` — le gabarit des 265 modules quantitatifs
Chaque module analytique déclare : titre/sous-titre/icône, **métriques** (fonction recevant les trades), **données de graphique**, type de chart (bar/line/area/pie/radar), **prompt IA**, et optionnellement des statistiques supplémentaires. `QuantPage` fournit : chargement automatique des 500 derniers trades, rendu des métriques, du graphique Recharts, et un bouton **« Analyse IA »** qui envoie le contexte au LLM et affiche l'analyse structurée (score /100, niveau de risque, recommandations).

### `Sidebar` — navigation groupée (12 groupes, 265+ entrées)
Core · Comptes · Backtesting · Outils Trade · Analyse & IA · Capital & Croissance · Gestion · Quant Lab · Advanced Quant · Market Analysis · Calculators Pro · Quality & Review. Affiche le badge de version (v13.0) et un bloc « System Status » (Webhook TV, Scanner IA, News Feed, Live Bot).

### `CommandPalette` — recherche globale ⌘K / Ctrl+K
Navigation instantanée vers les 265+ modules : ouverte depuis le TopBar ou le raccourci clavier, filtre les entrées de navigation à la frappe.

### `RiskMonitor` + `src/lib/portfolio.js` — moteur de surveillance temps réel
`accountStats()` reconstruit pour chaque compte : PnL du jour, PnL total, equity peak, drawdown courant, utilisation des limites (DD journalier, DD max), progression de l'objectif de profit et statut de consistance. `computeAlerts()` génère les alertes : **warning à 80%** d'une limite, **critical à 95%**, succès à l'objectif atteint, critique en violation de consistance. `RiskMonitor` (monté dans la Vue Globale) déclenche les toasts — une seule fois par niveau et par compte. La page s'abonne aux entités `TradingAccount`/`Trade` pour un rafraîchissement instantané, plus un polling de secours toutes les 30 s.

### `src/lib/stats.js` — boîte à outils statistique
Somme/moyenne/écart-type, tri chronologique, approximation d'Erf et CDF normale, survie du Chi² (Wilson-Hilferty), formatage monétaire — partagée par tous les modules de tests statistiques.

### Modules dynamiques de la Vue Globale

- **Objectifs journaliers dynamiques** (`src/components/overview/DynamicTargets.jsx`) — calcule pour chaque compte soumis à une règle de consistance la **cible de gain du jour garantie conforme** : le plafond est résolu exactement à partir de la formule `g_max = (r·PnL_total − PnL_jour) / (1 − r)` (avec `r` = règle de consistance), puis la cible prudente proposée est `min(plafond, 1% du solde, restant d'objectif global)`. Si le plafond est à zéro, le module affiche « STOP gains (consistance) » : tout gain supplémentaire violerait la règle. Recalculé en temps réel à chaque trade.
- **Simulateur de risque pré-position** (`src/components/overview/PreTradeRisk.jsx`) — avant de prendre une position, sélectionnez un compte et saisissez (ou choisissez par raccourci 0,5 % / 1 % / 2 % du compte) une **perte potentielle** : le module projette le solde, l'utilisation du DD journalier, du DD max et du ratio de consistance *après* cette perte, avec barres avant → après et un verdict sans ambiguïté : **POSITION AUTORISÉE** (< 80 %), **RISQUE ÉLEVÉ** (≥ 80 %), **POSITION INTERDITE** (≥ 100 % d'une limite).

### Enrichissements de la Vue Globale (v13.2)

- **Equity agrégée** (`GlobalEquityChart.jsx`) — courbe du PnL cumulé de tous les comptes sur les 30 derniers jours.
- **Analyse IA du portefeuille** (`GlobalAIReview.jsx`) — un clic envoie le résumé complet (soldes, PnL, utilisation des limites, consistance, objectifs de chaque compte) au LLM qui rend une évaluation : score /100, niveau de risque, recommandations priorisées.
- **Progression de l'objectif du jour** — barre de progression dans le module Objectifs dynamiques : PnL du jour consolidé vs somme des cibles de gain.
- **Stats journalières par compte** — nombre de trades du jour et win rate du jour affichés sur chaque carte de compte.
- **Badge « PAYOUT PRÊT »** — s'affiche automatiquement dès qu'un compte atteint 100% de son objectif de profit.
- **Export CSV du portefeuille** — un bouton télécharge le rapport complet : solde, PnL jour/total, DD jour/max, objectif, consistance, statut, trades et WR du jour, pour tous les comptes.

### Capital & graphiques agrégés (v13.3)

- **Évolution du capital** (`CapitalEvolution.jsx`) — deux graphiques : l'**equity historique agrégée** de tous les comptes (reconstruite depuis le capital de départ, avec ligne de référence au capital initial et drawdown max historique affiché) et le **PnL mensuel agrégé** des 12 derniers mois (barres vertes/rouges).
- **Objectif de capital** (`TargetProgress.jsx`) — jauge de progression vers le montant cible du plan Boule de Neige (1 M€ par défaut), avec estimation du temps restant **au rythme actuel** (moyenne des 3 derniers mois de PnL).

### Suggestions intelligentes (v13.4)

- **Panneau « Suggestions & Améliorations »** (`SmartSuggestions.jsx`) — analyse par règles de l'état du portefeuille, avec jusqu'à 12 recommandations priorisées par couleur : pertes consécutives (réduire la taille / pause), DD journalier ≥ 60% (réduire la taille) ou ≥ 85% (arrêter le compte), DD max consommé, consistance en violation (risque de refus de payout) ou en zone d'attention, objectif approché (90%) ou atteint (demander le payout), sur-trading vs max du plan, meilleur / pire contributeur du portefeuille. Si tout va bien, message de validation verte.

### Autres briques
- `AuthContext` : état d'authentification global, gestion des erreurs (utilisateur non enregistré, auth requise).
- `PnLGauge`, `StatCard`, `PreFlightChecklist`, `KillSwitchBanner`, `NotificationCenter`, `PushAlerts` : widgets transverses.
- `CSVImporter` : import de trades backtest depuis CSV.
- `Toaster` : notifications système (toasts de risque, confirmations).

---

## 5. Agents IA embarqués

| Agent | Rôle |
|---|---|
| **Ghost Coach** (`ghost_coach.jsonc`) | Coach personnel : dialogue sur vos données de trades, plans et psychologie ; conseille la discipline, analyse les erreurs récurrentes, fixe les objectifs quotidiens. Interfaçé via la page « Ghost Coach IA ». |
| **Market Scanner** (`market_scanner.jsonc`) | Scanner multi-stratégies (ICT/SMC, Market Profile, Order Flow) : score les setups, classe la confiance, explique les confluences. Interfaçé via la page « Scanner Multi-Marchés ». |
| **Trading Council** (`trading_council.jsonc`) | « Conseil » de plusieurs points de vue IA (risque, exécution, psychologie) qui délibèrent sur vos décisions — interfaçé via la page « Conseil IA ». |

Chaque agent dispose d'un accès contrôlé aux entités (trades, comptes, plans) et peut être étendu aux workflows planifiés pour un suivi proactif.

---

## 6. Guide complet des onglets et pages

### 6.1 Groupe « Core » — pilotage temps réel

| Page | Route | Contenu |
|---|---|---|
| **Dashboard** | `/` | Hub principal : cartes de statut des comptes, courbe d'equity, jauge PnL, trades récents, panneau multi-comptes, gestionnaire de risque, calendrier de news, biais de marché, signaux automatisés, widgets payouts/finance, missions du jour, sessions de marché actives. |
| **Vue Globale** | `/overview` | Centre de contrôle multi-comptes : equity totale, PnL du jour, risque max, comptes à risque ; une carte par compte affichant clairement le **solde actuel**, le **PnL du jour**, les barres DD journalier / DD max / objectif / **statut de consistance** (ok · attention · violation) ; bandeau d'alertes de limites ; **objectifs journaliers dynamiques** ajustés à la taille des comptes et à la règle de consistance ; **simulateur de risque pré-position** (impact d'une perte sur les drawdowns avant exécution) ; jauge de progression vers l'**objectif de capital** (plan Boule de Neige) ; courbe **d'equity agrégée** 30 j ; **évolution du capital** historique tous comptes + **PnL mensuel agrégé** ; **suggestions intelligentes** (analyse par règles : pertes consécutives, drawdowns, consistance, sur-trading, objectif, meilleur/pire compte) ; **analyse IA du portefeuille** (score, niveau de risque, recommandations) ; progression de l'objectif du jour ; stats journalières (trades, WR) et badge **« PAYOUT PRÊT »** par compte ; **export CSV** du rapport ; graphique PnL par compte ; **surveillance temps réel avec alertes automatiques à 80%/95% des limites** (voir §4). |
| **Trading Live** | `/live` | Tableau de bord d'exécution sur comptes live : signaux optimisés, journal d'activité automatisé, positions ouvertes, tableaux de risque avec limites PropFirm, arrêt d'urgence (kill switch), synchronisation des trades, suivi de cohérence. |
| **Trading OS** | `/trading-os` | Poste de travail opérationnel : routines, états de session, checklist d'exécution, raccourcis vers les outils du quotidien. |
| **Ghost Coach IA** | `/coach` | Chat avec l'agent coach : questions/réponses sur vos données, plans d'action, retours disciplinés. |
| **Scanner Multi-Marchés** | `/scanner` | Scanner multi-stratégies multi-marchés : onglets setups actifs, watchlist, historique d'alertes, performances par stratégie ; scoring IA des probabilités. |
| **Flux Live** | `/livefeed` | Flux d'événements en temps réel : signaux, exécutions, alertes, changements de compte. |

### 6.2 Groupe « Comptes »

| Page | Route | Contenu |
|---|---|---|
| **Comptes Perso MT4/5** | `/personal-account` | Gestion des comptes personnels (brokers, levier, plateformes) sans règles PropFirm. |
| **Suivi PropFirm** | `/prop-capital` | Suivi du capital alloué aux comptes PropFirm : progression, statuts, phase. |
| **PropFirms** | `/propfirms` | Comparatif des prop firms optimisées pour le trading automatisé/copy : fiches détaillées (règles, pièges, scores de compatibilité), plan de scaling multi-comptes, analyse IA comparative. |
| **Connexion PF** | `/prop-connect` | Connexion/synchronisation des comptes PropFirm. |
| **Copy Trading** | `/copy-trading` | Pilotage de la réplication de trades entre comptes (master → slaves) et cohérence des copies. |

### 6.3 Groupe « Backtesting »

| Page | Route | Contenu |
|---|---|---|
| **Templates Backtest** | `/backtest-templates` | Bibliothèque de scénarios de backtest réutilisables. |
| **Journal Backtest** | `/backtest` | Journal de validation locale : saisie des trades backtest, courbe d'equity, comparatifs par setup/session, critique IA de la stratégie, import CSV, statut de « préparation à la démo ». |
| **Backtest Auto** | `/backtest-auto` | Backtesting automatisé façon PropFirm : simulation paramétrique des setups/sessions, scénarios sauvegardés, export CSV, recommandations IA. |
| **Démo Bot** | `/demo` | Supervision du bot en phase démo avant passage en live. |

### 6.4 Groupe « Outils Trade »

Trade Builder (`/trade-builder`) construction détaillée d'un trade · Calculateur de Risque (`/risk-calc`) dimensionnement du risque par trade · Trade Review IA (`/trade-review`) revue post-trade par l'IA · Heatmap Perf. (`/heatmap`) heatmap de performance · Comparateur PF (`/propfirm-comparator`) face-à-face de prop firms · Trade Replay (`/trade-replay`) relecture des trades · Position Sizing (`/position-sizer`) taille de position · Risk of Ruin (`/risk-ruin`) probabilité de ruine · Trade Guardian (`/guardian`) gardien des règles en cours de session · Liquidity Map (`/liquidity-map`) cartographie de liquidité · Hedging Calc (`/hedging`) calculs de couverture · Gap Risk (`/gap-risk`) risque de gap overnight · Margin Call (`/margin-call`) distance à l'appel de marge · Pos. Correlation (`/position-correlation`) corrélation des positions ouvertes · DD Duration (`/dd-duration`) durée des drawdowns.

### 6.5 Groupe « Analyse & IA »

Analytics IA (`/analytics`) synthèse IA du PnL, setups, sessions, erreurs · Monte Carlo (`/montecarlo`) simulation multi-scénarios WR/risque sur comptes réels · Equity Analytics (`/equity-analytics`) anatomie de la courbe d'equity · Forecaster IA (`/forecaster`) projection de performance · Strategy Optim. (`/strategy-optimizer`) optimisation des paramètres · Volatility (`/volatility`) analyse de volatilité · Psychology (`/psychology`) journal psychologique (humeur, discipline, FOMO, tilt) · Journal IA (`/journal`) journal quotidien auto-généré à 18h avec analyse IA, KPIs et courbes · Sessions (`/sessions`) statistiques par session de marché · Session Clock (`/session-clock`) horloge des sessions mondiales et overlaps · Playbook (`/playbook`) bibliothèque de plays · Rapports (`/reports`) rapports synthétiques exportables CSV/JSON · Corrélations (`/correlations`) corrélations inter-marchés.

### 6.6 Groupe « Capital & Croissance »

Calendrier Payouts (`/payout-calendar`) échéancier des retraits · Simulateur Payouts (`/payout-simulator`) projection des gains de payouts · Simulateur Drawdown (`/drawdown-simulator`) impact des séries de pertes · **Boule de Neige** (`/snowball`) plan de capitalisation multi-comptes jusqu'à 1 M€ : jalons, courbe projetée, évaluation IA de faisabilité · Finance Perso (`/finance-perso`) finances personnelles.

### 6.7 Groupe « Gestion »

Alertes Kill Switch (`/alerts`) centre d'alertes critiques · Calendrier Fiscal (`/fiscal-calendar`) échéances fiscales · Fiscal Auto (`/fiscal-auto`) suivi fiscal automatisé · Actualités (`/news`) flux de news · Banque (`/bank`) dettes, payouts, coûts opérationnels · Backlog IA (`/backlog`) backlog d'améliorations priorisé · Stratégie (`/strategy`) documentation des stratégies · Plan Builder (`/plan-builder`) constructeur de plans de trading (règles, checklists) · Conseil IA (`/council`) délibération multi-perspectives du Trading Council.

### 6.8 Groupe « Quant Lab » (53 modules)

Fondamentaux du money management et de la performance :
**Kelly Criterion** (`/kelly`) fraction de Kelly · **Sharpe & Ratios** (`/sharpe`) famille Sharpe · **Expectancy** (`/expectancy`) espérance par trade · **Streak Analyzer** (`/streaks`) séries gagnantes/perdantes · **Drawdown** (`/drawdown-analysis`) analyse des pertes max · **Consistency** (`/consistency`) régularité des résultats · **Simulator** (`/trade-simulator`) simulateur de séquences · **Portfolio Heat** (`/portfolio-heat`) exposition totale ouverte · **Correlations** (`/correlation-matrix`) matrice de corrélation symboles · **Session Stats** (`/session-analyzer`) stats par session · **MTF Confluence** (`/mf-confluence`) confluence multi-timeframes · **Pivot Points** (`/pivots`) niveaux pivots · **R:R Calculator** (`/rr-calc`) ratio risque/rendement · **Break-Even** (`/breakeven`) point d'équilibre après frais · **Compounding** (`/compounding`) capitalisation · **Slippage** (`/slippage`) coût de glissement · **WFA Backtest** (`/backtest-engine`) walk-forward engine · **Risk Parity** (`/risk-parity`) allocation à parité de risque · **Tags Analyzer** (`/trade-tags`) analyse par tags · **MFE/MAE** (`/mfe-mae`) excursions favorables/défavorables · **Duration** (`/trade-duration`) durée des trades · **By Symbol** (`/symbol-performance`) performance par instrument · **Z-Score** (`/zscore`) écart à la moyenne · **DD Recovery** (`/dd-recovery`) temps de récupération · **Sequence Matrix** (`/sequence-matrix`) matrice des séquences W/L · **Entry/Exit Q.** (`/entry-exit-quality`) qualité des points d'entrée/sortie · **Equity Stats** (`/equity-stats`) statistiques de la courbe · **WR Optimizer** (`/wr-optimizer`) arbitrage win rate/payoff · **BT Compare** (`/backtest-compare`) comparaison de backtests · **R-Multiples** (`/r-multiples`) distribution en R · **Profit Factor** (`/profit-factor`) PF détaillé · **Recovery Factor** (`/recovery-factor`) rendement/DD max · **Trade Velocity** (`/trade-velocity`) fréquence d'exécution · **Efficiency** (`/trade-efficiency`) capture du mouvement · **Capital Eff.** (`/capital-efficiency`) rendement du capital engagé · **Eq. Momentum** (`/equity-momentum`) momentum de la courbe · **Clustering** (`/trade-clustering`) regroupement des trades · **Attribution** (`/trade-attribution`) attribution par facteur · **Perf Attribution** (`/perf-attribution`) attribution de la performance · **Setup Quality** (`/setup-quality`) score des setups · **Optimal Risk** (`/optimal-risk`) risque optimal · **Sharpe Opt.** (`/sharpe-optimizer`) optimisation du Sharpe · **DD Probability** (`/dd-probability`) probabilité de drawdown · **Sortino** (`/sortino`) ratio Sortino · **Calmar** (`/calmar`) Calmar · **Omega** (`/omega`) ratio Omega · **K-Ratio** (`/k-ratio`) pente de l'equity · **Expected Val.** (`/expected-value`) valeur espérée · **Lev. Optim.** (`/leverage-opt`) levier optimal · **Growth Rate** (`/growth-rate`) taux de croissance · **Eq. Fitness** (`/equity-fitness`) fitness de la courbe · **Risk Ladder** (`/risk-ladder`) échelle de risque · **Frequency** (`/trade-frequency`) cadence de trading · **Scorecard** (`/trader-scorecard`) fiche de note du trader.

### 6.9 Groupe « Advanced Quant » (110 modules)

Statistique et ingénierie financière avancée :
**Info Ratio** · **Treynor** · **Modigliani M²** · **Prob. Sharpe** (test statistique du Sharpe) · **Deflated Sharpe** (correction du multiple testing) · **MAR Ratio** · **Burke** · **Sterling** · **Pain Index** · **Ulcer Index** · **Capture Ratios** (up/down capture) · **Alpha** · **Beta** · **Skew & Kurtosis** · **Hurst Exp.** (persistance des séries) · **Fractal Dim.** · **Choppiness** · **Autocorrelation** · **Vol Clustering** · **Mean Reversion** (vitesse de retour à la moyenne) · **Cointegration** · **Gambler's Ruin** · **Walk-Forward** · **Overfit Detector** · **Bootstrap** · **Stress Test** · **Sensitivity** · **Cum. Delta** · **Eff. Frontier** · **Net Profit** · **Eq. Decomp.** · **Benchmark** · **Latency** (délais d'exécution) · **Data Quality** (score de qualité des données) · **Tail Ratio** · **Rachev Ratio** · **Gain/Pain** · **Upside Pot.** · **Rolling Sharpe/Sortino/DD/Vol/WR/E[R]** (fenêtres glissantes) · **Hourly Perf** · **Quarterly** · **Yearly Comp** · **Monthly Matrix** · **Outliers** · **DD Depth** · **Recovery Time** · **Quality Comp.** (score composite) · **Price Eff.** · **Concentration** · **CVaR** · **Kurtosis Risk** · **Cum. Alpha** · **Strategy Decay** · **Regime Detect** (détection de régime) · **P. Consistency** · **Worst Case** · **Eq. Smoothness** · **Geo Returns** (rendements géométriques) · **RA Ranking** (classement risk-adjusted) · **Cost Efficiency** · **SQN (Van Tharp)** · **Optimal f** (Ralph Vince) · **Expectunity** · **R-Expectancy** · **Kelly Mult.** · **T-Statistic** · **Conf. Interval** · **Sharpe Sig.** · **Jarque-Bera** (normalité) · **Ljung-Box** (indépendance) · **Shannon Entropy** · **Gini Coeff.** (concentration des gains) · **Tracking Error** · **Info Coeff.** · **Fama Decomp.** · **Brinson Attr.** · **Style Drift** · **Capacity** (capacité de la stratégie) · **PF Stability** · **DD Sharpe** · **R-Expectancy**… · **Risk Decomp.** · **Overfit Risk** · **Liquidity VaR** · **Vol-Adj Returns** · **Persistence** · **Robustness** · **Signal Quality** · **Bench. Alpha** · **Kolmog.-Smirnov** (test de distribution) · **ADF Stationarity** (racine unitaire) · **R² Equity** (linéarité de la courbe) · **MAD** (déviations absolues moyennes) · **Semi-Deviation** · **Corr. Stability** · **Beta Stability** · **V2 Ratio** · **MC VaR** (VaR Monte Carlo) · **Cost Sharpe** (Sharpe net de coûts) — et les 10 derniers-nés :
- **WR Bayésien** (`/bayes-wr`) : distribution postérieure Beta du win rate, intervalle de crédibilité 95%, probabilité que le WR dépasse 50%.
- **Runs Test** (`/runs-test`) : test de Wald–Wolfowitz — vos séquences W/L sont-elles aléatoires (détection de tilt/clustering) ?
- **Chi² Test** (`/chi-square`) : uniformité de la répartition d'activité par jour de semaine.
- **Time Under Water** (`/tuw`) : % du temps passé sous le dernier sommet d'equity, plus longue période sous l'eau.
- **Payoff Ratio** (`/payoff-ratio`) : gain moyen / perte moyenne et win rate d'équilibre qui en découle.
- **WR Conditionnel** (`/cond-wr`) : win rate après un gain vs après une perte (biais émotionnel).
- **Séries de Pertes** (`/loss-streak`) : Monte Carlo — probabilité d'encaisser 3/5/8/10 pertes consécutives sur 100 trades.
- **Recovery Requis** (`/recovery-needed`) : gain nécessaire pour récupérer chaque niveau de drawdown (asymétrie des pertes).
- **Rendements M/Q/Y** (`/period-returns`) : MTD, QTD, YTD et PnL des 12 derniers mois.
- **Salaire Horaire** (`/hourly-wage`) : euros gagnés par heure réellement passée en position, PnL par heure d'entrée.

### 6.10 Groupe « Market Analysis »

Market Profile (`/market-profile`) profil de marché · Order Flow (`/order-flow`) flux d'ordres · Fibonacci (`/fibonacci`) niveaux de retracement · Eco Calendar (`/economic-calendar`) calendrier économique détaillé · PnL Calendar (`/calendar-heatmap`) heatmap calendrier du PnL · Currency Strength (`/currency-strength`) force des devises · Volatility Regime (`/volatility-regime`) régime de volatilité · Market Internals (`/market-internals`) internes de marché · VWAP (`/vwap`) prix moyen pondéré par volume · Regime Perf (`/regime-perf`) performance par régime · Vol. Surface (`/vol-surface`) surface de volatilité · Vol. Target (`/vol-target`) ciblage de volatilité.

### 6.11 Groupe « Calculators Pro »

ATR Position Sizer (`/atr-sizer`) sizing basé ATR · Margin Calc (`/margin-calc`) marge requise · Pip Value (`/pip-calc`) valeur du pip · Swap Calc (`/swap-calc`) swaps overnight · Spread Cost (`/spread-cost`) coût du spread.

### 6.12 Groupe « Quality & Review »

Trade Grading (`/trade-grading`) notation A-F des trades · Daily Routine (`/daily-routine`) routine quotidienne checkée · Goals Tracker (`/goals`) suivi d'objectifs · Psychology Score (`/psychology-score`) score psychologique agrégé · Day of Week (`/day-of-week`) performance par jour · Seasonality (`/monthly-seasonality`) saisonnalité mensuelle · Conviction (`/conviction`) score de conviction des entrées · Liq. Sweep (`/liq-sweep`) détection de balayages de liquidité · **Réglages** (`/settings`) : multi-onglets — phases de trading, gestion du risque, notifications, automatisation/webhook TradingView (test de connectivité), gestion des prix PropFirm, ajustement manuel des soldes, export de configuration, documentation.

---

## 7. Authentification & sécurité

- **Authentification plateforme** : email/mot de passe et fournisseurs gérés par Base44 — aucune logique d'auth custom. Les erreurs (utilisateur non enregistré, session requise) sont interceptées par `AuthContext` et affichées proprement.
- **Rôles** : `admin` / `user`, invitations via `base44.users.inviteUser`.
- **Données** : stockage entités Base44 ; les fichiers personnels (captures d'écran de trades) passent par le stockage **privé** (`UploadPrivateFile`) avec URLs signées à durée limitée.
- **Sécurité de session** : aucun secret en frontend ; les clés/API tiers restent côté plateforme.

---

## 8. Historique des versions

| Version | Contenu |
|---|---|
| v7.0 | Cœur applicatif : dashboard, comptes, backtest, news, reports, réglages. |
| v8.0–v10.0 | Extensions : calculators, market analysis, qualité/review, quant lab élargi. |
| v11.0 | +10 modules quant avancés (KS, ADF, R², MAD, Semi-Deviation, Corr/Beta Stability, V2 Ratio, MC VaR, Cost Sharpe) + **palette de commandes ⌘K** sur 245+ modules. |
| v12.0 | +10 modules statistiques (Bayésien, Runs, Chi², TUW, Payoff, WR Conditionnel, Séries de Pertes, Recovery, Périodes, Salaire Horaire) + lib statistique partagée `stats.js`. |
| **v13.0** | **Vue Globale multi-comptes** : performance agrégée, risque cumulé, consistance journalière sur un écran ; **RiskMonitor temps réel** avec alertes automatiques à 80% et 95% des limites de drawdown, objectif atteint et violation de consistance ; abonnements temps réel + polling 30s. |
| **v13.1** | Finalisation de la Vue Globale : **Objectifs journaliers dynamiques** (cible de gain recalculée en continu, garantie conforme à la règle de consistance et proportionnée à la taille du compte) et **Simulateur de risque pré-position** (projection d'une perte potentielle sur les limites de drawdown avant exécution, verdict autorisé/élevé/interdit). |
| **v13.2** | Enrichissements Vue Globale : **equity agrégée 30 j**, **analyse IA du portefeuille** (score/100, risque, recommandations priorisées), progression de l'objectif du jour, stats journalières par compte (trades, win rate), badge **« PAYOUT PRÊT »** à l'atteinte de l'objectif, **export CSV** du rapport multi-comptes. |
| **v13.3** | **Évolution globale du capital** sur la Vue Globale : equity historique agrégée tous comptes (avec capital de départ et drawdown max historique), PnL mensuel agrégé 12 mois, et jauge de progression vers l'**objectif de capital** (plan Boule de Neige) avec projection du temps restant au rythme actuel. |
| **v13.4** | **Suggestions intelligentes** sur la Vue Globale : panneau d'analyse par règles (pertes consécutives, utilisation des drawdowns, consistance, sur-trading, objectif/payout, meilleur & pire compte) avec recommandations priorisées par couleur. |

---

*Documentation générée pour Ghost Trader v13.0 — 266 routes, 10 entités, 3 agents IA.*