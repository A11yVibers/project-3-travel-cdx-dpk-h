import { useMemo, useState } from 'react'
import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

const EXPENSE_CATEGORIES = [
  { key: 'lodging', label: 'Lodging', color: '#7c5cff' },
  { key: 'food', label: 'Food', color: '#f6a723' },
  { key: 'entertainment', label: 'Entertainment', color: '#27b98a' },
  { key: 'travel', label: 'Travel', color: '#2f80ed' },
]

function parseCsv(csvText) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]
    const next = csvText[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && next === '\n') {
        i += 1
      }
      row.push(field)
      field = ''
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row)
      }
      row = []
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row)
    }
  }

  return rows
}

function csvToObjects(csvText) {
  const rows = parseCsv(csvText)
  if (rows.length === 0) return []
  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header] = (row[index] ?? '').trim()
      return record
    }, {})
  })
}

function formatDate(dateValue) {
  const [year, month, day] = dateValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(date)
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ')
}

function DonutChart({ categories, selectedCategory, onSelect }) {
  const total = categories.reduce((sum, category) => sum + category.value, 0)
  const radius = 80
  const strokeWidth = 30
  const center = 110
  const viewSize = center * 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  const segments = categories.map((category) => {
    const angle = total === 0 ? 0 : (category.value / total) * 360
    const segment = {
      ...category,
      angle,
      startAngle: offset,
      endAngle: offset + angle,
      dashOffset: circumference * (1 - angle / 360),
      dashArray: `${(angle / 360) * circumference} ${circumference}`,
    }
    offset += angle
    return segment
  })

  return (
    <div className="donut-layout">
      <div className="donut-wrap">
        <svg
          className="donut-chart"
          viewBox={`0 0 ${viewSize} ${viewSize}`}
          role="img"
          aria-label="Expense distribution by category"
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {segments.map((segment) => {
            const isSelected = selectedCategory === segment.key
            const adjustedStart = isSelected ? segment.startAngle - 3 : segment.startAngle
            const adjustedEnd = isSelected ? segment.endAngle - 3 : segment.endAngle
            const strokeColor = isSelected ? '#ffffff' : segment.color

            return (
              <path
                key={segment.key}
                d={describeArc(center, center, radius, adjustedStart, adjustedEnd)}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelected ? strokeWidth + 6 : strokeWidth}
                strokeLinecap="butt"
                className="donut-segment"
                role="button"
                tabIndex={0}
                aria-label={`${segment.label}: $${Math.round(segment.value).toLocaleString()}`}
                onClick={() => onSelect(segment.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(segment.key)
                  }
                }}
              />
            )
          })}
          <text x={center} y={center - 6} textAnchor="middle" className="donut-total-label">
            Total
          </text>
          <text x={center} y={center + 22} textAnchor="middle" className="donut-total-value">
            ${Math.round(total).toLocaleString()}
          </text>
        </svg>
      </div>

      <div className="donut-legend" aria-label="Expense category legend">
        {segments.map((segment) => {
          const percentage = total === 0 ? 0 : Math.round((segment.value / total) * 100)
          return (
            <button
              type="button"
              key={segment.key}
              className={`legend-item ${selectedCategory === segment.key ? 'is-selected' : ''}`}
              onClick={() => onSelect(segment.key)}
            >
              <span className="legend-swatch" style={{ backgroundColor: segment.color }} />
              <span className="legend-text">
                <span className="legend-name">{segment.label}</span>
                <span className="legend-value">${Math.round(segment.value).toLocaleString()}</span>
              </span>
              <span className="legend-percent">{percentage}%</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ComparisonBars({ selectedCategory, days, expensesByDay }) {
  const categoryLabel = EXPENSE_CATEGORIES.find((category) => category.key === selectedCategory)?.label
  const color = EXPENSE_CATEGORIES.find((category) => category.key === selectedCategory)?.color
  const comparison = days.map((day) => ({
    ...day,
    amount: expensesByDay[day.id]?.[selectedCategory] ?? 0,
  }))
  const maxAmount = Math.max(...comparison.map((item) => item.amount), 1)

  return (
    <div className="comparison-panel">
      <div className="comparison-heading">
        <div>
          <p className="eyebrow">Daily breakdown</p>
          <h3>{categoryLabel} spending by city</h3>
        </div>
        <span className="category-chip" style={{ '--chip-color': color }}>
          {categoryLabel}
        </span>
      </div>

      <div className="comparison-list">
        {comparison.map((item, index) => (
          <div className="comparison-row" key={item.id}>
            <div className="comparison-meta">
              <span className="comparison-day">Day {item.dayNumber}</span>
              <span className="comparison-city">{item.city}</span>
            </div>
            <div className="bar-track" aria-hidden="true">
              <div
                className="bar-fill"
                style={{
                  width: `${(item.amount / maxAmount) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="comparison-amount">${Math.round(item.amount).toLocaleString()}</span>
            {index === comparison.length - 1 ? <span className="sr-only">{item.amount}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const tripDays = useMemo(() => csvToObjects(tripDaysCsv), [])
  const itineraries = useMemo(() => csvToObjects(itineraryCsv), [])
  const expenses = useMemo(() => csvToObjects(expensesCsv), [])
  const [selectedDayId, setSelectedDayId] = useState('D01')
  const [selectedCategory, setSelectedCategory] = useState(null)

  const days = useMemo(() => {
    return tripDays.map((day) => ({
      id: day.day_id,
      dayNumber: Number(day.day_number),
      date: day.date,
      city: day.city,
      country: day.country,
      landmark: day.iconic_landmark,
      imageUrl: day.landmark_image_url,
    }))
  }, [tripDays])

  const itineraryByDay = useMemo(() => {
    return itineraries.reduce((grouped, item) => {
      if (!grouped[item.day_id]) grouped[item.day_id] = []
      grouped[item.day_id].push(item)
      return grouped
    }, {})
  }, [itineraries])

  const expensesByDay = useMemo(() => {
    const grouped = {}
    expenses.forEach((expense) => {
      if (!grouped[expense.day_id]) grouped[expense.day_id] = {}
      const category = expense.category.toLowerCase()
      grouped[expense.day_id][category] = (grouped[expense.day_id][category] ?? 0) + Number(expense.amount_usd)
    })
    return grouped
  }, [expenses])

  const categoryTotals = useMemo(() => {
    return EXPENSE_CATEGORIES.map((category) => ({
      ...category,
      value: expenses.reduce((total, expense) => {
        return expense.category.toLowerCase() === category.key
          ? total + Number(expense.amount_usd)
          : total
      }, 0),
    }))
  }, [expenses])

  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0]
  const selectedItinerary = itineraryByDay[selectedDayId] ?? []

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="hero-kicker">Visual travel journal</p>
        <h1>10 Days Across Europe</h1>
        <p className="hero-intro">
          One city every day, from London to Rome. Follow the journey and see how the adventure added up.
        </p>
        <div className="hero-stats" aria-label="Trip overview">
          <div>
            <span>10</span>
            <small>cities</small>
          </div>
          <div>
            <span>{new Date(`${days[0]?.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {days[days.length - 1] ? new Date(`${days[days.length - 1].date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            <small>journey dates</small>
          </div>
          <div>
            <span>${Math.round(categoryTotals.reduce((total, category) => total + category.value, 0)).toLocaleString()}</span>
            <small>total spend</small>
          </div>
        </div>
      </header>

      <section className="section journey-section" aria-labelledby="journey-heading">
        <div className="section-heading">
          <p className="eyebrow">Journey</p>
          <h2 id="journey-heading">The Route</h2>
          <p>Select a city to open its daily itinerary.</p>
        </div>

        <div className="journey-flow">
          {days.map((day, index) => {
            const isSelected = selectedDayId === day.id
            return (
              <div className="journey-node-wrap" key={day.id}>
                {index > 0 && <div className="flow-connector" aria-hidden="true" />}
                <button
                  type="button"
                  className={`journey-node ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setSelectedDayId(day.id)}
                  aria-pressed={isSelected}
                  aria-label={`Day ${day.dayNumber}: ${day.city}, ${formatDate(day.date)}`}
                >
                  <span className="diamond-frame">
                    <img src={day.imageUrl} alt={`${day.landmark} in ${day.city}`} loading="lazy" />
                  </span>
                  <span className="node-copy">
                    <span className="node-day">Day {day.dayNumber}</span>
                    <strong>{day.city}</strong>
                    <span className="node-date">{formatDate(day.date)}</span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="itinerary-card">
          <div className="itinerary-heading">
            <div>
              <p className="eyebrow">Day {selectedDay?.dayNumber}</p>
              <h3>{selectedDay?.city} itinerary</h3>
            </div>
            <span className="landmark-label">{selectedDay?.landmark}</span>
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
                {selectedItinerary.map((item) => (
                  <tr key={`${item.day_id}-${item.item_order}`}>
                    <td>{item.time}</td>
                    <td>{item.place}</td>
                    <td>{item.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section expense-section" aria-labelledby="expense-heading">
        <div className="section-heading">
          <p className="eyebrow">Expenses</p>
          <h2 id="expense-heading">Where the Money Went</h2>
          <p>Select a category to compare spending across every city.</p>
        </div>

        <div className="expense-card">
          <DonutChart
            categories={categoryTotals}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {selectedCategory ? (
            <ComparisonBars
              selectedCategory={selectedCategory}
              days={days}
              expensesByDay={expensesByDay}
            />
          ) : (
            <div className="comparison-empty">
              <span className="empty-icon" aria-hidden="true">◔</span>
              <h3>Choose a slice</h3>
              <p>Tap any donut segment or legend item to see how that category compares from city to city.</p>
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <p>One suitcase, ten cities, and a lot of espresso.</p>
      </footer>
    </main>
  )
}

export default App
