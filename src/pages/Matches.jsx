import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
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
  'Cuartos de Final', 'Semifinales', '3er Puesto', 'Final', 'Otros'
]

export default function Matches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [rounds, setRounds] = useState([])

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const { data: matchData } = await supabase.from('matches').select('*').order('match_date')
    setMatches(matchData || [])

    const seen = new Set()
    const uniqueRounds = []
    for (const m of matchData || []) {
      const rg = roundGroup(m.round)
      if (!seen.has(rg)) { seen.add(rg); uniqueRounds.push(rg) }
    }
    setRounds(uniqueRounds.sort((a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b)))

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

  const filtered = filter === 'all' ? matches : matches.filter(m => roundGroup(m.round) === filter)

  const grouped = {}
  for (const m of filtered) {
    const rg = roundGroup(m.round)
    if (!grouped[rg]) grouped[rg] = []
    grouped[rg].push(m)
  }

  const sortedGroups = Object.keys(grouped).sort(
    (a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b)
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Todos los partidos</h1>

      {/* Filter pills */}
      {rounds.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {['all', ...rounds].map(r => (
            <button
              key={r}
              onClick={() => setFilter(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === r
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r === 'all' ? 'Todos' : r}
            </button>
          ))}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">⚽</div>
          <p>No hay partidos disponibles todavía</p>
        </div>
      ) : (
        sortedGroups.map(roundName => (
          <div key={roundName} className="mb-8">
            <h2 className="text-base font-semibold text-slate-600 mb-3 pb-2 border-b border-slate-200 flex items-center gap-2">
              {roundName}
              <span className="text-xs font-normal text-slate-400">({grouped[roundName].length} partidos)</span>
            </h2>
            <div className="space-y-3">
              {grouped[roundName].map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictions[match.id]}
                  onPredict={handlePredict}
                  isLoggedIn={!!user}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
