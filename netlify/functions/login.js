import bcrypt from 'bcryptjs'
import { criarSessao, lerSessao, pegarCookie, cookieSessao, cookieLimpar, json } from './_sessao.js'

const JANELA_MS = 10 * 60 * 1000
const MAX_TENTATIVAS = 20
const tentativasPorIp = new Map()

function limiteOk(ip) {
  const agora = Date.now()
  const t = tentativasPorIp.get(ip) || { n: 0, ini: agora }
  if (agora - t.ini > JANELA_MS) {
    t.n = 0
    t.ini = agora
  }
  t.n++
  tentativasPorIp.set(ip, t)
  return t.n <= MAX_TENTATIVAS
}

export const handler = async (event) => {
  const segredo = process.env.SESSION_SECRET
  const hashComum = process.env.SENHA_COMUM_HASH
  const hashAdmin = process.env.SENHA_ADMIN_HASH

  if (event.httpMethod === 'GET') {
    const sessao = lerSessao(pegarCookie(event), segredo)
    return json(200, { autenticado: !!sessao, admin: !!(sessao && sessao.admin) })
  }

  if (event.httpMethod !== 'POST') return json(405, { erro: 'metodo' })

  if (!segredo || !hashComum || !hashAdmin) return json(500, { erro: 'config' })

  const ip =
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['client-ip'] ||
    (event.requestContext && event.requestContext.ip) ||
    'desconhecido'

  if (!limiteOk(ip)) return json(429, { erro: 'limite' })

  let senha = ''
  try {
    const corpo = JSON.parse(event.body || '{}')
    senha = typeof corpo.senha === 'string' ? corpo.senha : ''
  } catch {
    return json(400, { erro: 'invalido' })
  }
  if (!senha || senha.length > 200) return json(400, { erro: 'invalido' })

  let admin = false
  let comum = false
  try {
    admin = await bcrypt.compare(senha, hashAdmin)
    comum = await bcrypt.compare(senha, hashComum)
  } catch {
    return json(500, { erro: 'config' })
  }

  if (!admin && !comum) return json(401, { erro: 'senha' }, cookieLimpar())

  const token = criarSessao(admin, segredo)
  return json(200, { ok: true, admin }, cookieSessao(token))
}
