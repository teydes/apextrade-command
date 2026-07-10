import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { TrendingUp } from 'lucide-react';

export default function BetaAnalyzer() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const longs = closed.filter(t => t.direction === 'LONG');
    const shorts = closed.filter(t => t.direction === 'SHORT');
    const longPnl = longs.map(t => t.pnl || 0);
    const shortPnl = shorts.map(t => t.pnl || 0);
    if (longPnl.length < 3) return [{ label: 'Beta', value: 'N/A' }];
    const longMean = longPnl.reduce((a, b) => a + b, 0) / longPnl.length;
    const longVar = longPnl.reduce((s, p) => s + Math.pow(p - longMean, 2), 0) / Math.max(longPnl.length - 1, 1);
    const longStd = Math.sqrt(longVar);
    const shortMean = shortPnl.length > 0 ? shortPnl.reduce((a, b) => a + b, 0) / shortPnl.length : 0;
    const shortStd = shortPnl.length > 1 ? Math.sqrt(shortPnl.reduce((s, p) => s + Math.pow(p - shortMean, 2), 0) / (shortPnl.length - 1)) : 0;
    const beta = longStd > 0 ? shortStd / longStd : 0;
    return [
      { label: 'Beta (L/S)', value: beta.toFixed(3), color: beta < 0.7 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Long Vol', value: longStd.toFixed(2), color: 'text-foreground' },
      { label: 'Short Vol', value: shortStd.toFixed(2), color: 'text-foreground' },
      { label: 'Long Mean', value: longMean.toFixed(2), color: longMean >= 0 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const symbols = [...new Set(closed.map(t => t.symbol))];
    return symbols.slice(0, 8).map(sym => {
      const symTrades = closed.filter(t => t.symbol === sym);
      const pnl = symTrades.reduce((s, t) => s + (t.pnl || 0), 0);
      return { name: sym, value: pnl };
    });
  };

  return (
    <QuantPage
      title="Beta Analyzer"
      subtitle="Sensibilité directionnelle: volatilité LONG vs SHORT"
      icon={TrendingUp}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par Symbole' }}
      aiPrompt="Analyse le Beta entre positions LONG et SHORT. Un beta proche de 0 indique une stratégie market-neutral. Un beta élevé indique une forte sensibilité directionnelle. Évalue si le trader est équilibré long/short."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, direction: t.direction, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Beta</strong> = Vol(Short) / Vol(Long)</p>
        <p>Le beta mesure la sensibilité relative entre positions long et short. Un trader équilibré a un beta proche de 1.</p>
      </div>
    </QuantPage>
  );
}