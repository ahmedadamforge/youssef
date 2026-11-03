'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Item, MaintenanceLog, TestRun } from '@/lib/inventory-types'
import ArduinoUltrasonicBench from './arduino-ultrasonic-bench'
import TestGuides from './test-guides'
import TestHistory from './test-history'

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>
  close: () => Promise<void>
  readable: ReadableStream<Uint8Array> | null
  writable: WritableStream<Uint8Array> | null
  getInfo?: () => { usbVendorId?: number; usbProductId?: number }
}
type SerialLike = {
  requestPort: () => Promise<SerialPortLike>
  getPorts: () => Promise<SerialPortLike[]>
  addEventListener?: (event: string, handler: () => void) => void
}
type NavigatorWithSerial = Navigator & { serial?: SerialLike }
type LogEntry = { id: number; time: string; direction: 'rx' | 'tx' | 'system'; text: string }
type TestState = 'idle' | 'testing' | 'working' | 'faulty'
type TestKey =
  | 'board'
  | 'ultrasonic'
  | 'pir'
  | 'line'
  | 'dht11'
  | 'imu'
  | 'servo'
  | 'dcMotor'
  | 'stepper'
  | 'driver'
  | 'relay'
  | 'led'
  | 'power'
type HandshakeState = 'idle' | 'working' | 'faulty'

type HardwareTest = { key: TestKey; label: string; family: string; detail: string; command: string }

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const tests: HardwareTest[] = [
  { key: 'board', label: 'Microcontroller handshake', family: 'Boards', detail: 'PING → PONG / READY response', command: 'PING' },
  { key: 'ultrasonic', label: 'Ultrasonic HC-SR04', family: 'Sensors', detail: 'Trigger + echo distance pulse', command: 'TEST ULTRASONIC' },
  { key: 'pir', label: 'PIR motion sensor', family: 'Sensors', detail: 'Digital movement response', command: 'TEST PIR' },
  { key: 'line', label: 'IR line array', family: 'Sensors', detail: 'Five-channel reflectance scan', command: 'TEST LINE' },
  { key: 'dht11', label: 'DHT11 temperature', family: 'Sensors', detail: 'Temperature + humidity read', command: 'TEST DHT11' },
  { key: 'imu', label: 'MPU6050 IMU', family: 'Sensors', detail: 'Accelerometer + gyroscope read', command: 'TEST IMU' },
  { key: 'servo', label: 'Micro servo SG90', family: 'Motors', detail: 'Sweep 0° → 180° → 0°', command: 'TEST SERVO' },
  { key: 'dcMotor', label: 'TT DC motor pair', family: 'Motors', detail: 'Forward / reverse PWM', command: 'TEST DC MOTOR' },
  { key: 'stepper', label: '28BYJ-48 stepper', family: 'Motors', detail: 'Forward / reverse step sequence', command: 'TEST STEPPER' },
  { key: 'driver', label: 'L298N motor driver', family: 'Drivers', detail: 'Dual channel output check', command: 'TEST DRIVER' },
  { key: 'relay', label: '1-channel relay', family: 'Drivers', detail: 'Open / close contact state', command: 'TEST RELAY' },
  { key: 'led', label: 'LED / GPIO output', family: 'Outputs', detail: 'GPIO high / low response', command: 'TEST LED' },
  { key: 'power', label: 'Power rail', family: 'Power', detail: 'Voltage and continuity check', command: 'TEST POWER' },
]

const initialStates = tests.reduce<Record<TestKey, TestState>>(
  (states, test) => ({ ...states, [test.key]: 'idle' }),
  {} as Record<TestKey, TestState>,
)

function stamp() {
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date())
}

function testKeyFromLine(line: string): TestKey | null {
  const value = line.toLowerCase()
  if (/pong|ready|handshake|board|microcontroller/.test(value)) return 'board'
  if (/ultrasonic|distance/.test(value)) return 'ultrasonic'
  if (/pir|motion/.test(value)) return 'pir'
  if (/line|reflect/.test(value)) return 'line'
  if (/dht|humidity|temperature|temp/.test(value)) return 'dht11'
  if (/imu|mpu|gyro|acceler/.test(value)) return 'imu'
  if (/servo/.test(value)) return 'servo'
  if (/stepper|step/.test(value)) return 'stepper'
  if (/dc motor|tt motor|motor/.test(value)) return 'dcMotor'
  if (/driver|l298/.test(value)) return 'driver'
  if (/relay/.test(value)) return 'relay'
  if (/led|gpio/.test(value)) return 'led'
  if (/power|voltage|volt|continuity/.test(value)) return 'power'
  return null
}

export default function CircuitTester() {
  const [port, setPort] = useState<SerialPortLike | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [baudRate, setBaudRate] = useState('115200')
  const [command, setCommand] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 1, time: stamp(), direction: 'system', text: 'Banc prêt. Connectez une carte pour tester.' },
  ])
  const [testStates, setTestStates] = useState<Record<TestKey, TestState>>(initialStates)
  const [handshake, setHandshake] = useState<HandshakeState>('idle')
  const [lastReading, setLastReading] = useState({ distance: '--', servo: '--', led: '—', temperature: '--', power: '--' })
  const [lastSignal, setLastSignal] = useState('--')
  const [portInfo, setPortInfo] = useState('Périphérique USB non sélectionné')

  // Error details per key
  const [errorDetails, setErrorDetails] = useState<Partial<Record<TestKey, string>>>({})
  const [reportedKeys, setReportedKeys] = useState<Record<string, boolean>>({})
  const [reportingKey, setReportingKey] = useState<string | null>(null)

  const [inventory, setInventory] = useState<Item[]>([])
  const [faultItemId, setFaultItemId] = useState('')


  // Maintenance logs
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([])
  const [testRuns, setTestRuns] = useState<TestRun[]>([])

  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const keepReadingRef = useRef(false)
  const logId = useRef(2)
  const pendingRef = useRef<Set<TestKey>>(new Set())
  const activeTestRef = useRef<TestKey | null>(null)

  const addLog = useCallback((text: string, direction: LogEntry['direction'] = 'system') => {
    setLogs((current) => [...current.slice(-100), { id: logId.current++, time: stamp(), direction, text }])
  }, [])

  const persistTestRun = useCallback(async (test: HardwareTest, status: TestRun['status'], rawResponse: string, errorDetail?: string) => {
    try {
      const response = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: faultItemId || null, testKey: test.key, testLabel: test.label, command: test.command, status, measurements: lastReading, rawResponse, errorDetail }),
      })
      const data = await response.json().catch(() => ({})) as { testRun?: TestRun; error?: string }
      if (!response.ok || !data.testRun) throw new Error(data.error || 'Historique indisponible')
      setTestRuns(current => [data.testRun!, ...current].slice(0, 100))
    } catch (error) {
      addLog(`Résultat non enregistré : ${error instanceof Error ? error.message : 'erreur historique'}`)
    }
  }, [addLog, faultItemId, lastReading])

  useEffect(() => {
    fetch('/api/inventory', { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(d => setInventory(d.items)).catch(() => addLog('Inventaire indisponible pour le signalement.'))
  }, [addLog])

  // Load maintenance logs
  useEffect(() => {
    fetch('/api/maintenance', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { logs?: MaintenanceLog[] }) => {
        if (data.logs) setMaintenanceLogs(data.logs)
      })
      .catch(() => {
        addLog('Impossible de charger le journal de maintenance.')
      })
  }, [])

  useEffect(() => {
    fetch('/api/test-runs', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: { testRuns?: TestRun[] }) => { if (data.testRuns) setTestRuns(data.testRuns) })
      .catch(() => addLog('Impossible de charger l’historique des tests.'))
  }, [addLog])

  useEffect(() => {
    const serial = (navigator as NavigatorWithSerial).serial
    setIsSupported(Boolean(serial))
    serial?.addEventListener?.('disconnect', () => {
      pendingRef.current.clear()
      keepReadingRef.current = false
      activeTestRef.current = null
      setTestStates(initialStates)
      setHandshake('idle')
      setLastReading({ distance: '--', servo: '--', led: '-', temperature: '--', power: '--' })
      setIsConnected(false)
      setPort(null)
      addLog('Périphérique USB déconnecté.', 'system')
    })
  }, [addLog])

  const parseLine = useCallback((line: string) => {
    setLastSignal(stamp())
    const distance = line.match(/(?:distance|ultrasonic)\s*[:=]\s*(\d+(?:\.\d+)?)\s*cm/i)
    const servo = line.match(/servo\s*[:=]\s*(\d+)/i)
    const led = line.match(/led\s*[:=]\s*(on|off|high|low)/i)
    const temperature = line.match(/(?:temp|temperature)\s*[:=]\s*(-?\d+(?:\.\d+)?)\s*°?c?/i)
    const power = line.match(/(?:power|voltage|volt)\s*[:=]\s*(\d+(?:\.\d+)?)\s*v?/i)
    if (distance) setLastReading((reading) => ({ ...reading, distance: `${distance[1]} cm` }))
    if (servo) setLastReading((reading) => ({ ...reading, servo: `${servo[1]}°` }))
    if (led) setLastReading((reading) => ({ ...reading, led: led[1].toUpperCase() }))
    if (temperature) setLastReading((reading) => ({ ...reading, temperature: `${temperature[1]}°C` }))
    if (power) setLastReading((reading) => ({ ...reading, power: `${power[1]} V` }))

    const key = testKeyFromLine(line)
    if (/pong|ready|hello|handshake.*ok/i.test(line)) setHandshake('working')
    if (/\b(pass|working|ok|ready|pong)\b/i.test(line) && key) {
      const wasActive = activeTestRef.current === key
      setTestStates((state) => ({ ...state, [key]: 'working' }))
      pendingRef.current.delete(key)
      if (wasActive) activeTestRef.current = null
      const test = tests.find(candidate => candidate.key === key)
      if (wasActive && test) void persistTestRun(test, 'passed', line)
    }
    if (/fail|fault|error|timeout/i.test(line) && key) {
      const wasActive = activeTestRef.current === key
      setTestStates((state) => ({ ...state, [key]: 'faulty' }))
      setErrorDetails((prev) => ({ ...prev, [key]: `RX: ${line}` }))
      pendingRef.current.delete(key)
      if (key === 'board') setHandshake('faulty')
      if (wasActive) activeTestRef.current = null
      const test = tests.find(candidate => candidate.key === key)
      if (wasActive && test) void persistTestRun(test, 'failed', line, line)
    }
  }, [persistTestRun])

  const readLoop = useCallback(
    async (activePort: SerialPortLike) => {
      if (!activePort.readable) return
      const reader = activePort.readable.getReader()
      readerRef.current = reader
      keepReadingRef.current = true
      let buffer = ''
      try {
        while (keepReadingRef.current) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split(/\r?\n/)
          buffer = lines.pop() ?? ''
          lines.filter(Boolean).forEach((line) => {
            addLog(line, 'rx')
            parseLine(line)
          })
        }
      } catch (error) {
        addLog(`Lecture arrêtée: ${error instanceof Error ? error.message : 'erreur série inconnue'}`)
      } finally {
        reader.releaseLock()
        readerRef.current = null
      }
    },
    [addLog, parseLine],
  )

  const writeToPort = useCallback(
    async (target: SerialPortLike, value: string, record = true) => {
      const clean = value.trim()
      if (!clean || !target.writable) return false
      if (record) addLog(clean, 'tx')
      const writer = target.writable.getWriter()
      try {
        await writer.write(encoder.encode(`${clean}\n`))
        return true
      } catch (error) {
        addLog(`Écriture échouée: ${error instanceof Error ? error.message : 'erreur série'}`)
        return false
      } finally {
        writer.releaseLock()
      }
    },
    [addLog],
  )

  const connect = async () => {
    const serial = (navigator as NavigatorWithSerial).serial
    if (!serial) {
      addLog('Web Serial non disponible. Utilisez Chrome ou Edge sur desktop.')
      return
    }
    try {
      const nextPort = await serial.requestPort()
      await nextPort.open({ baudRate: Number(baudRate) })
      const info = nextPort.getInfo?.()
      setTestStates(initialStates)
      setLastReading({ distance: '--', servo: '--', led: '-', temperature: '--', power: '--' })
      setPort(nextPort)
      setIsConnected(true)
      setHandshake('idle')
      setPortInfo(
        info?.usbVendorId
          ? `USB VID ${info.usbVendorId.toString(16).toUpperCase()} · PID ${(info.usbProductId ?? 0).toString(16).toUpperCase()}`
          : 'Périphérique série USB',
      )
      addLog(`Connecté à ${baudRate} bauds.`, 'system')
      void readLoop(nextPort)
    } catch (error) {
      addLog(`Connexion annulée ou échouée: ${error instanceof Error ? error.message : 'erreur'}`)
    }
  }

  const disconnect = async () => {
    keepReadingRef.current = false
    await readerRef.current?.cancel()
    if (port) await port.close().catch(() => undefined)
    pendingRef.current.clear()
    activeTestRef.current = null
    setTestStates(initialStates)
    setLastReading({ distance: '--', servo: '--', led: '-', temperature: '--', power: '--' })
    setPort(null)
    setIsConnected(false)
    setHandshake('idle')
    setPortInfo('Périphérique USB non sélectionné')
    addLog('Carte déconnectée.', 'system')
  }

  const send = async (value = command) => {
    const clean = value.trim()
    if (!clean) return
    setCommand('')
    if (!port) {
      addLog('Connectez une carte avant d’envoyer une commande.')
      return
    }
    await writeToPort(port, clean)
  }

  const runTest = async (test: HardwareTest) => {
    if (!port || pendingRef.current.size > 0) return
    pendingRef.current.add(test.key)
    activeTestRef.current = test.key
    setTestStates((state) => ({ ...state, [test.key]: 'testing' }))
    if (test.key === 'board') setHandshake('idle')
    addLog(`Exécution test ${test.label}…`, 'system')
    await writeToPort(port, test.command)
    window.setTimeout(() => {
      if (pendingRef.current.has(test.key)) {
        pendingRef.current.delete(test.key)
        if (activeTestRef.current === test.key) activeTestRef.current = null
        setTestStates((state) => ({ ...state, [test.key]: 'faulty' }))
        setErrorDetails((prev) => ({
          ...prev,
          [test.key]: prev[test.key] || 'Délai d’attente dépassé (3s sans réponse valide)',
        }))
        if (test.key === 'board') setHandshake('faulty')
        addLog(`${test.label}: aucune réponse PASS/OK dans le délai de 3s.`, 'system')
        void persistTestRun(test, 'timeout', '', 'Délai d’attente dépassé (3s sans réponse valide)')
      }
    }, 3000)
  }

  // Feature 2: Signalement de Panne & Retrait du stock
  async function reportFault(test: HardwareTest) {
    const selected = inventory.find(i => i.id === faultItemId)
    if (!selected) { addLog('Sélectionnez le matériel concerné avant de signaler une panne.'); return }
    const mapping = { itemId: selected.id, itemName: selected.name }

    setReportingKey(test.key)
    const errText = errorDetails[test.key] || 'Défaillance confirmée au banc de test (timeout / erreur RX)'

    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: mapping.itemId,
          errorDetail: `${test.label}: ${errText}`,
          reportedBy: 'Banc de Test (Opérateur)',
        }),
      })

      const data = (await res.json()) as { log?: MaintenanceLog; error?: string }
      if (!res.ok || !data.log) {
        throw new Error(data.error || 'Erreur lors du signalement')
      }

      setReportedKeys((prev) => ({ ...prev, [test.key]: true }))
      setMaintenanceLogs((prev) => [data.log!, ...prev])
      addLog(`⚠️ PANNE SIGNALÉE : 1x ${mapping.itemName} retiré du stock inventaire.`, 'system')
    } catch (err) {
      addLog(`Échec du signalement de panne: ${err instanceof Error ? err.message : 'inconnu'}`)
    } finally {
      setReportingKey(null)
    }
  }

  const connectionLabel = useMemo(
    () => (!isSupported ? 'Navigateur incompatible' : isConnected ? 'USB connecté' : 'En attente de carte'),
    [isConnected, isSupported],
  )
  const passedTests = Object.values(testStates).filter((state) => state === 'working').length
  const faultyTests = Object.values(testStates).filter((state) => state === 'faulty').length

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="stat-card">
          <p className="eyebrow">Connexion</p>
          <p className="mt-3 text-lg text-white">
            <span className={`status-dot mr-2 ${isConnected ? 'status-dot-working' : 'status-dot-idle'}`} />
            {connectionLabel}
          </p>
          <p className="mt-1 truncate text-[11px] text-muted">{portInfo}</p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">Handshake Série</p>
          <p className="mt-3 text-lg text-white">
            <span
              className={`status-dot mr-2 ${
                handshake === 'working' ? 'status-dot-working' : handshake === 'faulty' ? 'status-dot-faulty' : 'status-dot-idle'
              }`}
            />
            {handshake === 'working' ? 'Vérifié' : handshake === 'faulty' ? 'Sans réponse' : 'Non vérifié'}
          </p>
          <button
            onClick={() => void runTest(tests[0])}
            disabled={!isConnected}
            className="mt-1 text-[11px] text-cyan disabled:opacity-40"
          >
            Tester PING handshake →
          </button>
        </div>
        <div className="stat-card">
          <p className="eyebrow">Dernier signal RX</p>
          <p className="mt-3 font-mono text-lg text-cyan">{lastSignal}</p>
          <p className="mt-1 text-[11px] text-muted">Activité série de la carte</p>
        </div>
        <div className="stat-card">
          <p className="eyebrow">Score de validation</p>
          <p className="mt-3 text-lg text-white">
            <span className="text-mint">{passedTests}</span>
            <span className="mx-1 text-muted">/</span>
            {tests.length}
            <span className="ml-2 text-xs text-muted">validés</span>
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {faultyTests ? (
              <span className="text-orange font-semibold">
                {faultyTests} composant{faultyTests > 1 ? 's' : ''} défaillant{faultyTests > 1 ? 's' : ''}
              </span>
            ) : (
              'Aucune panne détectée'
            )}
          </p>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel overflow-hidden rounded-[24px]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <p className="eyebrow">01 / Liaison Matérielle</p>
            <h2 className="mt-2 text-xl text-white">Connectez et vérifiez votre banc de prototypage</h2>
            <p className="mt-1 text-xs text-muted">Connexion USB → Handshake série → Signaux temps réel → Détection de pannes.</p>
          </div>
          <div className="flex gap-2">
            <select
              value={baudRate}
              onChange={(event) => setBaudRate(event.target.value)}
              disabled={isConnected}
              className="rounded-full border border-white/10 bg-[#101418] px-3.5 py-2 text-xs text-fog outline-none disabled:opacity-50"
            >
              <option value="9600">9,600 baud</option>
              <option value="115200">115,200 baud</option>
              <option value="230400">230,400 baud</option>
            </select>
            <button
              onClick={isConnected ? disconnect : connect}
              className={`rounded-full px-5 py-3 text-xs font-semibold transition ${
                isConnected
                  ? 'border border-orange/40 bg-orange/10 text-orange'
                  : 'bg-cyan text-ink hover:bg-white'
              }`}
            >
              {isConnected ? 'Déconnecter la carte' : 'Connexion USB série'} <span className="ml-2">↗</span>
            </button>
          </div>
        </div>

        {!isSupported && (
          <div className="border-b border-orange/20 bg-orange/5 px-6 py-3 text-xs text-orange">
            ⚠️ Web Serial n'est pas disponible dans ce navigateur. Utilisez Google Chrome ou Microsoft Edge sur ordinateur.
          </div>
        )}

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_.8fr]">
          {/* Terminal */}
          <div className="min-h-[340px] rounded-2xl border border-white/10 bg-[#06141b] p-4 flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[11px] text-muted tracking-wider">CONSOLE SÉRIE / TERMINAL RX-TX</p>
                <span className="text-[10px] uppercase tracking-[.2em] text-muted">{logs.length} lignes</span>
              </div>
              <div className="terminal-scroll max-h-[250px] space-y-2 overflow-auto pr-2 font-mono text-xs leading-5">
                {logs.map((log) => (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={log.id} className="flex gap-3">
                    <span className="shrink-0 text-[#47656e]">{log.time}</span>
                    <span
                      className={
                        log.direction === 'rx' ? 'text-cyan' : log.direction === 'tx' ? 'text-orange' : 'text-muted'
                      }
                    >
                      {log.direction === 'rx' ? '←' : log.direction === 'tx' ? '→' : '·'} {log.text}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void send()}
                placeholder="PING, TEST ULTRASONIC, TEST SERVO…"
                className="min-w-0 flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-[#47656e]"
              />
              <button
                onClick={() => void send()}
                className="rounded-lg bg-white/10 px-3.5 py-2 text-xs text-white transition hover:bg-cyan hover:text-ink"
              >
                Envoyer
              </button>
            </div>
          </div>

          {/* Live Readings */}
          <div className="space-y-3">
            <div>
              <p className="eyebrow">02 / Télémétrie en direct</p>
              <p className="mt-1 text-xs text-muted">Valeurs décodées à partir des trames série du microcontrôleur.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className="text-[10px] tracking-wider text-muted font-mono">DISTANCE</p>
                <p className="mt-2 font-mono text-base font-semibold text-white">{lastReading.distance}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className="text-[10px] tracking-wider text-muted font-mono">SERVO ANGLE</p>
                <p className="mt-2 font-mono text-base font-semibold text-white">{lastReading.servo}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className="text-[10px] tracking-wider text-muted font-mono">TEMPÉRATURE</p>
                <p className="mt-2 font-mono text-base font-semibold text-white">{lastReading.temperature}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className="text-[10px] tracking-wider text-muted font-mono">TENSION RAIL</p>
                <p className="mt-2 font-mono text-base font-semibold text-white">{lastReading.power}</p>
              </div>
            </div>
            <div className="rounded-xl border border-cyan/15 bg-cyan/[.04] p-3 text-[11px] leading-5 text-muted">
              Le firmware doit répondre par une ligne contenant <span className="font-mono text-cyan">PASS</span>,{' '}
              <span className="font-mono text-cyan">OK</span> ou <span className="font-mono text-orange">FAIL</span>. En l'absence de
              réponse sous 3s, le composant passe en <span className="text-orange font-semibold">Faulty</span>.
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Benchmark: Arduino & Ultrasonic Sensor */}
      <ArduinoUltrasonicBench
        isConnected={isConnected}
        lastDistance={lastReading.distance}
        boardState={testStates.board}
        sonarState={testStates.ultrasonic}
        onSendCommand={async (cmd: string) => {
          const test = tests.find(t => t.command === cmd)
          if (test) await runTest(test)
        }}
      />

      <TestGuides />

      <label className="block rounded-xl border border-white/10 p-4 text-sm text-muted">
        Matériel concerné par un signalement de panne
        <select value={faultItemId} onChange={e => { setFaultItemId(e.target.value); setReportedKeys({}) }} className="mt-2 block w-full rounded-lg bg-ink p-3 text-white">
          <option value="">Sélectionner un article de votre inventaire</option>
          {inventory.map(i => <option key={i.id} value={i.id}>{i.name} — {i.id}</option>)}
        </select>
      </label>
      {/* Component Tests Grid */}
      <div>
        <div className="mb-3.5 flex items-end justify-between">
          <div>
            <p className="eyebrow">03 / Tests Unitaires Matériel</p>
            <h2 className="mt-2 text-xl text-white">Vérification des capteurs, moteurs & circuits</h2>
          </div>
          <span className="hidden text-xs text-muted sm:block">{tests.length} protocoles de test matériels</span>
        </div>

        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {tests.map((test) => {
            const state = testStates[test.key]
            const isReported = reportedKeys[test.key]
            const isReporting = reportingKey === test.key
            const mapping = inventory.find(i => i.id === faultItemId)

            return (
              <motion.div
                layout
                key={test.key}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[.035] p-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[.18em] text-muted">{test.family}</span>
                        {mapping && (
                          <span className="rounded bg-white/5 px-1.5 py-0.2 font-mono text-[9px] text-muted">
                            SKU: {mapping.id}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-white">{test.label}</p>
                      <p className="mt-1 text-xs text-muted">{test.detail}</p>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={state}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`status-dot mt-1 shrink-0 ${
                          state === 'working'
                            ? 'status-dot-working'
                            : state === 'faulty'
                            ? 'status-dot-faulty'
                            : 'status-dot-idle'
                        }`}
                      />
                    </AnimatePresence>
                  </div>

                  {/* Error detail if faulty */}
                  {state === 'faulty' && errorDetails[test.key] && (
                    <div className="mt-2.5 rounded-lg border border-orange/20 bg-orange/5 p-2 font-mono text-[10px] text-orange">
                      {errorDetails[test.key]}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {/* Primary Test Button */}
                  <button
                    onClick={() => void runTest(test)}
                    disabled={!isConnected || Object.values(testStates).includes('testing')}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 py-2.5 px-3 text-xs text-fog transition hover:border-cyan/40 hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>
                      {state === 'testing'
                        ? 'Test en cours…'
                        : state === 'working'
                        ? 'Test Validé (OK)'
                        : state === 'faulty'
                        ? 'Relancer le test'
                        : 'Lancer le test'}
                    </span>
                    <span>{state === 'working' ? '✓' : state === 'testing' ? '…' : '→'}</span>
                  </button>

                  {/* Feature 2: Quick Action Button when Faulty */}
                  {state === 'faulty' && (
                    <button
                      onClick={() => void reportFault(test)}
                      disabled={isReported || isReporting || !faultItemId}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg border py-2 px-3 text-xs font-semibold transition ${
                        isReported
                          ? 'border-mint/30 bg-mint/10 text-mint'
                          : 'border-orange/50 bg-orange/15 text-orange hover:bg-orange hover:text-white'
                      }`}
                    >
                      <span>{isReported ? '✓' : '⚠️'}</span>
                      <span>
                        {isReported
                          ? 'Signalé & Retiré du stock'
                          : isReporting
                          ? 'Mise à jour inventaire…'
                          : 'Signaler en panne & Retirer du stock'}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Feature 2: Maintenance Journal / Defauts Recents */}
      <div className="glass-panel rounded-[22px] p-5 sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange/10 text-orange text-sm">
              🛠️
            </span>
            <div>
              <h3 className="text-base font-semibold text-white">Journal de Maintenance & Sécurité Matériel</h3>
              <p className="text-xs text-muted">
                Traçabilité des composants défectueux retirés du stock suite aux tests banc
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 font-mono text-[10px] text-muted">
            {maintenanceLogs.length} entrée{maintenanceLogs.length > 1 ? 's' : ''}
          </span>
        </div>

        {maintenanceLogs.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">Aucune défaillance signalée récemment.</p>
        ) : (
          <div className="space-y-2.5 max-h-[280px] overflow-auto pr-1">
            {maintenanceLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{log.itemName || log.itemId}</span>
                    <span className="rounded bg-orange/10 px-1.5 py-0.5 font-mono text-[9px] text-orange">
                      {log.status}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-muted truncate">{log.errorDetail}</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between text-[10px] text-muted shrink-0">
                  <span className="text-fog font-medium">{log.reportedBy}</span>
                  <span>{new Date(log.reportedAt).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TestHistory runs={testRuns} />
    </div>
  )
}
