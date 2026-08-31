import { json, cookieLimpar } from './_sessao.js'

export const handler = async () => json(200, { ok: true }, cookieLimpar())
