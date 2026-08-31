import * as XLSX from 'xlsx'

const MAPA = {
  romaneio: 'Romaneio',
  anexos: 'Anexos',
  hora: 'Hora',
  data: 'Data',
  motorista: 'Motorista',
  placa: 'Placa',
  regiao: 'Região',
  peso: 'Peso',
  valor: 'Valor',
  veiculo: 'Veiculo',
  capacidade: 'Capacidade',
  ocupacao: '%Ocupação',
  entregas: 'Entrega',
  destino: 'Destino',
  acrescimo: 'Acrescimo%',
  frete: 'Frete',
  adiantamento: 'Adiantamento',
  caixas: 'Caixas',
  caixasSF: 'Caixas S.F.',
}

const NUMERIC = ['peso', 'valor', 'capacidade', 'entregas', 'acrescimo', 'frete', 'adiantamento', 'caixas', 'caixasSF', 'romaneio']

function num(v) {
  if (v == null) return 0
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const s = String(v).trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return isFinite(n) ? n : 0
}

function parseData(v) {
  if (v instanceof Date) return isFinite(v) ? v : new Date(NaN)
  const s = String(v).trim()
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]))
  return new Date(s)
}

function converterHora(v) {
  if (typeof v === 'number')
    return String(Math.floor(v / 100)).padStart(2, '0') + ':' + String(Math.floor(v % 100)).padStart(2, '0')
  return String(v ?? '')
}

function montarRow(obj) {
  const row = {}
  for (const [key, col] of Object.entries(MAPA)) {
    let v = obj[col]
    if (NUMERIC.includes(key)) v = num(v)
    else if (key === 'data') v = parseData(v)
    else v = v == null ? '' : String(v).trim()
    row[key] = v
  }
  row.hora = converterHora(obj[MAPA.hora])
  return row
}

export function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: null })

  return rows
    .filter((r) => r[MAPA.romaneio] != null)
    .map(montarRow)
}

export function parsePlanilhaJson(payload) {
  const cabecalhos = Array.isArray(payload && payload.cabecalhos) ? payload.cabecalhos : []
  const valores = Array.isArray(payload && payload.valores) ? payload.valores : []
  return valores
    .map((linha) => {
      const obj = {}
      cabecalhos.forEach((h, i) => {
        obj[h] = linha[i]
      })
      return obj
    })
    .filter((o) => o[MAPA.romaneio] != null)
    .map(montarRow)
}