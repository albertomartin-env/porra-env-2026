import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { profile } = useAuth()
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, total_points, correct_predictions, predictions_count')
      .order('total_points', { ascending: false })
      .then(({ data }) => {
        setRankings(data || [])
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSpinner />

  const myRank = rankings.findIndex(r => r.id === profile?.id) + 1

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">🏆 Clasificación</h1>
      {profile && myRank > 0 && (
        <p className="text-sm text-slate-500 mb-6">
          Estás en el puesto <strong className="text-emerald-600">#{myRank}</strong> con{' '}
          <strong className="text-emerald-600">{profile.total_points ?? 0} puntos</strong>
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left w-10">#</th>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Predicciones</th>
              <th className="px-4 py-3 text-right hidden sm:table-cell">Aciertos</th>
              <th className="px-4 py-3 text-right">Puntos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rankings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Aún no hay participantes
                </td>
              </tr>
            )}
            {rankings.map((player, i) => {
              const isMe = profile?.id === player.id
              return (
                <tr
                  key={player.id}
                  className={`transition-colors ${isMe ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {MEDALS[i] ?? <span className="text-slate-400">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isMe ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {player.username}
                    </span>
                    {isMe && <span className="ml-1.5 text-xs text-emerald-500 font-normal">(tú)</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-500 hidden sm:table-cell">
                    {player.predictions_count ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-500 hidden sm:table-cell">
                    {player.correct_predictions ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-lg ${isMe ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {player.total_points ?? 0}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        3 puntos por acertar el resultado · 0 por fallar
      </p>
    </div>
  )
}
