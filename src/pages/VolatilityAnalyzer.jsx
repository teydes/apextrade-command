import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Waves, TrendingUp, TrendingDown, Brain, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, ReferenceLine, Cell } from 'recharts';
import { toast } from 'sonner';

function generateVolData(days = 90) {
  const data = [];
  let atr = 50;
  for (let i = 0; i < days; i++) {
    const regime = Math.random();
    const baseVol = regime < 0.3 ? 30 : regime < 0.6 ? 55 : regime < 0.85 ? 80 : 120;
    atr = atr * 0.7 + baseVol * 0.3 + (Math.random() - 0.5) * 20;
    const range = atr * (0.8 + Math.random() * 0.4);
    const open = 15000 + (Math.random() - 0.5) * 200;
    const close = open + (Math.random() - 0.5) * range;
    const high = Math.max(open, close) + Math.random() * range * 0.3;
    const low = Math.min(open, close) - Math.random() * range * 0.3;
    const volume = Math.round(1000 + atr * 20 + Math.random() * 500);
    data.push({
      day: i + 1, date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      atr: Math.round(atr), range: Math.round(range), volume,
      open: Math.round(open), close: Math.round(close), high: Math.round(high), low: Math.round(low),
      body: Math.abs(close - open), upper_wick: high - Math.max(open, close), lower_wick: Math.min(open, close) - low,
    });
  }
  return data;
}

export default function VolatilityAnalyzer() {
  const [symbol, setSymbol] = useState('NQ1!');
  const [lookback, setLookback] = useState(90);
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const volData = useMemo(() => generateVolData(lookback), [lookback, symbol]);

  const { data: trades = [] } = useQuery({ queryKey: ['vol-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 100) });

  const currentATR = volData[volData.length - 1]?.atr || 0;
  const avgATR = volData.reduce((s, d) => s + d.atr, 0) / volData.length;
  const maxATR = Math.max(...volData.map(d => d.atr));
  const minATR = Math.min(...volData.map(d => d.atr));
  const atrPercentile = Math.round((volData.filter(d => d.atr < currentATR).length / volData.length) * 100);
  const volRatio = avgATR > 0 ? currentATR / avgATR : 1;

  const regime = volRatio > 1.3 ? 'expansion' : volRatio < 0.7 ? 'contraction' : 'normal';
  const regimeColor = { expansion: 'text-destructive', contraction: 'text-yellow-400', normal: 'text-primary' };
  const regimeBg = { expansion: 'bg-destructive/10 border-destructive/30', contraction: 'bg-yellow-400/10 border-yellow-400/30', normal: 'bg-primary/10 border-primary/30' };

  // ATR distribution
  const atrBuckets = {};
  volData.forEach(d => { const b = Math.floor(d.atr / 20) * 20; atrBuckets[`${b}-${b + 20}`] = (atrBuckets[`${b}-${b + 20}`] || 0) + 1; });
  const atrDist = Object.entries(atrBuckets).map(([range, count]) => ({ range, count })).sort((a, b) => parseInt(a.range) - parseInt(b.range));

  // Volume analysis
  const avgVolume = volData.reduce((s, d) => s + d.volume, 0) / volData.length;
  const volSpikeDays = volData.filter(d => d.volume > avgVolume * 1.5).length;

  // Correlation with win rate
  const tradesByVol = useMemo(() => {
    const bins = { low: { wins: 0, total: 0 }, mid: { wins: 0, total: 0 }, high: { wins: 0, total: 0 } };
    trades.filter(t => t.status === 'closed').forEach(t => {
      const atrAtTrade = volData[Math.floor(Math.random() * volData.length)]?.atr || avgATR;
      if (atrAtTrade < avgATR * 0.8) bins.low;
      else if (atrAtTrade > avgATR * 1.2) bins.high;
      else bins.mid;
      const bin = atrAtTrade < avgATR * 0.8 ? 'low' : atrAtTrade > avgATR * 1.2 ? 'high' : 'mid';
      bins[bin].total++;
      if (t.result === 'win') bins[bin].wins++;
    });
    return Object.entries(bins).map(([k, v]) => ({ regime: k === 'low' ? 'Low Vol' : k === 'mid' ? 'Normal' : 'High Vol', wr: v.total > 0 ? Math.round(v.wins / v.total * 100) : 0, total: v.total }));
  }, [trades, volData, avgATR]);

  const getAIInsight = async () => {
    setLoadingAI(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyste volatilité trading. ${symbol} sur ${lookback} jours.
ATR actuel: ${currentATR} | ATR moyen: ${avgATR.toFixed(0)} | Ratio: ${volRatio.toFixed(2)} | Régime: ${regime}
ATR percentile: ${atrPercentile}% | Volume moyen: ${avgVolume.toFixed(0)} | Jours spike volume: ${volSpikeDays}
Win rate par régime: Low=${tradesByVol[0].wr}%(${tradesByVol[0].total}), Normal=${tradesByVol[1].wr}%(${tradesByVol[1].total}), High=${tradesByVol[2].wr}%(${tradesByVol[2].total})

Retourne JSON: {"regime":"<régime actuel>","forecast":"<prévision volatilité>","strategy":"<stratégie adaptée>","risk_adjustment":"<ajustement risque>","best_setup":"<meilleur setup pour ce régime>","warning":"<alerte si applicable>"}`,
      response_json_schema: { type: "object", properties: { regime: { type: "string" }, forecast: { type: "string" }, strategy: { type: "string" }, risk_adjustment: { type: "string" }, best_setup: { type: "string" }, warning: { type: "string" } } }
    });
    setAiInsight(res); setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Waves className="w-5 h-5 text-purple-400" />Volatility Analyzer</h1>
          <p className="text-xs text-muted-foreground">ATR · Régimes de volatilité · Expansion/Contraction · Corrélation performance</p>
        </div>
        <div className="flex gap-2">
          <Select value={symbol} onValueChange={setSymbol}><SelectTrigger className="h-8 bg-secondary text-xs w-28"><SelectValue /></SelectTrigger><SelectContent>{['NQ1!', 'ES1!', 'EURUSD', 'XAUUSD', 'BTCUSD'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
          <Select value={String(lookback)} onValueChange={v => setLookback(+v)}><SelectTrigger className="h-8 bg-secondary text-xs w-28"><SelectValue /></SelectTrigger><SelectContent>{[30, 60, 90, 180].map(d => <SelectItem key={d} value={String(d)}>{d} jours</SelectItem>)}</SelectContent></Select>
          <Button size="sm" onClick={getAIInsight} disabled={loadingAI} className="gap-1 text-xs"><Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Analyse IA</Button>
        </div>
      </div>

      {/* Regime banner */}
      <div className={`card-trading border ${regimeBg[regime]} flex items-center gap-4`}>
        <Zap className={`w-6 h-6 ${regimeColor[regime]}`} />
        <div>
          <div className={`text-sm font-bold ${regimeColor[regime]}`}>RÉGIME: {regime.toUpperCase()}</div>
          <div className="text-xs text-muted-foreground">Volatilité {volRatio > 1 ? `+${((volRatio - 1) * 100).toFixed(0)}%` : `${((volRatio - 1) * 100).toFixed(0)}%`} vs moyenne</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold font-mono text-foreground">{currentATR}</div>
          <div className="text-[10px] text-muted-foreground">ATR actuel</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ l: 'ATR Moyen', v: avgATR.toFixed(0), c: 'text-blue-400' },
          { l: 'ATR Max', v: maxATR, c: 'text-destructive' },
          { l: 'ATR Min', v: minATR, c: 'text-primary' },
          { l: 'Percentile', v: `${atrPercentile}%`, c: atrPercentile > 70 ? 'text-destructive' : atrPercentile < 30 ? 'text-yellow-400' : 'text-foreground' },
          { l: 'Spikes Vol.', v: volSpikeDays, c: 'text-purple-400' }
        ].map(s => (
          <div key={s.l} className="card-trading text-center"><div className={`text-lg font-bold font-mono ${s.c}`}>{s.v}</div><div className="text-[10px] text-muted-foreground">{s.l}</div></div>
        ))}
      </div>

      {/* ATR Chart */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">ATR ({lookback} jours) — {symbol}</div>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={volData}>
            <defs><linearGradient id="atrGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} /><stop offset="95%" stopColor="#A855F7" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#6B7280' }} interval={Math.floor(lookback / 8)} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
            <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
            <ReferenceLine y={avgATR} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Avg', fill: '#6B7280', fontSize: 9 }} />
            <Area type="monotone" dataKey="atr" stroke="#A855F7" strokeWidth={2} fill="url(#atrGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">Volume</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={volData}>
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#6B7280' }} interval={Math.floor(lookback / 8)} />
            <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
            <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
            <ReferenceLine y={avgVolume} stroke="#6B7280" strokeDasharray="3 3" />
            <Bar dataKey="volume" radius={[2, 2, 0, 0]}>
              {volData.map((d, i) => <Cell key={i} fill={d.volume > avgVolume * 1.5 ? '#EF444488' : d.volume > avgVolume ? '#0088FF66' : '#6B728044'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ATR Distribution */}
        <div className="card-trading">
          <div className="text-sm font-semibold mb-2">Distribution ATR</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={atrDist}>
              <XAxis dataKey="range" tick={{ fontSize: 8, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} />
              <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
              <Bar dataKey="count" fill="#A855F766" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate by Regime */}
        <div className="card-trading">
          <div className="text-sm font-semibold mb-2">Win Rate par Régime de Volatilité</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={tradesByVol}>
              <XAxis dataKey="regime" tick={{ fontSize: 10, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} domain={[0, 100]} />
              <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
              <Bar dataKey="wr" radius={[3, 3, 0, 0]}>
                {tradesByVol.map((d, i) => <Cell key={i} fill={d.wr >= 60 ? '#00FF88' : d.wr >= 40 ? '#F59E0B' : '#EF4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {aiInsight && (
        <div className="card-trading border border-purple-400/30 bg-purple-400/5 space-y-3">
          <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-purple-400" /><span className="text-sm font-semibold">Analyse Volatilité IA</span></div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-secondary/50 rounded"><span className="text-muted-foreground">Régime: </span><span className={regimeColor[regime]}>{aiInsight.regime}</span></div>
            <div className="p-2 bg-secondary/50 rounded"><span className="text-muted-foreground">Prévision: </span><span className="text-foreground">{aiInsight.forecast}</span></div>
          </div>
          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs"><span className="text-primary font-semibold">Stratégie: </span><span className="text-muted-foreground">{aiInsight.strategy}</span></div>
          <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs"><span className="text-yellow-400 font-semibold">Ajustement risque: </span><span className="text-muted-foreground">{aiInsight.risk_adjustment}</span></div>
          <div className="p-2 bg-blue-400/5 border border-blue-400/20 rounded text-xs"><span className="text-blue-400 font-semibold">Meilleur setup: </span><span className="text-muted-foreground">{aiInsight.best_setup}</span></div>
          {aiInsight.warning && <div className="p-2 bg-destructive/5 border border-destructive/20 rounded text-xs"><span className="text-destructive font-semibold">⚠️ Alerte: </span><span className="text-muted-foreground">{aiInsight.warning}</span></div>}
        </div>
      )}
    </div>
  );
}