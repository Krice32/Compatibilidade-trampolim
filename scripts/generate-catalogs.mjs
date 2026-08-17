import fs from 'node:fs'
import path from 'node:path'

const sourceDir = process.argv[2]
if (!sourceDir) {
  throw new Error('Uso: node scripts/generate-catalogs.mjs <diretorio-das-fontes>')
}

const outputDir = path.resolve('src/data')
fs.mkdirSync(outputDir, { recursive: true })

function readLatin1(file) {
  return fs.readFileSync(path.join(sourceDir, file)).toString('latin1').replace(/^ï»¿/, '')
}

function readCsv(file) {
  const [header, ...lines] = readLatin1(file).split(/\r?\n/).filter(Boolean)
  const columns = header.split(';')
  return lines.map((line) => {
    const values = line.split(';')
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? '']))
  })
}

function normalizeSpaces(value) {
  return value.replace(/\s+/g, ' ').trim()
}

const families = new Map(readCsv('cbo-familia.csv').map((row) => [row.CODIGO, row.TITULO]))
const synonymMap = new Map()
for (const row of readCsv('cbo-sinonimo.csv')) {
  if (!synonymMap.has(row.CODIGO)) synonymMap.set(row.CODIGO, [])
  synonymMap.get(row.CODIGO).push(row.TITULO)
}

const activityMap = new Map()
for (const row of readCsv('cbo-perfil.csv')) {
  if (!row.COD_OCUPACAO || !row.NOME_ATIVIDADE) continue
  if (!activityMap.has(row.COD_OCUPACAO)) activityMap.set(row.COD_OCUPACAO, [])
  const activities = activityMap.get(row.COD_OCUPACAO)
  const activity = row.NOME_ATIVIDADE.charAt(0).toUpperCase() + row.NOME_ATIVIDADE.slice(1).toLowerCase()
  if (activities.length < 4 && !activities.includes(activity)) activities.push(activity)
}

const occupations = readCsv('cbo-ocupacao.csv').map((row) => {
  const activities = activityMap.get(row.CODIGO) ?? []
  return {
    id: row.CODIGO,
    title: row.TITULO,
    familyCode: row.CODIGO.slice(0, 4),
    familyTitle: families.get(row.CODIGO.slice(0, 4)) ?? '',
    synonyms: synonymMap.get(row.CODIGO) ?? [],
    description: activities.length ? `Principais atividades: ${activities.join('; ')}.` : '',
  }
})

const cboOutput = {
  metadata: {
    source: 'Ministério do Trabalho e Emprego — CBO 2002',
    sourceUrl: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo/servicos/downloads/downloads',
    generatedAt: new Date().toISOString(),
    occupationCount: occupations.length,
    familyCount: families.size,
    synonymCount: [...synonymMap.values()].reduce((sum, values) => sum + values.length, 0),
  },
  occupations,
}

fs.writeFileSync(path.join(outputDir, 'cbo.json'), JSON.stringify(cboOutput))

const lines = fs.readFileSync(path.join(sourceDir, 'cine-appendices.txt'), 'utf8').split(/\r?\n/)
const cStart = lines.findIndex((line) => /apêndice c/i.test(line))
const dStart = lines.findIndex((line) => /apêndice d/i.test(line))
const fStart = lines.findIndex((line) => /apêndice f/i.test(line))
const splitMarkers = lines.map((line, index) => ({ line: line.trim(), index })).filter((item) => /^apê$/i.test(item.line))
const bStart = splitMarkers.filter((item) => item.index < cStart).at(-1)?.index ?? -1
const eStart = splitMarkers.find((item) => item.index > dStart)?.index ?? fStart

if ([bStart, cStart, dStart, eStart, fStart].some((index) => index < 0)) {
  throw new Error('Não foi possível localizar todos os apêndices B, C, D, E e F do manual CINE.')
}

const hierarchyNoise = /^(MANUAL PARA|CURSOS DE|CINE BRASIL|aPÊ|nDice|B –|área|Gera|Pec|ÍF|Deta|LH|Da cine|L$|\(continua\)|--|\d{2,3}$)/i
const hierarchyItems = []
let hierarchyCode = ''
let hierarchyParts = []

function flushHierarchy() {
  if (!hierarchyCode) return
  let title = normalizeSpaces(hierarchyParts.join(' '))
  title = title.replace(/\s+\((continuação|conclusão)\).*$/i, '').replace(/\s+aDa$/i, '').trim()
  if (title) hierarchyItems.push({ code: hierarchyCode, title })
  hierarchyCode = ''
  hierarchyParts = []
}

for (const raw of lines.slice(bStart, cStart)) {
  const line = normalizeSpaces(raw)
  const hierarchyMatch = /^\d{2,4}$/.test(line) && Number(line.slice(0, 2)) <= 10
  if (hierarchyMatch) {
    flushHierarchy()
    hierarchyCode = line
    continue
  }
  if (!hierarchyCode || !line || hierarchyNoise.test(line)) continue
  hierarchyParts.push(line)
}
flushHierarchy()

const hierarchy = new Map()
for (const item of hierarchyItems) {
  const existing = hierarchy.get(item.code)
  if (!existing || item.title.length < existing.length) hierarchy.set(item.code, item.title)
}

const labelNoise = /^(MANUAL PARA|CURSOS DE|CINE BRASIL|aPÊ|nDice|D –|cÓDiGo|rÓtuLo|cine BrasiL|\(continua\)|--|\d{2,3}$|[A-Z]$)/i
const labels = []
let labelCode = ''
let labelParts = []

function flushLabel() {
  if (!labelCode) return
  let title = normalizeSpaces(labelParts.join(' '))
  title = title.replace(/\s+\((continuação|conclusão)\).*$/i, '').trim()
  if (title) labels.push({ code: labelCode, title })
  labelCode = ''
  labelParts = []
}

for (const raw of lines.slice(dStart, eStart)) {
  const line = normalizeSpaces(raw)
  const match = line.match(/^(\d{4}[A-Z]\d{2})\s+(.+)$/)
  if (match) {
    flushLabel()
    labelCode = match[1]
    labelParts = [match[2]]
    continue
  }
  if (!labelCode || !line || labelNoise.test(line)) continue
  labelParts.push(line)
}
flushLabel()

const labelMap = new Map()
for (const label of labels) {
  const existing = labelMap.get(label.code)
  if (!existing || label.title.length < existing.length) labelMap.set(label.code, label.title)
}

const aliasMap = new Map()
let pendingAlias = []
const aliasNoise = /^(MANUAL PARA|CURSOS DE|CINE BRASIL|aPÊ|nDice|catáLoGo|aLFaBeto|GeraL|rÓtuLo|\(continua\)|--|\d{2,3}$|[A-Z]$)/i
for (const raw of lines.slice(fStart)) {
  const line = normalizeSpaces(raw)
  if (!line || aliasNoise.test(line)) continue
  const match = line.match(/^(.*?)\s*(\d{2})\s+(\d{4}[A-Z]\d{2})\s+(.+)$/)
  if (match) {
    const alias = normalizeSpaces([...pendingAlias, match[1]].join(' ')).replace(/^[A-Z]\s+/, '')
    if (alias) {
      if (!aliasMap.has(match[3])) aliasMap.set(match[3], [])
      if (!aliasMap.get(match[3]).includes(alias)) aliasMap.get(match[3]).push(alias)
    }
    pendingAlias = []
    continue
  }
  pendingAlias.push(line)
}

let cineEntries = [...labelMap.entries()].map(([code, title]) => {
  const detailedCode = code.slice(0, 4)
  const specificCode = code.slice(0, 3)
  const generalCode = code.slice(0, 2)
  const aliases = aliasMap.get(code) ?? []
  return {
    code,
    area: title,
    courses: aliases.join(', '),
    aliases,
    detailedCode,
    detailedTitle: hierarchy.get(detailedCode) ?? '',
    specificCode,
    specificTitle: hierarchy.get(specificCode) ?? '',
    generalCode,
    generalTitle: hierarchy.get(generalCode) ?? '',
  }
}).sort((a, b) => a.area.localeCompare(b.area, 'pt-BR'))

// A tabela de correspondência publicada em junho de 2025 passou a associar
// “Análise e desenvolvimento de sistemas” ao rótulo 0613S01.
cineEntries = cineEntries.map((entry) => entry.code === '0615S02' ? {
  ...entry,
  code: '0613S01',
  detailedCode: '0613',
  detailedTitle: hierarchy.get('0613') ?? 'Produção de software',
} : entry)

const cineOutput = {
  metadata: {
    source: 'INEP — Manual para classificação dos cursos de graduação e sequenciais — CINE Brasil, 5ª versão',
    sourceUrl: 'https://download.inep.gov.br/pesquisas_estatisticas_indicadores_educacionais/cinebrasil/manuais/manual_cine_brasil_5_versao.pdf',
    correspondenceReference: 'Tabela de correspondência entre as denominações dos cursos e as sugestões de rótulos — junho/2025',
    generatedAt: new Date().toISOString(),
    labelCount: cineEntries.length,
    hierarchyCount: hierarchy.size,
    courseAliasCount: [...aliasMap.values()].reduce((sum, values) => sum + values.length, 0),
  },
  hierarchy: [...hierarchy.entries()].map(([code, title]) => ({ code, title })),
  entries: cineEntries,
}

fs.writeFileSync(path.join(outputDir, 'cine.json'), JSON.stringify(cineOutput))

console.log(JSON.stringify({ cbo: cboOutput.metadata, cine: cineOutput.metadata }, null, 2))
