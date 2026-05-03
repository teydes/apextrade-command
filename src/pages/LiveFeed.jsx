import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Activity, Wifi, WifiOff, RefreshCw, TrendingUp, TrendingDown, Zap, BarChart2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

// Simulateur flux temps réel (tick par tick)
function generateTick(last, volatility = 8) {
  const change = (Math.random() - 0.49) * volatility;
  return Math.round((last + change) * 10) / 10;
}

const INSTRUMENTS = [
  { id: 'NQ1!', name: 'NQ Futures', base: 19850, vol: 15, color: '#00FF88' },
  { id: 'ES1!', name: 'ES Futures', base: 5280, vol: 5, color: '#0088FF' },
  { id: 'DXY', name: 'Dollar Index', base: 104.2, vol: 0.2, color: '#F59E0B' },
  { id: 'VIX', name: 'VIX', base: 18.5, vol: 0.5, color: '#EF4444' },
];

const NEWS_FEED = [
  { time: '14:32', source: 'Reuters', title: 'Fed officials signal patience on rate cuts amid sticky inflation', impact: 'high' },
  { time: '14:28', source: 'Bloomberg', title: 'NQ Futures erases gains as tech sector under pressure', impact: 'medium' },
  { time: '14:15', source: 'Investing.com', title: 'ISM Manufacturing PMI misses estimates at 48.3 vs 48.5 expected', impact: 'high' },
  { time: '13:58', source: 'CNBC', title: 'Jobless claims in line with expectations — labor market resilient', impact: 'low' },
  { time: '13:45', source: 'MarketWatch', title: 'Tech mega-caps lead morning session gains on AI momentum', impact: 'medium' },
];

const ORDERBOOK_MOCK = {
  bids: [
    { price: 19847, size: 142 }, { price: 19846, size: 89 }, { price: 19845, size: 203 },
    { price: 19844, size: 67 }, { price: 19843, size: 315 },
  ],
  asks: [
    { price: 19851, size: 98 }, { price: 19852, size: 156 }, { price: 19853, size: 74 },
    { price: 19854, size: 228 }, { price: 19855, size: 142 },
  ]
};

export default function LiveFeed() {
  const [prices, setPrices] = useState(() => INSTRUMENTS.map(i => ({ ...i, price: i.base, prev: i.base, history: Array.from({ length: 30 }, (_, j) => ({ t: j, p: i.base + (Math.random() - 0.5) * i.vol * 3 })) })));
  const [connected, setConnected] = useState(true);
  const [selectedInstr, setSelectedInstr] = useState('NQ1!');
  const [tab, setTab] = useState('chart'); // chart | orderbook | news
  const [aiContext, setAiContext] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const intervalRef = useRef(null);

  // Simuler les ticks temps réel
  useEffect(() => {
    if (!connected) return;
    intervalRef.current = setInterval(() => {
      setPrices(prev => prev.map(i => {
        const newPrice = generateTick(i.price, i.vol);
        const newHistory = [...i.history.slice(-49), { t: Date.now(), p: newPrice }];
        return { ...i, prev: i.price, price: newPrice, history: newHistory };
      }));
    }, 800);
    return () => clearInterval(intervalRef.current);
  }, [connected]);

  const toggle = () => {
    setConnected(p => !p);
    toast(connected ? '⏸ Flux pausé' : '▶ Flux repris');
  };

  const getMarketContext = async () => {
    setLoadingAI(true);
    const nq = prices.find(p => p.id === 'NQ1!');
    const es = prices.find(p => p.id === 'ES1!');
    const vix = prices.find(p => p.id === 'VIX');
    const dxy = prices.find(p => p.id === 'DXY');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un trader institutionnel NQ Futures. Analyse le contexte de marché actuel et donne un biais directionnel.

Données temps réel simulées:
- NQ Futures: ${nq?.price} (${nq?.price > nq?.prev ? '+' : ''}${((nq?.price - nq?.prev) || 0).toFixed(1)})
- ES Futures: ${es?.price}
- VIX: ${vix?.price} (${vix?.price > 20 ? 'ÉLEVÉ' : 'NORMAL'})
- DXY: ${dxy?.price}
- Dernières news: ${NEWS_FEED.slice(0, 3).map(n => n.title).join(' | ')}

Retourne UNIQUEMENT un JSON sans markdown:
{
  "bias": "bullish"|"bearish"|"neutre"|"volatile",
  "confidence": <0-100>,
  "summary": "<analyse de 2 phrases>",
  "key_levels": { "support": <number>, "resistance": <number> },
  "session_advice": "<conseil pour la session actuelle>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          bias: { type: "string" },
          confidence: { type: "number" },
          summary: { type: "string" },
          key_levels: { type: "object", properties: { support: { type: "number" }, resistance: { type: "number" } } },
          session_advice: { type: "string" }
        }
      }
    });
    setAiContext(res);
    setLoadingAI(false);
  };

  const nqData = prices.find(p => p.id === selectedInstr);
  const biasColor = (b) => ({ bullish: 'text-primary', bearish: 'text-destructive', neutre: 'text-yellow-400', volatile: 'text-orange-400' }[b] || 'text-muted-foreground');
  const maxBid = Math.max(...ORDERBOOK_MOCK.bids.map(b => b.size));
  const maxAsk = Math.max(...ORDERBOOK_MOCK.asks.map(a => a.size));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Flux Données Temps Réel
          </h1>
          <p className="text-xs text-muted-foreground">Prix live simulés · Carnet d'ordres · Contexte IA</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className={`flex items-center gap-1.5 text-xs ${connected ? 'text-primary' : 'text-muted-foreground'}`}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? 'LIVE' : 'PAUSÉ'}
          </div>
          <Button size="sm" variant="outline" onClick={toggle} className="h-7 text-xs gap-1">
            {connected ? '⏸ Pause' : '▶ Reprendre'}
          </Button>
          <Button size="sm" onClick={getMarketContext} disabled={loadingAI} className="h-7 text-xs gap-1">
            <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            {loadingAI ? 'Analyse...' : 'Contexte IA'}
          </Button>
        </div>
      </div>

      {/* Prix en temps réel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {prices.map(i => {
          const change = i.price - i.prev;
          const changeDay = i.price - i.base;
          const sel = selectedInstr === i.id;
          return (
            <button key={i.id} onClick={() => setSelectedInstr(i.id)}
              className={`card-trading text-left transition-all ${sel ? 'border-2 ring-1' : 'hover:border-border/80'}`}
              style={{ borderColor: sel ? i.color : undefined, boxShadow: sel ? `0 0 10px ${i.color}22` : undefined }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground">{i.id}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'animate-pulse' : ''}`} style={{ background: i.color }} />
              </div>
              <div className="text-xl font-bold font-mono" style={{ color: i.color }}>{i.price.toFixed(i.vol < 1 ? 2 : 0)}</div>
              <div className={`text-xs font-mono mt-0.5 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(i.vol < 1 ? 2 : 1)}
                <span className="text-muted-foreground ml-2">({changeDay >= 0 ? '+' : ''}{changeDay.toFixed(0)})</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* AI Context Banner */}
      {aiContext && (
        <div className={`card-trading border ${aiContext.bias === 'bullish' ? 'border-primary/40 bg-primary/5' : aiContext.bias === 'bearish' ? 'border-destructive/40 bg-destructive/5' : 'border-yellow-400/40 bg-yellow-400/5'}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <div className={`text-lg font-bold font-mono uppercase ${biasColor(aiContext.bias)}`}>{aiContext.bias}</div>
              <div className="text-[10px] text-muted-foreground">{aiContext.confidence}% conf.</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{aiContext.summary}</p>
              {aiContext.session_advice && <p className="text-xs text-foreground mt-1">→ {aiContext.session_advice}</p>}
            </div>
            {aiContext.key_levels && (
              <div className="text-xs space-y-1 flex-shrink-0">
                <div className="flex gap-2"><span className="text-green-400">S:</span><span className="font-mono">{aiContext.key_levels.support}</span></div>
                <div className="flex gap-2"><span className="text-red-400">R:</span><span className="font-mono">{aiContext.key_levels.resistance}</span></div>
              </div>
            )}
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiContext(null)}>✕</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart + tabs */}
        <div className="lg:col-span-2 card-trading">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">{nqData?.name} — {nqData?.price?.toFixed(nqData?.vol < 1 ? 2 : 0)}</span>
            <div className="flex gap-1">
              {['chart', 'orderbook', 'news'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`text-xs px-2 py-1 rounded transition-all ${tab === t ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'chart' ? '📈 Chart' : t === 'orderbook' ? '📒 Carnet' : '📰 News'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'chart' && nqData && (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={nqData.history.map((h, i) => ({ t: i, p: h.p }))}>
                <defs>
                  <linearGradient id="liveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={nqData.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={nqData.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 10 }}
                  formatter={(v) => [v?.toFixed(nqData.vol < 1 ? 2 : 1), nqData.id]} />
                <Area type="monotone" dataKey="p" stroke={nqData.color} fill="url(#liveGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {tab === 'orderbook' && (
            <div className="space-y-1">
              <div className="grid grid-cols-3 text-[10px] text-muted-foreground font-semibold pb-1 border-b border-border">
                <span>Taille</span><span className="text-center">Prix</span><span className="text-right">Taille</span>
              </div>
              {ORDERBOOK_MOCK.asks.slice().reverse().map((a, i) => (
                <div key={i} className="grid grid-cols-3 text-xs relative">
                  <span />
                  <span className="text-center font-mono text-red-400">{a.price}</span>
                  <div className="relative flex items-center justify-end">
                    <div className="absolute inset-y-0 right-0 bg-red-500/10 rounded" style={{ width: `${(a.size / maxAsk) * 100}%` }} />
                    <span className="font-mono relative z-10">{a.size}</span>
                  </div>
                </div>
              ))}
              <div className="text-center text-xs font-bold font-mono text-foreground py-1 bg-secondary/40 rounded">
                {prices.find(p => p.id === selectedInstr)?.price.toFixed(0)} — Spread: 4
              </div>
              {ORDERBOOK_MOCK.bids.map((b, i) => (
                <div key={i} className="grid grid-cols-3 text-xs">
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 bg-green-500/10 rounded" style={{ width: `${(b.size / maxBid) * 100}%` }} />
                    <span className="font-mono relative z-10">{b.size}</span>
                  </div>
                  <span className="text-center font-mono text-green-400">{b.price}</span>
                  <span />
                </div>
              ))}
            </div>
          )}

          {tab === 'news' && (
            <div className="space-y-2">
              {NEWS_FEED.map((n, i) => (
                <div key={i} className={`p-2.5 rounded border text-xs ${n.impact === 'high' ? 'border-orange-400/30 bg-orange-400/5' : n.impact === 'low' ? 'border-border' : 'border-yellow-400/20'}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-muted-foreground text-[10px]">{n.time}</span>
                    <span className="text-[10px] bg-secondary px-1 rounded">{n.source}</span>
                    {n.impact === 'high' && <AlertTriangle className="w-3 h-3 text-orange-400" />}
                  </div>
                  <p className={n.impact === 'high' ? 'text-foreground' : 'text-muted-foreground'}>{n.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats sidebar */}
        <div className="space-y-3">
          <div className="card-trading space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Corrélations</div>
            {prices.map(i => {
              const corr = i.id === 'VIX' ? -(i.price - i.base) / i.base * 100 : (i.price - i.base) / i.base * 100;
              const pct = Math.abs(corr).toFixed(2);
              return (
                <div key={i.id} className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-muted-foreground font-mono">{i.id}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(Math.abs(corr) * 50, 100)}%`, background: corr >= 0 ? '#00FF88' : '#EF4444' }} />
                  </div>
                  <span className={`font-mono font-bold w-14 text-right ${corr >= 0 ? 'text-green-400' : 'text-red-400'}`}>{corr >= 0 ? '+' : ''}{pct}%</span>
                </div>
              );
            })}
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sessions Actives</div>
            {[
              { name: 'NY Open', open: '14:30', close: '16:30', active: true },
              { name: 'NY Afternoon', open: '16:30', close: '18:00', active: false },
              { name: 'Asia', open: '00:00', close: '08:00', active: false },
            ].map(s => (
              <div key={s.name} className="flex items-center gap-2 text-xs mb-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                <span className={s.active ? 'text-foreground font-semibold' : 'text-muted-foreground'}>{s.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">{s.open}–{s.close}</span>
              </div>
            ))}
          </div>

          <div className="card-trading">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tick Info</div>
            <div className="space-y-1 text-xs">
              {[
                { label: 'Tick NQ', value: '$5 / 0.25 pt' },
                { label: 'Point NQ', value: '$20' },
                { label: 'Marge MFF', value: '~$1,000' },
                { label: 'Volume', value: connected ? '18,432' : '--' },
              ].map(r => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-mono text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}