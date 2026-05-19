import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import PredictionButtons from './PredictionButtons'

const LIVE = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
const FINISHED = ['FT', 'AET', 'PEN']

const STATUS_LABEL = {
  FT: 'FT', AET: 'FT (Prórr.)', PEN: 'FT (Pens.)',
  '1H': '1ª Parte', HT: 'Descanso', '2H': '2ª Parte',
  ET: 'Prórroga', P: 'Penaltis',
  PST: 'Aplazado', CANC: 'Cancelado',
}

function TeamName({ name, flag, align = 'left' }) {
  return (
    <div className={`flex items-center gap-2 flex-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
      {flag
        ? <img src={flag} alt={name} className="w-8 h-5 object-cover rounded-sm shadow-sm shrink-0" />
        : <span className="text-lg">🏳️</span>
      }
      <span className="font-semibold text-slate-800 text-sm leading-tight">{name}</span>
    </div>
  )
}

export default function MatchCard({ match, prediction, onPredict, isLoggedIn }) {
  const isFinished = FINISHED.includes(match.status)
  const isLive = LIVE.includes(match.status)
  const canPredict =
    match.status === 'NS' &&
    new Date(match.match_date) > new Date() &&
    isLoggedIn

  const isCorrect = prediction && isFinished && prediction.points === 3
  const isWrong = prediction && isFinished && prediction.points === 0

  const predLabel = prediction
    ? prediction.prediction === 'home'
      ? match.home_team
      : prediction.prediction === 'away'
      ? match.away_team
      : 'Empate'
    : null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-100 text-xs text-slate-500">
        <span className="font-medium truncate mr-2">{match.round}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span>{format(new Date(match.match_date), "d MMM · HH:mm", { locale: es })}</span>
          {isLive && (
            <span className="bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse font-bold">
              EN VIVO
            </span>
          )}
          {(isFinished || match.status === 'PST' || match.status === 'CANC') && (
            <span className="bg-slate-600 text-white px-1.5 py-0.5 rounded">
              {STATUS_LABEL[match.status] ?? match.status}
            </span>
          )}
        </div>
      </div>

      {/* Teams + Score */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <TeamName name={match.home_team} flag={match.home_flag} align="left" />

          <div className="shrink-0 text-center min-w-[60px]">
            {isFinished || isLive ? (
              <span className="text-xl font-bold text-slate-900">
                {match.home_score ?? 0} – {match.away_score ?? 0}
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-sm">vs</span>
            )}
          </div>

          <TeamName name={match.away_team} flag={match.away_flag} align="right" />
        </div>

        {/* Prediction buttons */}
        {canPredict && (
          <div className="mt-4">
            <PredictionButtons
              match={match}
              currentPrediction={prediction?.prediction}
              onPredict={onPredict}
              isKnockout={match.is_knockout}
            />
          </div>
        )}

        {/* Prediction shown (match not started, past deadline) */}
        {prediction && match.status === 'NS' && !canPredict && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Tu predicción: <strong>{predLabel}</strong>
          </p>
        )}

        {/* Result feedback */}
        {isFinished && prediction && (
          <div className={`mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {isCorrect ? '✓ Acertaste · +3 pts' : '✗ Fallaste · 0 pts'}
            <span className="text-xs opacity-60">({predLabel})</span>
          </div>
        )}

        {isFinished && !prediction && isLoggedIn && (
          <p className="mt-3 text-center text-xs text-slate-400">No hiciste predicción</p>
        )}

        {!isLoggedIn && match.status === 'NS' && new Date(match.match_date) > new Date() && (
          <p className="mt-3 text-center text-xs text-slate-400">
            <a href="/login" className="text-emerald-600 hover:underline">Inicia sesión</a> para predecir
          </p>
        )}
      </div>
    </div>
  )
}
