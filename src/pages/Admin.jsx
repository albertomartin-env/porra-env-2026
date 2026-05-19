import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

function ActionCard({ title, description, buttonLabel, buttonClass, onClick, loading, message }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="font-semibold text-slate-800 mb-1">{title}</h2>
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      <button
        onClick={onClick}
        disabled={loading}
        className={`${buttonClass} disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors`}
      >
        {loading ? '⟳ Procesando...' : buttonLabel}
      </button>
      {message && (
        <p className={`mt-3 text-sm ${message.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}

export default function Admin() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [syncMsg, setSyncMsg] = useState('')
  const [updateMsg, setUpdateMsg] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [updating, setUpdating] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false })
    setUsers(data || [])
    setLoadingUsers(false)
  }

  async function callFunction(fnName, setMsg, setLoading) {
    setLoading(true)
    setMsg('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/.netlify/functions/${fnName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      const json = await res.json()
      setMsg(res.ok ? `✓ ${json.message}` : `✗ ${json.error}`)
    } catch (err) {
      setMsg(`✗ Error: ${err.message}`)
    }
    setLoading(false)
  }

  async function toggleAdmin(userId, current) {
    if (userId === profile?.id) return
    const { error } = await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId)
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !current } : u))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Panel de administración</h1>

      <div className="grid sm:grid-cols-2 gap-5 mb-8">
        <ActionCard
          title="Sincronizar partidos"
          description="Descarga los 104 partidos del Mundial 2026 desde API-Football y los guarda en la base de datos."
          buttonLabel="↓ Sincronizar partidos"
          buttonClass="bg-blue-600 hover:bg-blue-700"
          onClick={() => callFunction('sync-matches', setSyncMsg, setSyncing)}
          loading={syncing}
          message={syncMsg}
        />
        <ActionCard
          title="Actualizar resultados"
          description="Obtiene los marcadores de partidos terminados y calcula automáticamente los puntos de cada usuario."
          buttonLabel="↻ Actualizar resultados"
          buttonClass="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => callFunction('update-results', setUpdateMsg, setUpdating)}
          loading={updating}
          message={updateMsg}
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Usuarios', value: users.length },
          { label: 'Total predicciones', value: users.reduce((s, u) => s + (u.predictions_count || 0), 0) },
          { label: 'Total aciertos', value: users.reduce((s, u) => s + (u.correct_predictions || 0), 0) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Usuarios</h2>
          <span className="text-sm text-slate-400">{users.length} registrados</span>
        </div>
        {loadingUsers ? (
          <LoadingSpinner />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-right">Pred.</th>
                  <th className="px-4 py-3 text-right">Aciertos</th>
                  <th className="px-4 py-3 text-right">Puntos</th>
                  <th className="px-4 py-3 text-center">Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {u.username}
                      {u.id === profile?.id && (
                        <span className="ml-1.5 text-xs text-slate-400">(tú)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-500">
                      {u.predictions_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-500">
                      {u.correct_predictions ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {u.total_points ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAdmin(u.id, u.is_admin)}
                        disabled={u.id === profile?.id}
                        title={u.id === profile?.id ? 'No puedes quitarte admin a ti mismo' : ''}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                          u.is_admin
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700'
                            : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                        }`}
                      >
                        {u.is_admin ? '✓ Admin' : 'Usuario'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
