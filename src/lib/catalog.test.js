import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cine = JSON.parse(readFileSync(new URL('../data/cine.json', import.meta.url), 'utf8'))

test('catálogo CINE inclui Análise e desenvolvimento de sistemas no rótulo atualizado', () => {
  const entry = cine.entries.find((item) => item.code === '0613S01')
  assert.ok(entry)
  assert.ok(entry.aliases.includes('Análise e desenvolvimento de sistemas'))
  assert.equal(entry.detailedTitle, 'Produção de software')
})
