import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Star, CheckCircle2, XCircle, Brain, TrendingUp, Shield, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const FIRMS = [
  { name: 'MFF (My Forex Funds)', daily_dd: 5, max_dd: 12, profit_target: 8, consistency: 30, payout: 80, min_days: 5, trailing: false, news: true, evals: 2, sizes: [10,25,50,100,200], traps: ['Trailing DD sur peak equity','Clôture weekend'], score: 85 },
  { name: 'FTMO', daily_dd: 5, max_dd: 10, profit_target: 10, consistency: 0, payout: 80, min_days: 10, trailing: false, news: true, evals: 2, sizes: [10,25,50,100,200], traps: ['Min 10 jours de trading','Règle weekly DD'], score: 88 },
  { name: 'Topstep', daily_dd: 3, max_dd: 6, profit_target: 6, consistency: 0, payout: 90, min_days: 1, trailing: true, news: false, evals: 1, sizes: [50,100,150], traps: ['Trailing DD dès le début','News bloquées'], score: 72 },
  { name: 'Apex Trader', daily_dd: 3, max_dd: 6, profit_target: 6, consistency: 0, payout: 90, min_days: 1, trailing: true, news: false, evals: 1, sizes: [25,50,100,150,250], traps: ['Trailing DD','Pas de news'], score: 75 },
  { name: 'True Forex Funds', daily_dd: 5, max_dd: 10, profit_target: 8, consistency: 0, payout: 75, min_days: 0, trailing: false, news: true, evals: 2, sizes: [10,25,50,100,200], traps: ['Fees élevés'], score: 78 },
  { name: 'The5ers', daily_dd: 4, max_dd: 6, profit_target: 8, consistency: 0, payout: 100, min_days: 0, trailing: false, news: true, evals: 1, sizes: [20,40,80], traps: ['Taille de compte limitée','Croissance lente'], score: 80 },
  { name: 'Funded Next', daily_dd: 5, max_dd: 10, profit_target: 10, consistency: 0, payout: 85, min_days: 0, trailing: false, news: true, evals: 2, sizes: [15,25,50,100,200], traps: ['Risque relatif drawdown'], score: 76 },
  { name: 'E8 Markets', daily_dd: 5, max_dd: 8, profit_target: 8, consistency: 30, payout: 80, min_days: 0, trailing: false, news: true, evals: 2, sizes: [25,50,100,250], traps: ['Règle consistance 30%'], score: 79 },
];

export default function PropFirmComparator() {
  const [selected, setSelected] = useState(['MFF (My Forex Funds)', 'FTMO', 'Topstep']);
  const [aiComp, setAiComp] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [sortBy, setSortBy] = useState('score');

  const { data: trades = [] } = useQuery({ queryKey: ['comp-trades'], queryFn: () => base44.entities.Trade.list('-entry_time', 100) });

  const closedTrades = trades.filter(t => t.status === 'closed');
  const winRate = closedTrades.length > 0 ? Math.round(closedTrades.filter(t => t.result === 'win').length / closedTrades.length * 100) : 65;
  const avgRR = closedTrades.filter(t => t.risk_reward).reduce((s, t) => s + t.risk_reward, 0) / (closedTrades.filter(t => t.risk_reward).length || 1) || 2.1;

  const toggle = (name) => setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const displayFirms = FIRMS.filter(f => selected.includes(f.name)).sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'payout') return b.payout - a.payout;
    if (sortBy === 'dd') return b.daily_dd - a.daily_dd;
    return 0;
  });

  const compatibility = (firm) => {
    let score = 0;
    if (!firm.trailing) score += 25;
    if (firm.news) score += 15;
    if (firm.daily_dd >= 5) score += 20;
    if (firm.payout >= 80) score += 20;
    if (winRate >= 60) score += 10;
    if (avgRR >= 2) score += 10;
    return Math.min(score, 100);
  };

  const getAIComp = async () => {
    setLoadingAI(true);
    const firmsSummary = displayFirms.map(f => `${f.name}: DD ${f.daily_dd}%/${f.max_dd}%, Target ${f.profit_target}%, Payout ${f.payout}%, Trailing: ${f.trailing}`).join(' | ');
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Expert PropFirm trading. Mon profil: WR ${winRate}%, Avg R:R ${avgRR.toFixed(1)}, stratégie ICT/SMC NQ Futures, scalping day trading.
      
Firmes à comparer: ${firmsSummary}

Retourne JSON: {"winner":"<nom firme>","winner_reason":"<raison>","ranking":[{"name":"<n>","score":<0-100>,"pros":["<p>"],"cons":["<c>"],"fit":"excellent|good|average|poor"}],"red_flags":["<piège à éviter>"],"recommendation":"<conseil final>"}`,
      response_json_schema: { type: "object", properties: { winner: { type: "string" }, winner_reason: { type: "string" }, ranking: { type: "array", items: { type: "object", properties: { name: { type: "string" }, score: { type: "number" }, pros: { type: "array", items: { type: "string" } }, cons: { type: "array", items: { type: "string" } }, fit: { type: "string" } } } }, red_flags: { type: "array", items: { type: "string" } }, recommendation: { type: "string" } } }
    });
    setAiComp(res);
    setLoadingAI(false);
    toast.success(`IA recommande: ${res.winner}`);
  };

  const fitColor = { excellent: 'text-primary', good: 'text-green-400', average: 'text-yellow-400', poor: 'text-destructive' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-yellow-400" />
            Comparateur PropFirms
          </h1>
          <p className="text-xs text-muted-foreground">Comparaison objective · Compatibilité profil · Analyse IA · {FIRMS.length} firmes</p>
        </div>
        <div className="flex gap-2">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="h-8 px-2 rounded bg-secondary border border-border text-xs text-foreground">
            <option value="score">Trier: Score</option>
            <option value="payout">Trier: Payout</option>
            <option value="dd">Trier: Daily DD</option>
          </select>
          <Button size="sm" onClick={getAIComp} disabled={loadingAI || displayFirms.length === 0} className="gap-1 text-xs">
            <Brain className={`w-3 h-3 ${loadingAI ? 'animate-spin' : ''}`} />
            Analyse IA
          </Button>
        </div>
      </div>

      {/* Mon profil */}
      <div className="card-trading border border-blue-400/20 bg-blue-400/5">
        <div className="text-xs font-semibold text-blue-400 mb-2">Mon Profil Trading</div>
        <div className="flex gap-4 flex-wrap text-xs">
          <span>Win Rate: <strong className={winRate >= 60 ? 'text-primary' : 'text-yellow-400'}>{winRate}%</strong></span>
          <span>Avg R:R: <strong className="text-blue-400">{avgRR.toFixed(1)}:1</strong></span>
          <span>Trades analysés: <strong className="text-foreground">{closedTrades.length}</strong></span>
          <span>Style: <strong className="text-foreground">ICT/SMC · Scalping NQ</strong></span>
        </div>
      </div>

      {/* Sélecteur de firmes */}
      <div className="flex flex-wrap gap-2">
        {FIRMS.map(f => (
          <button key={f.name} onClick={() => toggle(f.name)}
            className={`text-xs px-2 py-1 rounded border transition-all ${selected.includes(f.name) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}>
            {f.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Tableau comparatif */}
      {displayFirms.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-2 pr-3">Firme</th>
                <th className="text-center py-2 px-2">Daily DD</th>
                <th className="text-center py-2 px-2">Max DD</th>
                <th className="text-center py-2 px-2">Cible</th>
                <th className="text-center py-2 px-2">Payout</th>
                <th className="text-center py-2 px-2">Trailing</th>
                <th className="text-center py-2 px-2">News</th>
                <th className="text-center py-2 px-2">Compat.</th>
                <th className="text-center py-2 px-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {displayFirms.map(f => {
                const compat = compatibility(f);
                const aiRank = aiComp?.ranking?.find(r => r.name === f.name);
                return (
                  <tr key={f.name} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="font-semibold">{f.name}</div>
                      {aiRank && <div className={`text-[10px] ${fitColor[aiRank.fit]}`}>IA: {aiRank.fit}</div>}
                    </td>
                    <td className="text-center py-2 px-2 font-mono">{f.daily_dd}%</td>
                    <td className="text-center py-2 px-2 font-mono">{f.max_dd}%</td>
                    <td className="text-center py-2 px-2 font-mono text-yellow-400">{f.profit_target}%</td>
                    <td className="text-center py-2 px-2 font-mono text-primary">{f.payout}%</td>
                    <td className="text-center py-2 px-2">{f.trailing ? <XCircle className="w-3.5 h-3.5 text-destructive mx-auto" /> : <CheckCircle2 className="w-3.5 h-3.5 text-primary mx-auto" />}</td>
                    <td className="text-center py-2 px-2">{f.news ? <CheckCircle2 className="w-3.5 h-3.5 text-primary mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-destructive mx-auto" />}</td>
                    <td className="text-center py-2 px-2">
                      <div className={`font-bold font-mono ${compat >= 70 ? 'text-primary' : compat >= 50 ? 'text-yellow-400' : 'text-destructive'}`}>{compat}%</div>
                    </td>
                    <td className="text-center py-2 px-2">
                      <div className="flex items-center gap-1 justify-center">
                        <Star className="w-3 h-3 text-yellow-400" />
                        <span className="font-bold font-mono">{f.score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pièges */}
      <div className="card-trading">
        <div className="text-xs font-semibold mb-2 text-destructive">⚠️ Pièges Identifiés</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {displayFirms.map(f => f.traps.map((trap, i) => (
            <div key={`${f.name}-${i}`} className="flex items-start gap-2 text-xs p-2 bg-destructive/5 border border-destructive/20 rounded">
              <XCircle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
              <div><span className="font-semibold text-destructive">{f.name.split(' ')[0]}: </span><span className="text-muted-foreground">{trap}</span></div>
            </div>
          )))}
        </div>
      </div>

      {aiComp && (
        <div className="card-trading border border-yellow-400/30 bg-yellow-400/5 space-y-3">
          <div className="flex items-center gap-3">
            <Brain className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold">Recommandation IA</span>
            <span className="ml-auto text-sm font-bold text-primary">{aiComp.winner}</span>
          </div>
          <p className="text-xs text-muted-foreground">{aiComp.winner_reason}</p>
          {aiComp.red_flags?.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-destructive font-semibold uppercase">Red Flags</div>
              {aiComp.red_flags.map((f, i) => <div key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-destructive/50">⚠️ {f}</div>)}
            </div>
          )}
          <div className="p-2 bg-primary/5 border border-primary/20 rounded text-xs">
            <span className="text-primary font-semibold">Conseil final: </span>
            <span className="text-muted-foreground">{aiComp.recommendation}</span>
          </div>
        </div>
      )}
    </div>
  );
}