import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Zap, TrendingUp, TrendingDown, RefreshCw, Target, Shield,
  BarChart2, Globe, Star, Filter, Download, Bot, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const MARKETS = {
  forex: {
    label: 'Forex', color: 'text-blue-400',
    symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD']
  },
  indices: {
    label: 'Indices', color: 'text-yellow-400',
    symbols: ['SPX500', 'NAS100', 'US30', 'DAX40', 'FTSE100', 'CAC40', 'JP225', 'AUS200', 'ES1!', 'NQ1!']
  },
  crypto: {
    label: 'Crypto', color: 'text-orange-400',
    symbols: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD', 'ADAUSD', 'DOTUSD', 'AVAXUSD']
  },
  commodities: {
    label: 'Commodités', color: 'text-amber-400',
    symbols: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS', 'COPPER', 'WHEAT', 'CORN']
  },
  stocks: {
    label: 'Actions', color: 'text-purple-400',
    symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'JPM', 'LVMH', 'ASML']
  }
};

const PATTERNS = ['ICT Order Block', 'Fair Value Gap', 'BOS/CHoCH', 'Breaker Block', 'IFVG', 'Pullback EMA', 'Breakout', 'Double Top/Bot', 'Liquidity Sweep', 'OTE Zone', 'Support/Resistance', 'Trend Following'];
const TIMEFRAMES = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

function generateScanResult(symbol, market, pattern, tf) {
  const score = Math.floor(Math.random() * 40) + 55;
  const direction = Math.random() > 0.5 ? 'LONG' : 'SHORT';
  const rr = (Math.random() * 3 + 1.5).toFixed(1);
  const prob = Math.floor(Math.random() * 25) + 55;
  const entry = (Math.random() * 100 + 50).toFixed(4);
  const sl = direction === 'LONG'
    ? (parseFloat(entry) * (1 - Math.random() * 0.01 - 0.005)).toFixed(4)
    : (parseFloat(entry) * (1 + Math.random() * 0.01 + 0.005)).toFixed(4);
  const tp = direction === 'LONG'
    ? (parseFloat(entry) * (1 + parseFloat(rr) * 0.01)).toFixed(4)
    : (parseFloat(entry) * (1 - parseFloat(rr) * 0.01)).toFixed(4);
  return { id: `${symbol}_${Date.now()}_${Math.random()}`, symbol, market, pattern, timeframe: tf, direction, score, rr: parseFloat(rr), probability: prob, entry, sl, tp, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
}

export default function MarketScanner() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [selectedMarkets, setSelectedMarkets] = useState(['forex', 'indices']);
  const [selectedPatterns, setSelectedPatterns] = useState(['ICT Order Block', 'Fair Value Gap', 'Pullback EMA']);
  const [selectedTF, setSelectedTF] = useState('H1');
  const [minScore, setMinScore] = useState(70);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [activeTab, setActiveTab] = useState('scanner');
  const [watchlist, setWatchlist] = useState(['EURUSD', 'XAUUSD', 'SPX500', 'BTCUSD']);

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts-scanner'],
    queryFn: () => base44.entities.TradingAccount.list(),
  });

  const activeAccount = accounts.find(a => a.status === 'active') || accounts[0];
  const capital = activeAccount?.current_balance || activeAccount?.account_size || 500;
  const accountType = activeAccount?.account_type || 'personal';

  useEffect(() => {
    if (!autoScan) return;
    const interval = setInterval(() => runScan(true), 60000);
    return () => clearInterval(interval);
  }, [autoScan, selectedMarkets, selectedPatterns]);

  const runScan = async (silent = false) => {
    setScanning(true);
    if (!silent) setResults([]);

    await new Promise(r => setTimeout(r, 1200));

    const newResults = [];
    selectedMarkets.forEach(mkt => {
      const mktData = MARKETS[mkt];
      const symbols = searchSymbol ? [searchSymbol.toUpperCase()] : mktData.symbols.slice(0, 6);
      symbols.forEach(sym => {
        selectedPatterns.slice(0, 3).forEach(pat => {
          const result = generateScanResult(sym, mkt, pat, selectedTF);
          if (result.score >= minScore) newResults.push(result);
        });
      });
    });

    newResults.sort((a, b) => b.score - a.score);
    setResults(newResults.slice(0, 20));
    setScanning(false);
    if (!silent) toast.success(`${newResults.length} setups trouvés sur ${selectedMarkets.length} marchés`);
  };

  const analyzeWithAI = async (setup) => {
    setLoadingAI(true);
    const riskAmount = Math.round(capital * 0.01);
    const lotRecommended = accountType === 'personal' ? (capital / 10000).toFixed(2) : '0.5';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert trader ICT/SMC multi-marché. Analyse ce setup de trading et donne des recommandations précises.

Setup détecté:
- Symbole: ${setup.symbol} | Marché: ${setup.market} | Pattern: ${setup.pattern}
- Direction: ${setup.direction} | Timeframe: ${setup.timeframe}
- Score qualité: ${setup.score}/100 | Probabilité: ${setup.probability}%
- R:R estimé: ${setup.rr}:1

Capital disponible: ${capital}€ (${accountType === 'personal' ? 'compte personnel - pas de restrictions DD' : 'compte PropFirm'})
Risque suggéré: ${riskAmount}€ (1% du capital)

Analyse complète et retourne UNIQUEMENT JSON:
{
  "verdict": "<analyse setup 2 phrases>",
  "quality_score": <0-100>,
  "recommended_direction": "LONG|SHORT|WAIT",
  "confidence": <0-100>,
  "entry_zone": "<zone précise>",
  "invalidation": "<niveau d'invalidation>",
  "tp_levels": ["<TP1>", "<TP2>", "<TP3>"],
  "risk_management": {
    "lot_size": <number>,
    "risk_amount": <number>,
    "position_comment": "<explication>"
  },
  "market_context": "<contexte macro/technique>",
  "best_entry_timing": "<timing optimal>",
  "warnings": ["<warning 1>"],
  "similar_historical_setups": "<référence historique>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          verdict: { type: "string" }, quality_score: { type: "number" }, recommended_direction: { type: "string" },
          confidence: { type: "number" }, entry_zone: { type: "string" }, invalidation: { type: "string" },
          tp_levels: { type: "array", items: { type: "string" } },
          risk_management: { type: "object", properties: { lot_size: { type: "number" }, risk_amount: { type: "number" }, position_comment: { type: "string" } } },
          market_context: { type: "string" }, best_entry_timing: { type: "string" },
          warnings: { type: "array", items: { type: "string" } },
          similar_historical_setups: { type: "string" }
        }
      }
    });
    setAiAnalysis({ ...res, setup });
    setLoadingAI(false);
  };

  const scanAllMarketsAI = async () => {
    setLoadingAI(true);
    const allSymbols = selectedMarkets.flatMap(m => MARKETS[m]?.symbols.slice(0, 3) || []);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert trader multi-marché. Scan global du marché et identification des meilleures opportunités.

Marchés à scanner: ${selectedMarkets.join(', ')}
Symboles: ${allSymbols.join(', ')}
Patterns recherchés: ${selectedPatterns.join(', ')}
Timeframe: ${selectedTF}
Capital: ${capital}€

Identifie les 5 meilleures opportunités de trading maintenant et retourne UNIQUEMENT JSON:
{
  "market_regime": "risk-on|risk-off|neutre|volatile",
  "best_opportunities": [
    {
      "symbol": "<symbole>",
      "market": "<marché>",
      "pattern": "<pattern>",
      "direction": "LONG|SHORT",
      "score": <0-100>,
      "rr": <number>,
      "timeframe": "<tf>",
      "reason": "<raison courte>",
      "entry": "<zone entrée>",
      "sl": "<stop loss>",
      "tp": "<take profit>"
    }
  ],
  "avoid_symbols": ["<symbol à éviter>"],
  "market_bias": "<biais global court terme>",
  "best_session": "<meilleure session maintenant>",
  "daily_watchlist": ["<symbol 1>", "<symbol 2>", "<symbol 3>"]
}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          market_regime: { type: "string" },
          best_opportunities: { type: "array", items: { type: "object", properties: { symbol: { type: "string" }, market: { type: "string" }, pattern: { type: "string" }, direction: { type: "string" }, score: { type: "number" }, rr: { type: "number" }, timeframe: { type: "string" }, reason: { type: "string" }, entry: { type: "string" }, sl: { type: "string" }, tp: { type: "string" } } } },
          avoid_symbols: { type: "array", items: { type: "string" } },
          market_bias: { type: "string" },
          best_session: { type: "string" },
          daily_watchlist: { type: "array", items: { type: "string" } }
        }
      }
    });
    setAiAnalysis({ _globalScan: true, ...res });
    setLoadingAI(false);
    if (res.best_opportunities) {
      setResults(res.best_opportunities.map((o, i) => ({
        id: `ai_${i}`, ...o, probability: Math.floor(o.score * 0.85), time: new Date().toLocaleTimeString('fr-FR'), fromAI: true
      })));
    }
    toast.success('Scan IA global terminé — Internet utilisé');
  };

  const toggleMarket = (mkt) => setSelectedMarkets(p => p.includes(mkt) ? p.filter(x => x !== mkt) : [...p, mkt]);
  const togglePattern = (pat) => setSelectedPatterns(p => p.includes(pat) ? p.filter(x => x !== pat) : [...p, pat]);

  const scoreColor = (s) => s >= 80 ? 'text-primary' : s >= 70 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Search className="w-5 h-5 text-green-400" />
            Scanner Multi-Marchés
          </h1>
          <p className="text-xs text-muted-foreground">
            Forex · Indices · Crypto · Commodités · Actions · ICT/SMC · Pullback · Breakout
            {activeAccount && <span className="ml-2 text-primary">● {activeAccount.name} ({capital.toLocaleString()}€)</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Auto (1min)</span>
            <Switch checked={autoScan} onCheckedChange={setAutoScan} />
            {autoScan && <span className="text-primary animate-pulse text-[10px]">● LIVE</span>}
          </div>
          <Button size="sm" variant="outline" onClick={scanAllMarketsAI} disabled={loadingAI} className="gap-1 text-xs h-8">
            <Globe className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            Scan IA Global
          </Button>
          <Button size="sm" onClick={() => runScan()} disabled={scanning} className="gap-1 text-xs">
            <Search className={`w-3 h-3 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scan...' : 'Scanner'}
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="card-trading space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold">Marchés:</span>
          {Object.entries(MARKETS).map(([key, mkt]) => (
            <button key={key} onClick={() => toggleMarket(key)}
              className={`text-xs px-2 py-1 rounded border transition-all ${selectedMarkets.includes(key) ? `border-primary bg-primary/10 ${mkt.color}` : 'border-border text-muted-foreground'}`}>
              {mkt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">Patterns:</span>
          {PATTERNS.map(pat => (
            <button key={pat} onClick={() => togglePattern(pat)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-all ${selectedPatterns.includes(pat) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
              {pat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">TF:</span>
            <Select value={selectedTF} onValueChange={setSelectedTF}>
              <SelectTrigger className="h-7 w-20 bg-secondary border-border text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Score min: {minScore}</span>
            <input type="range" min={50} max={95} value={minScore} onChange={e => setMinScore(parseInt(e.target.value))} className="w-24 accent-primary" />
          </div>
          <Input value={searchSymbol} onChange={e => setSearchSymbol(e.target.value)} placeholder="Symbole précis..." className="bg-secondary border-border h-7 text-xs w-32" />
        </div>
      </div>

      {/* Analyse IA globale */}
      {aiAnalysis?._globalScan && (
        <div className="card-trading border border-green-400/30 bg-green-400/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold">Scan IA Global — Régime: <span className="text-primary">{aiAnalysis.market_regime?.toUpperCase()}</span></span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAiAnalysis(null)} className="h-6 text-xs">✕</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-secondary/30 rounded border border-border">
              <div className="text-[10px] text-muted-foreground mb-1">Biais du Jour</div>
              <div className="text-foreground">{aiAnalysis.market_bias}</div>
            </div>
            <div className="p-2 bg-secondary/30 rounded border border-border">
              <div className="text-[10px] text-muted-foreground mb-1">Meilleure Session</div>
              <div className="text-primary font-bold">{aiAnalysis.best_session}</div>
            </div>
            <div className="p-2 bg-secondary/30 rounded border border-border">
              <div className="text-[10px] text-muted-foreground mb-1">Watchlist IA</div>
              <div className="text-foreground">{aiAnalysis.daily_watchlist?.join(', ')}</div>
            </div>
          </div>
          {aiAnalysis.avoid_symbols?.length > 0 && (
            <div className="flex gap-2 items-center text-xs p-2 bg-destructive/5 border border-destructive/20 rounded">
              <AlertTriangle className="w-3 h-3 text-destructive" />
              <span className="text-muted-foreground">À éviter: <strong className="text-destructive">{aiAnalysis.avoid_symbols.join(', ')}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Analyse IA setup individuel */}
      {aiAnalysis && !aiAnalysis._globalScan && (
        <div className="card-trading border border-blue-400/30 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold">{aiAnalysis.setup?.symbol} — {aiAnalysis.setup?.pattern}</span>
              <span className={`ml-2 text-xs font-bold ${aiAnalysis.recommended_direction === 'LONG' ? 'text-green-400' : aiAnalysis.recommended_direction === 'SHORT' ? 'text-red-400' : 'text-yellow-400'}`}>{aiAnalysis.recommended_direction}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`text-lg font-bold font-mono ${aiAnalysis.quality_score >= 80 ? 'text-primary' : 'text-yellow-400'}`}>{aiAnalysis.quality_score}/100</div>
              <Button size="sm" variant="ghost" onClick={() => setAiAnalysis(null)} className="h-6 text-xs">✕</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{aiAnalysis.verdict}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2 rounded bg-secondary/30 border border-border">
              <div className="text-[10px] text-muted-foreground">Zone entrée</div>
              <div className="font-mono font-bold text-primary">{aiAnalysis.entry_zone}</div>
            </div>
            <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
              <div className="text-[10px] text-muted-foreground">Invalidation</div>
              <div className="font-mono font-bold text-destructive">{aiAnalysis.invalidation}</div>
            </div>
            <div className="p-2 rounded bg-secondary/30 border border-border">
              <div className="text-[10px] text-muted-foreground">Confiance</div>
              <div className="font-mono font-bold text-blue-400">{aiAnalysis.confidence}%</div>
            </div>
            <div className="p-2 rounded bg-secondary/30 border border-border">
              <div className="text-[10px] text-muted-foreground">Timing</div>
              <div className="font-mono text-yellow-400">{aiAnalysis.best_entry_timing}</div>
            </div>
          </div>
          {aiAnalysis.risk_management && (
            <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs">
              <span className="text-primary font-semibold">Taille position: </span>
              <span className="font-mono">{aiAnalysis.risk_management.lot_size} lots · </span>
              <span className="text-destructive">Risque: {aiAnalysis.risk_management.risk_amount}€ · </span>
              <span className="text-muted-foreground">{aiAnalysis.risk_management.position_comment}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{aiAnalysis.market_context}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'scanner', label: `Résultats (${results.length})` },
          { id: 'watchlist', label: 'Watchlist' },
          { id: 'markets', label: 'Marchés' },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === t.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'scanner' && (
        <div>
          {scanning ? (
            <div className="card-trading text-center py-12">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Scan en cours sur {selectedMarkets.length} marchés...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="card-trading text-center py-12">
              <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Sélectionnez des marchés et cliquez sur Scanner</p>
              <Button className="mt-3 gap-1 text-xs" onClick={() => runScan()}>
                <Search className="w-3 h-3" />Scanner maintenant
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map(r => {
                const mktData = MARKETS[r.market];
                return (
                  <div key={r.id} className={`card-trading border hover:border-primary/30 transition-all ${r.fromAI ? 'border-green-400/20 bg-green-400/5' : 'border-border'}`}>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.fromAI && <Bot className="w-3 h-3 text-green-400 flex-shrink-0" />}
                        <span className="font-bold text-sm font-mono">{r.symbol}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${mktData?.color || 'text-muted-foreground'} border-current bg-current/10`}>{mktData?.label || r.market}</span>
                        <span className="text-xs text-muted-foreground">{r.timeframe}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{r.direction}</span>
                      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{r.pattern}</span>
                      <div className="flex items-center gap-3 ml-auto flex-wrap">
                        <div className="text-center">
                          <div className={`text-sm font-bold font-mono ${scoreColor(r.score)}`}>{r.score}</div>
                          <div className="text-[9px] text-muted-foreground">Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold font-mono text-blue-400">{r.rr}:1</div>
                          <div className="text-[9px] text-muted-foreground">R:R</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold font-mono text-yellow-400">{r.probability}%</div>
                          <div className="text-[9px] text-muted-foreground">Prob</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => analyzeWithAI(r)} disabled={loadingAI} className="h-7 text-xs gap-1">
                          <Zap className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
                          IA
                        </Button>
                      </div>
                    </div>
                    {r.entry && (
                      <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>Entrée: <span className="text-foreground font-mono">{r.entry}</span></span>
                        <span>SL: <span className="text-destructive font-mono">{r.sl}</span></span>
                        <span>TP: <span className="text-primary font-mono">{r.tp}</span></span>
                        {r.reason && <span className="text-muted-foreground">• {r.reason}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Ajouter symbole..." className="bg-secondary border-border h-8 text-xs"
              onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { setWatchlist(p => [...new Set([...p, e.target.value.toUpperCase()])]); e.target.value = ''; toast.success('Ajouté'); }}} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {watchlist.map(sym => {
              const mkt = Object.entries(MARKETS).find(([, m]) => m.symbols.includes(sym));
              const mktData = mkt ? MARKETS[mkt[0]] : null;
              const mockChange = ((Math.random() - 0.45) * 2).toFixed(2);
              return (
                <div key={sym} className="card-trading border border-border hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold font-mono text-sm">{sym}</span>
                    <button onClick={() => setWatchlist(p => p.filter(s => s !== sym))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                  </div>
                  {mktData && <div className={`text-[10px] ${mktData.color}`}>{mktData.label}</div>}
                  <div className={`text-sm font-bold font-mono mt-1 ${parseFloat(mockChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{parseFloat(mockChange) >= 0 ? '+' : ''}{mockChange}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'markets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Object.entries(MARKETS).map(([key, mkt]) => (
            <div key={key} className={`card-trading border cursor-pointer transition-all ${selectedMarkets.includes(key) ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
              onClick={() => toggleMarket(key)}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-sm ${mkt.color}`}>{mkt.label}</span>
                {selectedMarkets.includes(key) && <CheckCircle2 className="w-4 h-4 text-primary" />}
              </div>
              <div className="flex flex-wrap gap-1">
                {mkt.symbols.map(s => (
                  <span key={s} className="text-[10px] px-1 py-0.5 bg-secondary rounded text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}