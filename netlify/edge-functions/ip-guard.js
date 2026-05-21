const ALLOWED_IPS = [
  '194.224.118.218', // oficina
]

export default async (request, context) => {
  if (!ALLOWED_IPS.includes(context.ip)) {
    return new Response('Acceso no autorizado', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

export const config = { path: '/*' }
