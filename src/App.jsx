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