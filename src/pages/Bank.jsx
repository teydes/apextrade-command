import { useState } from 'react';
import { Wallet, TrendingUp, Target, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const initialDebts = [
  { id: 1, name: 'Compte MFF 50K', amount: 480, priority: 1, type: 'propfirm', paid: false },
  { id: 2, name: 'VPS Server', amount: 20, priority: 2, type: 'infra', paid: false },
  { id: 3, name: 'TradingView Pro', amount: 60, priority: 3, type: 'tool', paid: false },
];

const payouts = [
  { date: '2024-05-01', propfirm: 'MFF', gross: 2500, net: 2250, reinvested: 1800, withdrawn: 450 },
];

const COLORS = ['#00FF88', '#0088FF', '#F59E0B', '#EF4444'];

export default function Bank() {
  const [debts, setDebts] = useState(initialDebts);
  const [newDebt, setNewDebt] = useState({ name: '', amount: '' });
  const [totalPayouts] = useState(2250);
  const [totalReinvested] = useState(1800);
  const [totalWithdrawn] = useState(450);

  const togglePaid = (id) => setDebts(prev => prev.map(d => d.id === id ? { ...d, paid: !d.paid } : d));
  const removeDebt = (id) => setDebts(prev => prev.filter(d => d.id !== id));
  const addDebt = () => {
    if (!newDebt.name || !newDebt.amount) return;
    setDebts(prev => [...prev, { id: Date.now(), name: newDebt.name, amount: parseFloat(newDebt.amount), priority: prev.length + 1, type: 'other', paid: false }]);
    setNewDebt({ name: '', amount: '' });
  };

  const totalDebt = debts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0);
  const pieData = [
    { name: 'Réinvesti', value: totalReinvested },
    { name: 'Retiré', value: totalWithdrawn },
    { name: 'Dettes', value: totalDebt },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-yellow-400" />
        <div>
          <h1 className="text-xl font-bold">Banque & Remboursements</h1>
          <p className="text-xs text-muted-foreground">Gestion des dettes, priorités et allocation des payouts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Summary */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-trading text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Payouts</div>
              <div className="text-xl font-bold font-mono text-primary">{totalPayouts}€</div>
            </div>
            <div className="card-trading text-center">
              <div className="text-xs text-muted-foreground mb-1">Dettes restantes</div>
              <div className="text-xl font-bold font-mono text-red-400">{totalDebt}€</div>
            </div>
          </div>
          <div className="card-trading">
            <span className="text-xs font-semibold block mb-3">Allocation des Gains</span>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-mono">{d.value}€</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Debts */}
        <div className="card-trading">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Dettes & Priorités</span>
          </div>
          <div className="space-y-2">
            {debts.sort((a, b) => a.priority - b.priority).map(debt => (
              <div key={debt.id} className={`flex items-center gap-2 p-2 rounded text-xs ${debt.paid ? 'opacity-40' : 'bg-secondary/40'}`}>
                <input type="checkbox" checked={debt.paid} onChange={() => togglePaid(debt.id)} className="accent-primary" />
                <div className="flex-1">
                  <div className={`font-medium ${debt.paid ? 'line-through' : ''}`}>{debt.name}</div>
                  <div className="text-muted-foreground capitalize">{debt.type}</div>
                </div>
                <span className={`font-mono font-bold ${debt.paid ? 'text-muted-foreground' : 'text-red-400'}`}>{debt.amount}€</span>
                <button onClick={() => removeDebt(debt.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input placeholder="Nom" value={newDebt.name} onChange={e => setNewDebt(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs bg-secondary border-border" />
            <Input placeholder="€" type="number" value={newDebt.amount} onChange={e => setNewDebt(p => ({ ...p, amount: e.target.value }))} className="h-7 text-xs bg-secondary border-border w-20" />
            <Button size="sm" className="h-7 text-xs px-2" onClick={addDebt}><Plus className="w-3 h-3" /></Button>
          </div>
        </div>

        {/* Payout history */}
        <div className="card-trading">
          <span className="text-sm font-semibold block mb-3">Historique Payouts</span>
          {payouts.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">Aucun payout reçu</div>
          ) : (
            payouts.map((p, i) => (
              <div key={i} className="p-3 rounded bg-secondary/40 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold">{p.propfirm}</span>
                  <span className="text-muted-foreground">{p.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div><span className="text-muted-foreground">Brut: </span><span className="font-mono text-foreground">{p.gross}€</span></div>
                  <div><span className="text-muted-foreground">Net (90%): </span><span className="font-mono text-primary">{p.net}€</span></div>
                  <div className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-400" /><span className="text-muted-foreground">Réinvesti: </span><span className="font-mono text-green-400">{p.reinvested}€</span></div>
                  <div className="flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-yellow-400" /><span className="text-muted-foreground">Retiré: </span><span className="font-mono text-yellow-400">{p.withdrawn}€</span></div>
                </div>
              </div>
            ))
          )}

          {/* Strategy tip */}
          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded text-xs">
            <div className="font-semibold text-primary mb-1">💡 Stratégie après 1er Payout (200€)</div>
            <div className="text-muted-foreground space-y-1">
              <p>→ Rembourser les dettes prioritaires (560€)</p>
              <p>→ Acheter un VPS OVH pour bot 24/7</p>
              <p>→ Réinvestir 80% en 2e compte MFF</p>
              <p>→ Garder 20% en réserve de sécurité</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}