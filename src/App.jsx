import { useMemo, useState } from 'react'
import {
  DAYS,
  ITINERARY_BY_DAY,
  CATEGORY_TOTALS,
  SPENDING_BY_CATEGORY_AND_DAY,
  DAY_LOOKUP,
  TOTAL_EXPENSES,
} from './data.js'

const CATEGORY_COLORS = {
  lodging: '#7c5ce7',
  food: '#f4a259',
  entertainment: '#45c6a4',
  travel: '#4d9de0',
}

function formatUSD(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

function donutSlicePath(cx, cy, outer, inner, startFraction, endFraction) {
  const start = -Math.PI / 2 + startFraction * Math.PI * 2
  const end = -Math.PI / 2 + endFraction * Math.PI * 2
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0
  const x0o = cx + outer * Math.cos(start)
  const y0o = cy + outer * Math.sin(start)
  const x1o = cx + outer * Math.cos(end)
  const y1o = cy + outer * Math.sin(end)
  const x1i = cx + inner * Math.cos(end)
  const y1i = cy + inner * Math.sin(end)
  const x0i = cx + inner * Math.cos(start)
  const y0i = cy + inner * Math.sin(start)
  return [
    `M ${x0o} ${y0o}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${x0i} ${y0i}`,
    'Z',
  ].join(' ')
}

function TripNode({ day, selected, onSelect }) {
  return (
    <button
      className={`trip-node ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(day.id)}
      aria-pressed={selected}
      aria-label={`Open day ${day.dayNumber}, ${day.city}`}
    >
      <span className="diamond-frame">
        <img src={day.imageUrl} alt={day.landmark} loading="lazy" />
      </span>
      <span className="node-meta">
        <span className="node-city">{day.city}</span>
        <span className="node-date">{day.shortDate}</span>
      </span>
    </button>
  )
}

function ItineraryPanel({ day }) {
  const items = ITINERARY_BY_DAY[day.id] || []
  return (
    <div className="itinerary-card">
      <div className="detail-header">
        <span className="eyebrow">Day {day.dayNumber}</span>
        <h3>{day.city}, {day.country}</h3>
        <p>{day.longDate} · {day.landmark}</p>
      </div>
      <table className="itinerary-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Place</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.order}>
              <td className="time-col">{item.time}</td>
              <td>{item.place}</td>
              <td>{item.activity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExpenseDonut({ selectedCategory, onSelectCategory }) {
  const slices = useMemo(() => {
    let cumulative = 0
    return CATEGORY_TOTALS.map((category) => {
      const start = cumulative / TOTAL_EXPENSES
      const end = (cumulative + category.total) / TOTAL_EXPENSES
      cumulative += category.total
      return {
        ...category,
        start,
        end,
        percent: Math.round((category.total / TOTAL_EXPENSES) * 1000) / 10,
      }
    })
  }, [])

  const activeSlice = slices.find((slice) => slice.id === selectedCategory)

  return (
    <div className="expense-viz">
      <svg className="donut" viewBox="0 0 280 280" role="img" aria-label="Expense distribution donut chart">
        <circle cx="140" cy="140" r="118" fill="none" stroke="#eef0f6" strokeWidth="2" />
        {slices.map((slice) => {
          const isActive = slice.id === selectedCategory
          const isDimmed = selectedCategory && !isActive
          return (
            <path
              key={slice.id}
              d={donutSlicePath(140, 140, 112, 74, slice.start, slice.end)}
              fill={CATEGORY_COLORS[slice.id]}
              className={`slice ${isActive ? 'is-active' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
              onClick={() => onSelectCategory(slice.id)}
              role="button"
              tabIndex="0"
              aria-label={`${slice.label}: ${formatUSD(slice.total)}`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectCategory(slice.id)
              }}
            />
          )
        })}
        <text x="140" y="128" textAnchor="middle" className="donut-center donut-center-label">
          {activeSlice ? activeSlice.label : 'Total'}
        </text>
        <text x="140" y="152" textAnchor="middle" className="donut-center donut-center-value">
          {activeSlice ? formatUSD(activeSlice.total) : formatUSD(TOTAL_EXPENSES)}
        </text>
      </svg>

      <div className="legend">
        {CATEGORY_TOTALS.map((category) => (
          <button
            key={category.id}
            className={`legend-item ${selectedCategory === category.id ? 'is-active' : ''}`}
            onClick={() => onSelectCategory(category.id)}
          >
            <span className="legend-swatch" style={{ background: CATEGORY_COLORS[category.id] }} />
            <span className="legend-name">{category.label}</span>
            <span className="legend-value">{formatUSD(category.total)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CategoryBreakdown({ category }) {
  if (!category) {
    return (
      <div className="breakdown-card is-empty">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">◔</span>
          <p>Select a slice or legend item to compare daily spending across all 10 cities.</p>
        </div>
      </div>
    )
  }
  const label = CATEGORY_TOTALS.find((item) => item.id === category).label
  const spending = SPENDING_BY_CATEGORY_AND_DAY[category]
  const max = Math.max(...spending.map((item) => item.total), 1)

  return (
    <div className="breakdown-card">
      <div className="detail-header">
        <span className="eyebrow">Category</span>
        <h3>{label}</h3>
        <p>Daily spending across all 10 cities</p>
      </div>
      <ul className="breakdown-list">
        {spending.map((item) => {
          const day = DAY_LOOKUP[item.dayId]
          return (
            <li key={item.dayId} className="breakdown-row">
              <div className="breakdown-row-top">
                <span className="breakdown-city">
                  <span className="mini-day">D{day.dayNumber}</span>
                  {day.city}
                </span>
                <span className="breakdown-amount">{formatUSD(item.total)}</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(item.total / max) * 100}%`,
                    background: CATEGORY_COLORS[category],
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function App() {
  const [selectedDayId, setSelectedDayId] = useState(DAYS[0].id)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const selectedDay = DAY_LOOKUP[selectedDayId]

  return (
    <div className="page">
      <header className="masthead">
        <span className="kicker">Ten days · Ten cities · One journey</span>
        <h1>A Grand European Journey</h1>
        <p className="subtitle">June 1 – June 10, 2026 · London to Rome</p>
      </header>

      <section className="panel journey-panel" id="journey">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">The route</span>
            <h2>Journey Flowchart</h2>
          </div>
          <p className="panel-hint">Select any city to see its day's itinerary.</p>
        </div>
        <div className="journey-layout">
          <JourneyFlow selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} />
          <ItineraryPanel day={selectedDay} />
        </div>
      </section>

      <section className="panel expense-panel" id="expenses">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">The budget</span>
            <h2>Expense Chart</h2>
          </div>
          <p className="panel-hint">Select a slice or legend item to compare daily spending.</p>
        </div>
        <div className="expense-layout">
          <ExpenseDonut selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          <CategoryBreakdown category={selectedCategory} />
        </div>
      </section>

      <footer className="footer">
        Total trip spending: <strong>{formatUSD(TOTAL_EXPENSES)}</strong>
      </footer>
    </div>
  )
}
