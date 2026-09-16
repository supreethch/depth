export type Level = { price: string; amount: string }
export type Book = {
  id: string; source: 'live' | 'demo'; status: 'live' | 'stale' | 'demo';
  fetched_at: string | null; age_seconds: number | null; max_age_seconds: number;
  bids: Level[]; asks: Level[]; spread: string; available_quantity: string; available_notional: string;
}
export type Result = {
  budget: string; quantity: string; average_price: string | null; price_impact_pct: string | null;
  cash_for_bitcoin: string; fee: string; fee_bps: number; total_debit: string; unspent: string;
  levels_used: number; last_price: string | null; status: 'filled' | 'partial_depth' | 'below_precision';
  fills: { price: string; quantity: string; notional: string }[]; snapshot: Book;
}
const base = import.meta.env.VITE_API_URL || ''
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(base + path, { ...options, signal: options.signal ?? AbortSignal.timeout(15000) })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'The request could not be completed. Please try again.')
  }
  return response.json()
}
export const usd = (n: string | number | null, digits = 2) => n === null ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
