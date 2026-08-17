import test from 'node:test'
import assert from 'node:assert/strict'
import { buildRecommendationPlan } from './vacancyRecommendations.js'

const base = { location: { lat: -23.55, lon: -46.63 }, educationLevel: 4, cineCode: '0613S01' }

test('histórico profissional seleciona cenário CBO com desempate geográfico', () => {
  const plan = buildRecommendationPlan({ ...base, professionalHistory: [{ cboCode: '317110' }] })
  assert.equal(plan.scenario, 'experience-cbo')
  assert.deepEqual(plan.query.query.script_score.query.bool.should[1].terms['occupation.cbo_family.keyword'], ['3171'])
  assert.ok(plan.query.sort[1]._geo_distance)
})

test('primeiro emprego com navegação aplica trava, MLT e nota mínima', () => {
  const plan = buildRecommendationPlan({ ...base, professionalHistory: [], recentlyViewedVacancyIds: ['vaga-1', 'vaga-2'] })
  assert.equal(plan.scenario, 'first-job-behavioral')
  assert.equal(plan.query.min_score, 60)
  assert.equal(plan.query.query.script_score.query.bool.must[0].more_like_this.like.length, 2)
})

test('cold start ordena primeiro pela distância', () => {
  const plan = buildRecommendationPlan({ ...base, professionalHistory: [], recentlyViewedVacancyIds: [] })
  assert.equal(plan.scenario, 'cold-start')
  assert.ok(plan.query.sort[0]._geo_distance)
  assert.equal(plan.query.query.bool.filter[2].terms['requirements.experience.keyword'].length, 2)
})
