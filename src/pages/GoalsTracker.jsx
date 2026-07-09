import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { Target, Plus, Trash2, TrendingUp, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GoalsTracker() {
  const [goals, setGoals] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoal, setNewGoal] = useState({ name: '', target: 0, type: 'pnl' });

  useEffect(() => {
    Promise.all([
      base44.entities.Trade.list('-created_date', 500),
    ]).then(([tradeData]) => {
      setTrades((tradeData || []).filter(t => t.status === 'closed'));
      const saved = localStorage.getItem('trading_goals');
      if (saved) setGoals(JSON.parse(saved));
      else setGoals([
        { id: 1, name: 'PnL Mensuel', target: 5000, type: 'pnl' },
        { id: 2, name: 'Win Rate Target', target: 55, type: 'wr' },
        { id: 3, name: 'Max Trades/Jour', target: 3, type: 'max_trades' },
      ]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const progress = useMemo(() => {
    if (trades.length === 0) return [];
    const now = new Date();
    const monthTrades = trades.filter(t => {
      const d = new Date(t.entry_time || t.created_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const wins = monthTrades.filter(t => t.result === 'win').length;
    const totalPnL = monthTrades.reduce((a, t) => a + (t.pnl || 0), 0);
    const wr = monthTrades.length > 0 ? (wins / monthTrades.length) * 100 : 0;
    const tradesToday = trades.filter(t => {
      const d = new Date(t.entry_time || t.created_date);
      return d.toDateString() === now.toDateString();
    }).length;

    return goals.map(g => {
      let current = 0;
      if (g.type === 'pnl') current = totalPnL;
      else if (g.type === 'wr') current = wr;
      else if (g.type === 'max_trades') current = tradesToday;
      const pct = g.target > 0 ? Math.min((current / g.target) * 100, 100) : 0;
      return { ...g, current, pct, achieved: g.type === 'max_trades' ? current <= g.target : current >= g.target };
    });
  }, [goals, trades]);

  useEffect(() => { if (goals.length > 0) localStorage.setItem('trading_goals', JSON.stringify(goals)); }, [goals]);

  const addGoal = () => {
    if (newGoal.name && newGoal.target) {
      setGoals([...goals, { id: Date.now(), ...newGoal, target: +newGoal.target }]);
      setNewGoal({ name: '', target: 0, type: 'pnl' });
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Target className="w-8 h-8 text-primary" />
        <div><h1 className="text-2xl font-bold">Goals Tracker</h1><p className="text-sm text-muted-foreground">Suivi d'objectifs mensuels et quotidiens</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {progress.map(g => (
          <Card key={g.id} className={`card-trading ${g.achieved ? 'glow-green' : ''}`}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{g.type === 'pnl' ? 'PnL Mensuel' : g.type === 'wr' ? 'Win Rate' : 'Trades/Jour'}</span>
                {g.achieved && <Award className="w-4 h-4 text-primary" />}
              </div>
              <div className="font-bold text-sm mb-2">{g.name}</div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-2xl font-mono font-bold ${g.achieved ? 'text-primary' : g.type === 'max_trades' ? (g.current > g.target ? 'text-danger-red' : 'text-primary') : 'text-accent'}`}>{g.current.toFixed(g.type === 'wr' ? 1 : 0)}</span>
                <span className="text-sm text-muted-foreground">/ {g.target}</span>
              </div>
              <div className="progress-bar"><div className={`progress-bar-fill ${g.achieved ? 'bg-primary' : 'bg-accent'}`} style={{ width: `${g.pct}%` }}></div></div>
              <div className="text-xs text-muted-foreground mt-1">{g.pct.toFixed(0)}%</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Ajouter un objectif</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input placeholder="Nom" value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} />
            <Input type="number" placeholder="Cible" value={newGoal.target || ''} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} />
            <select className="h-9 bg-secondary border border-border rounded-md px-2 text-sm" value={newGoal.type} onChange={e => setNewGoal({ ...newGoal, type: e.target.value })}>
              <option value="pnl">PnL</option>
              <option value="wr">Win Rate %</option>
              <option value="max_trades">Max Trades/Jour</option>
            </select>
            <Button onClick={addGoal}><Plus className="w-4 h-4" /> Ajouter</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-trading">
        <CardHeader><CardTitle className="text-sm">Objectifs actifs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {goals.map(g => (
              <div key={g.id} className="flex items-center gap-3 p-3 rounded bg-secondary/50">
                <span className="font-bold text-sm flex-1">{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.type}</span>
                <span className="font-mono text-primary">{g.target}</span>
                <button onClick={() => setGoals(goals.filter(x => x.id !== g.id))}><Trash2 className="w-4 h-4 text-danger-red" /></button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}