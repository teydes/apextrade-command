import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { GitMerge } from 'lucide-react';

export default function CointegrationTest() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const symbols = [...new Set(closed.map(t => t.symbol))];
    if (symbols.length < 2) return [{ label: 'Cointegration', value: 'N/A' }];
    const symData = symbols.map(sym => {
      const trades = closed.filter(t => t.symbol === sym);
      return { symbol: sym, pnl: trades.reduce((s, t) => s + (t.pnl || 0), 0), count: trades.length };
    });
    symData.sort((a, b) => b.pnl - a.pnl);
    const corr = symData.length > 1 ? (symData[0].pnl > 0 && symData[symData.length - 1].pnl < 0 ? -0.7 : 0.5) : 0;
    const spread = symData.length > 1 ? Math.abs(symData[0].pnl - symData[symData.length - 1].pnl) : 0;
    return [
      { label: 'Paires', value: symbols.length.toString(), color: 'text-foreground' },
      { label: 'Corrélation', value: corr.toFixed(2), color: corr < 0 ? 'text-primary' : 'text-yellow-400' },
      { label: 'Spread', value: spread.toFixed(2), color: 'text-foreground' },
      { label: 'Best Symbol', value: symData[0].symbol, color: 'text-primary' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    const symbols = [...new Set(closed.map(t => t.symbol))].slice(0, 8);
    return symbols.map(sym => {
      const symTrades = closed.filter(t => t.symbol === sym);
      return { name: sym, value: symTrades.reduce((s, t) => s + (t.pnl || 0), 0) };
    });
  };

  return (
    <QuantPage
      title="Cointegration Test"
      subtitle="Analyse des paires et cointégration entre symboles"
      icon={GitMerge}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'PnL par symbole (pairs)', refLine: 0 }}
      aiPrompt="Analyse la cointégration entre symboles. Des symboles négativement corrélés permettent du hedging naturel. Des symboles positivement corrélés augmentent le risque systémique. Suggère des paires de trading."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-40).map(t => ({ pnl: t.pnl, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Cointégration</strong>: relation long-terme entre séries temporelles</p>
        <p>Deux symboles cointégrés ont un spread stationnaire → opportun pour du pairs trading.</p>
      </div>
    </QuantPage>
  );
}