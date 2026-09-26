import tripDaysRaw from '../project-assets/trip_days.csv?raw'
import itineraryRaw from '../project-assets/itinerary.csv?raw'
import expensesRaw from '../project-assets/expenses.csv?raw'

const EXPENSE_CATEGORIES = ['lodging', 'food', 'entertainment', 'travel']

function parseCsv(raw) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const next = raw[index + 1]

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  }

  const [headers, ...body] = rows
  return body.map((cells) =>
    Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ''])),
  )
}

const tripDayRows = parseCsv(tripDaysRaw)
const itineraryRows = parseCsv(itineraryRaw)
const expenseRows = parseCsv(expensesRaw)

export const DAYS = tripDayRows
  .map((row) => ({
    id: row.day_id,
    number: Number(row.day_number),
    date: row.date,
    city: row.city,
    country: row.country,
    landmark: row.iconic_landmark,
    imageUrl: row.landmark_image_url,
  }))
  .sort((a, b) => a.number - b.number)

export const ITINERARY = DAYS.reduce((result, day) => {
  result[day.id] = itineraryRows
    .filter((row) => row.day_id === day.id)
    .sort((a, b) => Number(a.item_order) - Number(b.item_order))
    .map((row) => ({ time: row.time, place: row.place, activity: row.activity }))
  return result
}, {})

export const CATEGORY_INFO = {
  lodging: { label: 'Lodging', color: '#0f766e' },
  food: { label: 'Food', color: '#b45309' },
  entertainment: { label: 'Entertainment', color: '#9d174d' },
  travel: { label: 'Travel', color: '#4f46e5' },
}

export const EXPENSES = {
  categories: EXPENSE_CATEGORIES.map((category) => ({
    id: category,
    label: CATEGORY_INFO[category].label,
    color: CATEGORY_INFO[category].color,
    total: expenseRows
      .filter((row) => row.category === category)
      .reduce((sum, row) => sum + Number(row.amount_usd), 0),
  })),
  byDay: DAYS.map((day) => {
    const categoryTotals = EXPENSE_CATEGORIES.reduce((result, category) => {
      result[category] = expenseRows
        .filter((row) => row.day_id === day.id && row.category === category)
        .reduce((sum, row) => sum + Number(row.amount_usd), 0)
      return result
    }, {})
    return { day, city: day.city, total: Object.values(categoryTotals).reduce((a, b) => a + b, 0), categoryTotals }
  }),
  total: expenseRows.reduce((sum, row) => sum + Number(row.amount_usd), 0),
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}
