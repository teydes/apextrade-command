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
  RefreshCw, Gauge, Ruler, Shield, Receipt, ClipboardList, Moon, LineChart as LineChartIcon2
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
            <div className="text-[10px] text-muted-foreground">Multi-Marchés · PropF+Perso · <span className="text-primary">v5.0</span></div>
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
          <span>System Status</span><span className="text-primary font-bold">v5.0</span>
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