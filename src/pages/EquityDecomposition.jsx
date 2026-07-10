import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Layers3 } from 'lucide-react';

export default function EquityDecomposition() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Decomposition', value: 'N/A' }];
    const byDirection = {};
    const bySymbol = {};
    const bySession = {};
    for (const t of closed) {
      const d = t.direction || 'UNKNOWN';
      byDirection[d] = (byDirection[d] || 0) + (t.pnl || 0);
      const s = t.symbol || 'UNKNOWN';
      bySymbol[s] = (bySymbol[s] || 0) + (t.pnl || 0);
      const sess = t.session || 'Unknown';
      bySession[sess] = (bySession[sess] || 0) + (t.pnl || 0);
    }
    const totalPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0);
    const bestSource = Object.entries(bySymbol).sort((a, b) => b[1] - a[1])[0];
    const bestSession = Object.entries(bySession).sort((a, b) => b[1] - a[1])[0];
    return [
      { label: 'Total PnL', value: totalPnl.toFixed(2), color: totalPnl >= 0 ? 'text-primary' : 'text-red-400' },
      { label: 'Best Symbol', value: bestSource ? `${bestSource[0]}` : 'N/A', color: 'text-primary' },
      { label: 'Best Session', value: bestSession ? bestSession[0] : 'N/A', color: 'text-primary' },
      { label: 'Sources', value: Object.keys(bySymbol).length.toString(), color: 'text-foreground' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySymbol = {};
    for (const t of closed) {
      const s = t.symbol || 'UNKNOWN';
      bySymbol[s] = (bySymbol[s] || 0) + (t.pnl || 0);
    }
    return Object.entries(bySymbol)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([symbol, pnl]) => ({ name: symbol, value: pnl }));
  };

  const extraStats = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const bySession = {};
    for (const t of closed) {
      const s = t.session || 'Unknown';
      bySession[s] = (bySession[s] || 0) + (t.pnl || 0);
    }
    return (
      <div className="space-y-1">
        {Object.entries(bySession).sort((a, b) => b[1] - a[1]).map(([session, pnl]) => (
          <div key={session} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{session}</span>
            <span className={`font-mono ${pnl >= 0 ? 'text-primary' : 'text-red-400'}`}>{pnl.toFixed(2)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <QuantPage
      title="Equity Decomposition"
      subtitle="Décomposition du PnL par symbole, direction et session"
      icon={Layers3}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par symbole', refLine: 0 }}
      extraStats={extraStats}
      aiPrompt="Analyse la décomposition de l'equity. Identifie quelles sources (symboles, sessions, directions) contribuent le plus au PnL. Un PnL concentré sur 1-2 sources = risque de concentration. Recommande de diversifier ou de se spécialiser selon les forces."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-50).map(t => ({ pnl: t.pnl, symbol: t.symbol, session: t.session, direction: t.direction })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Equity Decomposition</strong>: répartition du PnL par dimension</p>
        <p>Identifie les sources de profit et de perte pour optimiser l'allocation.</p>
      </div>
    </QuantPage>
  );
}