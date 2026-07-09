import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';

// Page imports
import Dashboard from '@/pages/Dashboard';
import Backtest from '@/pages/Backtest';
import Demo from '@/pages/Demo';
import Live from '@/pages/Live';
import PropFirms from '@/pages/PropFirms';
import Snowball from '@/pages/Snowball';
import News from '@/pages/News';
import Reports from '@/pages/Reports';
import Bank from '@/pages/Bank';
import Fiscal from '@/pages/Fiscal';
import SettingsPage from '@/pages/SettingsPage';
import Council from '@/pages/Council';
import Strategy from '@/pages/Strategy';
import Backlog from '@/pages/Backlog';
import Sessions from '@/pages/Sessions';
import JournalIA from '@/pages/JournalIA';
import BacktestAuto from '@/pages/BacktestAuto';
import AnalyticsDashboard from '@/pages/AnalyticsDashboard';
import PropCapital from '@/pages/PropCapital';
import MonteCarlo from '@/pages/MonteCarlo';
import LiveFeed from '@/pages/LiveFeed';
import Playbook from '@/pages/Playbook';
import CopyTrading from '@/pages/CopyTrading';
import PropFirmConnect from '@/pages/PropFirmConnect';
import FinancePersonnelle from '@/pages/FinancePersonnelle';
import FiscalAuto from '@/pages/FiscalAuto';
import CorrelationMarkets from '@/pages/CorrelationMarkets';
import PayoutSimulator from '@/pages/PayoutSimulator';
import AlertCenter from '@/pages/AlertCenter';
import MarketScanner from '@/pages/MarketScanner';
import PersonalAccount from '@/pages/PersonalAccount';
import BacktestTemplates from '@/pages/BacktestTemplates';
import FiscalCalendar from '@/pages/FiscalCalendar';
import DrawdownSimulator from '@/pages/DrawdownSimulator';
import PayoutCalendar from '@/pages/PayoutCalendar';
import TradingOS from '@/pages/TradingOS';
import RiskCalculator from '@/pages/RiskCalculator';
import TradeBuilder from '@/pages/TradeBuilder';
import GhostCoach from '@/pages/GhostCoach';
import PerformanceHeatmap from '@/pages/PerformanceHeatmap';
import TradeReview from '@/pages/TradeReview';
import PropFirmComparator from '@/pages/PropFirmComparator';
import PsychologyTracker from '@/pages/PsychologyTracker';
import RiskOfRuin from '@/pages/RiskOfRuin';
import PositionSizer from '@/pages/PositionSizer';
import TradeReplay from '@/pages/TradeReplay';
import EquityAnalytics from '@/pages/EquityAnalytics';
import SessionClock from '@/pages/SessionClock';
import TradingPlanBuilder from '@/pages/TradingPlanBuilder';
import VolatilityAnalyzer from '@/pages/VolatilityAnalyzer';
import LiquidityMap from '@/pages/LiquidityMap';
import PerformanceForecaster from '@/pages/PerformanceForecaster';
import StrategyOptimizer from '@/pages/StrategyOptimizer';
import TradeGuardian from '@/pages/TradeGuardian';
import KellyCriterion from '@/pages/KellyCriterion';
import SharpeMetrics from '@/pages/SharpeMetrics';
import StreakAnalyzer from '@/pages/StreakAnalyzer';
import DrawdownAnalysis from '@/pages/DrawdownAnalysis';
import TradeSimulator from '@/pages/TradeSimulator';
import MFConfluence from '@/pages/MFConfluence';
import PivotCalculator from '@/pages/PivotCalculator';
import ExpectancyModel from '@/pages/ExpectancyModel';
import PortfolioHeat from '@/pages/PortfolioHeat';
import SessionAnalyzer from '@/pages/SessionAnalyzer';
import RiskRewardCalculator from '@/pages/RiskRewardCalculator';
import CorrelationMatrix from '@/pages/CorrelationMatrix';
import ConsistencyTracker from '@/pages/ConsistencyTracker';
import BacktestEngine from '@/pages/BacktestEngine';
import MarketProfile from '@/pages/MarketProfile';
import OrderFlowAnalyzer from '@/pages/OrderFlowAnalyzer';
import FibCalculator from '@/pages/FibCalculator';
import EconomicCalendar from '@/pages/EconomicCalendar';
import TradeGrading from '@/pages/TradeGrading';
import CompoundingCalculator from '@/pages/CompoundingCalculator';
import BreakEvenAnalyzer from '@/pages/BreakEvenAnalyzer';
import SlippageCalculator from '@/pages/SlippageCalculator';
import RiskParityAllocator from '@/pages/RiskParityAllocator';
import CalendarHeatmap from '@/pages/CalendarHeatmap';
import TradeTagsAnalyzer from '@/pages/TradeTagsAnalyzer';
import MFEAnalyzer from '@/pages/MFEAnalyzer';
import TradeDuration from '@/pages/TradeDuration';
import SymbolPerformance from '@/pages/SymbolPerformance';
import ZScoreAnalyzer from '@/pages/ZScoreAnalyzer';
import DrawdownRecovery from '@/pages/DrawdownRecovery';
import CurrencyStrength from '@/pages/CurrencyStrength';
import VolatilityRegime from '@/pages/VolatilityRegime';
import SequenceMatrix from '@/pages/SequenceMatrix';
import EntryExitQuality from '@/pages/EntryExitQuality';
import ATRPositionSizer from '@/pages/ATRPositionSizer';
import MarginCalculator from '@/pages/MarginCalculator';
import PipCalculator from '@/pages/PipCalculator';
import SwapCalculator from '@/pages/SwapCalculator';
import DailyRoutine from '@/pages/DailyRoutine';
import GoalsTracker from '@/pages/GoalsTracker';
import EquityCurveStats from '@/pages/EquityCurveStats';
import SpreadCostAnalyzer from '@/pages/SpreadCostAnalyzer';
import WinRateOptimizer from '@/pages/WinRateOptimizer';
import BacktestCompare from '@/pages/BacktestCompare';
import RMultipleAnalyzer from '@/pages/RMultipleAnalyzer';
import DayOfWeekAnalysis from '@/pages/DayOfWeekAnalysis';
import MonthlySeasonality from '@/pages/MonthlySeasonality';
import TradeClustering from '@/pages/TradeClustering';
import ProfitFactorAnalyzer from '@/pages/ProfitFactorAnalyzer';
import OptimalRiskFinder from '@/pages/OptimalRiskFinder';
import VWAPCalculator from '@/pages/VWAPCalculator';
import MarketInternals from '@/pages/MarketInternals';
import PsychologyScore from '@/pages/PsychologyScore';
import CapitalEfficiency from '@/pages/CapitalEfficiency';
import DrawdownProbability from '@/pages/DrawdownProbability';
import SetupQualityScore from '@/pages/SetupQualityScore';
import PerformanceAttribution from '@/pages/PerformanceAttribution';
import RecoveryFactor from '@/pages/RecoveryFactor';
import TradeVelocity from '@/pages/TradeVelocity';
import RegimePerformance from '@/pages/RegimePerformance';
import SharpeOptimizer from '@/pages/SharpeOptimizer';
import TradeEfficiency from '@/pages/TradeEfficiency';
import TradeAttribution from '@/pages/TradeAttribution';
import EquityMomentum from '@/pages/EquityMomentum';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-xs text-muted-foreground font-mono">GHOST TRADER — Initialisation...</div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/live" element={<Live />} />
        <Route path="/propfirms" element={<PropFirms />} />
        <Route path="/snowball" element={<Snowball />} />
        <Route path="/news" element={<News />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/bank" element={<Bank />} />
        <Route path="/fiscal" element={<Fiscal />} />
        <Route path="/council" element={<Council />} />
        <Route path="/strategy" element={<Strategy />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/journal" element={<JournalIA />} />
        <Route path="/backtest-auto" element={<BacktestAuto />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/prop-capital" element={<PropCapital />} />
        <Route path="/montecarlo" element={<MonteCarlo />} />
        <Route path="/livefeed" element={<LiveFeed />} />
        <Route path="/playbook" element={<Playbook />} />
        <Route path="/copy-trading" element={<CopyTrading />} />
        <Route path="/prop-connect" element={<PropFirmConnect />} />
        <Route path="/finance-perso" element={<FinancePersonnelle />} />
        <Route path="/fiscal-auto" element={<FiscalAuto />} />
        <Route path="/correlations" element={<CorrelationMarkets />} />
        <Route path="/payout-simulator" element={<PayoutSimulator />} />
        <Route path="/alerts" element={<AlertCenter />} />
        <Route path="/scanner" element={<MarketScanner />} />
        <Route path="/personal-account" element={<PersonalAccount />} />
        <Route path="/backtest-templates" element={<BacktestTemplates />} />
        <Route path="/fiscal-calendar" element={<FiscalCalendar />} />
        <Route path="/drawdown-simulator" element={<DrawdownSimulator />} />
        <Route path="/payout-calendar" element={<PayoutCalendar />} />
        <Route path="/trading-os" element={<TradingOS />} />
        <Route path="/risk-calc" element={<RiskCalculator />} />
        <Route path="/trade-builder" element={<TradeBuilder />} />
        <Route path="/coach" element={<GhostCoach />} />
        <Route path="/heatmap" element={<PerformanceHeatmap />} />
        <Route path="/trade-review" element={<TradeReview />} />
        <Route path="/propfirm-comparator" element={<PropFirmComparator />} />
        <Route path="/psychology" element={<PsychologyTracker />} />
        <Route path="/risk-ruin" element={<RiskOfRuin />} />
        <Route path="/position-sizer" element={<PositionSizer />} />
        <Route path="/trade-replay" element={<TradeReplay />} />
        <Route path="/equity-analytics" element={<EquityAnalytics />} />
        <Route path="/session-clock" element={<SessionClock />} />
        <Route path="/plan-builder" element={<TradingPlanBuilder />} />
        <Route path="/volatility" element={<VolatilityAnalyzer />} />
        <Route path="/liquidity-map" element={<LiquidityMap />} />
        <Route path="/forecaster" element={<PerformanceForecaster />} />
        <Route path="/strategy-optimizer" element={<StrategyOptimizer />} />
        <Route path="/guardian" element={<TradeGuardian />} />
        <Route path="/kelly" element={<KellyCriterion />} />
        <Route path="/sharpe" element={<SharpeMetrics />} />
        <Route path="/streaks" element={<StreakAnalyzer />} />
        <Route path="/drawdown-analysis" element={<DrawdownAnalysis />} />
        <Route path="/trade-simulator" element={<TradeSimulator />} />
        <Route path="/mf-confluence" element={<MFConfluence />} />
        <Route path="/pivots" element={<PivotCalculator />} />
        <Route path="/expectancy" element={<ExpectancyModel />} />
        <Route path="/portfolio-heat" element={<PortfolioHeat />} />
        <Route path="/session-analyzer" element={<SessionAnalyzer />} />
        <Route path="/rr-calc" element={<RiskRewardCalculator />} />
        <Route path="/correlation-matrix" element={<CorrelationMatrix />} />
        <Route path="/consistency" element={<ConsistencyTracker />} />
        <Route path="/backtest-engine" element={<BacktestEngine />} />
        <Route path="/market-profile" element={<MarketProfile />} />
        <Route path="/order-flow" element={<OrderFlowAnalyzer />} />
        <Route path="/fibonacci" element={<FibCalculator />} />
        <Route path="/economic-calendar" element={<EconomicCalendar />} />
        <Route path="/trade-grading" element={<TradeGrading />} />
        <Route path="/compounding" element={<CompoundingCalculator />} />
        <Route path="/breakeven" element={<BreakEvenAnalyzer />} />
        <Route path="/slippage" element={<SlippageCalculator />} />
        <Route path="/risk-parity" element={<RiskParityAllocator />} />
        <Route path="/calendar-heatmap" element={<CalendarHeatmap />} />
        <Route path="/trade-tags" element={<TradeTagsAnalyzer />} />
        <Route path="/mfe-mae" element={<MFEAnalyzer />} />
        <Route path="/trade-duration" element={<TradeDuration />} />
        <Route path="/symbol-performance" element={<SymbolPerformance />} />
        <Route path="/zscore" element={<ZScoreAnalyzer />} />
        <Route path="/dd-recovery" element={<DrawdownRecovery />} />
        <Route path="/currency-strength" element={<CurrencyStrength />} />
        <Route path="/volatility-regime" element={<VolatilityRegime />} />
        <Route path="/sequence-matrix" element={<SequenceMatrix />} />
        <Route path="/entry-exit-quality" element={<EntryExitQuality />} />
        <Route path="/atr-sizer" element={<ATRPositionSizer />} />
        <Route path="/margin-calc" element={<MarginCalculator />} />
        <Route path="/pip-calc" element={<PipCalculator />} />
        <Route path="/swap-calc" element={<SwapCalculator />} />
        <Route path="/daily-routine" element={<DailyRoutine />} />
        <Route path="/goals" element={<GoalsTracker />} />
        <Route path="/equity-stats" element={<EquityCurveStats />} />
        <Route path="/spread-cost" element={<SpreadCostAnalyzer />} />
        <Route path="/wr-optimizer" element={<WinRateOptimizer />} />
        <Route path="/backtest-compare" element={<BacktestCompare />} />
        <Route path="/r-multiples" element={<RMultipleAnalyzer />} />
        <Route path="/day-of-week" element={<DayOfWeekAnalysis />} />
        <Route path="/monthly-seasonality" element={<MonthlySeasonality />} />
        <Route path="/trade-clustering" element={<TradeClustering />} />
        <Route path="/profit-factor" element={<ProfitFactorAnalyzer />} />
        <Route path="/optimal-risk" element={<OptimalRiskFinder />} />
        <Route path="/vwap" element={<VWAPCalculator />} />
        <Route path="/market-internals" element={<MarketInternals />} />
        <Route path="/psychology-score" element={<PsychologyScore />} />
        <Route path="/capital-efficiency" element={<CapitalEfficiency />} />
        <Route path="/dd-probability" element={<DrawdownProbability />} />
        <Route path="/setup-quality" element={<SetupQualityScore />} />
        <Route path="/perf-attribution" element={<PerformanceAttribution />} />
        <Route path="/recovery-factor" element={<RecoveryFactor />} />
        <Route path="/trade-velocity" element={<TradeVelocity />} />
        <Route path="/regime-perf" element={<RegimePerformance />} />
        <Route path="/sharpe-optimizer" element={<SharpeOptimizer />} />
        <Route path="/trade-efficiency" element={<TradeEfficiency />} />
        <Route path="/trade-attribution" element={<TradeAttribution />} />
        <Route path="/equity-momentum" element={<EquityMomentum />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;