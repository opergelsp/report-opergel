import crypto from 'node:crypto'

const COOKIE_NOME = 'rep_sessao'
const TTL_MS = 60 * 60 * 1000

function assinar(dados, segredo) {
  return crypto.createHmac('sha256', segredo).update(dados).digest('base64url')
}

function criarSessao(admin, segredo) {
  const corpo = Buffer.from(JSON.stringify({ a: admin ? 1 : 0, e: Date.now() + TTL_MS })).toString('base64url')
  return corpo + '.' + assinar(corpo, segredo)
}

function lerSessao(valor, segredo) {
  if (!valor || typeof valor !== 'string') return null
  const partes = valor.split('.')
  if (partes.length !== 2) return null
  const [corpo, mac] = partes
  const a = Buffer.from(mac)
  const b = Buffer.from(assinar(corpo, segredo))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    if (!dados.e || Date.now() > dados.e) return null
    return { admin: dados.a === 1 }
  } catch {
    return null
  }
}

function pegarCookie(event) {
  const bruto = event.headers.cookie || event.headers.Cookie || ''
  const par = bruto.split(';').find((c) => c.trim().startsWith(COOKIE_NOME + '='))
  return par ? par.split('=').slice(1).join('=').trim() : ''
}

function cookieSessao(token) {
  return COOKIE_NOME + '=' + token + '; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=' + Math.floor(TTL_MS / 1000)
}

function cookieLimpar() {
  return COOKIE_NOME + '=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'
}

function json(status, corpo, cookie) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  if (cookie) headers['Set-Cookie'] = cookie
  return { statusCode: status, headers, body: JSON.stringify(corpo) }
}

export { COOKIE_NOME, TTL_MS, criarSessao, lerSessao, pegarCookie, cookieSessao, cookieLimpar, json }
