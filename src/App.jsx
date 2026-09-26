import { useState } from 'react'
import { DAYS, ITINERARY, EXPENSES, formatCurrency, formatDate } from './data.js'

function polarPoint(centerX, centerY, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  }
}

function donutSlicePath(center, outerRadius, innerRadius, startAngle, endAngle) {
  const outerStart = polarPoint(center, center, outerRadius, startAngle)
  const outerEnd = polarPoint(center, center, outerRadius, endAngle)
  const innerEnd = polarPoint(center, center, innerRadius, endAngle)
  const innerStart = polarPoint(center, center, innerRadius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function JourneyFlow({ selectedDayId, onSelectDay }) {
  return (
    <section className="section journey-section" aria-labelledby="journey-heading">
      <div className="section-heading">
        <p className="eyebrow">10 days · 10 cities</p>
        <h2 id="journey-heading">The journey</h2>
        <p>
          Follow the route from London to Rome. Select any stop to see that day&apos;s itinerary.
        </p>
      </div>

      <div className="journey">
        <div className="journey-spine" aria-hidden="true" />
        {DAYS.map((day, index) => {
          const selected = day.id === selectedDayId
          const side = index % 2 === 0 ? 'left' : 'right'
          return (
            <article key={day.id} className={`journey-row journey-row--${side}`}>
              <button
                type="button"
                className={`day-node day-node--${side}${selected ? ' day-node--selected' : ''}`}
                onClick={() => onSelectDay(day.id)}
                aria-pressed={selected}
              >
                <span className="day-node__dot" aria-hidden="true" />
                <span className="day-marker">
                  <span className="landmark-frame">
                    <img src={day.imageUrl} alt={`${day.landmark} in ${day.city}`} loading="lazy" />
                  </span>
                </span>
                <span className="day-caption">
                  <span className="day-caption__number">Day {day.number}</span>
                  <span className="day-caption__city">{day.city}</span>
                  <span className="day-caption__date">{formatDate(day.date)}</span>
                </span>
              </button>
            </article>
          )
        })}
      </div>

      <ItineraryPanel dayId={selectedDayId} />
    </section>
  )
}

function ItineraryPanel({ dayId }) {
  const day = DAYS.find((item) => item.id === dayId)
  const stops = ITINERARY[dayId] ?? []

  return (
    <div className="itinerary-panel">
      <div className="itinerary-panel__heading">
        <div>
          <p className="eyebrow">Selected day</p>
          <h3>{day.city}, {day.country}</h3>
        </div>
        <span className="itinerary-date">{formatDate(day.date)}</span>
      </div>
      <div className="table-scroll">
        <table className="itinerary-table">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Place</th>
              <th scope="col">Activity</th>
            </tr>
          </thead>
          <tbody>
            {stops.map((stop, index) => (
              <tr key={`${day.id}-${index}`}>
                <td className="itinerary-time">{stop.time}</td>
                <td>{stop.place}</td>
                <td>{stop.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpenseChart({ selectedCategory, onSelectCategory }) {
  const totalAngle = 360
  let angleCursor = 0
  const slices = EXPENSES.categories.map((category) => {
    const angle = totalAngle * (category.total / EXPENSES.total)
    const slice = { ...category, path: donutSlicePath(120, 88, 54, angleCursor, angleCursor + angle) }
    angleCursor += angle
    return slice
  })

  const comparison = EXPENSES.byDay.map((entry) => ({
    ...entry,
    amount: entry.categoryTotals[selectedCategory],
  }))
  const maxAmount = Math.max(...comparison.map((entry) => entry.amount), 1)
  const selectedInfo = EXPENSES.categories.find((category) => category.id === selectedCategory)

  return (
    <section className="section expense-section" aria-labelledby="expense-heading">
      <div className="section-heading">
        <p className="eyebrow">Spending snapshot</p>
        <h2 id="expense-heading">Where the budget went</h2>
        <p>Select a slice to compare spending in that category across all ten cities.</p>
      </div>

      <div className="expense-layout">
        <div className="donut-wrap">
          <svg
            className="donut-chart"
            viewBox="0 0 240 240"
            role="group"
            aria-label={`Expense distribution by category, ${formatCurrency(EXPENSES.total)} total`}
          >
            <title>{`Total trip expenses: ${formatCurrency(EXPENSES.total)}`}</title>
            {slices.map((slice) => (
              <path
                key={slice.id}
                d={slice.path}
                fill={slice.color}
                className={`donut-slice${selectedCategory === slice.id ? ' donut-slice--selected' : ''}`}
                onClick={() => onSelectCategory(slice.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectCategory(slice.id)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${slice.label}: ${formatCurrency(slice.total)}`}
              >
                <title>{`${slice.label}: ${formatCurrency(slice.total)}`}</title>
              </path>
            ))}
            <text x="120" y="113" textAnchor="middle" className="donut-total-label">Total spent</text>
            <text x="120" y="136" textAnchor="middle" className="donut-total-value">
              {formatCurrency(EXPENSES.total)}
            </text>
          </svg>

          <div className="legend" aria-label="Expense categories">
            {EXPENSES.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`legend-button${selectedCategory === category.id ? ' legend-button--selected' : ''}`}
                onClick={() => onSelectCategory(category.id)}
                aria-pressed={selectedCategory === category.id}
              >
                <span className="legend-swatch" style={{ backgroundColor: category.color }} />
                <span className="legend-label">{category.label}</span>
                <span className="legend-value">{formatCurrency(category.total)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="daily-comparison">
          <div className="daily-comparison__heading">
            <div>
              <p className="eyebrow">Daily comparison</p>
              <h3>{selectedInfo.label}</h3>
            </div>
            <span
              className="category-chip"
              style={{ backgroundColor: selectedInfo.color }}
            >
              {formatCurrency(selectedInfo.total)} total
            </span>
          </div>

          <ol className="comparison-list">
            {comparison.map((entry) => (
              <li key={entry.day.id} className="comparison-row">
                <div className="comparison-row__label">
                  <span className="comparison-row__day">Day {entry.day.number}</span>
                  <span className="comparison-row__city">{entry.city}</span>
                  <span className="comparison-row__amount">{formatCurrency(entry.amount)}</span>
                </div>
                <div
                  className="comparison-track"
                  role="img"
                  aria-label={`${entry.city}: ${formatCurrency(entry.amount)} spent on ${selectedInfo.label.toLowerCase()}`}
                >
                  <span
                    className="comparison-bar"
                    style={{
                      width: `${Math.max((entry.amount / maxAmount) * 100, entry.amount > 0 ? 5 : 0)}%`,
                      backgroundColor: selectedInfo.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const [selectedDayId, setSelectedDayId] = useState(DAYS[0].id)
  const [selectedCategory, setSelectedCategory] = useState(EXPENSES.categories[0].id)

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">A visual travel journal</p>
        <h1>Ten days across Europe</h1>
        <p className="hero__subtitle">
          One new city each day, from London to Rome — mapped in memories and numbers.
        </p>
      </header>

      <JourneyFlow selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} />
      <ExpenseChart selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

      <footer className="footer">
        <p>10 days · 10 cities · {formatCurrency(EXPENSES.total)}</p>
      </footer>
    </main>
  )
}
