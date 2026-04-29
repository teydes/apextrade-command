import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, FlaskConical, Monitor, Radio,
  Building2, Snowflake, BarChart3, Settings, Newspaper,
  Shield, Wallet, Scale, ChevronRight, Zap
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/backtest', label: 'Backtest 24/7', icon: FlaskConical },
  { path: '/demo', label: 'Backtest Demo', icon: Monitor },
  { path: '/live', label: 'Trading Live', icon: Radio },
  { path: '/propfirms', label: 'PropFirms', icon: Building2 },
  { path: '/snowball', label: 'Plan Boule de Neige', icon: Snowflake },
  { path: '/news', label: 'Actualités', icon: Newspaper },
  { path: '/reports', label: 'Rapports', icon: BarChart3 },
  { path: '/bank', label: 'Banque / Rembt.', icon: Wallet },
  { path: '/fiscal', label: 'Conseiller Fiscal', icon: Scale },
  { path: '/settings', label: 'Réglages', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-56 flex-shrink-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-bold text-primary font-mono">GHOST TRADER</div>
            <div className="text-xs text-muted-foreground">MFF · 50K · NQ</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-2 px-3 py-2 rounded-md mb-0.5 text-sm transition-all group ${
                active
                  ? 'bg-sidebar-accent text-primary border-l-2 border-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
              <span className="flex-1 truncate">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-primary" />}
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground mb-2 font-mono">SYSTEM STATUS</div>
        <div className="space-y-1.5">
          <StatusRow label="Webhook TV" status="active" />
          <StatusRow label="MFF Account" status="active" />
          <StatusRow label="News Feed" status="active" />
          <StatusRow label="Live Bot" status="inactive" />
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, status }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`status-dot ${status}`} />
        <span className={status === 'active' ? 'text-primary' : 'text-muted-foreground'}>
          {status === 'active' ? 'ON' : 'OFF'}
        </span>
      </div>
    </div>
  );
}