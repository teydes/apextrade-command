import React from 'react';
import QuantPage from '@/components/shared/QuantPage';
import { Crosshair } from 'lucide-react';

export default function TradeSignalQuality() {
  const metrics = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [{ label: 'Signal Quality', value: 'N/A' }];
    const n = closed.length;
    const withRR = closed.filter(t => t.risk_reward != null).length;
    const withSL = closed.filter(t => t.stop_loss != null && t.stop_loss !== 0).length;
    const withTP = closed.filter(t => t.take_profit_1 != null && t.take_profit_1 !== 0).length;
    const withStrategy = closed.filter(t => t.strategy != null).length;
    const withPattern = closed.filter(t => t.pattern != null && t.pattern !== '').length;
    const withScreenshot = closed.filter(t => t.screenshot_url != null && t.screenshot_url !== '').length;
    const completeness = ((withRR + withSL + withTP + withStrategy + withPattern) / (n * 5)) * 100;
    const qualityScore = (completeness * 0.5) + (withScreenshot / n * 50);
    return [
      { label: 'Signal Quality', value: qualityScore.toFixed(0) + '/100', color: qualityScore > 70 ? 'text-primary' : qualityScore > 40 ? 'text-yellow-400' : 'text-red-400' },
      { label: 'Completeness', value: completeness.toFixed(0) + '%', color: completeness > 80 ? 'text-primary' : 'text-red-400' },
      { label: 'R:R Set', value: (withRR / n * 100).toFixed(0) + '%', color: withRR > n * 0.8 ? 'text-primary' : 'text-red-400' },
      { label: 'SL Set', value: (withSL / n * 100).toFixed(0) + '%', color: withSL > n * 0.8 ? 'text-primary' : 'text-red-400' },
    ];
  };

  const chartData = (trades) => {
    const closed = trades.filter(t => t.status === 'closed' && t.pnl != null);
    if (closed.length < 5) return [];
    const n = closed.length;
    return [
      { name: 'R:R', value: closed.filter(t => t.risk_reward != null).length / n * 100 },
      { name: 'SL', value: closed.filter(t => t.stop_loss != null && t.stop_loss !== 0).length / n * 100 },
      { name: 'TP', value: closed.filter(t => t.take_profit_1 != null && t.take_profit_1 !== 0).length / n * 100 },
      { name: 'Strategy', value: closed.filter(t => t.strategy != null).length / n * 100 },
      { name: 'Pattern', value: closed.filter(t => t.pattern != null && t.pattern !== '').length / n * 100 },
      { name: 'Screenshot', value: closed.filter(t => t.screenshot_url != null && t.screenshot_url !== '').length / n * 100 },
    ];
  };

  return (
    <QuantPage
      title="Trade Signal Quality Score"
      subtitle="Qualité de la documentation des signaux (champs renseignés)"
      icon={Crosshair}
      metrics={metrics}
      chartData={chartData}
      chartType="bar"
      chartConfig={{ title: '% de trades avec chaque champ', refLine: 80 }}
      aiPrompt="Analyse la qualité des signaux. Un trade bien documenté (R:R, SL, TP, stratégie, pattern, screenshot) est un trade discipliné. Un completeness > 80% = excellent suivi. < 50% = manquement disciplinaire. La qualité de la documentation corrèle fortement avec la performance réelle."
      aiContext={(trades) => JSON.stringify(trades.filter(t => t.status === 'closed').slice(-30).map(t => ({ has_rr: !!t.risk_reward, has_sl: !!t.stop_loss, has_tp: !!t.take_profit_1, has_strategy: !!t.strategy, symbol: t.symbol })))}
    >
      <div className="text-xs text-muted-foreground space-y-2">
        <p><strong className="text-foreground">Signal Quality</strong> = Completeness × 0.5 + Screenshot × 0.5</p>
        <p>La discipline de documentation est un proxy de la discipline de trading.</p>
      </div>
    </QuantPage>
  );
}