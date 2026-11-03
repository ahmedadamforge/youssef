export type Category = 'All' | 'Sensors' | 'Motors' | 'Microcontrollers' | 'Drivers & Logic' | 'Power' | 'Prototyping'

export type Item = {
  id: string
  name: string
  category: string
  description: string
  image: string
  stock: number
  available: number
  unit: string
  specs: string[]
  accent: string
}

export type Loan = {
  id: string
  itemId: string
  itemName?: string
  memberUserId?: string
  memberName: string
  projectName: string
  quantity: number
  initialState: 'Testé OK' | 'Non testé'
  loanDate: string
  status: 'active' | 'returned'
  returnedAt?: string | null
}

export type MaintenanceLog = {
  id: string
  itemId: string
  itemName?: string
  errorDetail: string
  reportedBy: string
  status: string
  reportedAt: string
}

export type TestRun = {
  id: string
  itemId?: string | null
  itemName?: string
  testKey: string
  testLabel: string
  command: string
  status: 'passed' | 'failed' | 'timeout'
  measurements: Record<string, string>
  rawResponse?: string
  errorDetail?: string
  testedBy: string
  testedAt: string
}
