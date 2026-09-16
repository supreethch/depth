import { useState } from 'react'
import type { Book, Result } from './api'
import { usd } from './api'

export default function DepthChart({ book, result }: { book: Book; result: Result | null }) {
  const [hover, setHover] = useState<{ price: number; qty: number } | null>(null)
  const points = (side: Book['asks']) => {
    let total = 0
    return side.map(l => ({ price: Number(l.price), qty: total += Number(l.amount) }))
  }
  const bids = points(book.bids), asks = points(book.asks)
  const all = [...bids, ...asks]
  const min = Math.min(...all.map(p => p.price)), max = Math.max(...all.map(p => p.price))
  const ymax = Math.max(...all.map(p => p.qty)) * 1.15
  const x = (p: number) => 54 + (p - min) / (max - min || 1) * 640
  const y = (q: number) => 248 - q / ymax * 200
  const path = (ps: typeof asks) => `M${x(ps[0].price)},248 L${x(ps[0].price)},${y(ps[0].qty)} ` + ps.slice(1).map(p => `H${x(p.price)} V${y(p.qty)}`).join(' ')
  const area = (ps: typeof asks) => path(ps) + ` L${x(ps[ps.length - 1].price)},248 Z`
  const last = result?.last_price ? Number(result.last_price) : null
  return <div className="chart-wrap">
    <div className="chart-meta"><span>Cumulative quantity <b>BTC</b></span><span className="chart-legend"><i className="dot bid"/>Buy orders <i className="dot ask"/>Sell orders</span></div>
    <svg className="depth-chart" viewBox="0 0 750 300" role="img" aria-label="Cumulative Bitcoin order-book depth. Buy orders on the left, sell orders on the right. The shaded range marks the simulated purchase.">
      <defs><linearGradient id="bid-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#84c6aa" stopOpacity=".3"/><stop offset="100%" stopColor="#84c6aa" stopOpacity=".02"/></linearGradient><linearGradient id="ask-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#bafa6a" stopOpacity=".24"/><stop offset="100%" stopColor="#bafa6a" stopOpacity=".025"/></linearGradient></defs>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="54" x2="694" y1={y(ymax * i / 4)} y2={y(ymax * i / 4)} stroke="#252c35" strokeDasharray="3 5"/><text x="42" y={y(ymax * i / 4) + 4} textAnchor="end">{(ymax * i / 4).toFixed(2)}</text></g>)}
      <path d={area(bids)} fill="url(#bid-fill)"/><path d={path(bids)} stroke="#84c6aa" strokeWidth="2" fill="none"/>
      <path d={area(asks)} fill="url(#ask-fill)"/><path d={path(asks)} stroke="#bafa6a" strokeWidth="2" fill="none"/>
      {last !== null && <g><rect x={x(asks[0].price)} y="42" width={Math.max(2, x(last) - x(asks[0].price))} height="206" fill="#bafa6a" opacity=".1"/><line x1={x(last)} x2={x(last)} y1="35" y2="248" stroke="#bafa6a" strokeDasharray="4 5"/><text x={Math.min(635, Math.max(110, x(last)))} y="25" textAnchor="middle" className="execution-label">Your last fill · {usd(last, 0)}</text></g>}
      {[0, 1, 2, 3, 4].map(i => <text key={i} x={54 + 160 * i} y="274" textAnchor="middle">{usd(min + (max - min) * i / 4, 0)}</text>)}
      {hover && <g pointerEvents="none"><line x1={x(hover.price)} x2={x(hover.price)} y1="42" y2="248" stroke="#9aa8b8" strokeDasharray="3 3"/><circle cx={x(hover.price)} cy={y(hover.qty)} r="4" fill="#fff"/></g>}
      <rect x="54" y="40" width="640" height="208" fill="transparent" onMouseLeave={() => setHover(null)} onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        const price = min + (e.clientX - rect.left) / rect.width * (max - min)
        setHover(all.reduce((a, b) => Math.abs(a.price - price) < Math.abs(b.price - price) ? a : b))
      }}/>
    </svg>
    <div className="chart-caption">{hover ? `${usd(hover.price)} · ${hover.qty.toFixed(5)} BTC cumulative` : 'Price per bitcoin (USD)'}<span>{result ? 'Highlighted: the asks your budget reaches' : 'Hover to explore available liquidity'}</span></div>
  </div>
}
