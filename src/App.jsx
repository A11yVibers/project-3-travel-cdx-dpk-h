import { useMemo, useState } from 'react'
import { trip, getDayExpense } from './tripData.js'

const CATEGORY_COLORS = {
  lodging: '#e76f51',
  food: '#2a9d8f',
  entertainment: '#e9c46a',
  travel: '#5e81ac',
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const radians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

function describeDonutSlice(cx, cy, outerRadius, innerRadius, startAngle, endAngle) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle)
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle)
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

function ExpenseDonut({ activeCategory, onSelectCategory }) {
  const { expenseTotals, totalSpend } = trip
  const radius = 80
  const innerRadius = 52
  let cursor = 0

  const slices = trip.expenseCategories.map((category) => {
    const amount = expenseTotals[category.key]
    const angle = totalSpend > 0 ? (amount / totalSpend) * 360 : 0
    const slice = {
      ...category,
      amount,
      startAngle: cursor,
      endAngle: cursor + angle,
      path: describeDonutSlice(100, 100, radius, innerRadius, cursor, cursor + angle),
    }
    cursor += angle
    return slice
  })

  return (
    <div className="donut-block">
      <div className="donut-wrap">
        <svg
          className={`donut ${activeCategory ? 'donut--dimmed' : ''}`}
          viewBox="0 0 200 200"
          role="group"
          aria-label={`Total spending distribution: ${trip.expenseCategories
            .map((category) => `${category.label} $${Math.round(expenseTotals[category.key])}`)
            .join(', ')}`}
        >
          {slices.map((slice) => (
            <path
              key={slice.key}
              className={`donut-slice ${activeCategory === slice.key ? 'is-active' : ''}`}
              d={slice.path}
              fill={CATEGORY_COLORS[slice.key]}
              onClick={() => onSelectCategory(slice.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectCategory(slice.key)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${slice.label}: $${Math.round(slice.amount)}`}
            >
              <title>{`${slice.label}: $${Math.round(slice.amount)}`}</title>
            </path>
          ))}
          <text className="donut-total" x="100" y="93" textAnchor="middle">
            ${Math.round(totalSpend)}
          </text>
          <text className="donut-caption" x="100" y="113" textAnchor="middle">
            total spent
          </text>
        </svg>
      </div>

      <div className="donut-legend" aria-label="Expense categories">
        {trip.expenseCategories.map((category) => {
          const amount = expenseTotals[category.key]
          const percent = totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0
          return (
            <button
              key={category.key}
              type="button"
              className={`legend-button ${activeCategory === category.key ? 'is-active' : ''}`}
              onClick={() => onSelectCategory(category.key)}
              aria-pressed={activeCategory === category.key}
            >
              <span
                className="legend-swatch"
                style={{ backgroundColor: CATEGORY_COLORS[category.key] }}
                aria-hidden="true"
              />
              <span className="legend-label">{category.label}</span>
              <span className="legend-value">${Math.round(amount)} · {percent}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CategoryComparison({ activeCategory }) {
  const category = trip.expenseCategories.find((item) => item.key === activeCategory) ?? trip.expenseCategories[0]
  const values = trip.days.map((day) => ({ day, amount: getDayExpense(day, category.key) }))
  const maxAmount = Math.max(...values.map((item) => item.amount), 1)
  const categoryTotal = values.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="comparison-panel">
      <div className="comparison-heading">
        <div>
          <p className="eyebrow">Category comparison</p>
          <h3>{category.label}</h3>
        </div>
        <div className="comparison-total">
          <span>${Math.round(categoryTotal)}</span>
          <small>trip total</small>
        </div>
      </div>

      <div className="comparison-list">
        {values.map(({ day, amount }) => {
          const width = Math.max(4, (amount / maxAmount) * 100)
          return (
            <div className="comparison-row" key={day.id}>
              <span className="comparison-city">
                <strong>{day.city}</strong>
                <small>Day {day.dayNumber}</small>
              </span>
              <span className="comparison-bar-track" aria-hidden="true">
                <span
                  className="comparison-bar"
                  style={{
                    width: `${width}%`,
                    backgroundColor: CATEGORY_COLORS[category.key],
                  }}
                />
              </span>
              <span className="comparison-amount">${Math.round(amount)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ItineraryPanel({ day }) {
  return (
    <aside className="itinerary-panel" aria-live="polite">
      <div className="itinerary-panel-header">
        <p className="eyebrow">Day {day.dayNumber}</p>
        <h3>{day.city}</h3>
        <p className="itinerary-date">
          {day.formattedDate} · {day.country}
        </p>
      </div>

      <div className="itinerary-table-wrap">
        <table className="itinerary-table">
          <caption className="sr-only">Itinerary for {day.city} on {day.formattedDate}</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Place</th>
              <th scope="col">Activity</th>
            </tr>
          </thead>
          <tbody>
            {day.itinerary.map((item) => (
              <tr key={item.order}>
                <td className="itinerary-time">{item.time}</td>
                <td>{item.place}</td>
                <td>{item.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  )
}

function JourneyFlow() {
  const [selectedDayId, setSelectedDayId] = useState(trip.days[0].id)
  const selectedDay = trip.days.find((day) => day.id === selectedDayId) ?? trip.days[0]

  return (
    <div className="journey-layout">
      <ol className="journey-timeline" aria-label="Ten days of the trip">
        {trip.days.map((day) => {
          const isSelected = day.id === selectedDay.id
          return (
            <li className="journey-item" key={day.id}>
              <button
                type="button"
                className={`journey-node ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelectedDayId(day.id)}
                aria-pressed={isSelected}
                aria-label={`Show itinerary for day ${day.dayNumber}, ${day.city}`}
              >
                <span className={`node-frame ${day.dayNumber % 2 === 0 ? 'node-frame--circle' : 'node-frame--diamond'}`}>
                  <img
                    src={day.imageUrl}
                    alt={`${day.city}: ${day.landmark}`}
                    loading="lazy"
                  />
                </span>
                <span className="node-label">
                  <strong>{day.city}</strong>
                  <span>Day {day.dayNumber} · {day.formattedDate}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <ItineraryPanel day={selectedDay} />
    </div>
  )
}

function App() {
  const [activeCategory, setActiveCategory] = useState(trip.expenseCategories[0].key)
  const activeCategoryLabel = useMemo(
    () => trip.expenseCategories.find((category) => category.key === activeCategory)?.label,
    [activeCategory],
  )

  return (
    <main>
      <header className="hero">
        <p className="eyebrow">A visual travel journal</p>
        <h1>Ten Days in Europe</h1>
        <p className="hero-copy">
          One city each day, from London to Rome. Select any stop to see the day&apos;s itinerary,
          or explore the chart to compare spending across destinations.
        </p>
      </header>

      <section className="site-section journey-section" aria-labelledby="journey-heading">
        <div className="section-heading">
          <p className="eyebrow">The route</p>
          <h2 id="journey-heading">Journey Flowchart</h2>
        </div>
        <JourneyFlow />
      </section>

      <section className="site-section expense-section" aria-labelledby="expenses-heading">
        <div className="section-heading">
          <p className="eyebrow">The budget</p>
          <h2 id="expenses-heading">Expense Chart</h2>
        </div>
        <div className="expense-layout">
          <ExpenseDonut activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
          <CategoryComparison activeCategory={activeCategory} />
        </div>
        <p className="expense-hint" aria-live="polite">
          Viewing <strong>{activeCategoryLabel}</strong> spending across all {trip.days.length} cities.
        </p>
      </section>
    </main>
  )
}

export default App
