import tripDaysCsv from '../project-assets/trip_days.csv?raw'
import itineraryCsv from '../project-assets/itinerary.csv?raw'
import expensesCsv from '../project-assets/expenses.csv?raw'

export const EXPENSE_CATEGORIES = Object.freeze([
  { key: 'lodging', label: 'Lodging' },
  { key: 'food', label: 'Food' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'travel', label: 'Travel' },
])

export function parseCsv(source) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    const next = source[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(field)
      if (row.some((value) => value !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((value) => value !== '')) rows.push(row)
  }

  const [headers, ...dataRows] = rows
  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (values[index] ?? '').trim()])),
  )
}

function formatTripDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

function buildDays(rawDays) {
  return rawDays
    .map((row) => ({
      id: row.day_id,
      dayNumber: Number(row.day_number),
      date: row.date,
      formattedDate: formatTripDate(row.date),
      city: row.city,
      country: row.country,
      landmark: row.iconic_landmark,
      imageUrl: row.landmark_image_url,
      itinerary: [],
    }))
    .sort((a, b) => a.dayNumber - b.dayNumber)
}

function buildItinerary(rawRows) {
  const itineraryByDay = new Map()
  rawRows.forEach((row) => {
    const dayItems = itineraryByDay.get(row.day_id) ?? []
    dayItems.push({
      order: Number(row.item_order),
      time: row.time,
      place: row.place,
      activity: row.activity,
    })
    itineraryByDay.set(row.day_id, dayItems)
  })

  itineraryByDay.forEach((items) => items.sort((a, b) => a.order - b.order))
  return itineraryByDay
}

function buildExpenses(rawRows) {
  const byDayAndCategory = new Map()
  const categoryTotals = Object.fromEntries(EXPENSE_CATEGORIES.map(({ key }) => [key, 0]))

  rawRows.forEach((row) => {
    const dayId = row.day_id
    const category = row.category
    const amount = Number(row.amount_usd)

    if (!categoryTotals.hasOwnProperty(category)) return

    const dayMap = byDayAndCategory.get(dayId) ?? new Map()
    dayMap.set(category, (dayMap.get(category) ?? 0) + amount)
    byDayAndCategory.set(dayId, dayMap)
    categoryTotals[category] += amount
  })

  return { byDayAndCategory, categoryTotals }
}

const rawDays = parseCsv(tripDaysCsv)
const rawItinerary = parseCsv(itineraryCsv)
const rawExpenses = parseCsv(expensesCsv)

const itineraryByDay = buildItinerary(rawItinerary)
const expenses = buildExpenses(rawExpenses)
const days = buildDays(rawDays).map((day) => ({
  ...day,
  itinerary: itineraryByDay.get(day.id) ?? [],
  expensesByCategory: Object.fromEntries(
    EXPENSE_CATEGORIES.map(({ key }) => [key, expenses.byDayAndCategory.get(day.id)?.get(key) ?? 0]),
  ),
}))

export const trip = Object.freeze({
  days,
  expenseCategories: EXPENSE_CATEGORIES,
  expenseTotals: expenses.categoryTotals,
  totalSpend: Object.values(expenses.categoryTotals).reduce((sum, amount) => sum + amount, 0),
})

export function getDayExpense(day, categoryKey) {
  return day.expensesByCategory[categoryKey] ?? 0
}
