const TOKEN = 'COLE_AQUI_O_TOKEN'
const TTL_SEG = 21600
const CHUNK = 70000

function doGet(e) {
  const token = e && e.parameter ? e.parameter.token : ''
  if (!TOKEN || token !== TOKEN) {
    return saida({ erro: 'token' })
  }
  const params = e.parameter || {}
  const sig = calcularSig()

  if (params.probe) {
    const meta = lerMeta()
    if (!meta || meta.sig !== sig) {
      agendarRebuild(sig)
    }
    return saida({ sig: sig })
  }

  const meta = lerMeta()
  if (meta && meta.chunks) {
    if (meta.sig !== sig) {
      agendarRebuild(sig)
    }
    const payload = carregarPayload(meta)
    if (payload) {
      return saida(payload)
    }
    agendarRebuild(sig)
    return saida({ erro: 'frio' })
  }

  agendarRebuild(sig)
  return saida({ erro: 'frio' })
}

function calcularSig() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  const n = aba.getLastRow()
  const cols = aba.getLastColumn()
  if (n < 2) return 'vazio'
  const fim = Math.max(2, n - 2)
  const ultimas = aba.getRange(fim, 1, n - fim + 1, cols).getDisplayValues()
  const bruto = String(n) + '|' + JSON.stringify(ultimas)
  const dig = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bruto)
  return String(n) + '_' + dig.map((b) => ((b & 0xff) + 0x100).toString(16).slice(1)).join('').slice(0, 16)
}

function lerMeta() {
  const bruto = CacheService.getScriptCache().get('rep_meta')
  if (!bruto) return null
  try {
    return JSON.parse(bruto)
  } catch {
    return null
  }
}

function carregarPayload(meta) {
  const cache = CacheService.getScriptCache()
  const chaves = []
  for (let i = 0; i < meta.chunks; i++) chaves.push('rep_c' + i)
  let partes, b64
  try {
    partes = cache.getAll(chaves)
    b64 = chaves.map((k) => partes[k] || '').join('')
    if (!b64) return null
    const bytes = Utilities.base64Decode(b64)
    const descomprimido = Utilities.ungzip(Utilities.newBlob(bytes)).getDataAsString()
    return JSON.parse(descomprimido)
  } catch {
    return null
  }
}

function construirPayload() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || 'America/Sao_Paulo'
  const valores = aba.getDataRange().getValues()
  const cabecalhos = valores[0].map((h) => String(h).trim())
  const linhas = valores.slice(1).map((linha) =>
    linha.map((v) => {
      if (v instanceof Date) {
        if (v.getFullYear() < 1900) return Utilities.formatDate(v, tz, 'HH:mm')
        return Utilities.formatDate(v, tz, 'dd/MM/yyyy')
      }
      return v
    })
  )
  const json = JSON.stringify({ cabecalhos: cabecalhos, valores: linhas })
  const b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json, 'application/json')).getBytes())
  const chunks = Math.ceil(b64.length / CHUNK)
  const cache = CacheService.getScriptCache()
  for (let i = 0; i < chunks; i++) {
    cache.put('rep_c' + i, b64.slice(i * CHUNK, (i + 1) * CHUNK), TTL_SEG)
  }
  cache.put('rep_meta', JSON.stringify({ sig: calcularSig(), chunks: chunks }), TTL_SEG)
}

function reconstruir() {
  const cache = CacheService.getScriptCache()
  try {
    construirPayload()
  } finally {
    cache.remove('rep_building')
  }
  ScriptApp.getProjectTriggers().forEach((tr) => {
    if (tr.getHandlerFunction() === 'reconstruir') ScriptApp.deleteTrigger(tr)
  })
}

function agendarRebuild(sig) {
  const cache = CacheService.getScriptCache()
  if (cache.get('rep_building')) return
  const meta = lerMeta()
  if (meta && meta.sig === sig) return
  cache.put('rep_building', '1', 600)
  ScriptApp.newTrigger('reconstruir').timeBased().after(20 * 1000).create()
}

function saida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
