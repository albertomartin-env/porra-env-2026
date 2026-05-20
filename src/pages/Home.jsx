import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MatchCard from '../components/MatchCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Home() {
  const { user, profile } = useAuth()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    setLoading(true)
    const { data: matchData } = await supabase
      .from('matches')
      .select('*')
      .eq('status', 'NS')
      .gt('match_date', new Date().toISOString())
      .order('match_date')
      .limit(12)

    setMatches(matchData || [])

    if (user && matchData?.length) {
      const ids = matchData.map(m => m.id)
      const { data: predData } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .in('match_id', ids)
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
      .select()
      .single()
    if (!error && data) setPredictions(prev => ({ ...prev, [matchId]: data }))
  }

  if (loading) return <LoadingSpinner />

  const pending = matches.filter(m => !predictions[m.id])
  const done = matches.filter(m => predictions[m.id])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-900 text-white rounded-2xl p-6 mb-8">
        <h1 className="text-2xl font-bold mb-1">⚽ Porra Mundial 2026</h1>
        <p className="text-slate-300 text-sm">Predice los resultados y compite con tus compañeros</p>
        {user && profile && (
          <div className="mt-4 flex gap-4">
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-xl font-bold text-emerald-400">{profile.total_points ?? 0}</div>
              <div className="text-xs text-slate-400">Puntos</div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-xl font-bold text-emerald-400">{profile.correct_predictions ?? 0}</div>
              <div className="text-xs text-slate-400">Aciertos</div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
              <div className="text-xl font-bold">{profile.predictions_count ?? 0}</div>
              <div className="text-xs text-slate-400">Predicciones</div>
            </div>
          </div>
        )}
      </div>

      {/* Not logged in CTA */}
      {!user && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 text-center">
          <p className="text-emerald-800 font-medium mb-3">Inicia sesión para hacer tus predicciones</p>
          <div className="flex gap-3 justify-center">
            <Link to="/login" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Entrar
            </Link>
            <Link to="/register" className="border border-emerald-300 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
              Registrarse
            </Link>
          </div>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-4">⚽</div>
          <p className="font-medium">No hay partidos disponibles aún</p>
          <p className="text-sm mt-1">El admin debe sincronizar los partidos desde el panel</p>
        </div>
      ) : (
        <>
          {/* Pending predictions */}
          {user && pending.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Pendientes de predecir
                  <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                </h2>
              </div>
              <div className="space-y-3">
                {pending.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={null}
                    onPredict={handlePredict}
                    isLoggedIn={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Already predicted */}
          {user && done.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Ya has predicho</h2>
              <div className="space-y-3">
                {done.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predictions[match.id]}
                    onPredict={handlePredict}
                    isLoggedIn={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Not logged in: show all */}
          {!user && (
            <div className="space-y-3">
              {matches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={null}
                  onPredict={handlePredict}
                  isLoggedIn={false}
                />
              ))}
            </div>
          )}
        </>
      )}

      {matches.length > 0 && (
        <div className="text-center mt-6">
          <Link to="/matches" className="text-emerald-600 hover:underline text-sm font-medium">
            Ver todos los partidos →
          </Link>
        </div>
      )}
    </div>
  )
}
