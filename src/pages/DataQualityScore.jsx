import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Database } from 'lucide-react';

export default function DataQualityScore() {
  const metrics = (trades) => {
    if (trades.length === 0) return [{ label: 'Data Quality', value: 'N/A' }];
    let missing = 0, total = 0;
    const fields = ['symbol', 'direction', 'entry_price', 'exit_price', 'pnl', 'entry_time', 'strategy', 'session', 'timeframe', 'risk_reward'];
    for (const t of trades) {
      for (const f of fields) {
        total++;
        if (t[f] == null || t[f] === '' || t[f] === undefined) missing++;
      }
    }
    const completeness = ((total - missing) / total) * 100;
    const closed = trades.filter(t => t.status === 'closed');
    const withPnl = closed.filter(t => t.pnl != null).length;
    const pnlCoverage = closed.length > 0 ? (withPnl / closed.length) * 100 : 0;
    const withRR = trades.filter(t => t.risk_reward != null).length;
    const rrCoverage = (withRR / trades.length) * 100;
    const qualityScore = (completeness * 0.5 + pnlCoverage * 0.3 + rrCoverage * 0.2);
    return [
      { label: 'Data Quality', value: qualityScore.toFixed(0) + '/100', color: qualityScore > 80 ? 'text-primary' : qualityScore > 60 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Completeness', value: completeness.toFixed(0) + '%', color: completeness > 90 ? 'text-primary' : 'text-yellow-400' },
      { label: 'PnL Coverage', value: pnlCoverage.toFixed(0) + '%', color: pnlCoverage > 90 ? 'text-primary' : 'text-yellow-400' },
      { label: 'R:R Coverage', value: rrCoverage.toFixed(0) + '%', color: rrCoverage > 70 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const fields = ['symbol', 'direction', 'entry_price', 'exit_price', 'pnl', 'entry_time', 'strategy', 'session', 'timeframe', 'risk_reward'];
    return fields.map(f => {
      const filled = trades.filter(t => t[f] != null && t[f] !== '' && t[f] !== undefined).length;
      return { name: f.length > 8 ? f.slice(0, 8) : f, value: (filled / Math.max(trades.length, 1)) * 100 };
    });
  };

  return (
    <QuantPage
      title="Data Quality Score"
      subtitle="Évaluation de la complétude et qualité des données de trades"
      icon={Database}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: 'Taux de remplissage par champ', refLine: 80 }}
      aiPrompt="Analyse la qualité des données. Un score > 80% permet des analyses fiables. Les champs manquants (surtout pnl, entry_time, strategy) limitent la précision des métriques quant. Identifie les champs à compléter en priorité."
      aiContext={(trades) => `Total trades: ${trades.length}, Premiers 20: ${JSON.stringify(trades.slice(0, 20).map(t => Object.keys(t).filter(k => t[k] != null).length))}`}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Data Quality</strong> = Completeness (50%) + PnL Coverage (30%) + R:R Coverage (20%)</p>
        <p>Des données incomplètes faussent toutes les métriques quantitatives de l'app.</p>
      </div>
    </QuantPage>
  );
}