import { useState, useMemo } from 'react';
import { Droplets, TrendingUp, Brain, Plus, Minus, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ICT/SMC Liquidity concepts
const LIQUIDITY_TYPES = {
  BSL: { name: 'Buy-Side Liquidity', desc: 'Equal Highs, Old Highs, Trendline Liquidity above', color: '#00FF88', side: 'above' },
  SSL: { name: 'Sell-Side Liquidity', desc: 'Equal Lows, Old Lows, Trendline Liquidity below', color: '#EF4444', side: 'below' },
  EQH: { name: 'Equal Highs', desc: 'Resting liquidity above equal highs', color: '#00FF8866', side: 'above' },
  EQL: { name: 'Equal Lows', desc: 'Resting liquidity below equal lows', color: '#EF444466', side: 'below' },
  ASIA_HIGH: { name: 'Asian Session High', desc: 'Liquidity above Asian range high', color: '#F59E0B', side: 'above' },
  ASIA_LOW: { name: 'Asian Session Low', desc: 'Liquidity below Asian range low', color: '#F59E0B', side: 'below' },
  LDN_HIGH: { name: 'London High', desc: 'Liquidity above London session high', color: '#0088FF', side: 'above' },
  LDN_LOW: { name: 'London Low', desc: 'Liquidity below London session low', color: '#0088FF', side: 'below' },
  PD_HIGH: { name: 'Previous Day High', desc: 'Resting liquidity above PDH', color: '#A855F7', side: 'above' },
  PD_LOW: { name: 'Previous Day Low', desc: 'Resting liquidity below PDL', color: '#A855F7', side: 'below' },
  WEEKLY_HIGH: { name: 'Weekly High', desc: 'Liquidity above weekly high', color: '#A855F766', side: 'above' },
  WEEKLY_LOW: { name: 'Weekly Low', desc: 'Liquidity below weekly low', color: '#A855F766', side: 'below' },
};

export default function LiquidityMap() {
  const [price, setPrice] = useState(15000);
  const [zones, setZones] = useState([
    { type: 'PD_HIGH', level: 15120, swept: false },
    { type: 'PD_LOW', level: 14880, swept: false },
    { type: 'EQH', level: 15050, swept: false },
    { type: 'EQL', level: 14950, swept: false },
    { type: 'ASIA_HIGH', level: 15020, swept: true },
    { type: 'ASIA_LOW', level: 14980, swept: true },
    { type: 'LDN_HIGH', level: 15080, swept: false },
    { type: 'LDN_LOW', level: 14920, swept: false },
    { type: 'WEEKLY_HIGH', level: 15200, swept: false },
    { type: 'WEEKLY_LOW', level: 14800, swept: false },
  ]);
  const [newZoneType, setNewZoneType] = useState('BSL');
  const [newZoneLevel, setNewZoneLevel] = useState(15100);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const sortedZones = [...zones].sort((a, b) => b.level - a.level);
  const maxLevel = Math.max(...zones.map(z => z.level), price) * 1.01;
  const minLevel = Math.min(...zones.map(z => z.level), price) * 0.99;
  const range = maxLevel - minLevel;

  const pricePercent = ((price - minLevel) / range) * 100;

  const toggleSwept = (idx) => {
    setZones(prev => prev.map((z, i) => i === idx ? { ...z, swept: !z.swept } : z));
  };

  const addZone = () => {
    if (zones.some(z => z.type === newZoneType && z.level === newZoneLevel)) { toast.error('Zone déjà existante'); return; }
    setZones([...zones, { type: newZoneType, level: newZoneLevel, swept: false }]);
    toast.success('Zone ajoutée');
  };

  const removeZone = (idx) => setZones(zones.filter((_, i) => i !== idx));

  const unsweptAbove = zones.filter(z => !z.swept && z.level > price);
  const unsweptBelow = zones.filter(z => !z.swept && z.level < price);
  const nearestAbove = unsweptAbove.sort((a, b) => a.level - b.level)[0];
  const nearestBelow = unsweptBelow.sort((a, b) => b.level - a.level)[0];

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    const zonesSummary = zones.map(z => `${LIQUIDITY_TYPES[z.type].name} at ${z.level} ${z.swept ? '(SWEPT)' : '(UNSWEPT)'}`).join(', ');
    const res = await {
      bias: nearestAbove && nearestBelow ? `Price between ${nearestBelow.level} (SSL) and ${nearestAbove.level} (BSL). Bias: ${price > (nearestAbove.level + nearestBelow.level) / 2 ? 'bullish (closer to BSL)' : 'bearish (closer to SSL)'}` : 'Analyzing...',
      target: nearestAbove ? `${LIQUIDITY_TYPES[nearestAbove.type].name} at ${nearestAbove.level}` : 'No BSL above',
      support: nearestBelow ? `${LIQUIDITY_TYPES[nearestBelow.type].name} at ${nearestBelow.level}` : 'No SSL below',
      setup: unsweptAbove.length > unsweptBelow.length ? 'More BSL above — expect sweep up then reversal' : 'More SSL below — expect sweep down then reversal',
      recommendation: `Watch for liquidity sweep at ${nearestAbove?.level || nearestBelow?.level}. ICT model: wait for sweep + displacement + FVG entry.`,
      risk: `${zones.filter(z => z.swept).length}/${zones.length} zones swept. ${unsweptAbove.length} BSL targets above, ${unsweptBelow.length} SSL targets below.`
    };
    setAiAnalysis(res);
    setLoadingAI(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Droplets className="w-5 h-5 text-blue-400" />Liquidity Map (ICT/SMC)</h1>
          <p className="text-xs text-muted-foreground">Buy-side / Sell-side liquidity · Equal highs/lows · Session levels · Sweep tracking</p>
        </div>
        <Button size="sm" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs"><Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />Analyse IA</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Visual Liquidity Map */}
        <div className="lg:col-span-2 card-trading">
          <div className="text-sm font-semibold mb-3">Carte de Liquidité — NQ Futures</div>
          <div className="relative h-[500px] border-l border-border">
            {/* Price line */}
            <div className="absolute left-0 right-0 z-20 flex items-center" style={{ top: `${100 - pricePercent}%` }}>
              <div className="flex-1 h-0.5 bg-blue-400" />
              <span className="px-2 py-0.5 bg-blue-400 text-blue-900 text-xs font-mono font-bold rounded ml-1">{price}</span>
            </div>

            {/* Liquidity zones */}
            {sortedZones.map((z, idx) => {
              const cfg = LIQUIDITY_TYPES[z.type];
              const zonePercent = ((z.level - minLevel) / range) * 100;
              const top = 100 - zonePercent;
              return (
                <div key={idx} className="absolute left-0 right-0 flex items-center group" style={{ top: `${top}%` }}>
                  <div className={`flex-1 h-0.5 ${z.swept ? 'opacity-30' : ''}`} style={{ background: cfg.color, borderTop: z.swept ? '2px dashed' : '2px solid' }} />
                  <div className={`px-2 py-0.5 text-xs font-mono rounded ml-1 cursor-pointer transition-all ${z.swept ? 'opacity-50 line-through' : ''}`}
                    style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}` }}
                    onClick={() => toggleSwept(idx)} title="Click to toggle swept">
                    {cfg.name} · {z.level} {z.swept ? '✓' : ''}
                  </div>
                  <button onClick={() => removeZone(idx)} className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Minus className="w-3 h-3" /></button>
                </div>
              );
            })}

            {/* Labels */}
            <div className="absolute top-2 right-2 text-[9px] text-muted-foreground">↑ BSL (Above)</div>
            <div className="absolute bottom-2 right-2 text-[9px] text-muted-foreground">↓ SSL (Below)</div>
          </div>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {/* Price input */}
          <div className="card-trading">
            <label className="text-[10px] text-muted-foreground">Prix actuel</label>
            <input type="number" value={price} onChange={e => setPrice(+e.target.value)} className="w-full h-8 bg-secondary rounded px-2 text-xs font-mono" />
          </div>

          {/* Nearest liquidity */}
          <div className="card-trading space-y-2">
            <div className="text-sm font-semibold">Liquidité la plus proche</div>
            {nearestAbove && (
              <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                <div className="text-[10px] text-green-400">↑ BSL (Above)</div>
                <div className="font-mono font-bold text-green-400">{nearestAbove.level}</div>
                <div className="text-[10px] text-muted-foreground">{LIQUIDITY_TYPES[nearestAbove.type].name}</div>
                <div className="text-[10px] text-yellow-400">+{(nearestAbove.level - price).toFixed(1)} pts</div>
              </div>
            )}
            {nearestBelow && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                <div className="text-[10px] text-red-400">↓ SSL (Below)</div>
                <div className="font-mono font-bold text-red-400">{nearestBelow.level}</div>
                <div className="text-[10px] text-muted-foreground">{LIQUIDITY_TYPES[nearestBelow.type].name}</div>
                <div className="text-[10px] text-yellow-400">{(nearestBelow.level - price).toFixed(1)} pts</div>
              </div>
            )}
          </div>

          {/* Add zone */}
          <div className="card-trading space-y-2">
            <div className="text-sm font-semibold">Ajouter zone</div>
            <select value={newZoneType} onChange={e => setNewZoneType(e.target.value)} className="w-full h-8 bg-secondary rounded px-2 text-xs">
              {Object.entries(LIQUIDITY_TYPES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
            <input type="number" value={newZoneLevel} onChange={e => setNewZoneLevel(+e.target.value)} className="w-full h-8 bg-secondary rounded px-2 text-xs font-mono" />
            <Button size="sm" onClick={addZone} className="w-full text-xs gap-1"><Plus className="w-3 h-3" />Ajouter</Button>
          </div>

          {/* Stats */}
          <div className="card-trading space-y-1">
            <div className="text-sm font-semibold mb-1">Stats Liquidité</div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Zones BSL</span><span className="text-green-400 font-mono">{zones.filter(z => LIQUIDITY_TYPES[z.type].side === 'above').length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Zones SSL</span><span className="text-red-400 font-mono">{zones.filter(z => LIQUIDITY_TYPES[z.type].side === 'below').length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Swept</span><span className="text-yellow-400 font-mono">{zones.filter(z => z.swept).length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Unswept</span><span className="text-primary font-mono">{zones.filter(z => !z.swept).length}</span></div>
          </div>
        </div>
      </div>

      {aiAnalysis && (
        <div className="card-trading border border-blue-400/30 bg-blue-400/5 space-y-3">
          <div className="flex items-center gap-2"><Brain className="w-4 h-4 text-blue-400" /><span className="text-sm font-semibold">Analyse Liquidité IA</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-secondary/50 rounded"><span className="text-muted-foreground">Bias: </span><span className="text-foreground">{aiAnalysis.bias}</span></div>
            <div className="p-2 bg-secondary/50 rounded"><span className="text-muted-foreground">Setup: </span><span className="text-yellow-400">{aiAnalysis.setup}</span></div>
            <div className="p-2 bg-green-500/5 border border-green-500/20 rounded"><span className="text-green-400 font-semibold">🎯 Target BSL: </span><span className="text-muted-foreground">{aiAnalysis.target}</span></div>
            <div className="p-2 bg-red-500/5 border border-red-500/20 rounded"><span className="text-red-400 font-semibold">🛡 Support SSL: </span><span className="text-muted-foreground">{aiAnalysis.support}</span></div>
          </div>
          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs"><span className="text-primary font-semibold">💡 Recommendation: </span><span className="text-muted-foreground">{aiAnalysis.recommendation}</span></div>
          <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-xs"><span className="text-yellow-400 font-semibold">⚠️ Risk: </span><span className="text-muted-foreground">{aiAnalysis.risk}</span></div>
        </div>
      )}

      {/* Zone list */}
      <div className="card-trading">
        <div className="text-sm font-semibold mb-2">Zones de Liquidité ({zones.length})</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {sortedZones.map((z, idx) => {
            const cfg = LIQUIDITY_TYPES[z.type];
            return (
              <div key={idx} className={`flex items-center gap-2 p-2 rounded border text-xs ${z.swept ? 'border-border opacity-50' : 'border-border'}`} style={{ borderLeft: `3px solid ${cfg.color}` }}>
                <span className="font-semibold" style={{ color: cfg.color }}>{cfg.name}</span>
                <span className="font-mono">{z.level}</span>
                <span className="text-muted-foreground">{z.level > price ? `+${(z.level - price).toFixed(0)}` : `${(z.level - price).toFixed(0)}`} pts</span>
                {z.swept && <span className="text-[10px] px-1 rounded bg-yellow-400/20 text-yellow-400">SWEPT</span>}
                <button onClick={() => toggleSwept(idx)} className="ml-auto text-[10px] text-muted-foreground hover:text-primary">{z.swept ? 'Reset' : 'Mark swept'}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}