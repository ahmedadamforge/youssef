'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type SerialPortLike = { open: (options: { baudRate: number }) => Promise<void>; close: () => Promise<void>; readable: ReadableStream<Uint8Array> | null; writable: WritableStream<Uint8Array> | null }
type SerialLike = { requestPort: () => Promise<SerialPortLike>; getPorts: () => Promise<SerialPortLike[]> }
type NavigatorWithSerial = Navigator & { serial?: SerialLike }
type LogEntry = { id: number; time: string; direction: 'rx' | 'tx' | 'system'; text: string }
type TestState = 'idle' | 'working' | 'faulty'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const tests: { key: 'servo' | 'ultrasonic' | 'led'; label: string; detail: string; command: string }[] = [
  { key: 'servo', label: 'Servo motor', detail: 'Sweep 0° → 180° → 0°', command: 'TEST SERVO' },
  { key: 'ultrasonic', label: 'Ultrasonic', detail: 'Echo / distance pulse', command: 'TEST ULTRASONIC' },
  { key: 'led', label: 'LED output', detail: 'GPIO high / low response', command: 'TEST LED' },
]

function stamp() { return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()) }

export default function CircuitTester() {
  const [port, setPort] = useState<SerialPortLike | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [baudRate, setBaudRate] = useState('115200')
  const [command, setCommand] = useState('')
  const [logs, setLogs] = useState<LogEntry[]>([{ id: 1, time: stamp(), direction: 'system', text: 'Bench ready. Connect a board to begin.' }])
  const [testStates, setTestStates] = useState<Record<string, TestState>>({ servo: 'idle', ultrasonic: 'idle', led: 'idle' })
  const [lastReading, setLastReading] = useState({ distance: '--', servo: '--', led: '—' })
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const keepReadingRef = useRef(false)
  const logId = useRef(2)

  const addLog = useCallback((text: string, direction: LogEntry['direction'] = 'system') => {
    setLogs((current) => [...current.slice(-80), { id: logId.current++, time: stamp(), direction, text }])
  }, [])

  useEffect(() => { setIsSupported('serial' in navigator) }, [])

  const parseLine = useCallback((line: string) => {
    const distance = line.match(/(?:distance|ultrasonic)\s*[:=]\s*(\d+(?:\.\d+)?)\s*cm/i)
    const servo = line.match(/servo\s*[:=]\s*(\d+)/i)
    const led = line.match(/led\s*[:=]\s*(on|off|high|low)/i)
    if (distance) setLastReading((reading) => ({ ...reading, distance: `${distance[1]} cm` }))
    if (servo) setLastReading((reading) => ({ ...reading, servo: `${servo[1]}°` }))
    if (led) setLastReading((reading) => ({ ...reading, led: led[1].toUpperCase() }))
    if (/pass|working|ok|ready/i.test(line)) setTestStates((state) => ({ ...state, servo: /servo/i.test(line) ? 'working' : state.servo, ultrasonic: /ultrasonic|distance/i.test(line) ? 'working' : state.ultrasonic, led: /led/i.test(line) ? 'working' : state.led }))
    if (/fail|fault|error/i.test(line)) setTestStates((state) => ({ ...state, servo: /servo/i.test(line) ? 'faulty' : state.servo, ultrasonic: /ultrasonic|distance/i.test(line) ? 'faulty' : state.ultrasonic, led: /led/i.test(line) ? 'faulty' : state.led }))
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

  const connect = async () => {
    const serial = (navigator as NavigatorWithSerial).serial
    if (!serial) { addLog('Web Serial is unavailable. Use Chrome or Edge on desktop.'); return }
    try {
      const nextPort = await serial.requestPort()
      await nextPort.open({ baudRate: Number(baudRate) })
      setPort(nextPort); setIsConnected(true); addLog(`Connected at ${baudRate} baud.`, 'system'); void readLoop(nextPort)
    } catch (error) { addLog(`Connection cancelled or failed: ${error instanceof Error ? error.message : 'unknown error'}`) }
  }

  const disconnect = async () => {
    keepReadingRef.current = false
    await readerRef.current?.cancel()
    if (port) { await port.close().catch(() => undefined) }
    setPort(null); setIsConnected(false); addLog('Board disconnected.', 'system')
  }

  const send = async (value = command) => {
    const clean = value.trim(); if (!clean) return
    addLog(clean, 'tx'); setCommand('')
    if (!port?.writable) { addLog('Connect a board before sending commands.'); return }
    const writer = port.writable.getWriter()
    try { await writer.write(encoder.encode(`${clean}\n`)) } finally { writer.releaseLock() }
  }

  const runTest = async (key: 'servo' | 'ultrasonic' | 'led', testCommand: string) => {
    setTestStates((state) => ({ ...state, [key]: 'working' })); addLog(`Running ${key} test…`, 'system'); await send(testCommand)
  }

  const connectionLabel = useMemo(() => isConnected ? 'Working' : isSupported ? 'Awaiting board' : 'Browser unsupported', [isConnected, isSupported])

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="eyebrow">Connection</p><p className="mt-3 text-lg text-white"><span className={`status-dot mr-2 ${isConnected ? 'status-dot-working' : 'status-dot-idle'}`} />{connectionLabel}</p></div>
        <div className="stat-card"><p className="eyebrow">Serial speed</p><div className="mt-2 flex items-center gap-2"><select value={baudRate} onChange={(event) => setBaudRate(event.target.value)} className="w-full bg-transparent text-lg text-white outline-none"><option value="9600">9,600 baud</option><option value="115200">115,200 baud</option><option value="230400">230,400 baud</option></select></div></div>
        <div className="stat-card"><p className="eyebrow">Live readings</p><p className="mt-3 font-mono text-lg text-cyan">{lastReading.distance} <span className="text-muted">/</span> {lastReading.servo}</p></div>
      </div>

      <div className="glass-panel overflow-hidden rounded-[24px]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6"><div><p className="eyebrow">01 / Hardware link</p><h2 className="mt-2 text-xl text-white">Connect your workbench</h2></div><button onClick={isConnected ? disconnect : connect} className={`rounded-full px-5 py-3 text-xs font-semibold transition ${isConnected ? 'border border-orange/40 bg-orange/10 text-orange' : 'bg-cyan text-ink hover:bg-white'}`}>{isConnected ? 'Disconnect board' : 'Connect via USB'} <span className="ml-2">↗</span></button></div>
        {!isSupported && <div className="border-b border-orange/20 bg-orange/5 px-6 py-3 text-xs text-orange">Web Serial is not available in this browser. Open the app in Chrome or Edge on desktop.</div>}
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="min-h-[320px] rounded-2xl border border-white/10 bg-[#06141b] p-4"><div className="mb-4 flex items-center justify-between"><p className="font-mono text-[11px] text-muted">SERIAL / OUTPUT</p><span className="text-[10px] uppercase tracking-[.2em] text-muted">{logs.length} lines</span></div><div className="terminal-scroll max-h-[260px] space-y-2 overflow-auto pr-2 font-mono text-xs leading-5">{logs.map((log) => <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} key={log.id} className="flex gap-3"><span className="shrink-0 text-[#47656e]">{log.time}</span><span className={log.direction === 'rx' ? 'text-cyan' : log.direction === 'tx' ? 'text-orange' : 'text-muted'}>{log.direction === 'rx' ? '←' : log.direction === 'tx' ? '→' : '·'} {log.text}</span></motion.div>)}</div><div className="mt-5 flex gap-2 border-t border-white/10 pt-4"><input value={command} onChange={(event) => setCommand(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void send()} placeholder="Send an AT command…" className="min-w-0 flex-1 bg-transparent font-mono text-xs text-white outline-none placeholder:text-[#47656e]"/><button onClick={() => void send()} className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-cyan hover:text-ink">Send</button></div></div>
          <div className="space-y-3"><div><p className="eyebrow">Live board readings</p><p className="mt-1 text-xs text-muted">Parsed from incoming serial output.</p></div><div className="grid grid-cols-3 gap-2"><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">DISTANCE</p><p className="mt-2 font-mono text-sm text-white">{lastReading.distance}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">SERVO</p><p className="mt-2 font-mono text-sm text-white">{lastReading.servo}</p></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-[10px] text-muted">LED</p><p className="mt-2 font-mono text-sm text-white">{lastReading.led}</p></div></div><p className="pt-3 text-[11px] leading-5 text-muted">Tip: your Arduino sketch can print lines like <span className="font-mono text-cyan">distance: 24.8 cm</span> or <span className="font-mono text-cyan">servo: 90</span> and the tester will parse them automatically.</p></div>
        </div>
      </div>

      <div><div className="mb-3 flex items-end justify-between"><div><p className="eyebrow">02 / Component checks</p><h2 className="mt-2 text-xl text-white">Run a quick health test</h2></div><span className="hidden text-xs text-muted sm:block">Results update from board responses</span></div><div className="grid gap-3 md:grid-cols-3">{tests.map((test) => { const state = testStates[test.key]; return <motion.div layout key={test.key} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-white">{test.label}</p><p className="mt-1 text-xs text-muted">{test.detail}</p></div><AnimatePresence mode="wait"><motion.span key={state} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} className={`status-dot ${state === 'working' ? 'status-dot-working' : state === 'faulty' ? 'status-dot-faulty' : 'status-dot-idle'}`} /></AnimatePresence></div><button onClick={() => void runTest(test.key, test.command)} disabled={!isConnected} className="mt-5 w-full rounded-lg border border-white/10 py-2.5 text-xs text-fog transition hover:border-cyan/40 hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-40">{state === 'working' ? 'Test running…' : state === 'faulty' ? 'Retry test' : 'Run test'} <span className="ml-2">→</span></button></motion.div> })}</div></div>
    </div>
  )
}
