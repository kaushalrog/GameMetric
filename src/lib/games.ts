export type GameId =
  | 'valorant'
  | 'cs2'
  | 'apex'
  | 'fortnite'
  | 'rainbow-six'
  | 'overwatch'
  | 'warzone'
  | 'the-finals'
  | 'marvel-rivals'
  | 'pubg'
  | 'destiny-2'
  | 'team-fortress-2'

export type DataStatus = 'verified' | 'partially-verified' | 'unverified' | 'unsupported'
export type EvidenceType = 'official' | 'developer-documented' | 'reverse-engineered' | 'independently-tested' | 'community-reference' | 'project-assumption'

export interface SourceReference {
  label: string
  url?: string
  evidenceType: EvidenceType
  supports: string[]
}

export interface GameDefinition {
  id: GameId
  name: string
  slug: string
  category: 'fps'
  dataStatus: DataStatus
  reviewedAt: string | null
  sensitivity: {
    status: DataStatus
    yaw?: number
    pitch?: number
    note: string
  }
  fov: {
    status: DataStatus
    definition?: string
    default?: number
    note: string
  }
  sources: SourceReference[]
  notes: string[]
}

const identitySource = (label: string, url: string): SourceReference => ({
  label,
  url,
  evidenceType: 'official',
  supports: ['Game identity and official product reference only'],
})

const unsupportedGame = (id: GameId, name: string, slug: string, label: string, url: string): GameDefinition => ({
  id,
  name,
  slug,
  category: 'fps',
  dataStatus: 'unsupported',
  reviewedAt: null,
  sensitivity: { status: 'unsupported', note: 'No sensitivity scale is currently included.' },
  fov: { status: 'unsupported', note: 'No game-specific FOV definition is currently included.' },
  sources: [identitySource(label, url)],
  notes: ['This profile is listed for search and selection context; calculations requiring game-specific values are unavailable.'],
})

const yawAssumption: SourceReference = {
  label: 'GameMetric calculation assumption',
  evidenceType: 'project-assumption',
  supports: ['The yaw value used by the current conversion implementation; not independent evidence of the game internal constant'],
}

export const GAME_LIBRARY: GameDefinition[] = [
  {
    id: 'valorant', name: 'VALORANT', slug: 'valorant', category: 'fps', dataStatus: 'partially-verified', reviewedAt: 'Sep 2026',
    sensitivity: { status: 'partially-verified', yaw: 0.07, note: 'The conversion scale is a project assumption; the linked product page does not directly document the internal yaw constant.' },
    fov: { status: 'unsupported', note: 'Game-specific FOV camera parameters are not included.' },
    sources: [identitySource('VALORANT product page', 'https://playvalorant.com'), yawAssumption],
    notes: ['Sensitivity conversion is available using a partially verified project assumption.', 'No game-specific FOV conversion is claimed.'],
  },
  {
    id: 'cs2', name: 'Counter-Strike 2', slug: 'cs2', category: 'fps', dataStatus: 'partially-verified', reviewedAt: 'Sep 2026',
    sensitivity: { status: 'partially-verified', yaw: 0.022, note: 'The conversion scale is a project assumption; the linked store page does not directly document the internal yaw constant.' },
    fov: { status: 'unsupported', note: 'Game-specific FOV camera parameters are not included.' },
    sources: [identitySource('Counter-Strike 2 store page', 'https://store.steampowered.com/app/730/CounterStrike_2'), yawAssumption],
    notes: ['Sensitivity conversion is available using a partially verified project assumption.', 'No game-specific FOV conversion is claimed.'],
  },
  unsupportedGame('apex', 'Apex Legends', 'apex-legends', 'Apex Legends product page', 'https://www.ea.com/games/apex-legends'),
  unsupportedGame('fortnite', 'Fortnite', 'fortnite', 'Fortnite product page', 'https://www.epicgames.com/fortnite'),
  unsupportedGame('rainbow-six', 'Rainbow Six Siege', 'rainbow-six-siege', 'Rainbow Six Siege product page', 'https://www.ubisoft.com/en-us/game/rainbow-six/siege'),
  unsupportedGame('overwatch', 'Overwatch 2', 'overwatch-2', 'Overwatch 2 product page', 'https://overwatch.blizzard.com'),
  unsupportedGame('warzone', 'Warzone', 'warzone', 'Call of Duty: Warzone page', 'https://www.callofduty.com/warzone'),
  unsupportedGame('the-finals', 'The Finals', 'the-finals', 'The Finals store page', 'https://store.steampowered.com/app/2073850/The_Finals'),
  unsupportedGame('marvel-rivals', 'Marvel Rivals', 'marvel-rivals', 'Marvel Rivals product page', 'https://www.marvelrivals.com'),
  unsupportedGame('pubg', 'PUBG', 'pubg', 'PUBG product page', 'https://pubg.com'),
  unsupportedGame('destiny-2', 'Destiny 2', 'destiny-2', 'Destiny 2 product page', 'https://www.bungie.net/7/en/Destiny'),
  unsupportedGame('team-fortress-2', 'Team Fortress 2', 'team-fortress-2', 'Team Fortress 2 store page', 'https://store.steampowered.com/app/440/Team_Fortress_2'),
]

export const GAME_MAP = Object.fromEntries(GAME_LIBRARY.map((game) => [game.id, game])) as Record<GameId, GameDefinition>

export function getGameById(id: string | GameId) {
  return GAME_MAP[id as GameId] ?? null
}