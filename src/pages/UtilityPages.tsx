import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { calculateMonitorMetrics, calculatePollingIntervalMs } from '../lib/calculators/monitor'
import { estimateWorkload, type HardwareTier } from '../lib/calculators/performance'
import { CALCULATORS } from '../lib/registry'
import { GAME_LIBRARY } from '../lib/games'
import { useAppState } from '../state/useAppState'
import type { RecentCalculation, SavedSetup } from '../state/model'
import { LEARN_ARTICLES } from './LearnContent'

const defaultSetup: Omit<SavedSetup, 'id'> = {
  name: 'My FPS Setup', dpi: 800, pollingRate: 1000, resolutionWidth: 1920, resolutionHeight: 1080,
  refreshRate: 240, monitorSize: 24, game: 'valorant', sensitivity: 0.35, fov: 103, adsMultiplier: 1,
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
}

function formatRelativeDate(timestamp: number) {
  const elapsedMs = Math.max(0, Date.now() - timestamp)
  if (elapsedMs < 60_000) return 'Just now'
  if (elapsedMs < 60 * 60_000) return `${Math.floor(elapsedMs / 60_000)} min ago`
  if (elapsedMs < 24 * 60 * 60_000) return `${Math.floor(elapsedMs / (60 * 60_000))} hr ago`
  const then = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (then.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (elapsedMs < 7 * 24 * 60 * 60_000) return `${Math.floor(elapsedMs / (24 * 60 * 60_000))} days ago`
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: then.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(then)
}

function getRecentRoute(entry: RecentCalculation) {
  const calculator = CALCULATORS.find((item) => item.id === entry.calculator)
  if (!calculator) return '/'
  const params = new URLSearchParams()
  Object.entries(entry.values ?? {}).forEach(([key, value]) => params.set(key, String(value)))
  if (entry.calculator === 'sensitivity') {
    if (entry.fromGame) params.set('from', entry.fromGame)
    if (entry.toGame) params.set('to', entry.toGame)
    return `${calculator.route}?${params.toString()}`
  }
  return params.size ? `${calculator.route}?${params.toString()}` : calculator.route
}

export function FavoritesPage() {
  const { data, toggleFavorite } = useAppState()
  const [feedback, setFeedback] = useState('')
  const calculators = CALCULATORS.filter((calculator) => data.favorites.calculators.includes(calculator.id))
  const games = GAME_LIBRARY.filter((game) => data.favorites.games.includes(game.id))

  return (
    <section className="content-page">
      <PageHeading eyebrow="Your library" title="Favorites" subtitle="Saved tools and games stay on this device." />
      <h3 className="list-section-title">Favorite calculators</h3>
      {calculators.length ? <div className="compact-list">{calculators.map((calculator) => <div className="compact-row" key={calculator.id}><span>{calculator.icon} {calculator.title}</span><div><Link to={calculator.route} className="text-action">Open</Link><button className="text-action" onClick={() => { toggleFavorite('calculators', calculator.id); setFeedback(`Removed ${calculator.title} from favorites.`) }}>Remove</button></div></div>)}</div> : <EmptyState>Save a calculator or game to access it quickly.</EmptyState>}
      <h3 className="list-section-title">Favorite games</h3>
      {games.length ? <div className="compact-list">{games.map((game) => <div className="compact-row" key={game.id}><span>{game.name}</span><button className="text-action" onClick={() => { toggleFavorite('games', game.id); setFeedback(`Removed ${game.name} from favorites.`) }}>Remove</button></div>)}</div> : <EmptyState>Save a calculator or game to access it quickly.</EmptyState>}
      <h3 className="list-section-title">Saved setups</h3>
      <SetupList />
      <p role="status" className="status-message">{feedback}</p>
    </section>
  )
}

export function RecentPage() {
  const { data, removeRecent, clearRecent } = useAppState()
  const copy = async (text: string) => {
    if (navigator.clipboard) await navigator.clipboard.writeText(text)
    else window.prompt('Copy this result:', text)
  }

  return (
    <section className="content-page">
      <PageHeading eyebrow="Your activity" title="Recent calculations" subtitle="Only calculations you choose to save appear here." />
      {data.recent.length > 0 && <button className="secondary-btn" onClick={() => { if (window.confirm('Clear all recent calculations?')) clearRecent() }}>Clear history</button>}
      {data.recent.length ? <div className="compact-list recent-list">{data.recent.map((entry) => {
        const calculator = CALCULATORS.find((item) => item.id === entry.calculator)
        return <article className="compact-row recent-row" key={entry.id}>
          <div><strong>{calculator?.title ?? entry.calculator}</strong><p>{entry.inputSummary} <span aria-hidden="true">→</span> {entry.resultSummary}</p><small>{formatRelativeDate(entry.timestamp)}</small></div>
          <div><button className="text-action" onClick={() => void copy(`${entry.inputSummary} → ${entry.resultSummary}`)}>Copy</button><Link className="text-action" to={getRecentRoute(entry)}>Open</Link><button className="text-action" onClick={() => removeRecent(entry.id)}>Delete</button></div>
        </article>
      })}</div> : <EmptyState>Your saved calculations will show here. Choose “Save to recent” after a result.</EmptyState>}
    </section>
  )
}

export function SetupsPage() {
  const { saveSetup, removeSetup, duplicateSetup } = useAppState()
  const [setup, setSetup] = useState(defaultSetup)
  const [editingId, setEditingId] = useState<string>()
  const setField = (field: keyof typeof defaultSetup, value: string) => setSetup((current) => ({ ...current, [field]: field === 'name' || field === 'game' ? value : Number(value) }))
  const edit = (saved: SavedSetup) => {
    const { id, ...values } = saved
    setSetup(values)
    setEditingId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!setup.name.trim() || Object.entries(setup).some(([key, value]) => key !== 'name' && key !== 'game' && key !== 'id' && (!Number.isFinite(value) || Number(value) <= 0))) return
    saveSetup(setup, editingId)
    setSetup(defaultSetup)
    setEditingId(undefined)
  }

  return <section className="content-page">
    <PageHeading eyebrow="Local profile" title="My setups" subtitle="Save multiple loadouts on this device and reopen them in the sensitivity converter." />
    <form className="setup-form" onSubmit={submit}>
      <h3>{editingId ? 'Edit setup' : 'New setup'}</h3>
      <div className="form-grid">
        <Field label="Setup name"><input required value={setup.name} onChange={(event) => setField('name', event.target.value)} /></Field>
        <Field label="Game"><select value={setup.game} onChange={(event) => setField('game', event.target.value)}>{GAME_LIBRARY.map((game) => <option key={game.id} value={game.id}>{game.name}</option>)}</select></Field>
        <Field label="Mouse DPI"><input required type="number" min="1" value={setup.dpi} onChange={(event) => setField('dpi', event.target.value)} /></Field>
        <Field label="Polling rate (Hz)"><input required type="number" min="1" value={setup.pollingRate} onChange={(event) => setField('pollingRate', event.target.value)} /></Field>
        <Field label="Horizontal resolution"><input required type="number" min="1" value={setup.resolutionWidth} onChange={(event) => setField('resolutionWidth', event.target.value)} /></Field>
        <Field label="Vertical resolution"><input required type="number" min="1" value={setup.resolutionHeight} onChange={(event) => setField('resolutionHeight', event.target.value)} /></Field>
        <Field label="Refresh rate (Hz)"><input required type="number" min="1" value={setup.refreshRate} onChange={(event) => setField('refreshRate', event.target.value)} /></Field>
        <Field label="Monitor size (inches)"><input required type="number" min="1" step="0.1" value={setup.monitorSize} onChange={(event) => setField('monitorSize', event.target.value)} /></Field>
        <Field label="Sensitivity"><input required type="number" min="0.001" step="0.001" value={setup.sensitivity} onChange={(event) => setField('sensitivity', event.target.value)} /></Field>
        <Field label="Horizontal FOV"><input required type="number" min="1" max="179" value={setup.fov} onChange={(event) => setField('fov', event.target.value)} /></Field>
        <Field label="ADS multiplier"><input required type="number" min="0.01" step="0.01" value={setup.adsMultiplier} onChange={(event) => setField('adsMultiplier', event.target.value)} /></Field>
      </div>
      <div className="cta-row"><button className="primary-btn" type="submit">{editingId ? 'Update setup' : 'Save setup'}</button>{editingId && <button className="secondary-btn" type="button" onClick={() => { setSetup(defaultSetup); setEditingId(undefined) }}>Cancel edit</button>}</div>
    </form>
    <SetupList onEdit={edit} onDelete={(id) => { if (window.confirm('Delete this setup?')) removeSetup(id) }} onDuplicate={duplicateSetup} />
  </section>
}

function SetupList({ onEdit, onDelete, onDuplicate }: { onEdit?: (setup: SavedSetup) => void; onDelete?: (id: string) => void; onDuplicate?: (id: string) => void }) {
  const { data, removeSetup, duplicateSetup } = useAppState()
  if (!data.setups.length) return <EmptyState>No saved setups yet. Create a setup to keep your settings together.</EmptyState>
  return <div className="compact-list">{data.setups.map((setup) => <article className="compact-row" key={setup.id}>
    <div><strong>{setup.name}</strong><p>{GAME_LIBRARY.find((game) => game.id === setup.game)?.name} · {setup.dpi} DPI · {setup.sensitivity} sens · {setup.resolutionWidth}×{setup.resolutionHeight} @ {setup.refreshRate} Hz</p></div>
    <div><Link className="text-action" to={`/calculators/sensitivity?from=${setup.game}&dpi=${setup.dpi}&sens=${setup.sensitivity}`}>Open</Link><button className="text-action" onClick={() => onEdit?.(setup)}>Edit</button><button className="text-action" onClick={() => onDuplicate ? onDuplicate(setup.id) : duplicateSetup(setup.id)}>Duplicate</button><button className="text-action" onClick={() => onDelete ? onDelete(setup.id) : window.confirm('Delete this setup?') && removeSetup(setup.id)}>Delete</button></div>
  </article>)}</div>
}

export function MonitorPage() {
  const [displays, setDisplays] = useState([{ diagonalInches: 24, widthPixels: 1920, heightPixels: 1080, refreshRateHz: 240 }])
  const [pollingRate, setPollingRate] = useState(1000)
  const addDisplay = () => setDisplays((items) => items.length < 3 ? [...items, { diagonalInches: 27, widthPixels: 2560, heightPixels: 1440, refreshRateHz: 165 }] : items)
  const update = (index: number, key: keyof typeof displays[number], value: string) => setDisplays((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: Number(value) } : item))
  const remove = (index: number) => setDisplays((items) => items.length > 1 ? items.filter((_, itemIndex) => itemIndex !== index) : items)
  const results = displays.map((display) => { try { return calculateMonitorMetrics(display) } catch { return null } })
  let pollingInterval: number | null = null
  try { pollingInterval = calculatePollingIntervalMs(pollingRate) } catch { pollingInterval = null }

  return <section className="content-page">
    <PageHeading eyebrow="Display tool" title="Monitor calculator" subtitle="Compare display density and refresh intervals using your monitor’s published specifications." />
    <div className="compare-toolbar"><span>{displays.length} of 3 displays</span><div><button className="text-action" onClick={() => setDisplays([{ diagonalInches: 24, widthPixels: 1920, heightPixels: 1080, refreshRateHz: 240 }])}>Reset</button><button className="secondary-btn" onClick={addDisplay} disabled={displays.length >= 3}>Add display</button></div></div>
    <div className="monitor-grid">{displays.map((display, index) => <article className="converter-panel monitor-panel" key={index}>
      <div className="panel-header"><h3>Display {String.fromCharCode(65 + index)}</h3>{displays.length > 1 && <button className="text-action" onClick={() => remove(index)}>Remove</button>}</div>
      <Field label="Diagonal size (inches)"><input type="number" min="1" step="0.1" value={display.diagonalInches} onChange={(event) => update(index, 'diagonalInches', event.target.value)} /></Field>
      <div className="form-grid two"><Field label="Width (pixels)"><input type="number" min="1" value={display.widthPixels} onChange={(event) => update(index, 'widthPixels', event.target.value)} /></Field><Field label="Height (pixels)"><input type="number" min="1" value={display.heightPixels} onChange={(event) => update(index, 'heightPixels', event.target.value)} /></Field></div>
      <Field label="Refresh rate (Hz)"><input type="number" min="1" value={display.refreshRateHz} onChange={(event) => update(index, 'refreshRateHz', event.target.value)} /></Field>
      {results[index] ? <div className="monitor-results"><Metric label="Aspect ratio" value={results[index]!.aspectRatio} /><Metric label="Pixel density" value={`${results[index]!.ppi.toFixed(2)} PPI`} /><Metric label="Pixel pitch" value={`${results[index]!.pixelPitchMm.toFixed(3)} mm`} /><Metric label="Total pixels" value={results[index]!.totalPixels.toLocaleString()} /><Metric label="Frame interval" value={`${results[index]!.frameTimeMs.toFixed(3)} ms`} /></div> : <p className="error-message" role="alert">Enter positive display dimensions and refresh rate.</p>}
    </article>)}</div>
    <section className="polling-tool"><h3>Mouse polling interval</h3><p>Nominal interval implied by the selected report rate. This is not end-to-end input latency.</p><div className="polling-input"><Field label="Polling rate (Hz)"><input type="number" min="1" max="10000" value={pollingRate} onChange={(event) => setPollingRate(Number(event.target.value))} /></Field>{pollingInterval === null ? <p className="error-message" role="alert">Enter a polling rate from 1 to 10,000 Hz.</p> : <Metric label="Nominal report interval" value={`${pollingInterval.toFixed(3)} ms`} />}</div><div className="interval-diagram" aria-label="Polling events occur at regular nominal intervals"><span /><span /><span /><span /><span /></div></section>
    <p className="fine-print">Pixel density uses the diagonal pixel count divided by diagonal size. Frame interval is the time between refresh opportunities; it is not a guarantee of rendered FPS.</p>
  </section>
}

export function PerformancePage() {
  const initial = { cpuTier: 'mid' as HardwareTier, gpuTier: 'mid' as HardwareTier, ramGb: 16, resolution: '1080p' as const, targetFps: 144, preset: 'high' as const, game: 'VALORANT' }
  const [inputs, setInputs] = useState(initial)
  const update = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) => setInputs((current) => ({ ...current, [key]: value }))
  const result = estimateWorkload(inputs)
  return <section className="content-page">
    <PageHeading eyebrow="Workload estimator" title="PC performance context" subtitle="A transparent workload classification, not an FPS prediction or bottleneck score." />
    <div className="calculator-layout">
      <div className="converter-panel">
        <div className="panel-label">Your target workload</div>
        <Field label="Game"><input value={inputs.game} onChange={(event) => update('game', event.target.value)} /></Field>
        <div className="form-grid two">
          <Field label="CPU tier (your estimate)"><select value={inputs.cpuTier} onChange={(event) => update('cpuTier', event.target.value as HardwareTier)}><option value="entry">Entry</option><option value="mid">Mid-range</option><option value="high">High-end</option></select></Field>
          <Field label="GPU tier (your estimate)"><select value={inputs.gpuTier} onChange={(event) => update('gpuTier', event.target.value as HardwareTier)}><option value="entry">Entry</option><option value="mid">Mid-range</option><option value="high">High-end</option></select></Field>
          <Field label="System memory (GB)"><input type="number" min="1" value={inputs.ramGb} onChange={(event) => update('ramGb', Number(event.target.value))} /></Field>
          <Field label="Resolution"><select value={inputs.resolution} onChange={(event) => update('resolution', event.target.value as typeof initial.resolution)}><option value="1080p">1920×1080</option><option value="1440p">2560×1440</option><option value="4k">3840×2160</option></select></Field>
          <Field label="Target FPS"><input type="number" min="1" value={inputs.targetFps} onChange={(event) => update('targetFps', Number(event.target.value))} /></Field>
          <Field label="Graphics preset"><select value={inputs.preset} onChange={(event) => update('preset', event.target.value as typeof initial.preset)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option></select></Field>
        </div>
        <button className="secondary-btn" onClick={() => setInputs(initial)}>Reset</button>
      </div>
      <div className="result-panel workload-result" aria-live="polite"><p className="eyebrow muted">Result · workload classification</p><h3>{result.classification === 'Insufficient data' ? result.classification : `Potential ${result.classification}`}</h3><h4>Assumptions</h4><ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><p>Tier choices are user estimates; resolution, preset and frame-rate target are treated as workload signals.</p><h4>Limitations</h4><p className="fine-print">This does not predict FPS or quantify a bottleneck. Actual performance varies by game version, drivers, settings, cooling, and system configuration. No verified benchmark data is bundled.</p></div>
    </div>
  </section>
}

type TrainerMode = 'Reaction Click' | 'Target Click' | 'Flick'
type TrainerStage = 'idle' | 'countdown' | 'preparing' | 'active' | 'paused' | 'done'

export function AimTrainerPage() {
  const { data, saveTraining, removeTraining, setTrainingPreferences } = useAppState()
  const [mode, setMode] = useState<TrainerMode>(data.trainingPreferences.mode)
  const [targetSize, setTargetSize] = useState(data.trainingPreferences.targetSize)
  const [targetGoal, setTargetGoal] = useState(data.trainingPreferences.targetGoal)
  const [durationSeconds, setDurationSeconds] = useState(data.trainingPreferences.durationSeconds)
  const [sound, setSound] = useState(data.trainingPreferences.sound)
  const [arenaStyle, setArenaStyle] = useState(data.trainingPreferences.arenaStyle)
  const [stage, setStage] = useState<TrainerStage>('idle')
  const [target, setTarget] = useState({ x: 50, y: 50 })
  const [targetVisible, setTargetVisible] = useState(false)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const [countdown, setCountdown] = useState<number | 'GO'>(3)
  const shownAt = useRef(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const startedAt = useRef(0)
  const pauseStartedAt = useRef(0)
  const targetPauseStartedAt = useRef(0)
  const targetPausedMs = useRef(0)
  const durationRunningFrom = useRef(0)
  const pausedMs = useRef(0)
  const reactionTimer = useRef<number | undefined>(undefined)
  const durationTimer = useRef<number | undefined>(undefined)
  const remainingMs = useRef(0)
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const reactionsRef = useRef<number[]>([])
  const targetId = useRef(0)
  const consumedTargetId = useRef(-1)
  const [saved, setSaved] = useState(false)

  useEffect(() => () => { window.clearTimeout(reactionTimer.current); window.clearTimeout(durationTimer.current) }, [])
  useEffect(() => {
    setTrainingPreferences({ mode, targetSize, targetGoal, durationSeconds, sound, arenaStyle })
  }, [mode, targetSize, targetGoal, durationSeconds, sound, arenaStyle, setTrainingPreferences])
  useEffect(() => {
    if (stage !== 'active') return
    let animationFrame = 0
    const tick = (now: number) => {
      setElapsedMs(Math.max(0, now - startedAt.current - pausedMs.current))
      animationFrame = window.requestAnimationFrame(tick)
    }
    animationFrame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [stage])

  const playTone = useCallback((frequency: number) => {
    if (!sound) return
    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) return
    const context = new AudioContextConstructor()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.frequency.value = frequency
    gain.gain.value = 0.04
    oscillator.connect(gain).connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.045)
    oscillator.onended = () => void context.close()
  }, [sound])

  const showTarget = useCallback(() => {
    const bounds = arenaRef.current?.getBoundingClientRect()
    const visibleTargetSize = mode === 'Flick' ? Math.min(targetSize, 32) : targetSize
    const horizontalMargin = bounds ? Math.min(45, (visibleTargetSize / bounds.width) * 50) : 10
    const verticalMargin = bounds ? Math.min(45, (visibleTargetSize / bounds.height) * 50) : 10
    setTarget({
      x: horizontalMargin + Math.random() * (100 - horizontalMargin * 2),
      y: verticalMargin + Math.random() * (100 - verticalMargin * 2),
    })
    setTargetVisible(true)
    targetId.current += 1
    targetPausedMs.current = 0
    shownAt.current = performance.now()
    setStage('active')
    playTone(780)
  }, [mode, playTone, targetSize])

  const finish = useCallback(() => {
    window.clearTimeout(reactionTimer.current)
    window.clearTimeout(durationTimer.current)
    setTargetVisible(false)
    setStage('done')
    setElapsedMs(Math.max(0, performance.now() - startedAt.current - pausedMs.current))
  }, [])

  const beginSession = useCallback(() => {
    startedAt.current = performance.now()
    remainingMs.current = durationSeconds * 1000
    durationRunningFrom.current = startedAt.current
    durationTimer.current = window.setTimeout(finish, remainingMs.current)
    if (mode === 'Reaction Click') setStage('preparing')
    else showTarget()
  }, [durationSeconds, finish, mode, showTarget])

  useEffect(() => {
    if (stage !== 'countdown') return
    const countdownTimer = window.setTimeout(() => {
      if (countdown === 'GO') beginSession()
      else if (countdown === 1) setCountdown('GO')
      else setCountdown((value) => typeof value === 'number' ? value - 1 : value)
    }, countdown === 'GO' ? 500 : 800)
    return () => window.clearTimeout(countdownTimer)
  }, [stage, countdown, beginSession])

  useEffect(() => {
    if (stage !== 'preparing') return
    reactionTimer.current = window.setTimeout(showTarget, 700 + Math.random() * 1300)
    return () => window.clearTimeout(reactionTimer.current)
  }, [stage, showTarget])

  const start = () => {
    setHits(0); setMisses(0); setReactionTimes([]); setElapsedMs(0); setSaved(false)
    hitsRef.current = 0; missesRef.current = 0; reactionsRef.current = []; pausedMs.current = 0
    consumedTargetId.current = -1
    setCountdown(3)
    setStage('countdown')
  }

  const handleMiss = () => {
    if (stage !== 'active') return
    missesRef.current += 1
    setMisses(missesRef.current)
    playTone(180)
  }

  const handleHit = (event: React.MouseEvent) => {
    event.stopPropagation()
    if (stage !== 'active' || consumedTargetId.current === targetId.current) return
    consumedTargetId.current = targetId.current
    const reaction = performance.now() - shownAt.current - targetPausedMs.current
    hitsRef.current += 1
    reactionsRef.current = [...reactionsRef.current, reaction]
    setHits(hitsRef.current)
    setReactionTimes(reactionsRef.current)
    setTargetVisible(false)
    playTone(980)
    if (hitsRef.current >= targetGoal) finish()
    else if (mode === 'Reaction Click') setStage('preparing')
    else showTarget()
  }

  const pause = () => {
    if (stage === 'active' || stage === 'preparing') {
      const now = performance.now()
      pauseStartedAt.current = now
      if (stage === 'active' && targetVisible) targetPauseStartedAt.current = now
      remainingMs.current = Math.max(0, remainingMs.current - (now - durationRunningFrom.current))
      window.clearTimeout(durationTimer.current)
      window.clearTimeout(reactionTimer.current)
      setStage('paused')
    } else if (stage === 'paused') {
      const now = performance.now()
      pausedMs.current += now - pauseStartedAt.current
      if (targetPauseStartedAt.current > 0) {
        targetPausedMs.current += now - targetPauseStartedAt.current
        targetPauseStartedAt.current = 0
      }
      durationRunningFrom.current = now
      durationTimer.current = window.setTimeout(finish, remainingMs.current)
      if (mode === 'Reaction Click' && !targetVisible) setStage('preparing')
      else setStage('active')
    }
  }

  const average = reactionTimes.length ? reactionTimes.reduce((sum, value) => sum + value, 0) / reactionTimes.length : 0
  const best = reactionTimes.length ? Math.min(...reactionTimes) : 0
  const accuracy = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0
  const completedHistory = data.trainingHistory.filter((session) => session.averageReactionMs > 0)
  const reactionTrend = completedHistory.length >= 3
    ? completedHistory[0].averageReactionMs - (completedHistory[1].averageReactionMs + completedHistory[2].averageReactionMs) / 2
    : null

  return <section className="content-page">
    <PageHeading eyebrow="Practice lab" title="Aim trainer" subtitle="This is a browser-based practice tool, not a standardized assessment of gaming ability." />
    <div className="trainer-toolbar">
      <Field label="Mode"><select value={mode} onChange={(event) => setMode(event.target.value as TrainerMode)} disabled={stage === 'active' || stage === 'preparing' || stage === 'paused'}><option>Reaction Click</option><option>Target Click</option><option>Flick</option></select></Field>
      <Field label="Target size"><input type="range" min="28" max="88" step="4" value={targetSize} onChange={(event) => setTargetSize(Number(event.target.value))} disabled={stage === 'active' || stage === 'preparing' || stage === 'paused'} /><span>{targetSize}px</span></Field>
      <Field label="Targets to hit"><select value={targetGoal} onChange={(event) => setTargetGoal(Number(event.target.value))} disabled={stage === 'active' || stage === 'preparing' || stage === 'paused'}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></Field>
      <Field label="Session limit"><select value={durationSeconds} onChange={(event) => setDurationSeconds(Number(event.target.value))} disabled={stage === 'active' || stage === 'preparing' || stage === 'paused'}><option value="30">30 seconds</option><option value="60">60 seconds</option><option value="120">120 seconds</option></select></Field>
      <Field label="Arena"><select value={arenaStyle} onChange={(event) => setArenaStyle(event.target.value as typeof arenaStyle)} disabled={stage === 'active' || stage === 'preparing' || stage === 'paused'}><option value="grid">Grid</option><option value="plain">Plain</option><option value="crosshair">Crosshair</option></select></Field>
      <label className="sound-toggle"><input type="checkbox" checked={sound} onChange={(event) => setSound(event.target.checked)} /> Sound</label>
    </div>
    <div className="trainer-stats"><Metric label="Targets remaining" value={String(Math.max(0, targetGoal - hits))} /><Metric label="Hits" value={String(hits)} /><Metric label="Misses" value={String(misses)} /><Metric label="Elapsed" value={`${(elapsedMs / 1000).toFixed(1)} s`} /></div>
    <div ref={arenaRef} className={`practice-arena arena-${arenaStyle} ${stage === 'paused' ? 'is-paused' : ''}`} onClick={handleMiss} role="application" aria-label="Aim training area">
      {targetVisible && stage === 'active' && <button type="button" className={`aim-target ${mode === 'Flick' ? 'flick-target' : ''}`} aria-label="Hit target" onClick={handleHit} style={{ width: mode === 'Flick' ? Math.min(targetSize, 32) : targetSize, height: mode === 'Flick' ? Math.min(targetSize, 32) : targetSize, left: `${target.x}%`, top: `${target.y}%` }} />}
      {stage === 'idle' && <span>Press Start when you are ready</span>}
      {stage === 'countdown' && <span className="trainer-countdown" aria-live="assertive">{countdown}</span>}
      {stage === 'preparing' && <span>Wait for the target</span>}
      {stage === 'paused' && <span>Paused</span>}
      {stage === 'done' && <span>Session complete</span>}
    </div>
    <div className="cta-row"><button className="primary-btn" disabled={stage === 'countdown'} onClick={stage === 'active' || stage === 'preparing' || stage === 'paused' ? pause : start}>{stage === 'active' || stage === 'preparing' ? 'Pause' : stage === 'paused' ? 'Resume' : stage === 'done' ? 'Retry' : stage === 'countdown' ? 'Starting…' : 'Start'}</button>{stage !== 'idle' && <button className="secondary-btn" onClick={start}>Restart</button>}</div>
    {stage === 'done' && <div className="result-panel"><div className="result-topbar"><div><span className="eyebrow muted">Session results</span><h3>{mode}</h3></div>{!saved && <button className="copy-button" onClick={() => { saveTraining({ mode, targets: hits + misses, hits, misses, accuracy, averageReactionMs: average, bestReactionMs: best, durationMs: elapsedMs }); setSaved(true) }}>Save result</button>}</div><div className="stat-grid"><Metric label="Targets" value={String(hits + misses)} /><Metric label="Hits" value={String(hits)} /><Metric label="Misses" value={String(misses)} /><Metric label="Accuracy" value={`${accuracy.toFixed(1)}%`} /><Metric label="Average reaction" value={average ? `${average.toFixed(0)} ms` : 'No hits'} /><Metric label="Best reaction" value={best ? `${best.toFixed(0)} ms` : 'No hits'} /><Metric label="Duration" value={`${(elapsedMs / 1000).toFixed(1)} s`} /></div>{saved && <p role="status">Result saved on this device.</p>}</div>}
    <h3 className="list-section-title">Training history</h3>
    {data.trainingHistory.length ? <>{reactionTrend !== null ? <p className="trend-note">Recent reaction time is {Math.abs(reactionTrend).toFixed(0)} ms {reactionTrend < 0 ? 'faster' : 'slower'} than the previous two saved sessions.</p> : <p className="fine-print">No trend yet. Save at least three sessions with reaction times.</p>}<div className="compact-list">{data.trainingHistory.map((session) => <div className="compact-row" key={session.id}><span>{session.mode} · {formatDate(session.timestamp)}<br />{session.accuracy.toFixed(1)}% accuracy · {session.averageReactionMs.toFixed(0)} ms average · {session.bestReactionMs.toFixed(0)} ms best · {((session.durationMs ?? 0) / 1000).toFixed(1)} s</span><button className="text-action" aria-label={`Delete ${session.mode} session from ${formatDate(session.timestamp)}`} onClick={() => removeTraining(session.id)}>Delete</button></div>)}</div></> : <EmptyState>Save an aim session to start building your history.</EmptyState>}
  </section>
}

export function LearnPage() {
  const [searchParams] = useSearchParams()
  const [selected, setSelected] = useState<string>(() => searchParams.get('article') ?? '')
  const [dpi, setDpi] = useState(800)
  const [sensitivity, setSensitivity] = useState(0.35)
  const article = LEARN_ARTICLES.find((item) => item.id === selected)
  return <section className="content-page learn-page">
    <PageHeading eyebrow="Field guide" title="Learn the numbers" subtitle="Short explanations of the settings and measurements behind an FPS setup." />
    <div className="learn-layout"><nav className="learn-index" aria-label="Learning topics">{LEARN_ARTICLES.map((item) => <button className={selected === item.id ? 'learn-link active' : 'learn-link'} key={item.id} onClick={() => setSelected(item.id)}>{item.title}</button>)}</nav>
      <article className="learn-article" aria-live="polite">{article ? <><p className="eyebrow muted">{article.summary}</p><h3>{article.title}</h3><p>{article.body}</p>{['cm360', 'fov', 'fps-refresh', 'ppi'].includes(article.id) && <div className={`article-diagram diagram-${article.id === 'cm360' ? 'cm360' : article.id === 'fov' ? 'fov' : article.id === 'fps-refresh' ? 'fps' : 'monitor'}`} role="img" aria-label={`${article.title} explanatory diagram`} />}{article.id === 'polling' && <div className="interval-diagram" role="img" aria-label="Polling reports occur at regular intervals"><span /><span /><span /><span /><span /></div>}<div className="learning-context"><h4>Why it matters</h4><p>{article.whyItMatters}</p><h4>Useful when</h4><p>{article.usefulWhen}</p><h4>Limitations</h4><p>{article.limitations}</p></div><div className="example-box"><strong>Example</strong><p>{article.example}</p>{article.formula && <code>{article.formula}</code>}</div>{article.id === 'edpi' && <div className="mini-calculator"><h4>Try an eDPI calculation</h4><Field label="DPI"><input type="number" min="1" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></Field><Field label="Sensitivity"><input type="number" min="0.001" step="0.01" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} /></Field><strong>{dpi > 0 && sensitivity > 0 && Number.isFinite(dpi * sensitivity) ? `${(dpi * sensitivity).toFixed(0)} eDPI` : 'Enter positive finite values'}</strong></div>}{article.calculator ? <Link className="primary-btn" to={article.calculator}>Related calculator</Link> : <p className="fine-print">{article.relatedNote}</p>}</> : <><p className="eyebrow muted">Start here</p><h3>Choose a topic</h3><p>Select a guide to see its explanation, example and related tool.</p></>}</article>
    </div>
  </section>
}

export function PageHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <div className="page-header-block"><div><p className="eyebrow muted">{eyebrow}</p><h2>{title}</h2></div><p className="page-intro">{subtitle}</p></div>
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field-row"><span>{label}</span>{children}</label>
}

export function Metric({ label, value }: { label: string; value: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="empty-state"><p>{children}</p><Link to="/">Explore calculators</Link></div>
}