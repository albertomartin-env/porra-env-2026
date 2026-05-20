import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { loadSettings } from '../lib/settings'
import { useAuth } from '../context/AuthContext'
import MatchCard from '../components/MatchCard'
import LoadingSpinner from '../components/LoadingSpinner'

function roundGroup(round) {
  if (!round) return 'Otros'
  const r = round.toLowerCase()
  if (r.includes('group')) return 'Fase de Grupos'
  if (r.includes('round of 32')) return 'Ronda de 32'
  if (r.includes('round of 16')) return 'Octavos de Final'
  if (r.includes('quarter')) return 'Cuartos de Final'
  if (r.includes('semi')) return 'Semifinales'
  if (r.includes('3rd') || r.includes('third')) return '3er Puesto'
  if (r.includes('final')) return 'Final'
  return round
}

const ROUND_ORDER = [
  'Fase de Grupos', 'Ronda de 32', 'Octavos de Final',
  'Cuartos de Final', 'Semifinales', '3er Puesto', 'Final', 'Otros',
]

const FINISHED = ['FT', 'AET', 'PEN']

function phaseStats(matches) {
  const total = matches.length
  const done = matches.filter(m => FINISHED.includes(m.status)).length
  const live = matches.filter(m => ['1H', 'HT', '2H', 'ET', 'BT', 'P'].includes(m.status)).length
  return { total, done, live, allDone: total > 0 && done === total }
}

function PhaseBadge({ stats }) {
  if (stats.live > 0) return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 animate-pulse">
      EN VIVO
    </span>
  )
  if (stats.allDone) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
      Completada
    </span>
  )
  if (stats.done > 0) return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
      {stats.done}/{stats.total} jugados
    </span>
  )
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
      Próxima
    </span>
  )
}

function PhaseSection({ name, matches, predictions, onPredict, isLoggedIn, canPredict, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const stats = phaseStats(matches)

  return (
    <div className="mb-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">{name}</span>
          <PhaseBadge stats={stats} />
          <span className="text-xs text-slate-400">{matches.length} partidos</span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {matches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              onPredict={onPredict}
              isLoggedIn={isLoggedIn}
              canPredict={canPredict}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Matches() {
  const { user, profile } = useAuth()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [settings, setSettings] = useState({ bizumPhone: '', bizumAmount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const [{ data: matchData }, cfg] = await Promise.all([
      supabase.from('matches').select('*').order('match_date'),
      loadSettings(),
    ])
    setMatches(matchData || [])
    setSettings(cfg)

    if (user && matchData?.length) {
      const ids = matchData.map(m => m.id)
      const { data: predData } = await supabase
        .from('predictions').select('*').eq('user_id', user.id).in('match_id', ids)
      const map = {}
      predData?.forEach(p => { map[p.match_id] = p })
      setPredictions(map)
    }
    setLoading(false)
  }

  async function handlePredict(matchId, prediction) {
    if (!user) return
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        { user_id: user.id, match_id: matchId, prediction, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,match_id' }
      )
      .select().single()
    if (!error && data) setPredictions(prev => ({ ...prev, [matchId]: data }))
  }

  const grouped = {}
  for (const m of matches) {
    const rg = roundGroup(m.round)
    if (!grouped[rg]) grouped[rg] = []
    grouped[rg].push(m)
  }

  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b)
  )

  const activePhase = sortedGroups.find(g => !phaseStats(grouped[g]).allDone) ?? sortedGroups[0]
  const paymentRequired = settings.bizumAmount > 0
  const canPredict = !!user && (!paymentRequired || !!profile?.paid)

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Todos los partidos</h1>

      {matches.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">⚽</div>
          <p>No hay partidos disponibles todavía</p>
        </div>
      ) : (
        sortedGroups.map(name => (
          <PhaseSection
            key={name}
            name={name}
            matches={grouped[name]}
            predictions={predictions}
            onPredict={handlePredict}
            isLoggedIn={!!user}
            canPredict={canPredict}
            defaultOpen={name === activePhase}
          />
        ))
      )}
    </div>
  )
}
