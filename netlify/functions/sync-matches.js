import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APIFOOTBALL_KEY = process.env.APIFOOTBALL_KEY

function isKnockout(round) {
  if (!round) return false
  const r = round.toLowerCase()
  return !r.includes('group')
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) }
  }

  const token = (event.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) }
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

  // Verificar que el usuario es admin
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token inválido' }) }
  }
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Solo los administradores pueden ejecutar esta acción' }) }
  }

  try {
    // Liga 1 = FIFA World Cup, temporada 2026
    const res = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
      headers: { 'x-apisports-key': APIFOOTBALL_KEY },
    })

    const data = await res.json()

    if (!Array.isArray(data?.response) || data.response.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'API-Football no devolvió partidos. Comprueba que la API key es correcta y el Mundial 2026 está disponible.',
          raw: data,
        }),
      }
    }

    const matches = data.response.map(f => ({
      api_id: f.fixture.id,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_flag: f.teams.home.logo,
      away_flag: f.teams.away.logo,
      match_date: f.fixture.date,
      round: f.league.round,
      venue: f.fixture.venue?.name ?? null,
      status: f.fixture.status.short,
      home_score: f.goals.home,
      away_score: f.goals.away,
      is_knockout: isKnockout(f.league.round),
      updated_at: new Date().toISOString(),
    }))

    const { error: upsertErr } = await supabase
      .from('matches')
      .upsert(matches, { onConflict: 'api_id' })

    if (upsertErr) {
      return { statusCode: 500, body: JSON.stringify({ error: upsertErr.message }) }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `${matches.length} partidos sincronizados correctamente` }),
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
