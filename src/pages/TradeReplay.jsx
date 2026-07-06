import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip as RTooltip, ReferenceLine } from 'recharts';

function generatePricePath(entry, sl, tp, direction, steps = 100) {
  const path = [];
  let price = entry;
  const vol = Math.abs(tp - entry) / 15;
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    // Random walk with slight drift toward outcome
    const drift = direction === 'LONG' ? (tp - entry) * progress * 0.3 : (sl - entry) * progress * 0.3;
    const noise = (Math.random() - 0.5) * vol;
    price = entry + drift + noise;
    // Clamp between SL and TP
    price = Math.max(Math.min(price, Math.max(entry, tp) + vol), Math.min(entry, sl) - vol);
    path.push({ step: i, price: Math.round(price * 100) / 100, time: `${i}min` });
  }
  // Ensure final price hits TP or SL
  const won = Math.random() > 0.45;
  path[steps].price = won ? tp : sl;
  return { path, won, finalPrice: path[steps].price };
}

export default function TradeReplay() {
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [replayStep, setReplayStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(100);
  const [pricePath, setPricePath] = useState(null);
  const intervalRef = useRef(null);

  const { data: trades = [] } = useQuery({ queryKey: ['replay-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 100) });
  const closedTrades = trades.filter(t => t.status === 'closed' && t.entry_price);

  const selectedTrade = closedTrades.find(t => t.id === selectedTradeId);

  useEffect(() => {
    if (selectedTrade && !pricePath) {
      const { path, won, finalPrice } = generatePricePath(selectedTrade.entry_price, selectedTrade.stop_loss || selectedTrade.entry_price * 0.99, selectedTrade.take_profit_1 || selectedTrade.entry_price * 1.01, selectedTrade.direction, 100);
      setPricePath({ path, won, finalPrice });
      setReplayStep(0);
    }
  }, [selectedTrade, pricePath]);

  useEffect(() => {
    if (playing && pricePath) {
      intervalRef.current = setInterval(() => {
        setReplayStep(prev => {
          if (prev >= pricePath.path.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, 600 - speed * 5);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, pricePath]);

  const resetReplay = () => { setPricePath(null); setReplayStep(0); setPlaying(false); };

  const currentPrice = pricePath ? pricePath.path[replayStep]?.price : 0;
  const progress = pricePath ? (replayStep / (pricePath.path.length - 1)) * 100 : 0;
  const chartData = pricePath ? pricePath.path.slice(0, replayStep + 1) : [];

  const pnl = selectedTrade && currentPrice ? (selectedTrade.direction === 'LONG' ? currentPrice - selectedTrade.entry_price : selectedTrade.entry_price - currentPrice) * (selectedTrade.lot_size || 1) : 0;
  const isWin = pricePath && replayStep >= pricePath.path.length - 1 ? pricePath.won : null;
  const slHit = selectedTrade && currentPrice && selectedTrade.stop_loss && ((selectedTrade.direction === 'LONG' && currentPrice <= selectedTrade.stop_loss) || (selectedTrade.direction === 'SHORT' && currentPrice >= selectedTrade.stop_loss));
  const tpHit = selectedTrade && currentPrice && selectedTrade.take_profit_1 && ((selectedTrade.direction === 'LONG' && currentPrice >= selectedTrade.take_profit_1) || (selectedTrade.direction === 'SHORT' && currentPrice <= selectedTrade.take_profit_1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><RotateCcw className="w-5 h-5 text-purple-400" />Trade Replay Simulator</h1>
          <p className="text-xs text-muted-foreground">Rejouez vos trades step par step · {closedTrades.length} trades disponibles</p>
        </div>
        <Select value={selectedTradeId} onValueChange={v => { setSelectedTradeId(v); setPricePath(null); setReplayStep(0); setPlaying(false); }}>
          <SelectTrigger className="h-8 bg-secondary border-border text-xs w-64"><SelectValue placeholder="Sélectionner un trade..." /></SelectTrigger>
          <SelectContent>
            {closedTrades.map(t => <SelectItem key={t.id} value={t.id}>{t.symbol} {t.direction} — {t.entry_time?.slice(0, 10)} ({t.pnl > 0 ? '+' : ''}{t.pnl}€)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedTrade ? (
        <div className="card-trading text-center py-16 text-xs text-muted-foreground">
          <Play className="w-12 h-12 mx-auto mb-3 opacity-20" />
          Sélectionnez un trade clôturé pour le rejouer
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="lg:col-span-2 space-y-3">
            <div className="card-trading">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold font-mono">{selectedTrade.symbol}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${selectedTrade.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{selectedTrade.direction}</span>
                  {isWin === true && <span className="text-xs text-primary font-bold">🎯 TP HIT!</span>}
                  {isWin === false && <span className="text-xs text-destructive font-bold">💥 SL HIT!</span>}
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold font-mono ${pnl > 0 ? 'text-primary' : pnl < 0 ? 'text-destructive' : 'text-yellow-400'}`}>{currentPrice?.toFixed(2) || '—'}</div>
                  <div className="text-[10px] text-muted-foreground">{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} pts</div>
                </div>
              </div>

              {chartData.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="step" tick={{ fontSize: 9, fill: '#6B7280' }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#6B7280' }} />
                    <RTooltip contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 16%)', fontSize: 11 }} />
                    {selectedTrade.stop_loss && <ReferenceLine y={selectedTrade.stop_loss} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'SL', fill: '#EF4444', fontSize: 9 }} />}
                    {selectedTrade.take_profit_1 && <ReferenceLine y={selectedTrade.take_profit_1} stroke="#00FF88" strokeDasharray="4 4" label={{ value: 'TP', fill: '#00FF88', fontSize: 9 }} />}
                    <ReferenceLine y={selectedTrade.entry_price} stroke="#0088FF" strokeDasharray="2 2" label={{ value: 'Entry', fill: '#0088FF', fontSize: 9 }} />
                    <Line type="monotone" dataKey="price" stroke={pnl > 0 ? '#00FF88' : pnl < 0 ? '#EF4444' : '#0088FF'} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* Controls */}
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => setReplayStep(Math.max(0, replayStep - 5))} disabled={!pricePath}><SkipBack className="w-3 h-3" /></Button>
                <Button size="sm" onClick={() => setPlaying(!playing)} disabled={!pricePath} className="gap-1">
                  {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {playing ? 'Pause' : 'Play'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setReplayStep(Math.min(pricePath?.path.length - 1 || 0, replayStep + 5))} disabled={!pricePath}><SkipForward className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={resetReplay} className="gap-1 text-xs"><RotateCcw className="w-3 h-3" />Reset</Button>
                <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                  <span>Vitesse:</span>
                  <input type="range" min="10" max="100" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-20 accent-primary" />
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                <span>Step {replayStep}/{pricePath?.path.length - 1 || 0}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Trade Info */}
          <div className="space-y-3">
            <div className="card-trading space-y-2">
              <div className="text-sm font-semibold">Détails Trade</div>
              {[
                { l: 'Date', v: selectedTrade.entry_time?.slice(0, 10) },
                { l: 'Stratégie', v: selectedTrade.strategy || '—' },
                { l: 'Session', v: selectedTrade.session || '—' },
                { l: 'Timeframe', v: selectedTrade.timeframe || '—' },
                { l: 'Entry', v: selectedTrade.entry_price, c: 'text-blue-400' },
                { l: 'Stop Loss', v: selectedTrade.stop_loss || '—', c: 'text-destructive' },
                { l: 'Take Profit', v: selectedTrade.take_profit_1 || '—', c: 'text-primary' },
                { l: 'Lots', v: selectedTrade.lot_size || '—' },
                { l: 'R:R', v: selectedTrade.risk_reward ? `${selectedTrade.risk_reward}:1` : '—', c: 'text-purple-400' },
                { l: 'Résultat', v: selectedTrade.result, c: selectedTrade.result === 'win' ? 'text-primary' : 'text-destructive' },
                { l: 'PnL', v: `${selectedTrade.pnl > 0 ? '+' : ''}${selectedTrade.pnl}€`, c: selectedTrade.pnl > 0 ? 'text-primary' : 'text-destructive' },
              ].map(f => (
                <div key={f.l} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{f.l}</span>
                  <span className={`font-mono font-semibold ${f.c || 'text-foreground'}`}>{f.v}</span>
                </div>
              ))}
            </div>

            {selectedTrade.pattern && <div className="card-trading text-xs"><span className="text-muted-foreground">Patterns: </span><span className="text-foreground">{selectedTrade.pattern}</span></div>}
            {selectedTrade.setup && <div className="card-trading text-xs"><span className="text-muted-foreground">Notes: </span><span className="text-foreground">{selectedTrade.setup}</span></div>}
            {selectedTrade.mistakes && <div className="card-trading text-xs border-destructive/20"><span className="text-destructive">Erreurs: </span><span className="text-muted-foreground">{selectedTrade.mistakes}</span></div>}
          </div>
        </div>
      )}
    </div>
  );
}