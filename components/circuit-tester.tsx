'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type SerialPortLike = { open: (options: { baudRate: number }) => Promise<void>; close: () => Promise<void>; readable: ReadableStream<Uint8Array> | null; writable: WritableStream<Uint8Array> | null; getInfo?: () => { usbVendorId?: number; usbProductId?: number } }
type SerialLike = { requestPort: () => Promise<SerialPortLike>; getPorts: () => Promise<SerialPortLike[]>; addEventListener?: (event: string, handler: () => void) => void }
type NavigatorWithSerial = Navigator & { serial?: SerialLike }
type LogEntry = { id: number; time: string; direction: 'rx' | 'tx' | 'system'; text: string }
type TestState = 'idle' | 'testing' | 'working' | 'faulty'
type TestKey = 'board' | 'ultrasonic' | 'pir' | 'line' | 'dht11' | 'imu' | 'servo' | 'dcMotor' | 'stepper' | 'driver' | 'relay' | 'led' | 'power'
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

const initialStates = tests.reduce<Record<TestKey, TestState>>((states, test) => ({ ...states, [test.key]: 'idle' }), {} as Record<TestKey, TestState>)

function stamp() { return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) }
function testKeyFromLine(line: string): TestKey | null {
  const value = line.toLowerCase()
  if (/pong|ready|handshake|board|microcontroller/.test(value)) return 'board'
  if (/ultrasonic|distance/.test(value)) return 'ultrasonic'
  if (/pir|motion/.test(value)) return 'pir'
  if (/line|reflect/.test(value)) return 'line'
  if (/dht|humidity|temperature|temp/.test(value)) return 'dht11'
  if (/imu|mpu|gyro|acceler/.test(value)) return 'imu'
  if (/servo/.test(value)) return 'servo'
  if (/dc motor|tt motor|motor/.test(value)) return 'dcMotor'
  if (/stepper|step/.test(value)) return 'stepper'
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
  const [logs, setLogs] = useState<LogEntry[]>([{ id: 1, time: stamp(), direction: 'system', text: 'Bench ready. Connect a board to begin.' }])
  const [testStates, setTestStates] = useState<Record<TestKey, TestState>>(initialStates)
  const [handshake, setHandshake] = useState<HandshakeState>('idle')
  const [lastReading, setLastReading] = useState({ distance: '--', servo: '--', led: '—', temperature: '--', power: '--' })
  const [lastSignal, setLastSignal] = useState('--')
  const [portInfo, setPortInfo] = useState('USB device not selected')
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const keepReadingRef = useRef(false)
  const logId = useRef(2)
  const pendingRef = useRef<Set<TestKey>>(new Set())
  const activeTestRef = useRef<TestKey | null>(null)

  const addLog = useCallback((text: string, direction: LogEntry['direction'] = 'system') => {
    setLogs((current) => [...current.slice(-100), { id: logId.current++, time: stamp(), direction, text }])
  }, [])

  useEffect(() => {
    const serial = (navigator as NavigatorWithSerial).serial
    setIsSupported(Boolean(serial))
    serial?.addEventListener?.('disconnect', () => { setIsConnected(false); setPort(null); addLog('USB device disconnected.', 'system') })
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

    const key = testKeyFromLine(line) ?? activeTestRef.current
    if (/pong|ready|hello|handshake.*ok/i.test(line)) setHandshake('working')
    if (/pass|working|ok|ready|pong/i.test(line) && key) { setTestStates((state) => ({ ...state, [key]: 'working' })); pendingRef.current.delete(key); if (activeTestRef.current === key) activeTestRef.current = null }
    if (/fail|fault|error|timeout/i.test(line) && key) { setTestStates((state) => ({ ...state, [key]: 'faulty' })); pendingRef.current.delete(key); if (key === 'board') setHandshake('faulty'); if (activeTestRef.current === key) activeTestRef.current = null }
  }, [])

  const readLoop = useCallback(async (activePort: SerialPortLike) => {
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
        lines.filter(Boolean).forEach((line) => { addLog(line, 'rx'); parseLine(line) })
      }
    } catch (error) { addLog(`Read stopped: ${error instanceof Error ? error.message : 'unknown serial error'}`) }
    finally { reader.releaseLock(); readerRef.current = null }
  }, [addLog, parseLine])

  const writeToPort = useCallback(async (target: SerialPortLike, value: string, record = true) => {
    const clean = value.trim()
    if (!clean || !target.writable) return false
    if (record) addLog(clean, 'tx')
    const writer = target.writable.getWriter()
    try { await writer.write(encoder.encode(`${clean}\n`)); return true } catch (error) { addLog(`Write failed: ${error instanceof Error ? error.message : 'unknown serial error'}`); return false } finally { writer.releaseLock() }
  }, [addLog])

  const connect = async () => {
    const serial = (navigator as NavigatorWithSerial).serial
    if (!serial) { addLog('Web Serial is unavailable. Use Chrome or Edge on desktop.'); return }
    try {
      const nextPort = await serial.requestPort()
      await nextPort.open({ baudRate: Number(baudRate) })
      const info = nextPort.getInfo?.()
      setPort(nextPort); setIsConnected(true); setHandshake('idle'); setPortInfo(info?.usbVendorId ? `USB VID ${info.usbVendorId.toString(16).toUpperCase()} · PID ${(info.usbProductId ?? 0).toString(16).toUpperCase()}` : 'USB serial device')
      addLog(`Connected at ${baudRate} baud.`, 'system'); void readLoop(nextPort)
    } catch (error) { addLog(`Connection cancelled or failed: ${error instanceof Error ? error.message : 'unknown error'}`) }
  }

  const disconnect = async () => {
    keepReadingRef.current = false
    await readerRef.current?.cancel()
    if (port) await port.close().catch(() => undefined)
    pendingRef.current.clear(); activeTestRef.current = null; setPort(null); setIsConnected(false); setHandshake('idle'); setPortInfo('USB device not selected'); addLog('Board disconnected.', 'system')
  }

  const send = async (value = command) => {
    const clean = value.trim(); if (!clean) return
    setCommand('')
    if (!port) { addLog('Connect a board before sending commands.'); return }
    await writeToPort(port, clean)
  }

  const runTest = async (test: HardwareTest) => {
    if (!port) return
    pendingRef.current.add(test.key); activeTestRef.current = test.key
    setTestStates((state) => ({ ...state, [test.key]: 'testing' }));
    if (test.key === 'board') setHandshake('working')
    addLog(`Running ${test.label}…`, 'system')
    await writeToPort(port, test.command)
    window.setTimeout(() => {
      if (pendingRef.current.has(test.key)) {
        pendingRef.current.delete(test.key); if (activeTestRef.current === test.key) activeTestRef.current = null
        setTestStates((state) => ({ ...state, [test.key]: 'faulty' }))
        if (test.key === 'board') setHandshake('faulty')
        addLog(`${test.label}: no PASS/OK response within 3 seconds.`, 'system')
      }
    }, 3000)
  }

  const connectionLabel = useMemo(() => !isSupported ? 'Browser unsupported' : isConnected ? 'USB connected' : 'Awaiting board', [isConnected, isSupported])
  const passedTests = Object.values(testStates).filter((state) => state === 'working').length
  const faultyTests = Object.values(testStates).filter((state) => state === 'faulty').length

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="stat-card"><p className="eyebrow">Connection</p><p className="mt-3 text-lg text-white"><span className={`status-dot mr-2 ${isConnected ? 'status-dot-working' : 'status-dot-idle'}`} />{connectionLabel}</p><p className="mt-1 truncate text-[11px] text-muted">{portInfo}</p></div>
        <div className="stat-card"><p className="eyebrow">Serial handshake</p><p className="mt-3 text-lg text-white"><span className={`status-dot mr-2 ${handshake === 'working' ? 'status-dot-working' : handshake === 'faulty' ? 'status-dot-faulty' : 'status-dot-idle'}`} />{handshake === 'working' ? 'Verified' : handshake === 'faulty' ? 'No response' : 'Not checked'}</p><button onClick={() => void runTest(tests[0])} disabled={!isConnected} className="mt-1 text-[11px] text-cyan disabled:opacity-40">Send PING check →</button></div>
        <div className="stat-card"><p className="eyebrow">Last signal</p><p className="mt-3 font-mono text-lg text-cyan">{lastSignal}</p><p className="mt-1 text-[11px] text-muted">RX activity from the board</p></div>
        <div className="stat-card"><p className="eyebrow">Test score</p><p className="mt-3 text-lg text-white"><span className="text-mint">{passedTests}</span><span className="mx-1 text-muted">/</span>{tests.length}<span className="ml-2 text-xs text-muted">passed</span></p><p className="mt-1 text-[11px] text-muted">{faultyTests ? `${faultyTests} faulty response${faultyTests > 1 ? 's' : ''}` : 'No faults detected yet'}</p></div>
      </div>

      <div className="glass-panel overflow-hidden rounded-[24px]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6"><div><p className="eyebrow">01 / Hardware link</p><h2 className="mt-2 text-xl text-white">Connect and verify your workbench</h2><p className="mt-1 text-xs text-muted">USB connection → serial handshake → live signal → component response.</p></div><div className="flex gap-2"><select value={baudRate} onChange={(event) => setBaudRate(event.target.value)} disabled={isConnected} className="rounded-full border border-white/10 bg-transparent px-3 py-2 text-xs text-fog outline-none disabled:opacity-50"><option value="9600">9,600 baud</option><option value="115200">115,200 baud</option><option value="230400">230,400 baud</option></select><button onClick={isConnected ? disconnect : connect} className={`rounded-full px-5 py-3 text-xs font-semibold transition ${isConnected ? 'border border-orange/40 bg-orange/10 text-orange' : 'bg-cyan text-ink hover:bg-white'}`}>{isConnected ? 'Disconnect board' : 'Connect via USB'} <span className="ml-2">↗</span></button></div></div>
        {!isSupported && <div className="border-b border-orange/20 bg-orange/5 px-6 py-3 text-xs text-orange">Web Serial is not available in this browser. Open the app in Chrome or Edge on desktop.</div>}
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="min-h-[340px] rounded-2xl border border-white/10 bg-[#06141b] p-4"><div className="mb-4 flex items-center justify-between"><p className="font-mono text-[11px] text-muted">SERIAL / OUTPUT</p><span className="text-[10px] uppercase tracking-[.2em] text-muted">{logs.length} lines</span></div><div className="terminal-scroll max-h-[280px] space-y-2 overflow-auto pr-2 font-mono text-xs leading-5">{logs.map((log) => <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={log.id} className="flex gap-3"><span className="shrink-0 text-[#47656e]">{log.time}</span><span className={log.direction === 'rx' ? 'text-cyan' : log.direction === 'tx' ? 'text-orange' : 'text-muted'}>{log.direction === 'rx' ? '←' : log.direction === 'tx' ? '→' : '·'} {log.text}</span></motion.div>)}</div><div className="mt-5 flex gap-2 border-t border-white/10 pt-4"><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void send()} placeholder="PING, TEST SERVO, AT…" className="min-w-0 flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-[#47656e]"/><button onClick={() => void send()} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-cyan hover:text-ink">Send</button></div></div>
          <div className="space-y-3"><div><p className="eyebrow">02 / Live readings</p><p className="mt-1 text-xs text-muted">Parsed from incoming serial output.</p></div><div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">DISTANCE</p><p className="mt-2 font-mono text-sm text-white">{lastReading.distance}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">SERVO</p><p className="mt-2 font-mono text-sm text-white">{lastReading.servo}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">TEMP</p><p className="mt-2 font-mono text-sm text-white">{lastReading.temperature}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">POWER</p><p className="mt-2 font-mono text-sm text-white">{lastReading.power}</p></div></div><div className="rounded-xl border border-cyan/15 bg-cyan/[.04] p-3 text-[11px] leading-5 text-muted">Your firmware should answer each command with a line containing <span className="font-mono text-cyan">PASS</span>, <span className="font-mono text-cyan">OK</span>, or <span className="font-mono text-orange">FAIL</span>. The tester marks a test Faulty after 3 seconds without a response.</div></div>
        </div>
      </div>

      <div><div className="mb-3 flex items-end justify-between"><div><p className="eyebrow">03 / Component checks</p><h2 className="mt-2 text-xl text-white">Verify every connected part</h2></div><span className="hidden text-xs text-muted sm:block">{tests.length} hardware checks · response-based</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tests.map((test) => { const state = testStates[test.key]; return <motion.div layout key={test.key} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-[10px] uppercase tracking-[.18em] text-muted">{test.family}</p><p className="mt-2 text-sm font-medium text-white">{test.label}</p><p className="mt-1 text-xs text-muted">{test.detail}</p></div><AnimatePresence mode="wait"><motion.span key={state} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} className={`status-dot mt-1 ${state === 'working' ? 'status-dot-working' : state === 'faulty' ? 'status-dot-faulty' : 'status-dot-idle'}`} /></AnimatePresence></div><button onClick={() => void runTest(test)} disabled={!isConnected || state === 'testing'} className="mt-5 flex w-full items-center justify-between rounded-lg border border-white/10 py-2.5 px-3 text-xs text-fog transition hover:border-cyan/40 hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-40"><span>{state === 'testing' ? 'Test in progress…' : state === 'working' ? 'Working / response received' : state === 'faulty' ? 'Faulty / retry test' : 'Run hardware test'}</span><span>{state === 'working' ? '✓' : state === 'testing' ? '…' : '→'}</span></button></motion.div> })}</div></div>
    </div>
  )
}
