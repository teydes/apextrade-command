export default function StatCard({ label, value, sub, color = 'text-foreground', icon: Icon, glow }) {
  return (
    <div className={`card-trading ${glow ? `glow-${glow}` : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}