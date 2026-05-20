import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const F = (code) => `https://flagcdn.com/w40/${code}.png`

// Partidos fase de grupos Mundial 2026 (tiempos en UTC, fuente ESPN/FIFA)
// Argentina UTC-3 + 3h = UTC
const MATCHES = [
  // ── GRUPO A: Mexico, South Africa, South Korea, Czech Republic ──
  { home_team:'Mexico',        away_team:'South Africa',  home_flag:F('mx'), away_flag:F('za'), match_date:'2026-06-11T19:00:00Z', round:'Group Stage - 1', venue:'Estadio Azteca, Ciudad de México',        is_knockout:false },
  { home_team:'South Korea',   away_team:'Czech Republic',home_flag:F('kr'), away_flag:F('cz'), match_date:'2026-06-12T02:00:00Z', round:'Group Stage - 1', venue:'Estadio Akron, Guadalajara',               is_knockout:false },
  { home_team:'Czech Republic',away_team:'South Africa',  home_flag:F('cz'), away_flag:F('za'), match_date:'2026-06-18T16:00:00Z', round:'Group Stage - 2', venue:'Mercedes-Benz Stadium, Atlanta',           is_knockout:false },
  { home_team:'Mexico',        away_team:'South Korea',   home_flag:F('mx'), away_flag:F('kr'), match_date:'2026-06-19T01:00:00Z', round:'Group Stage - 2', venue:'Estadio Akron, Guadalajara',               is_knockout:false },
  { home_team:'South Africa',  away_team:'South Korea',   home_flag:F('za'), away_flag:F('kr'), match_date:'2026-06-25T01:00:00Z', round:'Group Stage - 3', venue:'Estadio BBVA, Monterrey',                  is_knockout:false },
  { home_team:'Czech Republic',away_team:'Mexico',        home_flag:F('cz'), away_flag:F('mx'), match_date:'2026-06-25T01:00:00Z', round:'Group Stage - 3', venue:'Estadio Azteca, Ciudad de México',        is_knockout:false },

  // ── GRUPO B: Canada, Bosnia, Qatar, Switzerland ──
  { home_team:'Canada',      away_team:'Bosnia',      home_flag:F('ca'), away_flag:F('ba'), match_date:'2026-06-12T19:00:00Z', round:'Group Stage - 1', venue:'BMO Field, Toronto',          is_knockout:false },
  { home_team:'Qatar',       away_team:'Switzerland', home_flag:F('qa'), away_flag:F('ch'), match_date:'2026-06-13T19:00:00Z', round:'Group Stage - 1', venue:'Levi\'s Stadium, San Francisco',is_knockout:false },
  { home_team:'Switzerland', away_team:'Bosnia',      home_flag:F('ch'), away_flag:F('ba'), match_date:'2026-06-18T19:00:00Z', round:'Group Stage - 2', venue:'SoFi Stadium, Los Ángeles',    is_knockout:false },
  { home_team:'Canada',      away_team:'Qatar',       home_flag:F('ca'), away_flag:F('qa'), match_date:'2026-06-18T22:00:00Z', round:'Group Stage - 2', venue:'BC Place, Vancouver',          is_knockout:false },
  { home_team:'Switzerland', away_team:'Canada',      home_flag:F('ch'), away_flag:F('ca'), match_date:'2026-06-24T19:00:00Z', round:'Group Stage - 3', venue:'BC Place, Vancouver',          is_knockout:false },
  { home_team:'Bosnia',      away_team:'Qatar',       home_flag:F('ba'), away_flag:F('qa'), match_date:'2026-06-24T19:00:00Z', round:'Group Stage - 3', venue:'Lumen Field, Seattle',         is_knockout:false },

  // ── GRUPO C: Brazil, Morocco, Haiti, Scotland ──
  { home_team:'Brazil',   away_team:'Morocco',  home_flag:F('br'), away_flag:F('ma'), match_date:'2026-06-13T22:00:00Z', round:'Group Stage - 1', venue:'MetLife Stadium, Nueva Jersey',          is_knockout:false },
  { home_team:'Haiti',    away_team:'Scotland', home_flag:F('ht'), away_flag:F('gb-sct'), match_date:'2026-06-14T01:00:00Z', round:'Group Stage - 1', venue:'Gillette Stadium, Boston',            is_knockout:false },
  { home_team:'Scotland', away_team:'Morocco',  home_flag:F('gb-sct'), away_flag:F('ma'), match_date:'2026-06-19T22:00:00Z', round:'Group Stage - 2', venue:'Gillette Stadium, Boston',            is_knockout:false },
  { home_team:'Brazil',   away_team:'Haiti',    home_flag:F('br'), away_flag:F('ht'), match_date:'2026-06-20T00:30:00Z', round:'Group Stage - 2', venue:'Lincoln Financial Field, Philadelphia', is_knockout:false },
  { home_team:'Morocco',  away_team:'Haiti',    home_flag:F('ma'), away_flag:F('ht'), match_date:'2026-06-24T22:00:00Z', round:'Group Stage - 3', venue:'Mercedes-Benz Stadium, Atlanta',         is_knockout:false },
  { home_team:'Brazil',   away_team:'Scotland', home_flag:F('br'), away_flag:F('gb-sct'), match_date:'2026-06-24T22:00:00Z', round:'Group Stage - 3', venue:'Hard Rock Stadium, Miami',            is_knockout:false },

  // ── GRUPO D: United States, Paraguay, Australia, Turkey ──
  { home_team:'United States', away_team:'Paraguay',   home_flag:F('us'), away_flag:F('py'), match_date:'2026-06-13T01:00:00Z', round:'Group Stage - 1', venue:'SoFi Stadium, Los Ángeles',    is_knockout:false },
  { home_team:'Australia',     away_team:'Turkey',     home_flag:F('au'), away_flag:F('tr'), match_date:'2026-06-13T04:00:00Z', round:'Group Stage - 1', venue:'BC Place, Vancouver',           is_knockout:false },
  { home_team:'United States', away_team:'Australia',  home_flag:F('us'), away_flag:F('au'), match_date:'2026-06-19T19:00:00Z', round:'Group Stage - 2', venue:'Lumen Field, Seattle',          is_knockout:false },
  { home_team:'Turkey',        away_team:'Paraguay',   home_flag:F('tr'), away_flag:F('py'), match_date:'2026-06-19T03:00:00Z', round:'Group Stage - 2', venue:'Levi\'s Stadium, San Francisco', is_knockout:false },
  { home_team:'Paraguay',      away_team:'Australia',  home_flag:F('py'), away_flag:F('au'), match_date:'2026-06-26T02:00:00Z', round:'Group Stage - 3', venue:'Levi\'s Stadium, San Francisco', is_knockout:false },
  { home_team:'Turkey',        away_team:'United States',home_flag:F('tr'),away_flag:F('us'), match_date:'2026-06-26T02:00:00Z', round:'Group Stage - 3', venue:'SoFi Stadium, Los Ángeles',    is_knockout:false },

  // ── GRUPO E: Germany, Curacao, Ivory Coast, Ecuador ──
  { home_team:'Germany',     away_team:'Curacao',     home_flag:F('de'), away_flag:F('cw'), match_date:'2026-06-14T17:00:00Z', round:'Group Stage - 1', venue:'NRG Stadium, Houston',                    is_knockout:false },
  { home_team:'Ivory Coast', away_team:'Ecuador',     home_flag:F('ci'), away_flag:F('ec'), match_date:'2026-06-14T23:00:00Z', round:'Group Stage - 1', venue:'Lincoln Financial Field, Philadelphia',    is_knockout:false },
  { home_team:'Germany',     away_team:'Ivory Coast', home_flag:F('de'), away_flag:F('ci'), match_date:'2026-06-20T20:00:00Z', round:'Group Stage - 2', venue:'BMO Field, Toronto',                       is_knockout:false },
  { home_team:'Ecuador',     away_team:'Curacao',     home_flag:F('ec'), away_flag:F('cw'), match_date:'2026-06-21T02:00:00Z', round:'Group Stage - 2', venue:'Arrowhead Stadium, Kansas City',            is_knockout:false },
  { home_team:'Curacao',     away_team:'Ivory Coast', home_flag:F('cw'), away_flag:F('ci'), match_date:'2026-06-25T20:00:00Z', round:'Group Stage - 3', venue:'Lincoln Financial Field, Philadelphia',    is_knockout:false },
  { home_team:'Ecuador',     away_team:'Germany',     home_flag:F('ec'), away_flag:F('de'), match_date:'2026-06-25T20:00:00Z', round:'Group Stage - 3', venue:'MetLife Stadium, Nueva Jersey',             is_knockout:false },

  // ── GRUPO F: Netherlands, Japan, Sweden, Tunisia ──
  { home_team:'Netherlands', away_team:'Japan',       home_flag:F('nl'), away_flag:F('jp'), match_date:'2026-06-14T20:00:00Z', round:'Group Stage - 1', venue:'AT&T Stadium, Dallas',           is_knockout:false },
  { home_team:'Sweden',      away_team:'Tunisia',     home_flag:F('se'), away_flag:F('tn'), match_date:'2026-06-15T02:00:00Z', round:'Group Stage - 1', venue:'Estadio BBVA, Monterrey',         is_knockout:false },
  { home_team:'Netherlands', away_team:'Sweden',      home_flag:F('nl'), away_flag:F('se'), match_date:'2026-06-20T17:00:00Z', round:'Group Stage - 2', venue:'NRG Stadium, Houston',             is_knockout:false },
  { home_team:'Tunisia',     away_team:'Japan',       home_flag:F('tn'), away_flag:F('jp'), match_date:'2026-06-20T04:00:00Z', round:'Group Stage - 2', venue:'Estadio BBVA, Monterrey',         is_knockout:false },
  { home_team:'Japan',       away_team:'Sweden',      home_flag:F('jp'), away_flag:F('se'), match_date:'2026-06-25T23:00:00Z', round:'Group Stage - 3', venue:'AT&T Stadium, Dallas',            is_knockout:false },
  { home_team:'Tunisia',     away_team:'Netherlands', home_flag:F('tn'), away_flag:F('nl'), match_date:'2026-06-25T23:00:00Z', round:'Group Stage - 3', venue:'Arrowhead Stadium, Kansas City',   is_knockout:false },

  // ── GRUPO G: Belgium, Egypt, Iran, New Zealand ──
  { home_team:'Belgium',     away_team:'Egypt',       home_flag:F('be'), away_flag:F('eg'), match_date:'2026-06-15T19:00:00Z', round:'Group Stage - 1', venue:'Lumen Field, Seattle',    is_knockout:false },
  { home_team:'Iran',        away_team:'New Zealand', home_flag:F('ir'), away_flag:F('nz'), match_date:'2026-06-16T01:00:00Z', round:'Group Stage - 1', venue:'SoFi Stadium, Los Ángeles',is_knockout:false },
  { home_team:'Belgium',     away_team:'Iran',        home_flag:F('be'), away_flag:F('ir'), match_date:'2026-06-21T19:00:00Z', round:'Group Stage - 2', venue:'SoFi Stadium, Los Ángeles',is_knockout:false },
  { home_team:'New Zealand', away_team:'Egypt',       home_flag:F('nz'), away_flag:F('eg'), match_date:'2026-06-22T01:00:00Z', round:'Group Stage - 2', venue:'BC Place, Vancouver',      is_knockout:false },
  { home_team:'Egypt',       away_team:'Iran',        home_flag:F('eg'), away_flag:F('ir'), match_date:'2026-06-26T03:00:00Z', round:'Group Stage - 3', venue:'Lumen Field, Seattle',     is_knockout:false },
  { home_team:'New Zealand', away_team:'Belgium',     home_flag:F('nz'), away_flag:F('be'), match_date:'2026-06-26T03:00:00Z', round:'Group Stage - 3', venue:'BC Place, Vancouver',      is_knockout:false },

  // ── GRUPO H: Spain, Cape Verde, Saudi Arabia, Uruguay ──
  { home_team:'Spain',         away_team:'Cape Verde',   home_flag:F('es'), away_flag:F('cv'), match_date:'2026-06-15T16:00:00Z', round:'Group Stage - 1', venue:'Mercedes-Benz Stadium, Atlanta', is_knockout:false },
  { home_team:'Saudi Arabia',  away_team:'Uruguay',      home_flag:F('sa'), away_flag:F('uy'), match_date:'2026-06-15T22:00:00Z', round:'Group Stage - 1', venue:'Hard Rock Stadium, Miami',       is_knockout:false },
  { home_team:'Spain',         away_team:'Saudi Arabia', home_flag:F('es'), away_flag:F('sa'), match_date:'2026-06-21T16:00:00Z', round:'Group Stage - 2', venue:'Mercedes-Benz Stadium, Atlanta', is_knockout:false },
  { home_team:'Uruguay',       away_team:'Cape Verde',   home_flag:F('uy'), away_flag:F('cv'), match_date:'2026-06-21T22:00:00Z', round:'Group Stage - 2', venue:'Hard Rock Stadium, Miami',       is_knockout:false },
  { home_team:'Cape Verde',    away_team:'Saudi Arabia', home_flag:F('cv'), away_flag:F('sa'), match_date:'2026-06-27T00:00:00Z', round:'Group Stage - 3', venue:'NRG Stadium, Houston',            is_knockout:false },
  { home_team:'Uruguay',       away_team:'Spain',        home_flag:F('uy'), away_flag:F('es'), match_date:'2026-06-27T00:00:00Z', round:'Group Stage - 3', venue:'Estadio Akron, Guadalajara',      is_knockout:false },

  // ── GRUPO I: France, Senegal, Iraq, Norway ──
  { home_team:'France',   away_team:'Senegal',  home_flag:F('fr'), away_flag:F('sn'), match_date:'2026-06-16T19:00:00Z', round:'Group Stage - 1', venue:'MetLife Stadium, Nueva Jersey',          is_knockout:false },
  { home_team:'Iraq',     away_team:'Norway',   home_flag:F('iq'), away_flag:F('no'), match_date:'2026-06-16T22:00:00Z', round:'Group Stage - 1', venue:'Gillette Stadium, Boston',               is_knockout:false },
  { home_team:'France',   away_team:'Iraq',     home_flag:F('fr'), away_flag:F('iq'), match_date:'2026-06-22T21:00:00Z', round:'Group Stage - 2', venue:'Lincoln Financial Field, Philadelphia',   is_knockout:false },
  { home_team:'Norway',   away_team:'Senegal',  home_flag:F('no'), away_flag:F('sn'), match_date:'2026-06-23T00:00:00Z', round:'Group Stage - 2', venue:'MetLife Stadium, Nueva Jersey',          is_knockout:false },
  { home_team:'Norway',   away_team:'France',   home_flag:F('no'), away_flag:F('fr'), match_date:'2026-06-26T19:00:00Z', round:'Group Stage - 3', venue:'Gillette Stadium, Boston',               is_knockout:false },
  { home_team:'Senegal',  away_team:'Iraq',     home_flag:F('sn'), away_flag:F('iq'), match_date:'2026-06-26T19:00:00Z', round:'Group Stage - 3', venue:'BMO Field, Toronto',                     is_knockout:false },

  // ── GRUPO J: Argentina, Algeria, Austria, Jordan ──
  { home_team:'Argentina', away_team:'Algeria',   home_flag:F('ar'), away_flag:F('dz'), match_date:'2026-06-17T01:00:00Z', round:'Group Stage - 1', venue:'Arrowhead Stadium, Kansas City', is_knockout:false },
  { home_team:'Austria',   away_team:'Jordan',    home_flag:F('at'), away_flag:F('jo'), match_date:'2026-06-16T04:00:00Z', round:'Group Stage - 1', venue:'Levi\'s Stadium, San Francisco',  is_knockout:false },
  { home_team:'Argentina', away_team:'Austria',   home_flag:F('ar'), away_flag:F('at'), match_date:'2026-06-22T17:00:00Z', round:'Group Stage - 2', venue:'AT&T Stadium, Dallas',             is_knockout:false },
  { home_team:'Jordan',    away_team:'Algeria',   home_flag:F('jo'), away_flag:F('dz'), match_date:'2026-06-22T03:00:00Z', round:'Group Stage - 2', venue:'Levi\'s Stadium, San Francisco',  is_knockout:false },
  { home_team:'Algeria',   away_team:'Austria',   home_flag:F('dz'), away_flag:F('at'), match_date:'2026-06-28T02:00:00Z', round:'Group Stage - 3', venue:'Arrowhead Stadium, Kansas City',  is_knockout:false },
  { home_team:'Jordan',    away_team:'Argentina', home_flag:F('jo'), away_flag:F('ar'), match_date:'2026-06-28T02:00:00Z', round:'Group Stage - 3', venue:'AT&T Stadium, Dallas',             is_knockout:false },

  // ── GRUPO K: Portugal, DR Congo, Uzbekistan, Colombia ──
  { home_team:'Portugal',   away_team:'DR Congo',    home_flag:F('pt'), away_flag:F('cd'), match_date:'2026-06-17T17:00:00Z', round:'Group Stage - 1', venue:'NRG Stadium, Houston',           is_knockout:false },
  { home_team:'Uzbekistan', away_team:'Colombia',    home_flag:F('uz'), away_flag:F('co'), match_date:'2026-06-18T02:00:00Z', round:'Group Stage - 1', venue:'Estadio Azteca, Ciudad de México',is_knockout:false },
  { home_team:'Portugal',   away_team:'Uzbekistan',  home_flag:F('pt'), away_flag:F('uz'), match_date:'2026-06-23T17:00:00Z', round:'Group Stage - 2', venue:'NRG Stadium, Houston',           is_knockout:false },
  { home_team:'Colombia',   away_team:'DR Congo',    home_flag:F('co'), away_flag:F('cd'), match_date:'2026-06-24T02:00:00Z', round:'Group Stage - 2', venue:'Estadio Akron, Guadalajara',      is_knockout:false },
  { home_team:'Colombia',   away_team:'Portugal',    home_flag:F('co'), away_flag:F('pt'), match_date:'2026-06-27T23:30:00Z', round:'Group Stage - 3', venue:'Hard Rock Stadium, Miami',        is_knockout:false },
  { home_team:'DR Congo',   away_team:'Uzbekistan',  home_flag:F('cd'), away_flag:F('uz'), match_date:'2026-06-27T23:30:00Z', round:'Group Stage - 3', venue:'Mercedes-Benz Stadium, Atlanta',  is_knockout:false },

  // ── GRUPO L: England, Croatia, Ghana, Panama ──
  { home_team:'England', away_team:'Croatia', home_flag:F('gb-eng'), away_flag:F('hr'), match_date:'2026-06-17T20:00:00Z', round:'Group Stage - 1', venue:'AT&T Stadium, Dallas',             is_knockout:false },
  { home_team:'Ghana',   away_team:'Panama',  home_flag:F('gh'),     away_flag:F('pa'), match_date:'2026-06-17T23:00:00Z', round:'Group Stage - 1', venue:'BMO Field, Toronto',                is_knockout:false },
  { home_team:'England', away_team:'Ghana',   home_flag:F('gb-eng'), away_flag:F('gh'), match_date:'2026-06-23T20:00:00Z', round:'Group Stage - 2', venue:'Gillette Stadium, Boston',          is_knockout:false },
  { home_team:'Panama',  away_team:'Croatia', home_flag:F('pa'),     away_flag:F('hr'), match_date:'2026-06-23T23:00:00Z', round:'Group Stage - 2', venue:'BMO Field, Toronto',                is_knockout:false },
  { home_team:'Croatia', away_team:'Ghana',   home_flag:F('hr'),     away_flag:F('gh'), match_date:'2026-06-27T21:00:00Z', round:'Group Stage - 3', venue:'Lincoln Financial Field, Philadelphia',is_knockout:false },
  { home_team:'Panama',  away_team:'England', home_flag:F('pa'),     away_flag:F('gb-eng'), match_date:'2026-06-27T21:00:00Z', round:'Group Stage - 3', venue:'MetLife Stadium, Nueva Jersey', is_knockout:false },
]

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) }
  }

  const token = (event.headers.authorization || '').replace('Bearer ', '')
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) }

  if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === 'PENDIENTE_ver_instrucciones') {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en Netlify' }) }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Token inválido' }) }

  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return { statusCode: 403, body: JSON.stringify({ error: 'Solo administradores' }) }

  // Borra partidos sin api_id (seeds anteriores) para evitar duplicados
  await supabase.from('matches').delete().is('api_id', null)

  const { error } = await supabase.from('matches').insert(MATCHES)
  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: `${MATCHES.length} partidos de fase de grupos cargados correctamente` }),
  }
}
