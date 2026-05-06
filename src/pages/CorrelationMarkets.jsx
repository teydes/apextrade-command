import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { GitBranch, Zap, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Données de corrélation simulées mais réalistes pour NQ/ES/DXY/VIX/BTC/Gold
const INSTRUMENTS = [
  { id: 'NQ', name: 'NQ Futures', base: 19850, vol: 15, color: '#00FF88', sector: 'Tech' },
  { id: 'ES', name: 'ES Futures', base: 5280, vol: 5, color: '#0088FF', sector: 'Broad' },
  { id: 'YM', name: 'Dow Jones', base: 39200, vol: 30, color: '#8B5CF6', sector: 'Industrial' },
  { id: 'RTY', name: 'Russell 2000', base: 2010, vol: 8, color: '#F59E0B', sector: 'Small Cap' },
  { id: 'DXY', name: 'Dollar Index', base: 104.2, vol: 0.2, color: '#EF4444', sector: 'Forex' },
  { id: 'VIX', name: 'VIX', base: 18.5, vol: 0.5, color: '#FF6B6B', sector: 'Volatility' },
  { id: 'BTC', name: 'Bitcoin', base: 62000, vol: 800, color: '#F7931A', sector: 'Crypto' },
  { id: 'GLD', name: 'Gold', base: 2320, vol: 8, color: '#FFD700', sector: 'Commodity' },
  { id: 'CL', name: 'Crude Oil', base: 82.5, vol: 0.8, color: '#6B7280', sector: 'Energy' },
];

// Corrélations historiques NQ vs autres (entre -1 et 1)
const BASE_CORRELATIONS = {
  NQ: { NQ: 1.00, ES: 0.96, YM: 0.82, RTY: 0.71, DXY: -0.65, VIX: -0.88, BTC: 0.58, GLD: -0.12, CL: 0.24 },
  ES: { NQ: 0.96, ES: 1.00, YM: 0.91, RTY: 0.78, DXY: -0.60, VIX: -0.85, BTC: 0.52, GLD: -0.08, CL: 0.29 },
  YM: { NQ: 0.82, ES: 0.91, YM: 1.00, RTY: 0.72, DXY: -0.51, VIX: -0.76, BTC: 0.41, GLD: 0.05, CL: 0.35 },
  RTY: { NQ: 0.71, ES: 0.78, YM: 0.72, RTY: 1.00, DXY: -0.58, VIX: -0.72, BTC: 0.49, GLD: -0.15, CL: 0.38 },
  DXY: { NQ: -0.65, ES: -0.60, YM: -0.51, RTY: -0.58, DXY: 1.00, VIX: 0.45, BTC: -0.62, GLD: -0.78, CL: -0.52 },
  VIX: { NQ: -0.88, ES: -0.85, YM: -0.76, RTY: -0.72, DXY: 0.45, VIX: 1.00, BTC: -0.48, GLD: 0.25, CL: -0.18 },
  BTC: { NQ: 0.58, ES: 0.52, YM: 0.41, RTY: 0.49, DXY: -0.62, VIX: -0.48, BTC: 1.00, GLD: 0.08, CL: 0.31 },
  GLD: { NQ: -0.12, ES: -0.08, YM: 0.05, RTY: -0.15, DXY: -0.78, VIX: 0.25, BTC: 0.08, GLD: 1.00, CL: 0.42 },
  CL: { NQ: 0.24, ES: 0.29, YM: 0.35, RTY: 0.38, DXY: -0.52, VIX: -0.18, BTC: 0.31, GLD: 0.42, CL: 1.00 },
};

function generatePriceHistory(base, vol, days = 60) {
  const data = [];
  let price = base;
  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * vol * 2;
    price = Math.max(base * 0.8, price + change);
    data.push({ day: i === 0 ? 'Aujourd\'hui' : `J-${i}`, price: Math.round(price * 100) / 100 });
  }
  return data;
}

function corrColor(v) {
  if (v >= 0.7) return '#00FF88';
  if (v >= 0.4) return '#86EFAC';
  if (v >= 0.1) return '#FEF08A';
  if (v >= -0.1) return '#9CA3AF';
  if (v >= -0.4) return '#FCA5A5';
  if (v >= -0.7) return '#F87171';
  return '#EF4444';
}

function corrTextColor(v) {
  if (Math.abs(v) >= 0.5) return 'text-foreground font-bold';
  return 'text-muted-foreground';
}

export default function CorrelationMarkets() {
  const [selectedBase, setSelectedBase] = useState('NQ');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [priceHistories, setPriceHistories] = useState({});
  const [liveCorr, setLiveCorr] = useState(BASE_CORRELATIONS);
  const [selectedPair, setSelectedPair] = useState('ES');

  useEffect(() => {
    const histories = {};
    INSTRUMENTS.forEach(inst => {
      histories[inst.id] = generatePriceHistory(inst.base, inst.vol);
    });
    setPriceHistories(histories);
  }, []);

  // Légère variation des corrélations pour effet "live"
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCorr(prev => {
        const updated = { ...prev };
        // Faire varier légèrement quelques corrélations
        Object.keys(updated).forEach(k => {
          Object.keys(updated[k]).forEach(j => {
            if (k !== j) {
              const noise = (Math.random() - 0.5) * 0.03;
              updated[k][j] = Math.max(-1, Math.min(1, parseFloat((updated[k][j] + noise).toFixed(3))));
            }
          });
        });
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getAIAnalysis = async () => {
    setLoadingAI(true);
    const corrRows = INSTRUMENTS.map(i => `${i.id}: ${i.name} | Corr NQ: ${liveCorr.NQ[i.id]?.toFixed(2)}`).join('\n');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un analyste marchés institutionnel expert en corrélations inter-marchés pour NQ Futures.

CORRÉLATIONS ACTUELLES (NQ comme base):
${corrRows}

CONDITIONS ACTUELLES:
- VIX: ~18.5 (normal)
- DXY: ~104.2 (dollar fort)
- BTC: +2.3% aujourd'hui (risk-on)
- Gold: stable
- Session: NY Open

Analyse ces corrélations et donne des insights trading actionnables pour un trader NQ Futures PropFirm. Retourne UNIQUEMENT JSON:
{
  "regime_marche": "risk-on"|"risk-off"|"mixte",
  "biais_nq": "bullish"|"bearish"|"neutre",
  "confiance": <0-100>,
  "analyse": "<analyse 2-3 phrases>",
  "signals_correlation": [
    {"instrument": "<nom>", "signal": "<ce que ça implique pour NQ>", "force": "forte"|"modérée"|"faible", "direction": "bullish"|"bearish"}
  ],
  "divergences": ["<divergence notable 1>", "<divergence notable 2>"],
  "setups_favoris": ["<setup ICT/SMC favorisé par ce régime>"],
  "risques": "<principal risque à surveiller>",
  "niveaux_cles": {"support_nq": <number>, "resistance_nq": <number>}
}`,
      response_json_schema: {
        type: "object",
        properties: {
          regime_marche: { type: "string" },
          biais_nq: { type: "string" },
          confiance: { type: "number" },
          analyse: { type: "string" },
          signals_correlation: { type: "array", items: { type: "object", properties: { instrument: { type: "string" }, signal: { type: "string" }, force: { type: "string" }, direction: { type: "string" } } } },
          divergences: { type: "array", items: { type: "string" } },
          setups_favoris: { type: "array", items: { type: "string" } },
          risques: { type: "string" },
          niveaux_cles: { type: "object", properties: { support_nq: { type: "number" }, resistance_nq: { type: "number" } } }
        }
      }
    });
    setAiAnalysis(res);
    setLoadingAI(false);
  };

  const baseInst = INSTRUMENTS.find(i => i.id === selectedBase);
  const pairInst = INSTRUMENTS.find(i => i.id === selectedPair);
  const corrValue = liveCorr[selectedBase]?.[selectedPair] || 0;

  const corrType = corrValue >= 0.5 ? 'Forte corrélation positive' :
    corrValue >= 0.1 ? 'Corrélation positive modérée' :
    corrValue >= -0.1 ? 'Décorrélé' :
    corrValue >= -0.5 ? 'Corrélation inverse modérée' :
    'Forte corrélation inverse';

  const biasColor = { bullish: 'text-primary border-primary/30', bearish: 'text-destructive border-destructive/30', neutre: 'text-yellow-400 border-yellow-400/30' };
  const regimeColor = { 'risk-on': 'text-primary', 'risk-off': 'text-destructive', 'mixte': 'text-yellow-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            Analyse Corrélations Inter-Marchés
          </h1>
          <p className="text-xs text-muted-foreground">Corrélations live · NQ vs tous marchés · Biais IA · Détection régime</p>
        </div>
        <Button size="sm" onClick={getAIAnalysis} disabled={loadingAI} className="gap-1 text-xs">
          <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
          {loadingAI ? 'Analyse...' : 'Analyse IA Marchés'}
        </Button>
      </div>

      {/* AI Analysis Banner */}
      {aiAnalysis && (
        <div className={`card-trading border space-y-3 ${biasColor[aiAnalysis.biais_nq] || 'border-border'}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center">
              <div className={`text-xl font-bold font-mono uppercase ${biasColor[aiAnalysis.biais_nq]?.split(' ')[0]}`}>{aiAnalysis.biais_nq}</div>
              <div className="text-[10px] text-muted-foreground">{aiAnalysis.confiance}% conf.</div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-purple-400">Régime:</span>
                <span className={`text-xs font-bold ${regimeColor[aiAnalysis.regime_marche]}`}>{aiAnalysis.regime_marche?.toUpperCase()}</span>
              </div>
              <p className="text-xs text-muted-foreground">{aiAnalysis.analyse}</p>
            </div>
            {aiAnalysis.niveaux_cles && (
              <div className="text-xs space-y-1">
                <div className="flex gap-2"><span className="text-green-400">S:</span><span className="font-mono">{aiAnalysis.niveaux_cles.support_nq}</span></div>
                <div className="flex gap-2"><span className="text-red-400">R:</span><span className="font-mono">{aiAnalysis.niveaux_cles.resistance_nq}</span></div>
              </div>
            )}
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAiAnalysis(null)}>✕</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {aiAnalysis.signals_correlation?.slice(0, 6).map((sig, i) => (
              <div key={i} className={`p-2 rounded border text-xs ${sig.direction === 'bullish' ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5'}`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="font-mono font-bold">{sig.instrument}</span>
                  <span className={`ml-auto text-[10px] ${sig.direction === 'bullish' ? 'text-primary' : 'text-destructive'}`}>{sig.direction === 'bullish' ? '↑' : '↓'} {sig.force}</span>
                </div>
                <p className="text-muted-foreground">{sig.signal}</p>
              </div>
            ))}
          </div>
          {aiAnalysis.setups_favoris?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Setups favorisés:</span>
              {aiAnalysis.setups_favoris.map((s, i) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{s}</span>)}
            </div>
          )}
          {aiAnalysis.divergences?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {aiAnalysis.divergences.map((d, i) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">⚠ {d}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Matrice de corrélation */}
      <div className="card-trading">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Matrice de Corrélation</span>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#00FF88' }} /> Forte +</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#9CA3AF' }} /> Neutre</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: '#EF4444' }} /> Forte -</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="w-10 p-1 text-left text-muted-foreground">Base\</th>
                {INSTRUMENTS.map(i => (
                  <th key={i.id} className="p-1 text-center font-mono" style={{ color: i.color }}>{i.id}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INSTRUMENTS.map(row => (
                <tr key={row.id}>
                  <td className="p-1 font-mono font-bold" style={{ color: row.color }}>{row.id}</td>
                  {INSTRUMENTS.map(col => {
                    const v = liveCorr[row.id]?.[col.id] ?? 0;
                    return (
                      <td key={col.id} className="p-0.5 text-center">
                        <button
                          onClick={() => { setSelectedBase(row.id); setSelectedPair(col.id); }}
                          className="w-10 h-7 rounded text-[10px] font-mono transition-all hover:ring-1 hover:ring-white/20"
                          style={{ background: corrColor(v), color: '#0f1625' }}
                          title={`${row.id}/${col.id}: ${v.toFixed(2)}`}
                        >
                          {v.toFixed(2)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sélecteur instruments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-trading">
          <div className="text-sm font-semibold mb-3">Analyse de Paire</div>
          <div className="flex gap-2 flex-wrap mb-3">
            <div className="text-xs text-muted-foreground self-center">Base:</div>
            {INSTRUMENTS.map(i => (
              <button key={i.id} onClick={() => setSelectedBase(i.id)}
                className={`text-xs px-2 py-1 rounded border transition-all ${selectedBase === i.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80'}`}>
                {i.id}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            <div className="text-xs text-muted-foreground self-center">Comparer:</div>
            {INSTRUMENTS.filter(i => i.id !== selectedBase).map(i => (
              <button key={i.id} onClick={() => setSelectedPair(i.id)}
                className={`text-xs px-2 py-1 rounded border transition-all ${selectedPair === i.id ? 'border-purple-400 bg-purple-400/10 text-purple-400' : 'border-border text-muted-foreground hover:border-border/80'}`}>
                {i.id}
              </button>
            ))}
          </div>

          <div className="p-3 rounded border border-border bg-secondary/20 text-center">
            <div className="text-3xl font-bold font-mono mb-1" style={{ color: corrColor(corrValue) }}>{corrValue.toFixed(3)}</div>
            <div className="text-xs text-muted-foreground">{baseInst?.name} vs {pairInst?.name}</div>
            <div className={`text-xs font-semibold mt-1 ${corrValue >= 0 ? 'text-primary' : 'text-destructive'}`}>{corrType}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {corrValue >= 0.7 ? `Trading signal: ${baseInst?.id} ↑ → ${pairInst?.id} ↑ probable` :
               corrValue <= -0.7 ? `Trading signal: ${baseInst?.id} ↑ → ${pairInst?.id} ↓ probable` :
               'Corrélation insuffisante pour signal directionnel fiable'}
            </div>
          </div>
        </div>

        {/* Charts superposés */}
        <div className="card-trading">
          <div className="text-sm font-semibold mb-3">
            Comparaison Prix — {baseInst?.name} vs {pairInst?.name}
          </div>
          {priceHistories[selectedBase] && priceHistories[selectedPair] && (
            <div className="space-y-2">
              <div>
                <div className="text-[10px] mb-1" style={{ color: baseInst?.color }}>{baseInst?.id}</div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={priceHistories[selectedBase].slice(-30)}>
                    <defs>
                      <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={baseInst?.color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={baseInst?.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 9, borderRadius: 4 }} formatter={v => [v, baseInst?.id]} />
                    <Area type="monotone" dataKey="price" stroke={baseInst?.color} fill="url(#baseGrad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="text-[10px] mb-1" style={{ color: pairInst?.color }}>{pairInst?.id}</div>
                <ResponsiveContainer width="100%" height={70}>
                  <AreaChart data={priceHistories[selectedPair].slice(-30)}>
                    <defs>
                      <linearGradient id="pairGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pairInst?.color} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={pairInst?.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', fontSize: 9, borderRadius: 4 }} formatter={v => [v, pairInst?.id]} />
                    <Area type="monotone" dataKey="price" stroke={pairInst?.color} fill="url(#pairGrad)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top corrélations NQ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-trading">
          <div className="text-sm font-semibold mb-3">Top Corrélations avec NQ (live)</div>
          <div className="space-y-2">
            {INSTRUMENTS.filter(i => i.id !== 'NQ').sort((a, b) => Math.abs(liveCorr.NQ[b.id] || 0) - Math.abs(liveCorr.NQ[a.id] || 0)).map(inst => {
              const corr = liveCorr.NQ[inst.id] || 0;
              return (
                <div key={inst.id} className="flex items-center gap-3 text-xs">
                  <span className="font-mono font-bold w-10 flex-shrink-0" style={{ color: inst.color }}>{inst.id}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.abs(corr) * 100}%`, background: corrColor(corr), marginLeft: corr < 0 ? `${(1 - Math.abs(corr)) * 100}%` : '0' }} />
                  </div>
                  <span className={`font-mono font-bold w-12 text-right ${corr >= 0 ? 'text-green-400' : 'text-red-400'}`}>{corr >= 0 ? '+' : ''}{corr.toFixed(2)}</span>
                  <span className="text-muted-foreground text-[10px] w-20">{corr >= 0.5 ? '📈 Confirme' : corr <= -0.5 ? '🔄 Inverse' : '➡️ Neutre'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-trading">
          <div className="text-sm font-semibold mb-3">Signaux de Trading Inter-Marchés</div>
          <div className="space-y-2 text-xs">
            {[
              { condition: liveCorr.NQ.ES >= 0.9, signal: 'ES et NQ alignés — Biais cohérent confirmé', type: 'confirm' },
              { condition: liveCorr.NQ.VIX <= -0.7, signal: 'VIX faible → Environnement favorable aux LONG NQ', type: 'bullish' },
              { condition: liveCorr.NQ.VIX >= -0.5, signal: 'VIX hausse → Pression baissière sur NQ, prudence', type: 'warning' },
              { condition: liveCorr.NQ.DXY <= -0.6, signal: 'DXY fort → Corrélation inverse active, surveiller', type: 'warning' },
              { condition: liveCorr.NQ.BTC >= 0.5, signal: 'BTC corrélé → Régime Risk-On, NQ favorisé LONG', type: 'bullish' },
              { condition: liveCorr.NQ.GLD <= -0.2, signal: 'Gold décorrélé / inverse → Flight-to-safety possible', type: 'neutral' },
              { condition: liveCorr.NQ.RTY >= 0.7, signal: 'Russell fort → Breadth saine, NQ rally probable', type: 'bullish' },
            ].filter(s => s.condition).map((sig, i) => (
              <div key={i} className={`p-2 rounded border flex items-start gap-2 ${
                sig.type === 'bullish' ? 'border-primary/30 bg-primary/5' :
                sig.type === 'warning' ? 'border-yellow-400/30 bg-yellow-400/5' :
                sig.type === 'confirm' ? 'border-blue-400/30 bg-blue-400/5' :
                'border-border bg-secondary/20'}`}>
                <span className={sig.type === 'bullish' ? 'text-primary' : sig.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}>
                  {sig.type === 'bullish' ? '↑' : sig.type === 'warning' ? '⚠' : '→'}
                </span>
                <span className="text-muted-foreground">{sig.signal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}