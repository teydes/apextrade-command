import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Play, Pause, RotateCcw, Plus, TrendingUp, Target, Percent } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatCard from '@/components/shared/StatCard';
import { toast } from 'sonner';

const mockEquity = [
  { t: '01/04', eq: 50000, dd: 0 }, { t: '03/04', eq: 50450, dd: -120 },
  { t: '05/04', eq: 50180, dd: -280 }, { t: '07/04', eq: 51200, dd: -90 },
  { t: '09/04', eq: 51800, dd: -60 }, { t: '11/04', eq: 51650, dd: -200 },
  { t: '13/04', eq: 52400, dd: -40 }, { t: '15/04', eq: 53100, dd: -10 },
];

const tradeLogs = [
  { id: 1, date: '2024-04-01', time: '09:47', setup: 'ICT OB + FVG', dir: 'LONG', entry: 19820, sl: 19795, tp1: 19850, tp2: 19875, pnl: 320, rr: 2.4, result: 'win', mistake: null },
  { id: 2, date: '2024-04-01', time: '10:22', setup: 'BOS + CHoCH', dir: 'SHORT', entry: 19865, sl: 19890, tp1: 19835, tp2: 19810, pnl: -95, rr: 1.2, result: 'loss', mistake: 'Entry trop tôt, pas de confirmation' },
  { id: 3, date: '2024-04-02', time: '14:05', setup: 'AMD Expansion', dir: 'LONG', entry: 19780, sl: 19760, tp1: 19820, tp2: 19860, pnl: 540, rr: 3.0, result: 'win', mistake: null },
  { id: 4, date: '2024-04-02', time: '15:15', setup: 'IFVG Fill', dir: 'SHORT', entry: 19845, sl: 19860, tp1: 19820, tp2: 19800, pnl: 210, rr: 1.8, result: 'win', mistake: null },
];

export default function Backtest() {
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTrade, setNewTrade] = useState({ symbol: 'NQ1!', direction: 'LONG', setup: '', pnl: '', rr: '', result: 'win', mistakes: '', improvements: '' });
  const qc = useQueryClient();

  const { data: trades = [] } = useQuery({
    queryKey: ['backtest-trades'],
    queryFn: () => base44.entities.Trade.filter({ phase: 'backtest_local' }, '-created_date', 50)
  });

  const addTrade = useMutation({
    mutationFn: (d) => base44.entities.Trade.create({ ...d, phase: 'backtest_local', pnl: parseFloat(d.pnl), rr: parseFloat(d.rr) }),
    onSuccess: () => { qc.invalidateQueries(['backtest-trades']); setShowAddTrade(false); toast.success('Trade ajouté'); }
  });

  const allTrades = [...tradeLogs, ...trades.map((t, i) => ({ ...t, id: `db-${i}` }))];
  const wins = allTrades.filter(t => t.result === 'win').length;
  const losses = allTrades.filter(t => t.result === 'loss').length;
  const totalPnl = allTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winRate = allTrades.length ? ((wins / allTrades.length) * 100).toFixed(1) : 0;
  const avgRR = allTrades.length ? (allTrades.reduce((s, t) => s + (t.rr || 0), 0) / allTrades.length).toFixed(2) : 0;

  const filtered = filter === 'all' ? allTrades : allTrades.filter(t => t.result === filter);

  const isReadyForDemo = parseFloat(winRate) >= 60 && totalPnl > 500;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Backtest 24/7 — Local
          </h1>
          <p className="text-xs text-muted-foreground">Validation obligatoire avant passage en Demo MFF</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium ${isReadyForDemo ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {isReadyForDemo ? '✅ Prêt pour Demo' : '⏳ Validation en cours...'}
          </div>
          <Button size="sm" variant={running ? 'destructive' : 'default'} onClick={() => setRunning(!running)} className="gap-2">
            {running ? <><Pause className="w-3.5 h-3.5" />Pause</> : <><Play className="w-3.5 h-3.5" />Lancer</>}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Trades Total" value={allTrades.length} icon={Target} />
        <StatCard label="Win Rate" value={`${winRate}%`} color={parseFloat(winRate) >= 60 ? 'text-green-400' : 'text-red-400'} icon={Percent} />
        <StatCard label="P&L Total" value={`${totalPnl >= 0 ? '+' : ''}${totalPnl}€`} color={totalPnl >= 0 ? 'text-green-400' : 'text-red-400'} icon={TrendingUp} />
        <StatCard label="Avg R:R" value={`${avgRR}:1`} color="text-blue-400" />
        <StatCard label="Wins / Losses" value={`${wins}W / ${losses}L`} />
      </div>

      {/* Equity curve */}
      <div className="card-trading">
        <span className="text-sm font-semibold block mb-3">Courbe d'Équité — Backtest Local</span>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={mockEquity}>
            <defs>
              <linearGradient id="btGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF88" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00FF88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }} />
            <Area type="monotone" dataKey="eq" stroke="#00FF88" fill="url(#btGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trade Log */}
      <div className="card-trading">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Journal des Trades</span>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {['all', 'win', 'loss', 'breakeven'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs px-2 py-1 rounded ${filter === f ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {f}
                </button>
              ))}
            </div>
            <Dialog open={showAddTrade} onOpenChange={setShowAddTrade}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 text-xs"><Plus className="w-3 h-3" />Ajouter</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle>Ajouter un Trade Backtest</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { key: 'setup', label: 'Setup (OB, FVG...)' },
                    { key: 'pnl', label: 'P&L (€)', type: 'number' },
                    { key: 'rr', label: 'R:R Ratio', type: 'number' },
                    { key: 'mistakes', label: 'Erreurs identifiées' },
                    { key: 'improvements', label: 'Améliorations' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'mistakes' || f.key === 'improvements' ? 'col-span-2' : ''}>
                      <Label className="text-xs">{f.label}</Label>
                      <Input type={f.type || 'text'} value={newTrade[f.key]} onChange={e => setNewTrade(p => ({ ...p, [f.key]: e.target.value }))} className="bg-secondary border-border text-sm h-8 mt-1" />
                    </div>
                  ))}
                  <div>
                    <Label className="text-xs">Direction</Label>
                    <Select value={newTrade.direction} onValueChange={v => setNewTrade(p => ({ ...p, direction: v }))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="LONG">LONG</SelectItem><SelectItem value="SHORT">SHORT</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Résultat</Label>
                    <Select value={newTrade.result} onValueChange={v => setNewTrade(p => ({ ...p, result: v }))}>
                      <SelectTrigger className="h-8 mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="win">Win</SelectItem><SelectItem value="loss">Loss</SelectItem><SelectItem value="breakeven">Breakeven</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={() => addTrade.mutate(newTrade)} className="w-full mt-2">Enregistrer</Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                {['Heure', 'Setup', 'Direction', 'Entry', 'SL', 'TP1', 'P&L', 'R:R', 'Résultat', 'Erreur'].map(h => (
                  <th key={h} className="text-left py-2 pr-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2 pr-3 font-mono text-muted-foreground">{t.time || '--:--'}</td>
                  <td className="py-2 pr-3">{t.setup}</td>
                  <td className="py-2 pr-3"><span className={`px-1.5 py-0.5 rounded font-bold ${t.dir === 'LONG' || t.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.dir || t.direction}</span></td>
                  <td className="py-2 pr-3 font-mono">{t.entry || '--'}</td>
                  <td className="py-2 pr-3 font-mono text-red-400">{t.sl || t.stop_loss || '--'}</td>
                  <td className="py-2 pr-3 font-mono text-green-400">{t.tp1 || t.take_profit_1 || '--'}</td>
                  <td className={`py-2 pr-3 font-mono font-bold ${t.pnl > 0 ? 'text-green-400' : t.pnl < 0 ? 'text-red-400' : 'text-yellow-400'}`}>{t.pnl > 0 ? '+' : ''}{t.pnl}€</td>
                  <td className="py-2 pr-3 font-mono">{t.rr || '--'}:1</td>
                  <td className="py-2 pr-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.result === 'win' ? 'bg-green-500/20 text-green-400' : t.result === 'loss' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.result}</span>
                  </td>
                  <td className="py-2 text-muted-foreground max-w-[150px] truncate">{t.mistake || t.mistakes || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}