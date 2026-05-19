import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function StatBox({ value, label, highlight }) {
  return (
    <div className="text-center bg-slate-50 rounded-lg p-3">
      <div className={`text-2xl font-bold ${highlight ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [username, setUsername] = useState(profile?.username || '')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [msgUser, setMsgUser] = useState(null)
  const [msgPwd, setMsgPwd] = useState(null)
  const [loadUser, setLoadUser] = useState(false)
  const [loadPwd, setLoadPwd] = useState(false)

  async function handleUpdateUsername(e) {
    e.preventDefault()
    setLoadUser(true)
    setMsgUser(null)
    const { error } = await supabase.from('profiles').update({ username }).eq('id', user.id)
    if (error) {
      setMsgUser({ ok: false, text: error.message.includes('unique') ? 'Ese nombre ya está en uso' : error.message })
    } else {
      setMsgUser({ ok: true, text: 'Nombre actualizado correctamente' })
      await refreshProfile()
    }
    setLoadUser(false)
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    if (newPwd !== confirmPwd) return setMsgPwd({ ok: false, text: 'Las contraseñas no coinciden' })
    if (newPwd.length < 6) return setMsgPwd({ ok: false, text: 'Mínimo 6 caracteres' })
    setLoadPwd(true)
    setMsgPwd(null)
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) {
      setMsgPwd({ ok: false, text: error.message })
    } else {
      setMsgPwd({ ok: true, text: 'Contraseña actualizada correctamente' })
      setNewPwd('')
      setConfirmPwd('')
    }
    setLoadPwd(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">Mi perfil</h1>

      <div className="space-y-5">
        {/* Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Estadísticas</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatBox value={profile?.predictions_count ?? 0} label="Predicciones" />
            <StatBox value={profile?.correct_predictions ?? 0} label="Aciertos" />
            <StatBox value={profile?.total_points ?? 0} label="Puntos totales" highlight />
          </div>
        </div>

        {/* Username */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Nombre de usuario</h2>
          <form onSubmit={handleUpdateUsername} className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              minLength={3}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loadUser}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loadUser ? '...' : 'Guardar'}
            </button>
          </form>
          {msgUser && (
            <p className={`mt-2 text-sm ${msgUser.ok ? 'text-emerald-600' : 'text-red-600'}`}>
              {msgUser.ok ? '✓' : '✗'} {msgUser.text}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Cambiar contraseña</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {msgPwd && (
              <p className={`text-sm ${msgPwd.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                {msgPwd.ok ? '✓' : '✗'} {msgPwd.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loadPwd}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loadPwd ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>

        <p className="text-xs text-slate-400 text-center">Email: {user?.email}</p>
      </div>
    </div>
  )
}
