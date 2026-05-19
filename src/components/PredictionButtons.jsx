export default function PredictionButtons({ match, currentPrediction, onPredict, isKnockout }) {
  const options = isKnockout
    ? [
        { key: 'home', label: match.home_team },
        { key: 'away', label: match.away_team },
      ]
    : [
        { key: 'home', label: match.home_team },
        { key: 'draw', label: 'Empate' },
        { key: 'away', label: match.away_team },
      ]

  return (
    <div className={`grid gap-2 ${isKnockout ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {options.map(({ key, label }) => {
        const selected = currentPrediction === key
        return (
          <button
            key={key}
            onClick={() => onPredict(match.id, key)}
            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all truncate ${
              selected
                ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-400'
                : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
            }`}
          >
            {selected && '✓ '}{label}
          </button>
        )
      })}
    </div>
  )
}
