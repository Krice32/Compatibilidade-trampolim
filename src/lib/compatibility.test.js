import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateVacancyCompatibility, candidateAge, compareCbo, compareCine, compareCnh, compareLanguage, compareProfessionalExperience, deriveCandidateEligibility, experienceDurationLabel } from './compatibility.js'

test('CBO diferencia código exato, sinônimo, família e ausência de relação', () => {
  assert.equal(compareCbo({ code: '2124-05' }, { code: '212405' }).adherence, 1)
  assert.equal(compareCbo({ code: '212405' }, { code: '212405', resolvedFromSynonym: true }).adherence, 0.95)
  assert.equal(compareCbo({ code: '212405' }, { code: '212420' }).adherence, 0.8)
  assert.equal(compareCbo({ code: '212405' }, { code: '411010' }).adherence, 0)
})

test('CINE percorre área detalhada, específica, geral e nível de escolaridade', () => {
  assert.equal(compareCine({ code: '0615S02' }, { code: '0615S03' }).adherence, 1)
  assert.equal(compareCine({ code: '0615S02' }, { code: '0614C01' }).adherence, 0.85)
  assert.equal(compareCine({ code: '0615S02' }, { code: '0688P01' }).adherence, 0.5)
  assert.equal(compareCine({ code: '0615S02' }, { code: '0913E01' }, { required: 6, candidate: 6 }).adherence, 0.1)
  assert.equal(compareCine({ code: '0615S02' }, { code: '0913E01' }, { required: 6, candidate: 4 }).adherence, 0)
})

test('idiomas concedem aderência integral, parcial ou nula', () => {
  assert.equal(compareLanguage(3, 3).adherence, 1)
  assert.equal(compareLanguage(3, 2).adherence, 0.5)
  assert.equal(compareLanguage(3, 1).adherence, 0)
})

test('CNH de categoria superior atende categorias inferiores conforme a matriz', () => {
  assert.equal(compareCnh(['B'], ['D']), true)
  assert.equal(compareCnh(['C'], ['D']), true)
  assert.equal(compareCnh(['D'], ['B']), false)
  assert.equal(compareCnh(['B'], ['E']), true)
  assert.equal(compareCnh(['B'], ['ACCC']), true)
})

test('compatibilidade considera candidato com CNH D apto ao requisito B', () => {
  const result = calculateVacancyCompatibility({
    criteria: { cnh: ['B'], cnhPriority: 'required' },
  }, { cnh: ['D'] })

  assert.equal(result.eligible, true)
  assert.equal(result.score, 100)
  assert.equal(result.breakdown[0].adherence, 1)
  assert.equal(result.breakdown[0].evidence, 'Categorias D')
})

test('idiomas diferentes não geram aderência mesmo com o mesmo nível', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      languages: [{ language: 'Inglês', level: 'Avançado', priority: 'required' }],
      languagePriority: 'desired',
    },
  }, {
    savedLanguages: [{ language: 'Japonês', level: 'Avançado' }],
  })

  assert.equal(result.score, 0)
  assert.equal(result.breakdown[0].adherence, 0)
  assert.equal(result.breakdown[0].requirement, 'Inglês · Avançado')
  assert.equal(result.breakdown[0].evidence, 'Japonês · Avançado')
  assert.equal(result.breakdown[0].priority, 'required')
})

test('cada idioma pode ter prioridade própria', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      languages: [
        { language: 'Inglês', level: 'Avançado', priority: 'required' },
        { language: 'Espanhol', level: 'Básico', priority: 'desired' },
      ],
    },
  }, {
    savedLanguages: [{ language: 'Espanhol', level: 'Intermediário' }],
  })

  assert.equal(result.possibleWeight, 85)
  assert.equal(result.earnedWeight, 35)
  assert.equal(result.score, 41)
})

test('requisito muito importante tem peso maior sem bloquear a candidatura', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      cnh: ['B'],
      cnhPriority: 'required',
      languages: [{ language: 'Inglês', level: 'Avançado' }],
      languagePriority: 'desired',
    },
  }, {
    cnh: [],
    savedLanguages: [{ language: 'Inglês', level: 'Avançado' }],
  })

  assert.equal(result.eligible, true)
  assert.equal(result.possibleWeight, 85)
  assert.equal(result.score, 41)
  assert.deepEqual(result.breakdown.map(({ label, weight, blocked }) => ({ label, weight, blocked })), [
    { label: 'CNH', weight: 50, blocked: false },
    { label: 'Idiomas', weight: 35, blocked: false },
  ])
})

test('requisito desejável melhora o ranking sem bloquear o candidato', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      skills: ['Colaboração', 'Proatividade'],
      skillsPriority: 'desired',
    },
  }, { skills: ['Colaboração'] })

  assert.equal(result.eligible, true)
  assert.equal(result.score, 50)
  assert.equal(result.breakdown[0].blocked, false)
})

test('campos nulos ou sem itens não participam do score', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      cnh: [],
      cnhPriority: 'required',
      languages: [],
      languagePriority: 'desired',
      skills: ['Comunicação'],
      skillsPriority: 'none',
      exclusivity: '',
    },
  }, {})

  assert.equal(result.eligible, true)
  assert.equal(result.score, 0)
  assert.equal(result.possibleWeight, 0)
  assert.deepEqual(result.breakdown, [])
})

test('exclusividade preenchida é sempre obrigatória', () => {
  const result = calculateVacancyCompatibility({
    criteria: { exclusivity: 'Pessoa com deficiência — PCD' },
  }, { eligibility: [] })

  assert.equal(result.eligible, false)
  assert.equal(result.breakdown[0].priority, 'required')
  assert.equal(result.breakdown[0].weight, 50)
})

test('sem exclusividade é uma seleção importante atendida e não bloqueia a candidatura', () => {
  const result = calculateVacancyCompatibility({
    criteria: { exclusivity: 'Sem exclusividade' },
  }, {})

  assert.equal(result.eligible, true)
  assert.equal(result.score, 100)
  assert.equal(result.breakdown[0].priority, 'required')
  assert.equal(result.breakdown[0].requirement, 'Sem exclusividade')
})

test('data de nascimento deriva exclusividades etárias', () => {
  assert.equal(candidateAge('2008-08-06', '2026-08-06'), 18)
  assert.deepEqual(deriveCandidateEligibility({ birthDate: '2008-08-06' }, '2026-08-06'), ['Jovem aprendiz'])
  assert.deepEqual(deriveCandidateEligibility({ birthDate: '1960-01-10' }, '2026-08-06'), ['60 anos ou mais'])
})

test('pessoa com deficiência atende PCD e pode atender jovem aprendiz sem limite máximo', () => {
  const eligibility = deriveCandidateEligibility({ birthDate: '1980-01-10', isPcd: 'Sim' }, '2026-08-06')
  assert.equal(eligibility.includes('Pessoa com deficiência — PCD'), true)
  assert.equal(eligibility.includes('Jovem aprendiz'), true)

  const result = calculateVacancyCompatibility({
    criteria: { exclusivity: 'Pessoa com deficiência — PCD' },
  }, { birthDate: '1980-01-10', isPcd: 'Sim', compatibilityReferenceDate: '2026-08-06' })
  assert.equal(result.eligible, true)
  assert.equal(result.score, 100)
})

test('redistribui a nota entre os blocos que possuem requisitos', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      cnh: ['B'],
      cnhPriority: 'required',
      availability: [{ name: 'Dormir no local de trabalho', priority: 'desired' }],
      availabilityPriority: 'desired',
    },
  }, {
    cnh: ['B'],
    availability: [],
  })

  assert.equal(result.possibleWeight, 65)
  assert.equal(result.earnedWeight, 50)
  assert.equal(result.score, 77)
  assert.deepEqual(result.scoreGroups.map(({ group, points }) => ({ group, points })), [
    { group: 'required', points: 50 },
    { group: 'availability', points: 15 },
  ])
})

test('disponibilidades dividem proporcionalmente os 15 pontos por item', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      availability: [
        { name: 'Dormir no local de trabalho', priority: 'required' },
        { name: 'Viajar a trabalho', priority: 'desired' },
      ],
      availabilityPriority: 'desired',
    },
  }, {
    availability: ['Dormir no local de trabalho'],
  })

  assert.equal(result.possibleWeight, 15)
  assert.equal(result.earnedWeight, 7.5)
  assert.equal(result.score, 50)
  assert.deepEqual(result.breakdown.map((item) => item.weight), [7.5, 7.5])
})

test('CINE oculto não participa da comparação abaixo da graduação', () => {
  const result = calculateVacancyCompatibility({
    criteria: {
      educationLevel: 'Ensino médio completo',
      formationPriority: 'required',
      formations: [{ code: '0615S02' }],
    },
  }, {
    educationLevel: 'Ensino Médio completo',
    formations: [{ code: '0913E01' }],
  })

  assert.equal(result.score, 100)
  assert.equal(result.breakdown[0].adherence, 1)
})

test('questionário considera disponibilidade e tipo de veículo informado', () => {
  const vacancy = {
    criteria: {
      availability: ['Ter veículo próprio'],
      vehicles: ['Moto'],
      availabilityPriority: 'required',
    },
  }
  const compatible = calculateVacancyCompatibility(vacancy, {
    availability: ['Ter veículo próprio'],
    vehicles: ['Moto'],
  })
  const incompatibleVehicle = calculateVacancyCompatibility(vacancy, {
    availability: ['Ter veículo próprio'],
    vehicles: ['Carro'],
  })

  assert.equal(compatible.score, 100)
  assert.equal(incompatibleVehicle.score, 0)
  assert.equal(incompatibleVehicle.eligible, true)
})

test('curso complementar corresponde pelo ID compartilhado entre vaga e currículo', () => {
  const result = calculateVacancyCompatibility({
    criteria: { courseAreas: [{ id: 'CUR-003', catalogId: 'CUR-003', name: 'Excel avançado' }] },
  }, {
    savedCourses: [{ id: 'course-1', type: 'Curso', catalogId: 'CUR-003', name: 'Microsoft Excel Avançado' }],
  })

  assert.equal(result.score, 100)
  assert.equal(result.breakdown[0].adherence, 1)
  assert.equal(result.breakdown[0].requirementId, 'CUR-003')
})

test('cursos diferentes não correspondem apenas por pertencerem à mesma categoria', () => {
  const result = calculateVacancyCompatibility({
    criteria: { courseAreas: [{ id: 'CUR-003', catalogId: 'CUR-003', name: 'Excel avançado' }] },
  }, {
    savedCourses: [{ id: 'course-1', type: 'Curso', catalogId: 'CUR-004', name: 'Power BI' }],
  })

  assert.equal(result.score, 0)
  assert.equal(result.breakdown[0].adherence, 0)
})

test('curso complementar também pode ser comprovado por conhecimento digital', () => {
  const result = calculateVacancyCompatibility({
    criteria: { courseAreas: [{ id: 'CUR-003', catalogId: 'CUR-003', name: 'Excel avançado' }] },
  }, {
    savedCourses: [],
    savedDigital: [{ tool: 'Excel', level: 'Avançado' }],
  })

  assert.equal(result.score, 100)
  assert.equal(result.breakdown[0].evidenceSource, 'Conhecimentos digitais')
})

test('tempo de experiência é apresentado em faixas padronizadas com teto de cinco anos', () => {
  assert.equal(experienceDurationLabel(5), 'Possui até 6 meses de experiência')
  assert.equal(experienceDurationLabel(8), 'Possui mais de 6 meses de experiência')
  assert.equal(experienceDurationLabel(16), 'Possui mais de 1 ano de experiência')
  assert.equal(experienceDurationLabel(36), 'Possui mais de 3 anos de experiência')
  assert.equal(experienceDurationLabel(120), 'Possui mais de 5 anos de experiência')
})

test('experiência valida conjuntamente CBO e período solicitado pela vaga', () => {
  const result = compareProfessionalExperience('1 ano ou mais', '317110', [
    { id: 'exp-1', cbo: '317110', role: 'Desenvolvedor de sistemas', start: '2025-01', end: '2026-04' },
  ], '2026-08')

  assert.equal(result.adherence, 1)
  assert.equal(result.months, 16)
  assert.equal(result.status, 'above-reference')
  assert.equal(result.evidence, 'Possui mais de 1 ano de experiência')
})

test('experiência de outra família CBO não conta mesmo com período suficiente', () => {
  const result = compareProfessionalExperience('Até 6 meses de experiência', '317110', [
    { id: 'exp-1', cbo: '411010', role: 'Assistente administrativo', start: '2020-01', end: '2026-01' },
  ], '2026-08')

  assert.equal(result.adherence, 0)
  assert.equal(result.months, 0)
  assert.equal(result.evidence, 'Experiência relacionada não identificada')
})

test('períodos simultâneos relacionados não são contados duas vezes', () => {
  const result = compareProfessionalExperience('1 ano ou mais', '317110', [
    { id: 'exp-1', cbo: '317110', start: '2025-01', end: '2025-12' },
    { id: 'exp-2', cbo: '317110', start: '2025-06', end: '2026-03' },
  ], '2026-08')

  assert.equal(result.months, 15)
  assert.equal(result.adherence, 1)
})

test('mesma família CBO limita a aderência da experiência a oitenta por cento', () => {
  const result = calculateVacancyCompatibility({
    job: { cboId: '317110' },
    criteria: { experience: 'Até 6 meses de experiência' },
  }, {
    compatibilityReferenceDate: '2026-08',
    savedExperiences: [{ id: 'exp-1', cbo: '317120', start: '2020-01', end: '2026-01' }],
  })

  assert.equal(result.breakdown[0].adherence, 0.8)
  assert.equal(result.breakdown[0].evidence, 'Possui mais de 5 anos de experiência')
  assert.equal(result.score, 80)
})
