import tripDaysRaw from '../project-assets/trip_days.csv?raw'
import itineraryRaw from '../project-assets/itinerary.csv?raw'
import expensesRaw from '../project-assets/expenses.csv?raw'

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function toRecords(text) {
  const rows = parseCsv(text).filter((row) => row.length > 1)
  if (rows.length === 0) return []
  const headers = rows[0]
  return rows.slice(1).map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? '').trim()
    })
    return record
  })
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatLongDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

function formatShortDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

const CATEGORY_LABELS = {
  lodging: 'Lodging',
  food: 'Food',
  entertainment: 'Entertainment',
  travel: 'Travel',
}

export const EXPENSE_CATEGORIES = ['lodging', 'food', 'entertainment', 'travel']

export const DAYS = toRecords(tripDaysRaw)
  .map((day) => ({
    id: day.day_id,
    dayNumber: Number(day.day_number),
    date: day.date,
    city: day.city,
    country: day.country,
    landmark: day.iconic_landmark,
    imageUrl: day.landmark_image_url,
    longDate: formatLongDate(day.date),
    shortDate: formatShortDate(day.date),
  }))
  .sort((a, b) => a.dayNumber - b.dayNumber)

const itineraries = toRecords(itineraryRaw)
export const ITINERARY_BY_DAY = itineraries.reduce((acc, item) => {
  if (!acc[item.day_id]) acc[item.day_id] = []
  acc[item.day_id].push({
    order: Number(item.item_order),
    time: item.time,
    place: item.place,
    activity: item.activity,
  })
  return acc
}, {})

Object.values(ITINERARY_BY_DAY).forEach((items) => {
  items.sort((a, b) => a.order - b.order)
})

const expenses = toRecords(expensesRaw).map((item) => ({
  dayId: item.day_id,
  category: item.category.toLowerCase(),
  subcategory: item.subcategory,
  description: item.description,
  amount: Number(item.amount_usd),
}))

export const DAY_LOOKUP = DAYS.reduce((map, day) => {
  map[day.id] = day
  return map
}, {})

export const TOTAL_EXPENSES = expenses.reduce((sum, item) => sum + item.amount, 0)

export const CATEGORY_TOTALS = EXPENSE_CATEGORIES.map((category) => ({
  id: category,
  label: CATEGORY_LABELS[category],
  total: expenses
    .filter((item) => item.category === category)
    .reduce((sum, item) => sum + item.amount, 0),
}))

export const SPENDING_BY_CATEGORY_AND_DAY = EXPENSE_CATEGORIES.reduce((map, category) => {
  map[category] = DAYS.map((day) => ({
    dayId: day.id,
    city: day.city,
    dayNumber: day.dayNumber,
    total: expenses
      .filter((item) => item.category === category && item.dayId === day.id)
      .reduce((sum, item) => sum + item.amount, 0),
  }))
  return map
}, {})
