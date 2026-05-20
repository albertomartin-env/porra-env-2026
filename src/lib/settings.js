import { supabase } from './supabase'

export async function loadSettings() {
  const { data } = await supabase.from('app_settings').select('*')
  const map = {}
  data?.forEach(s => { map[s.key] = s.value })
  return {
    bizumPhone: map.bizum_phone || '',
    bizumAmount: parseFloat(map.bizum_amount) || 0,
  }
}
