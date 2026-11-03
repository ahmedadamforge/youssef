import * as XLSX from 'xlsx'
import type { Item, Loan, MaintenanceLog } from './inventory-types'

export const RESPONSIBLE_NAME = 'EL HANSALI Youssef'
export const RESPONSIBLE_TITLE = 'Responsable Matériel & Cellule Technique'

export async function generateExcelBuffer(
  itemsList: Item[],
  loansList: Loan[],
  logsList: MaintenanceLog[],
): Promise<Buffer> {
  const items = itemsList
  const loans = loansList
  const logs = logsList

  const wb = XLSX.utils.book_new()

  // --- SHEET 1: INVENTAIRE DU MATERIEL ---
  const now = new Date()
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const sheet1Data: (string | number)[][] = [
    ['CMC ROBOTICS LAB — INVENTAIRE OFFICIEL DU MATÉRIEL'],
    [`Responsable du Matériel : ${RESPONSIBLE_NAME} (${RESPONSIBLE_TITLE})`],
    [`Fichier synchronisé le : ${dateStr}`],
    [], // empty row
    [
      'ID / Référence',
      'Désignation du Matériel',
      'Catégorie',
      'Stock Total',
      'Disponible',
      'En Prêt',
      'Unité',
      'Spécifications Techniques',
      'Statut Stock',
      'Responsable Validation',
    ],
  ]

  for (const item of items) {
    const onLoan = loans.filter(l => l.itemId === item.id && l.status === 'active').reduce((sum, l) => sum + l.quantity, 0)
    const status =
      item.available === 0 ? 'Rupture' : item.available / item.stock < 0.35 ? 'Stock faible' : 'Disponible'
    const specsStr = Array.isArray(item.specs) ? item.specs.join(' | ') : String(item.specs || '')

    sheet1Data.push([
      item.id.toUpperCase(),
      item.name,
      item.category,
      item.stock,
      item.available,
      onLoan,
      item.unit,
      specsStr,
      status,
      RESPONSIBLE_NAME,
    ])
  }

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data)
  ws1['!cols'] = [
    { wch: 24 }, // ID
    { wch: 32 }, // Designation
    { wch: 18 }, // Categorie
    { wch: 12 }, // Stock Total
    { wch: 12 }, // Disponible
    { wch: 10 }, // En pret
    { wch: 12 }, // Unite
    { wch: 42 }, // Specs
    { wch: 14 }, // Statut
    { wch: 24 }, // Responsable
  ]
  XLSX.utils.book_append_sheet(wb, ws1, 'Inventaire Matériel')

  // --- SHEET 2: EMPRUNTS ACTIFS ---
  const sheet2Data: (string | number)[][] = [
    ['CMC ROBOTICS LAB — REGISTRE DES EMPRUNTS ACTIFS'],
    [`Gestionnaire de Stock : ${RESPONSIBLE_NAME}`],
    [`Date d'extraction : ${dateStr}`],
    [],
    [
      'ID Emprunt',
      'Désignation Matériel',
      'Référence (SKU)',
      'Membre Emprunteur',
      'Cellule / Projet',
      'Quantité',
      'État au Départ',
      'Date d\'emprunt',
      'Statut',
      'Validé Par',
    ],
  ]

  for (const loan of loans) {
    sheet2Data.push([
      loan.id,
      loan.itemName || loan.itemId,
      loan.itemId.toUpperCase(),
      loan.memberName,
      loan.projectName,
      loan.quantity,
      loan.initialState,
      loan.loanDate,
      loan.status === 'active' ? 'En cours' : 'Retourné',
      RESPONSIBLE_NAME,
    ])
  }

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data)
  ws2['!cols'] = [
    { wch: 22 },
    { wch: 30 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 10 },
    { wch: 14 },
    { wch: 24 },
    { wch: 12 },
    { wch: 24 },
  ]
  XLSX.utils.book_append_sheet(wb, ws2, 'Emprunts Membres')

  // --- SHEET 3: JOURNAL DE MAINTENANCE ---
  const sheet3Data: (string | number)[][] = [
    ['CMC ROBOTICS LAB — DÉFAILLANCES & MAINTENANCE DU MATÉRIEL'],
    [`Supervision Technique : ${RESPONSIBLE_NAME}`],
    [`Date : ${dateStr}`],
    [],
    [
      'ID Incident',
      'Composant Affecté',
      'Référence (SKU)',
      'Détail du Problème / Défaillance',
      'Signalé Par',
      'Statut Matériel',
      'Date du Signalement',
      'Superviseur',
    ],
  ]

  for (const log of logs) {
    sheet3Data.push([
      log.id,
      log.itemName || log.itemId,
      log.itemId.toUpperCase(),
      log.errorDetail,
      log.reportedBy,
      log.status,
      log.reportedAt,
      RESPONSIBLE_NAME,
    ])
  }

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data)
  ws3['!cols'] = [
    { wch: 20 },
    { wch: 28 },
    { wch: 22 },
    { wch: 45 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 24 },
  ]
  XLSX.utils.book_append_sheet(wb, ws3, 'Maintenance & Pannes')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return buffer
}

