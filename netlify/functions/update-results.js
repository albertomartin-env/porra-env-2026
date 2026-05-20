import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APIFOOTBALL_KEY = process.env.APIFOOTBALL_KEY

const FINISHED = ['FT', 'AET', 'PEN']

function getWinner(fixture) {
  const status = fixture.fixture.status.short
  if (!FINISHED.includes(status)) return null

  // Penaltis: el ganador es quien tiene más penaltis convertidos
  if (status === 'PEN') {
    const ph = fixture.score.penalty.home
    const pa = fixture.score.penalty.away
    if (ph !== null && pa !== null) return ph > pa ? 'home' : 'away'
  }

  const gh = fixture.goals.home ?? 0
  const ga = fixture.goals.away ?? 0

  if (gh > ga) return 'home'
  if (ga > gh) return 'away'
  return 'draw' // solo en fase de grupos
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) }
  }

  const token = (event.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) }
  }

  if (!SUPABASE_URL) {
    return { statusCode: 500, body: JSON.stringify({ error: 'VITE_SUPABASE_URL no configurada en Netlify' }) }
  }
  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'PENDIENTE_ver_instrucciones') {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en variables de entorno de Netlify' }),
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token inválido' }) }
  }
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Solo los administradores pueden ejecutar esta acción' }) }
  }

  try {
    // Partidos en juego o terminados
    const res = await fetch(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026&status=1H-HT-2H-ET-BT-P-FT-AET-PEN',
      { headers: { 'x-apisports-key': APIFOOTBALL_KEY } }
    )
    const data = await res.json()

    if (!Array.isArray(data?.response)) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API-Football no devolvió datos válidos' }) }
    }

    let updatedMatches = 0
    let scoredPredictions = 0

    for (const f of data.response) {
      const winner = getWinner(f)
      const status = f.fixture.status.short

      const { data: updated, error: matchErr } = await supabase
        .from('matches')
        .update({
          status,
          home_score: f.goals.home,
          away_score: f.goals.away,
          winner,
          updated_at: new Date().toISOString(),
        })
        .eq('api_id', f.fixture.id)
        .select('id')
        .maybeSingle()

      if (matchErr || !updated) continue
      updatedMatches++

      // Puntuar predicciones solo cuando el partido ha terminado y hay ganador
      if (winner && FINISHED.includes(status)) {
        const { data: preds } = await supabase
          .from('predictions')
          .select('id, prediction')
          .eq('match_id', updated.id)
          .is('points', null)

        if (preds?.length) {
          for (const pred of preds) {
            const points = pred.prediction === winner ? 3 : 0
            await supabase.from('predictions').update({ points }).eq('id', pred.id)
            scoredPredictions++
          }
        }
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `${updatedMatches} partidos actualizados, ${scoredPredictions} predicciones puntuadas`,
      }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
