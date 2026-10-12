import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import './App.css'
import { convertDpiSensitivity } from './lib/calculators/dpi'
import { calculateEdpi, convertSensitivity, matchSensitivity, type SensitivityMatchMode } from './lib/calculators/sensitivity'
import { GAME_LIBRARY, getGameById, type GameId, type SourceReference } from './lib/games'
import { CALCULATORS } from './lib/registry'
import { AppStateProvider } from './state/AppState'
import { useAppState } from './state/useAppState'
import { STORAGE_VERSION } from './state/model'
import { AimTrainerPage, FavoritesPage, Field, LearnPage, Metric, MonitorPage, PageHeading, PerformancePage, RecentPage, SetupsPage } from './pages/UtilityPages'
import { LEARN_ARTICLES } from './pages/LearnContent'
import { calculateFovMetrics } from './lib/calculators/fov'

const formatValue = (value: number, digits = 3) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)
const queryNumber = (value: string | null, fallback: number, maximum = 1_000_000) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 && number <= maximum ? number : fallback
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <div className="app-error" role="alert"><h2>This tool could not be loaded.</h2><p>Your saved browser data is unchanged. Return home and reopen the calculator.</p><Link to="/" className="primary-btn" onClick={() => this.setState({ failed: false })}>Return home</Link></div>
    }
    return this.props.children
  }
}
const routesByPath: Record<string, string> = {
  '/': 'GameMetric | Gaming Calculators',
  '/calculators/sensitivity': 'Sensitivity Converter | GameMetric',
  '/calculators/edpi': 'eDPI Calculator | GameMetric',
  '/calculators/dpi': 'DPI Converter | GameMetric',
  '/calculators/fov': 'FOV Calculator | GameMetric',
  '/calculators/monitor': 'Monitor Calculator | GameMetric',
  '/calculators/performance': 'Performance Estimator | GameMetric',
  '/tools/sensitivity-lab': 'Aim Trainer | GameMetric',
  '/learn': 'Learn | GameMetric',
  '/favorites': 'Favorites | GameMetric',
  '/recent': 'Recent Calculations | GameMetric',
  '/setups': 'My Setups | GameMetric',
}

function App() {
  return <AppStateProvider><BrowserRouter><GameMetricApp /></BrowserRouter></AppStateProvider>
}

function GameMetricApp() {
  const { data, setTheme } = useAppState()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()

  useEffect(() => {
    document.documentElement.dataset.theme = data.theme
    document.title = routesByPath[location.pathname] ?? 'GameMetric | Gaming Calculators'
  }, [data.theme, location.pathname])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        const active = document.activeElement
        if (active instanceof HTMLElement && (active.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName))) return
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') { setSearchOpen(false); setSettingsOpen(false) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <div className="app-shell">
    <header className="topbar">
      <Link to="/" className="brand-mark" aria-label="GameMetric home">GameMetric</Link>
      <nav className="nav" aria-label="Main navigation">
        <NavLink to="/" end>Home</NavLink><NavLink to="/calculators/sensitivity">Sensitivity</NavLink><NavLink to="/calculators/monitor">Monitor</NavLink><NavLink to="/calculators/performance">Performance</NavLink><NavLink to="/tools/sensitivity-lab">Aim lab</NavLink><NavLink to="/learn">Learn</NavLink>
      </nav>
      <div className="header-actions">
        <button type="button" className="ghost-button search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search GameMetric">⌕ <span>Search</span></button>
        <Link to="/favorites" className="ghost-button" aria-label={`Favorites, ${data.favorites.calculators.length + data.favorites.games.length} saved`}>★ <span>{data.favorites.calculators.length + data.favorites.games.length}</span></Link>
        <Link to="/recent" className="ghost-button" aria-label="Recent calculations">◷</Link>
        <button type="button" className="theme-toggle" aria-label={`Switch to ${data.theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(data.theme === 'dark' ? 'light' : 'dark')}>{data.theme === 'dark' ? '☼' : '☾'}</button>
        <button type="button" className="ghost-button" aria-label="Settings" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>⚙</button>
      </div>
    </header>
    {settingsOpen && <div className="settings-panel"><div className="panel-header"><strong>Settings</strong><button className="inline-close" onClick={() => setSettingsOpen(false)}>Close</button></div><div className="settings-grid"><span>Theme</span><strong>{data.theme === 'dark' ? 'Dark' : 'Light'}</strong><span>Data storage</span><strong>Local to this browser</strong><span>Data version</span><strong>{STORAGE_VERSION}</strong></div><div className="cta-row"><Link className="text-action" to="/setups" onClick={() => setSettingsOpen(false)}>Manage saved setups</Link></div></div>}
    <main className="page-shell"><RouteErrorBoundary><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/calculators/sensitivity" element={<SensitivityPage />} />
      <Route path="/calculators/edpi" element={<EdpiPage />} />
      <Route path="/calculators/dpi" element={<DpiPage />} />
      <Route path="/calculators/fov" element={<FovPage />} />
      <Route path="/calculators/monitor" element={<MonitorPage />} />
      <Route path="/calculators/performance" element={<PerformancePage />} />
      <Route path="/tools/sensitivity-lab" element={<AimTrainerPage />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/recent" element={<RecentPage />} />
      <Route path="/setups" element={<SetupsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></RouteErrorBoundary></main>
    {searchOpen && <SearchDialog query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} />}
  </div>
}

function SearchDialog({ query, setQuery, onClose }: { query: string; setQuery: (query: string) => void; onClose: () => void }) {
  const navigate = useNavigate()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const items = [
      ...CALCULATORS.map((item) => ({ label: item.title, detail: 'Calculator', route: item.route, keywords: `${item.title} ${item.description} ${item.id}` })),
      ...GAME_LIBRARY.map((game) => ({ label: game.name, detail: 'Game data', route: `/calculators/sensitivity?from=${game.id}`, keywords: game.name })),
      ...LEARN_ARTICLES.map((article) => ({ label: article.title, detail: 'Learn', route: `/learn?article=${article.id}`, keywords: `${article.title} ${article.summary} ${article.id}` })),
    ]
    if (!needle) return items.slice(0, 10)
    const rank = (item: (typeof items)[number]) => {
      const label = item.label.toLowerCase()
      const keywords = item.keywords.toLowerCase()
      if (label === needle) return 0
      if (label.startsWith(needle)) return 1
      if (item.detail === 'Calculator' && keywords.includes(needle)) return 2
      if (item.detail === 'Game data' && keywords.includes(needle)) return 3
      if (item.detail === 'Learn' && keywords.includes(needle)) return 4
      return 5
    }
    return items.filter((item) => item.keywords.toLowerCase().includes(needle)).sort((left, right) => rank(left) - rank(right)).slice(0, 12)
  }, [query])
  const openResult = (index: number) => {
    const result = results[index]
    if (!result) return
    navigate(result.route)
    onClose()
  }
  const onDialogKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' && results.length) { event.preventDefault(); setSelectedIndex((index) => (index + 1) % results.length) }
    if (event.key === 'ArrowUp' && results.length) { event.preventDefault(); setSelectedIndex((index) => (index - 1 + results.length) % results.length) }
    if (event.key === 'Enter') { event.preventDefault(); openResult(selectedIndex) }
    if (event.key === 'Tab') {
      const focusable = event.currentTarget.querySelectorAll<HTMLElement>('input, button:not(:disabled)')
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
  }
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="search-dialog" role="dialog" aria-modal="true" aria-label="Search GameMetric" onKeyDown={onDialogKeyDown}><div className="search-input-row"><span aria-hidden="true">⌕</span><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setSelectedIndex(0) }} placeholder="Search calculators, games, guides..." /><kbd>ESC</kbd></div><div className="search-results" role="listbox">{results.length ? results.map((result, index) => <button key={`${result.detail}-${result.route}`} id={`search-result-${index}`} aria-selected={selectedIndex === index} role="option" className={selectedIndex === index ? 'search-result selected' : 'search-result'} onMouseEnter={() => setSelectedIndex(index)} onClick={() => openResult(index)}><span>{result.label}</span><small>{result.detail}</small></button>) : <div className="search-empty"><p>No matching calculators, games or guides.</p><strong>Suggestions</strong><div>{['Sensitivity', 'eDPI', 'FOV', 'DPI'].map((suggestion) => <button key={suggestion} onClick={() => { setQuery(suggestion); setSelectedIndex(0) }}>{suggestion}</button>)}</div></div>}</div></section></div>
}

function HomePage() {
  const { data, toggleFavorite } = useAppState()
  const [favoriteFeedback, setFavoriteFeedback] = useState('')
  const sample = convertSensitivity({ fromGameId: 'valorant', toGameId: 'cs2', sensitivity: 0.35, dpi: 800 })
  return <>
    <section className="hero-section"><div className="hero-copy"><p className="eyebrow">Free gaming calculators</p><h1>Know your numbers.<span>Master your setup.</span></h1><p className="subheading">Sensitivity, FOV, DPI, monitor density and training tools, with transparent assumptions and calculations.</p><div className="cta-row"><Link to="/calculators/sensitivity" className="primary-btn">Open Sensitivity Converter</Link><Link to="/calculators/monitor" className="secondary-btn">Compare monitors</Link></div></div>
      <div className="hero-preview" aria-label="Sensitivity conversion example"><div className="preview-card"><div className="preview-header"><span className="chip">VALORANT</span><span className="chip chip-muted">800 DPI</span></div><div className="preview-values"><div className="preview-step"><span>0.35 Sens</span></div><div className="arrow-down">↓</div><div className="preview-step preview-step-strong"><span>CS2</span><strong>{formatValue(sample.convertedSensitivity)}</strong></div></div><div className="preview-bottom"><span>{formatValue(sample.cm360, 1)} cm / 360°</span><span>{formatValue(800 * 0.35, 0)} source eDPI</span></div><small>Example uses partially verified GameMetric yaw assumptions.</small></div></div>
    </section>
    <section className="trust-bar" aria-label="Available tools"><div><strong>{CALCULATORS.length}</strong><span>available tools</span></div><div><strong>{GAME_LIBRARY.length}</strong><span>game profiles</span></div><div><strong>Local</strong><span>data stays in browser</span></div></section>
    <section className="tools-section"><div className="section-heading"><div><p className="eyebrow muted">Tools</p><h2>Built for competitive setups</h2></div><Link className="text-action" to="/setups">My setups →</Link></div><div className="card-grid">{CALCULATORS.map((calculator) => {
      const favorite = data.favorites.calculators.includes(calculator.id)
      return <article className="tool-card" key={calculator.id}><div className="tool-card-top"><span className="tool-icon" aria-hidden="true">{calculator.icon}</span><button className={favorite ? 'favorite-toggle active' : 'favorite-toggle'} aria-label={`${favorite ? 'Remove' : 'Add'} ${calculator.title} ${favorite ? 'from' : 'to'} favorites`} aria-pressed={favorite} onClick={() => { toggleFavorite('calculators', calculator.id); setFavoriteFeedback(`${favorite ? 'Removed' : 'Added'} ${calculator.title} ${favorite ? 'from' : 'to'} favorites.`) }}>{favorite ? '★' : '☆'}</button></div><span className="tool-badge">{calculator.badge}</span><h3>{calculator.title}</h3><p>{calculator.description}</p><Link className="tool-open" to={calculator.route}>Open tool <span aria-hidden="true">→</span></Link></article>
    })}</div></section>
    <span className="sr-only" role="status">{favoriteFeedback}</span>
  </>
}

function SensitivityPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { addRecent, toggleFavorite, isFavorite } = useAppState()
  const validGame = (value: string | null, fallback: GameId) => getGameById(value ?? '')?.id ?? fallback
  const validPositive = (value: string | null, fallback: number, maximum = 1_000_000) => { const number = Number(value); return Number.isFinite(number) && number > 0 && number <= maximum ? number : fallback }
  const [fromGame, setFromGame] = useState<GameId>(() => validGame(searchParams.get('from'), 'cs2'))
  const [toGame, setToGame] = useState<GameId>(() => validGame(searchParams.get('to'), 'valorant'))
  const [sensitivity, setSensitivity] = useState(() => validPositive(searchParams.get('sens'), 1.2, 1000))
  const [dpi, setDpi] = useState(() => validPositive(searchParams.get('dpi'), 800, 100000))
  const [sourceFov, setSourceFov] = useState(() => validPositive(searchParams.get('sourceFov'), 90, 179))
  const [targetFov, setTargetFov] = useState(() => validPositive(searchParams.get('targetFov'), 103, 179))
  const [mode, setMode] = useState<SensitivityMatchMode>(() => ['360-distance', 'monitor-distance', 'viewspeed', 'custom'].includes(searchParams.get('mode') ?? '') ? searchParams.get('mode') as SensitivityMatchMode : '360-distance')
  const [monitorPercent, setMonitorPercent] = useState(() => {
    const value = Number(searchParams.get('percent'))
    return [25, 50, 75, 100].includes(value) ? value : 50
  })
  const [status, setStatus] = useState('')
  const [precision, setPrecision] = useState<'standard' | 'high'>('standard')
  const [copyFormat, setCopyFormat] = useState<'simple' | 'detailed' | 'discord'>('detailed')

  useEffect(() => {
    const next = new URLSearchParams()
    next.set('from', fromGame); next.set('to', toGame); next.set('dpi', String(dpi)); next.set('sens', String(sensitivity)); next.set('mode', mode)
    if (mode === 'monitor-distance' || mode === 'custom') { next.set('sourceFov', String(sourceFov)); next.set('targetFov', String(targetFov)); next.set('percent', String(monitorPercent)) }
    setSearchParams(next, { replace: true })
  }, [fromGame, toGame, dpi, sensitivity, mode, sourceFov, targetFov, monitorPercent, setSearchParams])

  const match = useMemo(() => {
    try { return matchSensitivity({ fromGameId: fromGame, toGameId: toGame, sensitivity, dpi, mode, sourceFov, targetFov, monitorDistancePercent: monitorPercent }) }
    catch (error) { return { available: false as const, mode: 'viewspeed' as const, reason: error instanceof Error ? error.message : 'Check the entered values.' } }
  }, [fromGame, toGame, sensitivity, dpi, mode, sourceFov, targetFov, monitorPercent])
  const result = match.available ? match.result : undefined
  const from = getGameById(fromGame)!
  const to = getGameById(toGame)!
  const conversionStatus = from.sensitivity.status === 'unsupported' || to.sensitivity.status === 'unsupported'
    ? 'unsupported'
    : from.sensitivity.status === 'unverified' || to.sensitivity.status === 'unverified'
      ? 'unverified'
      : from.sensitivity.status === 'partially-verified' || to.sensitivity.status === 'partially-verified'
        ? 'partially-verified'
        : 'verified'
  const dataStatusLabel = conversionStatus === 'partially-verified' ? 'Partially verified' : conversionStatus === 'verified' ? 'Verified game data' : 'Conversion data unavailable'
  const dataStatusExplanation = conversionStatus === 'partially-verified'
    ? 'The profile includes a sensitivity scale, but GameMetric uses a project assumption; the linked product documentation does not directly document the internal yaw constant.'
    : conversionStatus === 'verified' ? 'The inputs used by this calculation have source references that directly support the values shown.' : 'GameMetric does not have a usable sensitivity scale for one or both selected games.'
  const unavailableReason = match.available ? '' : match.reason

  const copyText = async (text: string) => {
    try { if (navigator.clipboard) await navigator.clipboard.writeText(text); else window.prompt('Copy this text:', text); setStatus('Copied to clipboard.') }
    catch { window.prompt('Copy this text:', text); setStatus('Select and copy the result.') }
  }
  const shownSensitivity = result ? precision === 'high' ? result.convertedSensitivity.toFixed(5) : formatValue(result.convertedSensitivity) : ''
  const copyOptions = {
    simple: `${from.name} ${dpi} DPI ${sensitivity} sens → ${to.name} ${shownSensitivity} sens`,
    detailed: `${from.name}\n${dpi} DPI\n${sensitivity} Sens\n${result ? `${formatValue(result.edpi, 0)} eDPI\n${formatValue(result.cm360, 1)} cm/360°\n${formatValue(result.in360, 1)} in/360°\n\n${to.name} ${shownSensitivity} Sens` : unavailableReason}`,
    discord: `🎯 ${from.name}\n${dpi} DPI | ${sensitivity} Sens\n${result ? `${formatValue(result.edpi, 0)} eDPI | ${formatValue(result.cm360, 1)} cm/360°\n→ ${to.name} ${shownSensitivity} Sens` : unavailableReason}`,
  }
  const resultText = copyOptions[copyFormat]
  const share = async () => {
    const url = window.location.href
    if (navigator.share) { try { await navigator.share({ title: 'GameMetric sensitivity result', text: resultText, url }) } catch { /* User cancelled the native share sheet. */ } }
    else await copyText(url)
  }
  const exportShareCard = () => {
    if (!result) return
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const context = canvas.getContext('2d')
    if (!context) { setStatus('PNG export is unavailable in this browser.'); return }
    context.fillStyle = '#0b121a'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#151f29'
    context.fillRect(54, 54, 1092, 522)
    context.fillStyle = '#72f7be'
    context.font = '700 26px system-ui'
    context.fillText('GameMetric', 92, 110)
    context.fillStyle = '#a4b3c9'
    context.font = '600 20px system-ui'
    context.fillText(`${from.name}  ·  ${dpi} DPI  ·  ${sensitivity} sens`, 92, 176)
    context.fillStyle = '#edf6ff'
    context.font = '700 74px system-ui'
    context.fillText(`${to.name} ${shownSensitivity}`, 92, 276)
    context.fillStyle = '#a4b3c9'
    context.font = '500 24px system-ui'
    context.fillText(`${formatValue(result.cm360, 1)} cm / 360°     ${formatValue(result.edpi, 0)} target eDPI`, 92, 340)
    context.fillText(`Method: ${modeLabel}`, 92, 400)
    context.font = '400 19px system-ui'
    context.fillText(`Game data: ${dataStatusLabel} · ${from.reviewedAt ? `reviewed ${from.reviewedAt}` : 'no review date'}`, 92, 472)
    context.fillText('Projection and game input behavior can affect perceived feel.', 92, 520)
    canvas.toBlob((blob) => {
      if (!blob) { setStatus('PNG export failed.'); return }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'gamemetric-sensitivity.png'
      anchor.click()
      URL.revokeObjectURL(url)
      setStatus('Share card exported as PNG.')
    }, 'image/png')
  }
  const reset = () => { setFromGame('cs2'); setToGame('valorant'); setSensitivity(1.2); setDpi(800); setMode('360-distance'); setSourceFov(90); setTargetFov(103); setMonitorPercent(50); setStatus('Calculator reset.') }
  const modeLabel = mode === '360-distance' ? '360° distance' : mode === 'monitor-distance' ? `monitor distance · ${monitorPercent}%` : mode === 'custom' ? `custom · ${monitorPercent}%` : 'viewspeed'

  return <section className="calculator-page"><PageHeading eyebrow="Calculator" title="Mouse sensitivity converter" subtitle="Match a defined input measure between games. A conversion does not guarantee identical subjective feel." />
    <div className="converter-shell"><div className="converter-panel"><div className="panel-label">Convert from</div><Field label="Game"><select value={fromGame} onChange={(event) => setFromGame(event.target.value as GameId)}><optgroup label="Popular · sensitivity scale available">{GAME_LIBRARY.slice(0, 2).map((game) => <option key={game.id} value={game.id}>{game.name} · {game.sensitivity.status} · FOV unsupported</option>)}</optgroup><optgroup label="Other games · conversion unavailable">{GAME_LIBRARY.slice(2).map((game) => <option key={game.id} value={game.id}>{game.name} · sensitivity/FOV unavailable</option>)}</optgroup></select></Field><Field label="Sensitivity"><input type="number" min="0.001" step="0.01" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} /></Field><Field label="DPI"><input type="number" min="1" step="1" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></Field><Field label="Source horizontal FOV (manual)"><input type="number" min="1" max="179" value={sourceFov} onChange={(event) => setSourceFov(Number(event.target.value))} /></Field><button className="text-action game-favorite" onClick={() => { toggleFavorite('games', fromGame); setStatus(`${isFavorite('games', fromGame) ? 'Removed' : 'Added'} ${from.name} ${isFavorite('games', fromGame) ? 'from' : 'to'} favorites.`) }} aria-pressed={isFavorite('games', fromGame)}>{isFavorite('games', fromGame) ? '★ Saved game' : '☆ Save game'}</button></div>
      <div className="swap-column"><button className="swap-btn" aria-label="Swap games" onClick={() => { setFromGame(toGame); setToGame(fromGame) }}>↔</button></div>
      <div className="converter-panel"><div className="panel-label">Convert to</div><Field label="Game"><select value={toGame} onChange={(event) => setToGame(event.target.value as GameId)}><optgroup label="Popular · sensitivity scale available">{GAME_LIBRARY.slice(0, 2).map((game) => <option key={game.id} value={game.id}>{game.name} · {game.sensitivity.status} · FOV unsupported</option>)}</optgroup><optgroup label="Other games · conversion unavailable">{GAME_LIBRARY.slice(2).map((game) => <option key={game.id} value={game.id}>{game.name} · sensitivity/FOV unavailable</option>)}</optgroup></select></Field><Field label="Target horizontal FOV (manual)" ><input type="number" min="1" max="179" value={targetFov} onChange={(event) => setTargetFov(Number(event.target.value))} /></Field><button className="text-action game-favorite" onClick={() => { toggleFavorite('games', toGame); setStatus(`${isFavorite('games', toGame) ? 'Removed' : 'Added'} ${to.name} ${isFavorite('games', toGame) ? 'from' : 'to'} favorites.`) }} aria-pressed={isFavorite('games', toGame)}>{isFavorite('games', toGame) ? '★ Saved game' : '☆ Save game'}</button></div></div>
    <div className="result-panel"><div className="result-topbar"><div><span className="eyebrow muted">Converted result</span><h3>{result ? `${to.name} sensitivity` : 'Method unavailable'}</h3></div><div className="precision-control" role="group" aria-label="Result precision"><button aria-pressed={precision === 'standard'} onClick={() => setPrecision('standard')}>Standard</button><button aria-pressed={precision === 'high'} onClick={() => setPrecision('high')}>High precision</button></div></div>{result ? <><div className="result-number">{shownSensitivity}</div><div className="result-context"><span>FROM <strong>{from.name}</strong> · {sensitivity} sens · {dpi} DPI</span><span>TO <strong>{to.name}</strong> · {modeLabel}</span></div><div className="stat-grid"><Metric label="cm / 360°" value={`${formatValue(result.cm360, 1)} cm`} /><Metric label="in / 360°" value={`${formatValue(result.in360, 1)} in`} /><Metric label="Target eDPI" value={formatValue(result.edpi, 0)} /><Metric label="Counts / 360°" value={formatValue(result.counts360, 0)} /></div></> : <p className="error-message" role="status">{unavailableReason}</p>}
      <div className="data-status" title={dataStatusExplanation}><strong>{dataStatusLabel}</strong><span>{from.name}: {from.reviewedAt ? `reviewed ${from.reviewedAt}` : 'not reviewed'} · {to.name}: {to.reviewedAt ? `reviewed ${to.reviewedAt}` : 'not reviewed'}</span><details><summary>What does this mean?</summary><p>{dataStatusExplanation}</p></details></div>
      <div className="match-tabs" role="group" aria-label="Sensitivity matching method">{([['360-distance', '360° Distance'], ['monitor-distance', 'Monitor Distance'], ['viewspeed', 'Viewspeed'], ['custom', 'Custom']] as const).map(([value, label]) => <button key={value} type="button" disabled={value === 'viewspeed'} title={value === 'viewspeed' ? 'Verified camera parameters are unavailable.' : undefined} className={mode === value ? 'match-tab active' : 'match-tab'} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>)}</div>
      <details className="viewspeed-help"><summary>Why isn’t Viewspeed matching available?</summary><p>Viewspeed matching requires verified camera projection parameters and title-specific FOV behavior. GameMetric does not currently have those values, so it cannot calculate this mode reliably.</p></details>
      {(mode === 'monitor-distance' || mode === 'custom') && <div className="advanced-fields"><Field label={mode === 'custom' ? 'Custom monitor-distance match (%)' : 'Match movement over this monitor distance'}><select value={monitorPercent} onChange={(event) => setMonitorPercent(Number(event.target.value))}><option value="25">25%</option><option value="50">50%</option><option value="75">75%</option><option value="100">100%</option></select></Field><p>Matches angular movement at the selected fraction of screen width, using the horizontal FOV values above. This is not interchangeable with a 360° match.</p></div>}
      <div className="explain-box"><h4>Method: {modeLabel}</h4><p>{mode === '360-distance' ? 'Preserves physical mouse distance for a full 360° turn using the selected sensitivity scales.' : mode === 'viewspeed' ? 'Viewspeed matching is not available for this game because GameMetric does not have verified camera parameters.' : 'Geometric match under the selected projection and FOV assumptions. It depends on horizontal FOV, projection model, and selected percentage; it is not a universal cross-game equivalent.'}</p>{mode === 'viewspeed' && <details><summary>Why?</summary><p>Viewspeed needs verified camera projection parameters and game-specific FOV behavior. GameMetric does not currently have those inputs for this selection.</p></details>}</div>
      <details className="methodology-panel"><summary>How was this calculated?</summary><div className="details-body"><p>1. Source sensitivity: <strong>{sensitivity}</strong></p><p>2. Source DPI: <strong>{dpi}</strong></p><p>3. Source yaw coefficient: <strong>{from.sensitivity.yaw ?? 'Unavailable'}° per count at sensitivity 1</strong></p><p>4. Target yaw coefficient: <strong>{to.sensitivity.yaw ?? 'Unavailable'}° per count at sensitivity 1</strong></p><p>5. Base 360° conversion: <strong>source sensitivity × source yaw ÷ target yaw</strong></p>{(mode === 'monitor-distance' || mode === 'custom') && <p>6. Monitor-distance factor uses atan(p × tan(FOV ÷ 2)) for p = {monitorPercent}%, with {sourceFov}° source and {targetFov}° target horizontal FOV.</p>}<p>Result: <strong>{result ? shownSensitivity : unavailableReason}</strong></p><p>Input DPI is counts per inch; cm/360 converts inches to centimeters using 2.54 cm/in. Internal calculations are not rounded; rounding is display-only.</p><div className="source-list">{[...from.sources.map((source) => ({ gameId: fromGame, source })), ...to.sources.map((source) => ({ gameId: toGame, source }))].map(({ gameId, source }: { gameId: GameId; source: SourceReference }) => <p key={`${gameId}-${source.label}-${source.evidenceType}`}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label} · evidence type: {source.evidenceType} · establishes: {source.supports.join(', ')}</p>)}</div></div></details>
      <div className="result-actions"><Field label="Copy format"><select value={copyFormat} onChange={(event) => setCopyFormat(event.target.value as typeof copyFormat)}><option value="simple">Simple</option><option value="detailed">Detailed</option><option value="discord">Discord</option></select></Field><button className="secondary-btn" onClick={() => void copyText(resultText)}>Copy</button><button className="secondary-btn" onClick={() => void share()}>Share URL</button><button className="secondary-btn" disabled={!result} onClick={exportShareCard}>Export PNG</button><button className="secondary-btn" onClick={() => { addRecent({ calculator: 'sensitivity', fromGame, toGame, inputSummary: `${from.name} ${sensitivity} sens · ${dpi} DPI → ${to.name} · ${modeLabel}`, resultSummary: result ? `${shownSensitivity} sens` : 'Unavailable', values: { dpi, sens: sensitivity, mode, sourceFov, targetFov, percent: monitorPercent } }); setStatus('Saved to recent calculations.') }}>Save</button><button className="text-action" onClick={reset}>Reset</button></div><p className="status-message" role="status">{status}</p>
    </div>
  </section>
}

function DpiPage() {
  const { addRecent } = useAppState()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentDpi, setCurrentDpi] = useState(() => queryNumber(searchParams.get('currentDpi'), 800))
  const [currentSensitivity, setCurrentSensitivity] = useState(() => queryNumber(searchParams.get('sens'), 0.4, 1000))
  const [targetDpi, setTargetDpi] = useState(() => queryNumber(searchParams.get('targetDpi'), 1600))
  const [status, setStatus] = useState('')
  const result = useMemo(() => {
    try { return convertDpiSensitivity({ currentDpi, currentSensitivity, targetDpi }) } catch { return null }
  }, [currentDpi, currentSensitivity, targetDpi])

  useEffect(() => {
    setSearchParams({ currentDpi: String(currentDpi), sens: String(currentSensitivity), targetDpi: String(targetDpi) }, { replace: true })
  }, [currentDpi, currentSensitivity, targetDpi, setSearchParams])

  const reset = () => { setCurrentDpi(800); setCurrentSensitivity(0.4); setTargetDpi(1600); setStatus('Calculator reset.') }
  return <section className="calculator-page">
    <PageHeading eyebrow="Calculator" title="DPI conversion" subtitle="Keep the same DPI × sensitivity product when changing mouse DPI." />
    <div className="converter-shell">
      <div className="converter-panel"><div className="panel-label">Current setup</div><Field label="Current DPI"><input type="number" min="1" value={currentDpi} onChange={(event) => setCurrentDpi(Number(event.target.value))} /></Field><Field label="Current sensitivity"><input type="number" min="0.001" step="0.01" value={currentSensitivity} onChange={(event) => setCurrentSensitivity(Number(event.target.value))} /></Field></div>
      <div className="swap-column" aria-hidden="true">→</div>
      <div className="converter-panel"><div className="panel-label">Target setup</div><Field label="Target DPI"><input type="number" min="1" value={targetDpi} onChange={(event) => setTargetDpi(Number(event.target.value))} /></Field>{result && <div className="mini-summary"><span>Equivalent sensitivity</span><strong>{formatValue(result.newSensitivity)}</strong></div>}</div>
    </div>
    {result ? <div className="result-panel"><h3>Equivalent sensitivity</h3><div className="result-number">{formatValue(result.newSensitivity)}</div><div className="stat-grid"><Metric label="eDPI preserved" value={formatValue(result.edpi, 0)} /><Metric label="Original" value={`${currentDpi} DPI · ${currentSensitivity} sens`} /><Metric label="New" value={`${targetDpi} DPI · ${formatValue(result.newSensitivity)} sens`} /></div><div className="result-actions"><button className="secondary-btn" onClick={() => { addRecent({ calculator: 'dpi', inputSummary: `${currentDpi} DPI · ${currentSensitivity} sens → ${targetDpi} DPI`, resultSummary: `${formatValue(result.newSensitivity)} sens`, values: { currentDpi, sens: currentSensitivity, targetDpi } }); setStatus('Saved to recent calculations.') }}>Save to recent</button><button className="text-action" onClick={reset}>Reset</button></div><p className="status-message" role="status">{status}</p></div> : <p className="error-message" role="alert">Enter positive finite values for both DPI settings and sensitivity.</p>}
  </section>
}

function EdpiPage() {
  const { addRecent } = useAppState()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dpi, setDpi] = useState(() => queryNumber(searchParams.get('dpi'), 800))
  const [sensitivity, setSensitivity] = useState(() => queryNumber(searchParams.get('sens'), 0.35, 1000))
  const [status, setStatus] = useState('')
  const edpi = useMemo(() => { try { return calculateEdpi(dpi, sensitivity) } catch { return null } }, [dpi, sensitivity])

  useEffect(() => setSearchParams({ dpi: String(dpi), sens: String(sensitivity) }, { replace: true }), [dpi, sensitivity, setSearchParams])

  return <section className="calculator-page"><PageHeading eyebrow="Calculator" title="eDPI calculator" subtitle="eDPI combines DPI and game sensitivity for comparison within a compatible input model." /><div className="calculator-layout"><div className="converter-panel"><div className="panel-label">Input</div><Field label="DPI"><input type="number" min="1" value={dpi} onChange={(event) => setDpi(Number(event.target.value))} /></Field><Field label="In-game sensitivity"><input type="number" min="0.001" step="0.01" value={sensitivity} onChange={(event) => setSensitivity(Number(event.target.value))} /></Field><button className="text-action" onClick={() => { setDpi(800); setSensitivity(0.35); setStatus('Calculator reset.') }}>Reset</button></div>{edpi !== null ? <div className="result-panel"><h3>Your eDPI</h3><div className="result-number">{formatValue(edpi, 0)}</div><p>eDPI = {dpi} × {sensitivity}</p><button className="secondary-btn" onClick={() => { addRecent({ calculator: 'edpi', inputSummary: `${dpi} DPI · ${sensitivity} sensitivity`, resultSummary: `${formatValue(edpi, 0)} eDPI`, values: { dpi, sens: sensitivity } }); setStatus('Saved to recent calculations.') }}>Save to recent</button><p className="status-message" role="status">{status}</p></div> : <p className="error-message" role="alert">Enter positive finite values.</p>}</div></section>
}

function FovPage() {
  const { addRecent } = useAppState()
  const [searchParams, setSearchParams] = useSearchParams()
  const [fov, setFov] = useState(() => queryNumber(searchParams.get('fov'), 103, 179))
  const [aspectRatio, setAspectRatio] = useState(() => ['16:9', '16:10', '21:9', '4:3', '32:9'].includes(searchParams.get('aspect') ?? '') ? searchParams.get('aspect')! : '16:9')
  const [status, setStatus] = useState('')
  const [width, height] = aspectRatio.split(':').map(Number)
  const result = useMemo(() => { try { return calculateFovMetrics(fov, width, height) } catch { return null } }, [fov, width, height])

  useEffect(() => setSearchParams({ fov: String(fov), aspect: aspectRatio }, { replace: true }), [fov, aspectRatio, setSearchParams])

  return <section className="calculator-page"><PageHeading eyebrow="Calculator" title="FOV calculator" subtitle="Convert a horizontal FOV to vertical and diagonal values for a selected display aspect ratio." /><div className="calculator-layout"><div className="converter-panel"><div className="panel-label">Input</div><Field label="Horizontal FOV (degrees)"><input type="number" min="1" max="179" value={fov} onChange={(event) => setFov(Number(event.target.value))} /></Field><Field label="Aspect ratio"><select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>{['16:9', '16:10', '21:9', '4:3', '32:9'].map((ratioValue) => <option key={ratioValue}>{ratioValue}</option>)}</select></Field><button className="text-action" onClick={() => { setFov(103); setAspectRatio('16:9'); setStatus('Calculator reset.') }}>Reset</button></div>{result ? <div className="result-panel"><h3>Projection values</h3><div className="stat-grid"><Metric label="Horizontal" value={`${result.horizontal.toFixed(2)}°`} /><Metric label="Vertical" value={`${result.vertical.toFixed(2)}°`} /><Metric label="Diagonal" value={`${result.diagonal.toFixed(2)}°`} /><Metric label="Aspect" value={aspectRatio} /></div><p className="fine-print">Different games may define or scale FOV differently. This calculator uses rectilinear projection unless otherwise stated.</p><button className="secondary-btn" onClick={() => { addRecent({ calculator: 'fov', inputSummary: `${fov}° horizontal · ${aspectRatio}`, resultSummary: `${result.vertical.toFixed(2)}° vertical`, values: { fov, aspect: aspectRatio } }); setStatus('Saved to recent calculations.') }}>Save to recent</button><p className="status-message" role="status">{status}</p></div> : <p className="error-message" role="alert">Horizontal FOV must be between 0° and 180°.</p>}</div></section>
}

function NotFoundPage() {
  return <section className="placeholder-page"><div className="placeholder-card"><p className="eyebrow muted">Not found</p><h2>Page unavailable</h2><p>This route does not match a GameMetric tool.</p><Link to="/" className="primary-btn">Return home</Link></div></section>
}

export default App