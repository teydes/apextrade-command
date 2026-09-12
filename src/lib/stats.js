// Helpers statistiques partagés
export const sum = (arr) => (arr || []).reduce((s, v) => s + (v || 0), 0);
export const mean = (arr) => (arr && arr.length ? sum(arr) / arr.length : 0);
export const std = (arr) => {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1));
};
export const sortByTime = (trades) =>
  [...(trades || [])].sort(
    (a, b) => new Date(a.entry_time || a.created_date || 0) - new Date(b.entry_time || b.created_date || 0)
  );
export const erf = (x) => {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-ax * ax);
  return sign * y;
};
export const normalCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
// Survie chi² via approximation Wilson-Hilferty (k = degrés de liberté)
export const chi2Surv = (x, k) =>
  x <= 0 ? 1 : 1 - normalCdf((Math.pow(x / k, 1 / 3) - (1 - 2 / (9 * k))) / Math.sqrt(2 / (9 * k)));
export const fmtEur = (v) => `${v >= 0 ? '+' : ''}${Math.round(v)}€`;
export const closedPnl = (trades) =>
  (trades || []).filter((t) => t.result === 'win' || t.result === 'loss' || t.result === 'breakeven');