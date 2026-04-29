export default function PnLGauge({ current, target, label }) {
  const pct = Math.min(100, Math.max(0, (current / target) * 100));
  const color = pct >= 100 ? '#00FF88' : pct >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="card-trading">
      <div className="flex justify-between text-xs text-muted-foreground mb-3">
        <span>{label}</span>
        <span className="font-mono">{pct.toFixed(0)}%</span>
      </div>

      {/* Arc gauge */}
      <div className="relative flex justify-center mb-2">
        <svg width="120" height="70" viewBox="0 0 120 70">
          <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#1e293b" strokeWidth="10" strokeLinecap="round" />
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${pct * 1.57} 157`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <text x="60" y="58" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color} fontFamily="JetBrains Mono">
            {current >= 0 ? '+' : ''}{current}€
          </text>
        </svg>
      </div>

      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">0€</span>
        <span style={{ color }} className="font-mono font-bold">{current >= 0 ? '+' : ''}{current}€</span>
        <span className="text-muted-foreground">{target}€</span>
      </div>
    </div>
  );
}