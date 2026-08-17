import test from 'node:test'
import assert from 'node:assert/strict'
import { customComplementaryCourseId, matchComplementaryCourseEvidence, searchComplementaryCourses } from './complementaryCourses.js'

test('busca fuzzy recomenda Excel avançado mesmo com erro de digitação', () => {
  const [result] = searchComplementaryCourses('exel avancado')
  assert.equal(result.id, 'CUR-003')
  assert.equal(result.name, 'Excel avançado')
})

test('curso personalizado recebe o mesmo ID para o mesmo nome normalizado', () => {
  assert.equal(customComplementaryCourseId('Curso de Fotografia'), customComplementaryCourseId('curso de fotografia'))
})

test('curso de Excel avançado pode ser comprovado por conhecimento digital equivalente', () => {
  const match = matchComplementaryCourseEvidence(
    { id: 'CUR-003', catalogId: 'CUR-003', name: 'Excel avançado' },
    { tool: 'Excel', level: 'Avançado', name: 'Excel Avançado' },
  )
  assert.equal(match.adherence, 1)
})

test('conhecimento básico gera apenas aderência parcial para curso avançado', () => {
  const match = matchComplementaryCourseEvidence(
    { id: 'CUR-003', catalogId: 'CUR-003', name: 'Excel avançado' },
    { name: 'Excel básico' },
  )
  assert.equal(match.adherence, .5)
})
