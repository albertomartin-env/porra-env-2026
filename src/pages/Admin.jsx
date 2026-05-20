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
  const [seedMsg, setSeedMsg] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [seeding, setSeeding] = useState(false)

  const [bizumPhone, setBizumPhone] = useState('')
  const [bizumAmount, setBizumAmount] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMsg, setSettingsMsg] = useState('')

  useEffect(() => {
    loadUsers()
    loadSettingsForm()
  }, [])

  async function loadSettingsForm() {
    const { data } = await supabase.from('app_settings').select('*')
    const map = {}
    data?.forEach(s => { map[s.key] = s.value })
    setBizumPhone(map.bizum_phone || '')
    setBizumAmount(map.bizum_amount || '0')
  }

  async function saveSettings(e) {
    e.preventDefault()
    setSavingSettings(true)
    setSettingsMsg('')
    const { error } = await supabase.from('app_settings').upsert([
      { key: 'bizum_phone', value: bizumPhone.trim() },
      { key: 'bizum_amount', value: String(parseFloat(bizumAmount) || 0) },
    ])
    setSettingsMsg(error ? `✗ ${error.message}` : '✓ Configuración guardada')
    setSavingSettings(false)
  }

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

  async function togglePaid(userId, current) {
    const { error } = await supabase.from('profiles').update({ paid: !current }).eq('id', userId)
    if (!error) setUsers(prev => prev.map(u => u.id === userId ? { ...u, paid: !current } : u))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Panel de administración</h1>

      {/* Bizum settings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="font-semibold text-slate-800 mb-1">Configuración de pago (Bizum)</h2>
        <p className="text-sm text-slate-500 mb-4">
          Si el importe es 0, el pago no es obligatorio y todos los usuarios pueden predecir.
        </p>
        <form onSubmit={saveSettings} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número de teléfono</label>
            <input
              type="tel"
              value={bizumPhone}
              onChange={e => setBizumPhone(e.target.value)}
              placeholder="600 000 000"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Importe (€)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={bizumAmount}
              onChange={e => setBizumAmount(e.target.value)}
              placeholder="0"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingSettings}
            className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {savingSettings ? 'Guardando...' : 'Guardar'}
          </button>
          {settingsMsg && (
            <p className={`text-sm ${settingsMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>
              {settingsMsg}
            </p>
          )}
        </form>
      </div>

      {/* Action buttons */}
      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        <ActionCard
          title="Cargar fase de grupos"
          description="Inserta los 72 partidos de la fase de grupos precargados."
          buttonLabel="⚽ Cargar partidos"
          buttonClass="bg-violet-600 hover:bg-violet-700"
          onClick={() => callFunction('seed-matches', setSeedMsg, setSeeding)}
          loading={seeding}
          message={seedMsg}
        />
        <ActionCard
          title="Sincronizar desde API"
          description="Descarga todos los partidos del Mundial 2026 desde API-Football."
          buttonLabel="↓ Sincronizar API"
          buttonClass="bg-blue-600 hover:bg-blue-700"
          onClick={() => callFunction('sync-matches', setSyncMsg, setSyncing)}
          loading={syncing}
          message={syncMsg}
        />
        <ActionCard
          title="Actualizar resultados"
          description="Obtiene marcadores de partidos terminados y puntúa predicciones."
          buttonLabel="↻ Actualizar resultados"
          buttonClass="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => callFunction('update-results', setUpdateMsg, setUpdating)}
          loading={updating}
          message={updateMsg}
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Usuarios', value: users.length },
          { label: 'Pagados', value: users.filter(u => u.paid).length },
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
                  <th className="px-4 py-3 text-center">Pagado</th>
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
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePaid(u.id, u.paid)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          u.paid
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-red-100 hover:text-red-700'
                            : 'bg-red-100 text-red-600 hover:bg-emerald-100 hover:text-emerald-700'
                        }`}
                      >
                        {u.paid ? '✓ Pagado' : '✗ Pendiente'}
                      </button>
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
