import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, Monitor, Radio,
  Building2, Snowflake, BarChart3, Settings, Newspaper,
  Wallet, Scale, ChevronRight, Zap, Users, Brain, ListChecks,
  Clock, BookOpen, Dices, Activity, Bot, PieChart, Landmark, BookMarked,
  Copy, Link2, PiggyBank, GitBranch, Calculator, Bell,
  Search, User, CalendarDays, LayoutTemplate, TrendingDown, DollarSign,
  Cpu, Crosshair, MessageCircle, Grid3x3, Eye, Star,
  HeartPulse, Skull, RotateCcw, LineChart as LineChartIcon, Globe,
  Layers, Waves, Droplets, ShieldCheck,
  Scale as ScaleIcon, Sigma, Flame, Thermometer, Repeat,
  Activity as ActivityIcon, BarChart3 as Bar3Icon, GitBranch as GitIcon,
  CalendarDays as CalIcon, Award as AwardIcon, Coins as CoinsIcon,
  Target as TargetIcon, Zap as ZapIcon, Tag as TagIcon, Layers3,
  RefreshCw, Gauge, Ruler, Shield, Receipt, ClipboardList, Moon, LineChart as LineChartIcon2,
  Timer, TrendingUp, ShieldAlert, GitMerge, Award,
  HeartCrack, SlidersHorizontal, Percent, BarChart2, CalendarClock, GitCompare, AlertTriangle
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/live', label: 'Trading Live', icon: Radio },
      { path: '/trading-os', label: 'Trading OS', icon: Cpu },
      { path: '/coach', label: 'Ghost Coach IA', icon: MessageCircle },
      { path: '/scanner', label: 'Scanner Multi-Marchés', icon: Search },
      { path: '/livefeed', label: 'Flux Live', icon: Activity },
    ]
  },
  {
    label: 'Comptes',
    items: [
      { path: '/personal-account', label: 'Comptes Perso MT4/5', icon: User },
      { path: '/prop-capital', label: 'Suivi PropFirm', icon: Landmark },
      { path: '/propfirms', label: 'PropFirms', icon: Building2 },
      { path: '/prop-connect', label: 'Connexion PF', icon: Link2 },
      { path: '/copy-trading', label: 'Copy Trading', icon: Copy },
    ]
  },
  {
    label: 'Backtesting',
    items: [
      { path: '/backtest-templates', label: 'Templates Backtest', icon: LayoutTemplate },
      { path: '/backtest', label: 'Journal Backtest', icon: FlaskConical },
      { path: '/backtest-auto', label: 'Backtest Auto', icon: Bot },
      { path: '/demo', label: 'Démo Bot', icon: Monitor },
    ]
  },
  {
    label: 'Outils Trade',
    items: [
      { path: '/trade-builder', label: 'Trade Builder', icon: Crosshair },
      { path: '/risk-calc', label: 'Calculateur Risque', icon: Calculator },
      { path: '/trade-review', label: 'Trade Review IA', icon: Eye },
      { path: '/heatmap', label: 'Heatmap Perf.', icon: Grid3x3 },
      { path: '/propfirm-comparator', label: 'Comparateur PF', icon: Star },
      { path: '/trade-replay', label: 'Trade Replay', icon: RotateCcw },
      { path: '/position-sizer', label: 'Position Sizing', icon: Calculator },
      { path: '/risk-ruin', label: 'Risk of Ruin', icon: Skull },
      { path: '/guardian', label: 'Trade Guardian', icon: ShieldCheck },
      { path: '/liquidity-map', label: 'Liquidity Map', icon: Droplets },
      { path: '/hedging', label: 'Hedging Calc', icon: GitMerge },
      { path: '/gap-risk', label: 'Gap Risk', icon: Moon },
      { path: '/margin-call', label: 'Margin Call', icon: ShieldAlert },
      { path: '/position-correlation', label: 'Pos. Correlation', icon: Crosshair },
      { path: '/dd-duration', label: 'DD Duration', icon: Clock },
    ]
  },
  {
    label: 'Analyse & IA',
    items: [
      { path: '/analytics', label: 'Analytics IA', icon: PieChart },
      { path: '/montecarlo', label: 'Monte Carlo', icon: Dices },
      { path: '/equity-analytics', label: 'Equity Analytics', icon: LineChartIcon },
      { path: '/forecaster', label: 'Forecaster IA', icon: LineChartIcon },
      { path: '/strategy-optimizer', label: 'Strategy Optim.', icon: GitBranch },
      { path: '/volatility', label: 'Volatility', icon: Waves },
      { path: '/psychology', label: 'Psychology', icon: HeartPulse },
      { path: '/journal', label: 'Journal IA', icon: BookOpen },
      { path: '/sessions', label: 'Sessions', icon: Clock },
      { path: '/session-clock', label: 'Session Clock', icon: Globe },
      { path: '/playbook', label: 'Playbook', icon: BookMarked },
      { path: '/reports', label: 'Rapports', icon: BarChart3 },
      { path: '/correlations', label: 'Corrélations', icon: GitBranch },
    ]
  },
  {
    label: 'Capital & Croissance',
    items: [
      { path: '/payout-calendar', label: 'Calendrier Payouts', icon: DollarSign },
      { path: '/payout-simulator', label: 'Simulateur Payouts', icon: Calculator },
      { path: '/drawdown-simulator', label: 'Simulateur Drawdown', icon: TrendingDown },
      { path: '/snowball', label: 'Boule de Neige', icon: Snowflake },
      { path: '/finance-perso', label: 'Finance Perso', icon: PiggyBank },
    ]
  },
  {
    label: 'Gestion',
    items: [
      { path: '/alerts', label: 'Alertes Kill Switch', icon: Bell },
      { path: '/fiscal-calendar', label: 'Calendrier Fiscal', icon: CalendarDays },
      { path: '/fiscal-auto', label: 'Fiscal Auto', icon: Scale },
      { path: '/news', label: 'Actualités', icon: Newspaper },
      { path: '/bank', label: 'Banque', icon: Wallet },
      { path: '/backlog', label: 'Backlog IA', icon: ListChecks },
      { path: '/strategy', label: 'Stratégie', icon: Brain },
      { path: '/plan-builder', label: 'Plan Builder', icon: Layers },
      { path: '/council', label: 'Conseil IA', icon: Users },
    ]
  },
  {
    label: 'Quant Lab',
    items: [
      { path: '/kelly', label: 'Kelly Criterion', icon: ScaleIcon },
      { path: '/sharpe', label: 'Sharpe & Ratios', icon: Activity },
      { path: '/expectancy', label: 'Expectancy', icon: Sigma },
      { path: '/streaks', label: 'Streak Analyzer', icon: Flame },
      { path: '/drawdown-analysis', label: 'Drawdown', icon: TrendingDown },
      { path: '/consistency', label: 'Consistency', icon: Repeat },
      { path: '/trade-simulator', label: 'Simulator', icon: Dices },
      { path: '/portfolio-heat', label: 'Portfolio Heat', icon: Thermometer },
      { path: '/correlation-matrix', label: 'Correlations', icon: Grid3x3 },
      { path: '/session-analyzer', label: 'Session Stats', icon: Clock },
      { path: '/mf-confluence', label: 'MTF Confluence', icon: Layers },
      { path: '/pivots', label: 'Pivot Points', icon: Crosshair },
      { path: '/rr-calc', label: 'R:R Calculator', icon: Calculator },
      { path: '/breakeven', label: 'Break-Even', icon: TargetIcon },
      { path: '/compounding', label: 'Compounding', icon: CoinsIcon },
      { path: '/slippage', label: 'Slippage', icon: ZapIcon },
      { path: '/backtest-engine', label: 'WFA Backtest', icon: FlaskConical },
      { path: '/risk-parity', label: 'Risk Parity', icon: ScaleIcon },
      { path: '/trade-tags', label: 'Tags Analyzer', icon: TagIcon },
      { path: '/mfe-mae', label: 'MFE / MAE', icon: ActivityIcon },
      { path: '/trade-duration', label: 'Duration', icon: Clock },
      { path: '/symbol-performance', label: 'By Symbol', icon: Layers3 },
      { path: '/zscore', label: 'Z-Score', icon: Sigma },
      { path: '/dd-recovery', label: 'DD Recovery', icon: RefreshCw },
      { path: '/sequence-matrix', label: 'Sequence Matrix', icon: Grid3x3 },
      { path: '/entry-exit-quality', label: 'Entry/Exit Q.', icon: Crosshair },
      { path: '/equity-stats', label: 'Equity Stats', icon: LineChartIcon2 },
      { path: '/wr-optimizer', label: 'WR Optimizer', icon: ZapIcon },
      { path: '/backtest-compare', label: 'BT Compare', icon: GitBranch },
      { path: '/r-multiples', label: 'R-Multiples', icon: Sigma },
      { path: '/profit-factor', label: 'Profit Factor', icon: DollarSign },
      { path: '/recovery-factor', label: 'Recovery Factor', icon: RefreshCw },
      { path: '/trade-velocity', label: 'Trade Velocity', icon: Timer },
      { path: '/trade-efficiency', label: 'Efficiency', icon: ZapIcon },
      { path: '/capital-efficiency', label: 'Capital Eff.', icon: DollarSign },
      { path: '/equity-momentum', label: 'Eq. Momentum', icon: Waves },
      { path: '/trade-clustering', label: 'Clustering', icon: Layers3 },
      { path: '/trade-attribution', label: 'Attribution', icon: PieChart },
      { path: '/perf-attribution', label: 'Perf Attribution', icon: Bar3Icon },
      { path: '/setup-quality', label: 'Setup Quality', icon: Star },
      { path: '/optimal-risk', label: 'Optimal Risk', icon: Search },
      { path: '/sharpe-optimizer', label: 'Sharpe Opt.', icon: Gauge },
      { path: '/dd-probability', label: 'DD Probability', icon: ActivityIcon },
      { path: '/sortino', label: 'Sortino', icon: Shield },
      { path: '/calmar', label: 'Calmar', icon: Gauge },
      { path: '/omega', label: 'Omega', icon: Sigma },
      { path: '/k-ratio', label: 'K-Ratio', icon: Activity },
      { path: '/expected-value', label: 'Expected Val.', icon: Calculator },
      { path: '/leverage-opt', label: 'Lev. Optim.', icon: Layers3 },
      { path: '/growth-rate', label: 'Growth Rate', icon: TrendingUp },
      { path: '/equity-fitness', label: 'Eq. Fitness', icon: LineChartIcon2 },
      { path: '/risk-ladder', label: 'Risk Ladder', icon: Layers3 },
      { path: '/trade-frequency', label: 'Frequency', icon: Timer },
      { path: '/trader-scorecard', label: 'Scorecard', icon: Award },
    ]
  },
  {
    label: 'Advanced Quant',
    items: [
      { path: '/information-ratio', label: 'Info Ratio', icon: Sigma },
      { path: '/treynor', label: 'Treynor', icon: Activity },
      { path: '/modigliani', label: 'Modigliani M²', icon: ScaleIcon },
      { path: '/psr', label: 'Prob. Sharpe', icon: Percent },
      { path: '/deflated-sharpe', label: 'Deflated Sharpe', icon: Shield },
      { path: '/mar-ratio', label: 'MAR Ratio', icon: TrendingUp },
      { path: '/burke', label: 'Burke', icon: TrendingDown },
      { path: '/sterling', label: 'Sterling', icon: ScaleIcon },
      { path: '/pain-index', label: 'Pain Index', icon: HeartCrack },
      { path: '/ulcer', label: 'Ulcer Index', icon: Shield },
      { path: '/capture-ratios', label: 'Capture Ratios', icon: TrendingUp },
      { path: '/alpha', label: 'Alpha', icon: Star },
      { path: '/beta', label: 'Beta', icon: TrendingUp },
      { path: '/skew-kurt', label: 'Skew & Kurtosis', icon: BarChart2 },
      { path: '/hurst', label: 'Hurst Exp.', icon: Waves },
      { path: '/fractal-dim', label: 'Fractal Dim.', icon: Grid3x3 },
      { path: '/choppiness', label: 'Choppiness', icon: Activity },
      { path: '/autocorr', label: 'Autocorrelation', icon: Activity },
      { path: '/vol-clustering', label: 'Vol Clustering', icon: Layers3 },
      { path: '/mean-reversion', label: 'Mean Reversion', icon: RefreshCw },
      { path: '/cointegration', label: 'Cointegration', icon: GitMerge },
      { path: '/gamblers-ruin', label: "Gambler's Ruin", icon: Skull },
      { path: '/walk-forward', label: 'Walk-Forward', icon: GitBranch },
      { path: '/overfit', label: 'Overfit Detector', icon: AlertTriangle },
      { path: '/bootstrap', label: 'Bootstrap', icon: Dices },
      { path: '/stress-test', label: 'Stress Test', icon: Zap },
      { path: '/sensitivity', label: 'Sensitivity', icon: SlidersHorizontal },
      { path: '/cum-delta', label: 'Cum. Delta', icon: Activity },
      { path: '/efficient-frontier', label: 'Eff. Frontier', icon: Layers },
      { path: '/net-profit', label: 'Net Profit', icon: DollarSign },
      { path: '/equity-decomp', label: 'Eq. Decomp.', icon: Layers3 },
      { path: '/benchmark', label: 'Benchmark', icon: GitCompare },
      { path: '/latency', label: 'Latency', icon: CalendarClock },
      { path: '/data-quality', label: 'Data Quality', icon: Activity },
      { path: '/tail-ratio', label: 'Tail Ratio', icon: ScaleIcon },
      { path: '/rachev', label: 'Rachev Ratio', icon: TrendingUp },
      { path: '/gain-pain', label: 'Gain/Pain', icon: Percent },
      { path: '/upside-pot', label: 'Upside Pot.', icon: TrendingUp },
      { path: '/rolling-sharpe', label: 'Rolling Sharpe', icon: Activity },
      { path: '/rolling-sortino', label: 'Rolling Sortino', icon: Activity },
      { path: '/rolling-dd', label: 'Rolling DD', icon: Activity },
      { path: '/rolling-vol', label: 'Rolling Vol', icon: Activity },
      { path: '/rolling-wr', label: 'Rolling WR', icon: Activity },
      { path: '/rolling-exp', label: 'Rolling E[R]', icon: Activity },
      { path: '/hourly-perf', label: 'Hourly Perf', icon: Clock },
      { path: '/quarterly', label: 'Quarterly', icon: CalendarDays },
      { path: '/yearly', label: 'Yearly Comp', icon: CalendarDays },
      { path: '/monthly-matrix', label: 'Monthly Matrix', icon: CalendarDays },
      { path: '/outliers', label: 'Outliers', icon: AlertTriangle },
      { path: '/dd-depth', label: 'DD Depth', icon: TrendingDown },
      { path: '/recovery-time', label: 'Recovery Time', icon: Clock },
      { path: '/quality-comp', label: 'Quality Comp.', icon: Award },
      { path: '/price-efficiency', label: 'Price Eff.', icon: Activity },
      { path: '/concentration', label: 'Concentration', icon: AlertTriangle },
      { path: '/cvar', label: 'CVaR', icon: Shield },
      { path: '/kurtosis-risk', label: 'Kurtosis Risk', icon: Waves },
      { path: '/cum-alpha', label: 'Cum. Alpha', icon: Activity },
      { path: '/strategy-decay', label: 'Strategy Decay', icon: TargetIcon },
      { path: '/regime-detect', label: 'Regime Detect', icon: Layers },
      { path: '/profit-consistency', label: 'P. Consistency', icon: DollarSign },
      { path: '/worst-case', label: 'Worst Case', icon: ShieldAlert },
      { path: '/equity-smooth', label: 'Eq. Smoothness', icon: Activity },
      { path: '/geo-returns', label: 'Geo Returns', icon: TrendingUp },
      { path: '/ra-ranking', label: 'RA Ranking', icon: Layers3 },
      { path: '/cost-efficiency', label: 'Cost Efficiency', icon: DollarSign },
      { path: '/sqn', label: 'SQN (Van Tharp)', icon: Sigma },
      { path: '/optimal-f', label: 'Optimal f', icon: TargetIcon },
      { path: '/expectunity', label: 'Expectunity', icon: Sigma },
      { path: '/r-expectancy', label: 'R-Expectancy', icon: Sigma },
      { path: '/kelly-mult', label: 'Kelly Mult.', icon: TargetIcon },
      { path: '/t-stat', label: 'T-Statistic', icon: Sigma },
      { path: '/conf-interval', label: 'Conf. Interval', icon: Shield },
      { path: '/sharpe-sig', label: 'Sharpe Sig.', icon: Shield },
      { path: '/jarque-bera', label: 'Jarque-Bera', icon: BarChart2 },
      { path: '/ljung-box', label: 'Ljung-Box', icon: Activity },
      { path: '/entropy', label: 'Shannon Entropy', icon: Brain },
      { path: '/gini', label: 'Gini Coeff.', icon: ScaleIcon },
      { path: '/tracking-error', label: 'Tracking Error', icon: GitCompare },
      { path: '/ic', label: 'Info Coeff.', icon: GitCompare },
      { path: '/fama', label: 'Fama Decomp.', icon: Layers3 },
      { path: '/brinson', label: 'Brinson Attr.', icon: Layers3 },
      { path: '/style-drift', label: 'Style Drift', icon: Activity },
      { path: '/capacity', label: 'Capacity', icon: TrendingUp },
      { path: '/pf-stability', label: 'PF Stability', icon: Activity },
      { path: '/dd-sharpe', label: 'DD Sharpe', icon: Activity },
      { path: '/risk-decomp', label: 'Risk Decomp.', icon: Layers3 },
      { path: '/overfit-risk', label: 'Overfit Risk', icon: AlertTriangle },
      { path: '/lvar', label: 'Liquidity VaR', icon: Shield },
      { path: '/vol-adj-returns', label: 'Vol-Adj Returns', icon: Gauge },
      { path: '/persistence', label: 'Persistence', icon: RefreshCw },
      { path: '/robustness', label: 'Robustness', icon: ShieldCheck },
      { path: '/signal-quality', label: 'Signal Quality', icon: Crosshair },
      { path: '/bench-alpha', label: 'Bench. Alpha', icon: GitCompare },
    ]
  },
  {
    label: 'Market Analysis',
    items: [
      { path: '/market-profile', label: 'Market Profile', icon: Bar3Icon },
      { path: '/order-flow', label: 'Order Flow', icon: ActivityIcon },
      { path: '/fibonacci', label: 'Fibonacci', icon: GitIcon },
      { path: '/economic-calendar', label: 'Eco Calendar', icon: CalIcon },
      { path: '/calendar-heatmap', label: 'PnL Calendar', icon: CalIcon },
      { path: '/currency-strength', label: 'Currency Strength', icon: DollarSign },
      { path: '/volatility-regime', label: 'Volatility Regime', icon: Gauge },
      { path: '/market-internals', label: 'Market Internals', icon: ActivityIcon },
      { path: '/vwap', label: 'VWAP', icon: TrendingUp },
      { path: '/regime-perf', label: 'Regime Perf', icon: Gauge },
      { path: '/vol-surface', label: 'Vol. Surface', icon: Waves },
      { path: '/vol-target', label: 'Vol. Target', icon: Thermometer },
    ]
  },
  {
    label: 'Calculators Pro',
    items: [
      { path: '/atr-sizer', label: 'ATR Position Sizer', icon: Ruler },
      { path: '/margin-calc', label: 'Margin Calc', icon: Shield },
      { path: '/pip-calc', label: 'Pip Value', icon: CoinsIcon },
      { path: '/swap-calc', label: 'Swap Calc', icon: Moon },
      { path: '/spread-cost', label: 'Spread Cost', icon: Receipt },
    ]
  },
  {
    label: 'Quality & Review',
    items: [
      { path: '/trade-grading', label: 'Trade Grading', icon: AwardIcon },
      { path: '/daily-routine', label: 'Daily Routine', icon: ClipboardList },
      { path: '/goals', label: 'Goals Tracker', icon: TargetIcon },
      { path: '/psychology-score', label: 'Psychology Score', icon: HeartPulse },
      { path: '/day-of-week', label: 'Day of Week', icon: CalendarDays },
      { path: '/monthly-seasonality', label: 'Seasonality', icon: CalIcon },
      { path: '/conviction', label: 'Conviction', icon: Star },
      { path: '/liq-sweep', label: 'Liq. Sweep', icon: Droplets },
      { path: '/settings', label: 'Réglages', icon: Settings },
    ]
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-52 flex-shrink-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-primary font-mono">GHOST TRADER</div>
            <div className="text-[10px] text-muted-foreground">Multi-Marchés · PropF+Perso · <span className="text-primary">v10.0</span></div>
          </div>
        </div>
      </div>

      {/* Nav groupée */}
      <nav className="flex-1 p-2 overflow-y-auto space-y-3">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <div className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest px-2 mb-1">{group.label}</div>
            {group.items.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md mb-0.5 text-xs transition-all group ${
                    active
                      ? 'bg-sidebar-accent text-primary border-l-2 border-primary'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                  <span className="flex-1 truncate">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 text-primary" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System status */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-[9px] text-muted-foreground mb-1.5 font-mono uppercase tracking-wide flex items-center justify-between">
          <span>System Status</span><span className="text-primary font-bold">v10.0</span>
        </div>
        <div className="space-y-1">
          <StatusRow label="Webhook TV" status="active" />
          <StatusRow label="Scanner IA" status="active" />
          <StatusRow label="News Feed" status="active" />
          <StatusRow label="Live Bot" status="inactive" />
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`status-dot ${status}`} />
        <span className={status === 'active' ? 'text-primary' : 'text-muted-foreground'}>
          {status === 'active' ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}