import type { Item } from './inventory-types'

export type StockFilter = 'all' | 'available' | 'low'
export const CATEGORY_ORDER = ['All', 'Sensors', 'Motors', 'Microcontrollers', 'Drivers & Logic', 'Power', 'Prototyping', 'Communication', 'Displays', 'Actuators', 'Chassis & Mechanics', 'Connectors & Cables', 'Tools & Consumables', 'Fasteners & Hardware', 'Safety & ESD']
export const CATEGORY_LABELS: Record<string, string> = {
  All: 'Tout le matériel', Sensors: 'Capteurs', Motors: 'Moteurs',
  Microcontrollers: 'Microcontrôleurs', 'Drivers & Logic': 'Drivers & logique',
  Power: 'Alimentation', Prototyping: 'Prototypage', Communication: 'Communication & réseau',
  Displays: 'Affichage & signalisation', Actuators: 'Actionneurs & servos',
  'Chassis & Mechanics': 'Châssis & mécanique', 'Connectors & Cables': 'Connectique & câbles',
  'Tools & Consumables': 'Outils & consommables', 'Fasteners & Hardware': 'Visserie & quincaillerie',
  'Safety & ESD': 'Protection & ESD',
}

export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function buildCatalogIndex(items: Item[]) {
  const categories = new Set(CATEGORY_ORDER)
  const categoryCounts: Record<string, number> = Object.create(null)
  let totalAvailable = 0
  const entries = items.map(item => {
    categories.add(item.category)
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
    totalAvailable += item.available
    return { item, searchText: normalizeSearch([item.name, item.id, item.category, CATEGORY_LABELS[item.category] || '', item.description, ...item.specs].join(' ')) }
  })
  return { categories: Array.from(categories), categoryCounts, totalAvailable, entries }
}

export function filterCatalog(index: ReturnType<typeof buildCatalogIndex>, category: string, stock: StockFilter, query: string) {
  const search = normalizeSearch(query)
  return index.entries.filter(({ item, searchText }) =>
    (category === 'All' || item.category === category) &&
    (!search || searchText.includes(search)) &&
    (stock === 'all' || (stock === 'available' ? item.available > 0 : (item.stock > 0 ? item.available / item.stock : 0) < 0.35)),
  ).map(entry => entry.item)
}
