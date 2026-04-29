import { useState } from 'react';
import { Wallet, TrendingUp, Target, Plus, Trash2, ArrowUpRight, ArrowDownRight, ShoppingCart, Monitor, Wifi } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const initialDebts = [
  { id: 1, name: 'Compte MFF 50K', amount: 480, priority: 1, type: 'propfirm', paid: false, dueDate: 'Avant trading' },
  { id: 2, name: 'TradingView Pro+ (CME Group)', amount: 60, priority: 2, type: 'tool', paid: false, dueDate: 'Mensuel' },
  { id: 3, name: 'VPS / Hébergement bot', amount: 20, priority: 3, type: 'infra', paid: false, dueDate: 'Mensuel' },
];

const initialPayouts = [
  { id: 1, date: '2024-05-01', propfirm: 'MFF', gross: 2500, net: 2250, reinvested: 1800, withdrawn: 450 },
];

// Besoins hebdomadaires pour fonctionner au maximum
const weeklyNeeds = [
  { category: 'PC de Trading', items: [
    { name: 'PC Trading haute perf (i9 / Ryzen 9, 32GB RAM, SSD NVMe)', cost: 1800, type: 'one-time', priority: 'critique', note: 'Pour éviter les lags sur NQ Futures Footprint' },
    { name: 'Écran 27" 144Hz (double setup)', cost: 400, type: 'one-time', priority: 'haute', note: '2 écrans : graphiques + carnet ordres' },
  ]},
  { category: 'Connectivité', items: [
    { name: 'Starlink (abonnement mensuel)', cost: 50, type: 'monthly', priority: 'critique', note: 'Connexion stable < 20ms de latence' },
    { name: 'Fibre de secours (4G/5G backup)', cost: 20, type: 'monthly', priority: 'haute', note: 'Failover si Starlink KO pendant un trade ouvert' },
  ]},
  { category: 'Logiciels & Abonnements', items: [
    { name: 'TradingView Pro+ (CME Group dxFeed)', cost: 60, type: 'monthly', priority: 'critique', note: 'Source data NQ Futures — déjà actif' },
    { name: 'Quantower (licence Standard)', cost: 30, type: 'monthly', priority: 'critique', note: 'Plateforme d\'exécution principale' },
    { name: 'Logiciel Copy Trading (TraderEvolution / TradeSmart)', cost: 80, type: 'monthly', priority: 'haute', note: 'Pour répliquer sur 10-15 comptes en simultané' },
    { name: 'VPS OVH (bot Python 24/7)', cost: 20, type: 'monthly', priority: 'haute', note: 'Héberger le script Ghost Trader' },
    { name: 'News Feed (Benzinga / Économique temps réel)', cost: 25, type: 'monthly', priority: 'moyenne', note: 'Alertes FOMC, CPI, NFP avant le marché' },
  ]},
  { category: 'Propfirms (scaling)', items: [
    { name: 'Compte MFF 50K #1 (sans évaluation)', cost: 480, type: 'one-time', priority: 'critique', note: 'Compte principal — déjà ciblé' },
    { name: 'Compte Tradefy 25K (éval)', cost: 150, type: 'one-time', priority: 'haute', note: 'À prendre après 1er payout MFF' },
    { name: 'Compte Lucid 25K', cost: 180, type: 'one-time', priority: 'haute', note: 'M3 — après validation stratégie' },
  ]},
];

const COLORS = ['#00FF88', '#0088FF', '#F59E0B', '#EF4444'];
const typeColors = { propfirm: 'text-primary', tool: 'text-blue-400', infra: 'text-yellow-400', other: 'text-muted-foreground' };
const priorityColors = { critique: 'text-red-400', haute: 'text-yellow-400', moyenne: 'text-blue-400' };

export default function Bank() {
  const [debts, setDebts] = useState(initialDebts);
  const [payouts] = useState(initialPayouts);
  const [newDebt, setNewDebt] = useState({ name: '', amount: '' });
  const [activeTab, setActiveTab] = useState('debts'); // debts | payouts | needs

  const togglePaid = (id) => setDebts(prev => prev.map(d => d.id === id ? { ...d, paid: !d.paid } : d));
  const removeDebt = (id) => setDebts(prev => prev.filter(d => d.id !== id));
  const addDebt = () => {
    if (!newDebt.name || !newDebt.amount) return;
    setDebts(prev => [...prev, { id: Date.now(), name: newDebt.name, amount: parseFloat(newDebt.amount), priority: prev.length + 1, type: 'other', paid: false, dueDate: '-' }]);
    setNewDebt({ name: '', amount: '' });
  };

  const totalDebt = debts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0);
  const totalPayoutsNet = payouts.reduce((s, p) => s + p.net, 0);
  const totalReinvested = payouts.reduce((s, p) => s + p.reinvested, 0);
  const totalWithdrawn = payouts.reduce((s, p) => s + p.withdrawn, 0);

  const pieData = [
    { name: 'Réinvesti', value: totalReinvested },
    { name: 'Retiré', value: totalWithdrawn },
    { name: 'Dettes restantes', value: totalDebt },
  ];

  const monthlyTotal = weeklyNeeds.flatMap(c => c.items).filter(i => i.type === 'monthly').reduce((s, i) => s + i.cost, 0);
  const oneTimeTotal = weeklyNeeds.flatMap(c => c.items).filter(i => i.type === 'one-time').reduce((s, i) => s + i.cost, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-yellow-400" />
        <div>
          <h1 className="text-xl font-bold">Banque & Remboursements</h1>
          <p className="text-xs text-muted-foreground">Dettes · Historique payouts · Besoins hebdomadaires</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-trading text-center">
          <div className="text-xs text-muted-foreground mb-1">Total Payouts</div>
          <div className="text-xl font-bold font-mono text-primary">{totalPayoutsNet}€</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-xs text-muted-foreground mb-1">Dettes restantes</div>
          <div className="text-xl font-bold font-mono text-red-400">{totalDebt}€</div>
        </div>
        <div className="card-trading text-center">
          <div className="text-xs text-muted-foreground mb-1">Solde net</div>
          <div className={`text-xl font-bold font-mono ${totalPayoutsNet - totalDebt >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {totalPayoutsNet - totalDebt}€
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'debts', label: '💳 Dettes & Priorités' },
          { id: 'payouts', label: '💰 Historique Payouts' },
          { id: 'needs', label: '🛒 Besoins Hebdo' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-all ${activeTab === tab.id ? 'tab-active' : 'text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB : Dettes */}
      {activeTab === 'debts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-trading">
            <div className="text-sm font-semibold mb-3">Dettes & Priorités de remboursement</div>
            <div className="space-y-2">
              {debts.sort((a, b) => a.priority - b.priority).map(debt => (
                <div key={debt.id} className={`flex items-center gap-2 p-2.5 rounded text-xs ${debt.paid ? 'opacity-40' : 'bg-secondary/40'}`}>
                  <input type="checkbox" checked={debt.paid} onChange={() => togglePaid(debt.id)} className="accent-primary" />
                  <div className="flex-1">
                    <div className={`font-medium ${debt.paid ? 'line-through' : ''}`}>{debt.name}</div>
                    <div className={`text-[10px] ${typeColors[debt.type]}`}>{debt.type} · Échéance: {debt.dueDate}</div>
                  </div>
                  <span className={`font-mono font-bold text-sm ${debt.paid ? 'text-muted-foreground' : 'text-red-400'}`}>{debt.amount}€</span>
                  <span className="text-[10px] text-muted-foreground">#{debt.priority}</span>
                  <button onClick={() => removeDebt(debt.id)} className="text-muted-foreground hover:text-destructive ml-1"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Input placeholder="Nom de la dette" value={newDebt.name} onChange={e => setNewDebt(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs bg-secondary border-border" />
              <Input placeholder="Montant €" type="number" value={newDebt.amount} onChange={e => setNewDebt(p => ({ ...p, amount: e.target.value }))} className="h-7 text-xs bg-secondary border-border w-24" />
              <Button size="sm" className="h-7 px-2" onClick={addDebt}><Plus className="w-3 h-3" /></Button>
            </div>
          </div>

          <div className="card-trading">
            <span className="text-xs font-semibold block mb-3">Allocation des Gains</span>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f1625', border: '1px solid #1e293b', borderRadius: 6, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-mono">{d.value}€</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB : Historique Payouts */}
      {activeTab === 'payouts' && (
        <div className="space-y-3">
          {payouts.length === 0 ? (
            <div className="card-trading text-center py-8 text-muted-foreground text-xs">Aucun payout reçu — En attente du 1er payout MFF</div>
          ) : payouts.map((p, i) => (
            <div key={i} className="card-trading text-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm">{p.propfirm}</span>
                <span className="text-muted-foreground">{p.date}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2 rounded bg-secondary/40 text-center">
                  <div className="text-muted-foreground text-[10px]">Brut</div>
                  <div className="font-mono font-bold">{p.gross}€</div>
                </div>
                <div className="p-2 rounded bg-primary/5 border border-primary/20 text-center">
                  <div className="text-muted-foreground text-[10px]">Net (90%)</div>
                  <div className="font-mono font-bold text-primary">{p.net}€</div>
                </div>
                <div className="p-2 rounded bg-green-400/5 text-center">
                  <div className="text-muted-foreground text-[10px] flex items-center justify-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-400" />Réinvesti</div>
                  <div className="font-mono font-bold text-green-400">{p.reinvested}€</div>
                </div>
                <div className="p-2 rounded bg-yellow-400/5 text-center">
                  <div className="text-muted-foreground text-[10px] flex items-center justify-center gap-1"><ArrowDownRight className="w-3 h-3 text-yellow-400" />Retiré</div>
                  <div className="font-mono font-bold text-yellow-400">{p.withdrawn}€</div>
                </div>
              </div>
            </div>
          ))}

          {/* Plan après 1er payout — séparé */}
          <div className="card-trading border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Plan d'allocation après 1er Payout MFF</span>
            </div>
            <div className="space-y-2 text-xs">
              {[
                { pct: '30%', action: 'Rembourser dettes prioritaires (MFF 480€, TV 60€)', color: 'text-red-400' },
                { pct: '30%', action: 'Ouvrir 2e compte Tradefy 25K (éval ~150€) + Lucid', color: 'text-blue-400' },
                { pct: '20%', action: 'Acheter VPS OVH + logiciel copy trading', color: 'text-yellow-400' },
                { pct: '20%', action: 'Réserve de sécurité (1 mois de charges fixes)', color: 'text-primary' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-secondary/30">
                  <span className={`font-bold font-mono text-sm w-10 flex-shrink-0 ${item.color}`}>{item.pct}</span>
                  <span className="text-muted-foreground">{item.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB : Besoins Hebdomadaires */}
      {activeTab === 'needs' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="card-trading text-center border border-yellow-400/20">
              <div className="text-xs text-muted-foreground mb-1">Charges fixes/mois</div>
              <div className="text-2xl font-bold font-mono text-yellow-400">{monthlyTotal}€</div>
            </div>
            <div className="card-trading text-center border border-blue-400/20">
              <div className="text-xs text-muted-foreground mb-1">Investissements one-time</div>
              <div className="text-2xl font-bold font-mono text-blue-400">{oneTimeTotal}€</div>
            </div>
          </div>

          {weeklyNeeds.map((cat, ci) => (
            <div key={ci} className="card-trading">
              <div className="flex items-center gap-2 mb-3">
                {ci === 0 && <Monitor className="w-4 h-4 text-blue-400" />}
                {ci === 1 && <Wifi className="w-4 h-4 text-green-400" />}
                {ci === 2 && <ShoppingCart className="w-4 h-4 text-yellow-400" />}
                {ci === 3 && <Target className="w-4 h-4 text-primary" />}
                <span className="text-sm font-semibold">{cat.category}</span>
              </div>
              <div className="space-y-2">
                {cat.items.map((item, ii) => (
                  <div key={ii} className={`p-2.5 rounded border text-xs ${item.priority === 'critique' ? 'border-red-400/20 bg-red-400/5' : item.priority === 'haute' ? 'border-yellow-400/20 bg-yellow-400/5' : 'border-border bg-secondary/20'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-muted-foreground mt-0.5">{item.note}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`font-mono font-bold ${item.type === 'monthly' ? 'text-yellow-400' : 'text-blue-400'}`}>{item.cost}€</div>
                        <div className={`text-[10px] ${priorityColors[item.priority]}`}>{item.priority}</div>
                        <div className="text-[10px] text-muted-foreground">{item.type === 'monthly' ? '/mois' : 'unique'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}