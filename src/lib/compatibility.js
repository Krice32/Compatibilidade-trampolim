import { complementaryCourseId, matchComplementaryCourseEvidence } from './complementaryCourses.js'

function digits(value = '') {
  return String(value).replace(/\D/g, '')
}

export function compareCbo(vacancyOccupation, candidateExperience) {
  const vacancyCode = digits(vacancyOccupation?.id ?? vacancyOccupation?.code)
  const candidateCode = digits(candidateExperience?.id ?? candidateExperience?.code)

  if (!vacancyCode || !candidateCode) {
    return { adherence: 0, level: 'none', reason: 'Ocupação não identificada na CBO' }
  }

  if (vacancyCode === candidateCode && candidateExperience?.resolvedFromSynonym) {
    return { adherence: 0.95, level: 'synonym', reason: 'Sinônimo oficial vinculado à mesma ocupação CBO' }
  }

  if (vacancyCode === candidateCode) {
    return { adherence: 1, level: 'exact', reason: 'Mesmo código de ocupação CBO' }
  }

  if (vacancyCode.slice(0, 4) === candidateCode.slice(0, 4)) {
    return { adherence: 0.8, level: 'family', reason: 'Mesma família ocupacional CBO' }
  }

  return { adherence: 0, level: 'none', reason: 'Famílias ocupacionais distintas' }
}

const experienceRequirements = {
  'Até 6 meses de experiência': { minimumMonths: 1, referenceMonths: 6 },
  '1 ano ou mais': { minimumMonths: 12, referenceMonths: 12 },
  '3 anos ou mais': { minimumMonths: 36, referenceMonths: 36 },
  '5 anos ou mais': { minimumMonths: 60, referenceMonths: 60 },
}

function monthIndex(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!year || month < 1 || month > 12) return null
  return (year * 12) + month - 1
}

function referenceMonthIndex(referenceDate) {
  if (typeof referenceDate === 'string') {
    const parsed = monthIndex(referenceDate)
    if (parsed !== null) return parsed
  }
  const date = referenceDate instanceof Date ? referenceDate : new Date()
  return (date.getFullYear() * 12) + date.getMonth()
}

function mergedIntervalMonths(intervals) {
  if (!intervals.length) return 0
  const sorted = intervals.slice().sort((first, second) => first.start - second.start || first.end - second.end)
  const merged = []
  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1]
    if (!previous || interval.start > previous.end + 1) merged.push({ ...interval })
    else previous.end = Math.max(previous.end, interval.end)
  })
  return merged.reduce((total, interval) => total + interval.end - interval.start + 1, 0)
}

export function experienceDurationLabel(months) {
  const total = Math.max(0, Math.floor(Number(months) || 0))
  if (total >= 60) return 'Possui mais de 5 anos de experiência'
  if (total >= 36) return 'Possui mais de 3 anos de experiência'
  if (total >= 12) return 'Possui mais de 1 ano de experiência'
  if (total > 6) return 'Possui mais de 6 meses de experiência'
  if (total > 0) return 'Possui até 6 meses de experiência'
  return 'Experiência relacionada não identificada'
}

export function compareProfessionalExperience(requirement, vacancyCbo, experiences = [], referenceDate = new Date()) {
  const configured = experienceRequirements[requirement]
  if (!configured || !vacancyCbo) {
    return { adherence: 0, months: 0, status: 'not-configured', evidence: 'Experiência relacionada não identificada' }
  }

  const currentMonth = referenceMonthIndex(referenceDate)
  const related = experiences.map((experience) => {
    const cbo = compareCbo({ id: vacancyCbo }, { id: experience.cbo, resolvedFromSynonym: experience.resolvedFromSynonym })
    const start = monthIndex(experience.start)
    const end = experience.current ? currentMonth : monthIndex(experience.end)
    return { experience, cbo, start, end }
  }).filter((item) => item.cbo.adherence > 0 && item.start !== null && item.end !== null && item.end >= item.start)

  const months = mergedIntervalMonths(related.map((item) => ({ start: item.start, end: item.end })))
  const cboAdherence = related.reduce((best, item) => Math.max(best, item.cbo.adherence), 0)
  const durationAdherence = Math.min(1, months / configured.minimumMonths)
  const adherence = Math.min(cboAdherence, durationAdherence)
  const status = months === 0 ? 'not-identified' : months > configured.referenceMonths ? 'above-reference' : months >= configured.minimumMonths ? 'meets' : 'below'

  return {
    adherence,
    months,
    status,
    cboAdherence,
    durationAdherence,
    minimumMonths: configured.minimumMonths,
    referenceMonths: configured.referenceMonths,
    evidence: experienceDurationLabel(months),
    relatedExperiences: related.map(({ experience, cbo }) => ({ id: experience.id, role: experience.role, cbo: experience.cbo, relation: cbo.level })),
  }
}

export function compareCine(vacancyFormation, candidateFormation, levels = {}) {
  const vacancyCode = String(vacancyFormation?.code ?? '')
  const candidateCode = String(candidateFormation?.code ?? '')
  const candidateLevel = Number(levels.candidate ?? 0)
  const requiredLevel = Number(levels.required ?? 0)

  if (vacancyCode && candidateCode && vacancyCode.slice(0, 4) === candidateCode.slice(0, 4)) {
    return { adherence: 1, level: 'detailed', reason: 'Mesma área detalhada CINE' }
  }

  if (vacancyCode && candidateCode && vacancyCode.slice(0, 3) === candidateCode.slice(0, 3)) {
    return { adherence: 0.85, level: 'specific', reason: 'Mesma área específica CINE' }
  }

  if (vacancyCode && candidateCode && vacancyCode.slice(0, 2) === candidateCode.slice(0, 2)) {
    return { adherence: 0.5, level: 'general', reason: 'Mesma área geral CINE' }
  }

  if (candidateLevel >= requiredLevel && requiredLevel > 0) {
    return { adherence: 0.1, level: 'education-level', reason: 'Nível de formação atendido sem afinidade CINE' }
  }

  return { adherence: 0, level: 'none', reason: 'Nível mínimo ou equivalência CINE não atendidos' }
}

export function compareLanguage(requiredLevel, candidateLevel) {
  const difference = Number(requiredLevel) - Number(candidateLevel)
  if (difference <= 0) return { adherence: 1, level: 'meets-or-exceeds' }
  if (difference === 1) return { adherence: 0.5, level: 'one-level-below' }
  return { adherence: 0, level: 'insufficient' }
}

const cnhRequirementCoverage = {
  A: ['A'],
  B: ['B'],
  C: ['C', 'B'],
  D: ['D', 'C', 'B'],
  E: ['E', 'D', 'C', 'B'],
  AB: ['AB', 'A', 'B'],
  AC: ['AC', 'A', 'ACC', 'C', 'B', 'AB'],
  AD: ['AD', 'A', 'ACC', 'D', 'C', 'B', 'AC', 'AB'],
  AE: ['AE', 'A', 'ACC', 'E', 'D', 'C', 'B', 'AD', 'AC', 'AB'],
  ACC: ['ACC'],
  ACCB: ['ACCB', 'ACC', 'B'],
  ACCC: ['ACCC', 'ACCB', 'ACC', 'C', 'B'],
  ACCD: ['ACCD', 'ACCC', 'ACCB', 'ACC', 'D', 'C', 'B'],
  ACCE: ['ACCE', 'ACCD', 'ACCC', 'ACCB', 'ACC', 'E', 'D', 'C', 'B'],
}

function normalizedCnhCategory(value = '') {
  return String(value).toUpperCase().replace('CATEGORIA', '').trim()
}

export function compareCnh(requiredCategories = [], candidateCategories = []) {
  const required = requiredCategories.map(normalizedCnhCategory).filter(Boolean)
  const covered = new Set(candidateCategories.flatMap((category) => {
    const normalizedCategory = normalizedCnhCategory(category)
    return cnhRequirementCoverage[normalizedCategory] || [normalizedCategory]
  }))
  return required.some((category) => covered.has(category))
}

const languageLevels = { 'Básico': 1, 'Intermediário': 2, 'Avançado': 3, 'Fluente / nativo': 4 }
const digitalLevels = { 'Básico': 1, 'Intermediário': 2, 'Avançado': 3 }
const educationLevels = {
  'Sem escolaridade formal': 0, 'Sem escolaridade mínima': 0,
  'Fundamental incompleto': 1, 'Ensino Fundamental incompleto': 1,
  'Fundamental completo': 2, 'Ensino Fundamental completo': 2,
  'Ensino médio incompleto': 3, 'Ensino Médio incompleto': 3,
  'Ensino médio completo': 4, 'Ensino Médio completo': 4,
  'Curso técnico incompleto': 5, 'Curso técnico completo': 6,
  'Superior incompleto': 5, 'Tecnólogo incompleto': 5, 'Graduação incompleta': 5,
  'Superior completo': 6, 'Tecnólogo completo': 6, 'Graduação completa': 6,
  'Pós-graduação incompleta': 7, 'Pós-graduação completa': 8,
  'Mestrado incompleto': 9, 'Mestrado completo': 10,
  'Doutorado incompleto': 11, 'Doutorado completo': 12,
}

function normalized(value = '') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function candidateAge(birthDate, referenceDate = new Date()) {
  const birthMatch = String(birthDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!birthMatch) return null
  const birth = new Date(Number(birthMatch[1]), Number(birthMatch[2]) - 1, Number(birthMatch[3]))
  const reference = typeof referenceDate === 'string' ? new Date(`${referenceDate.slice(0, 10)}T12:00:00`) : referenceDate
  if (Number.isNaN(birth.getTime()) || !(reference instanceof Date) || Number.isNaN(reference.getTime()) || birth > reference) return null
  let age = reference.getFullYear() - birth.getFullYear()
  const birthdayPending = reference.getMonth() < birth.getMonth() || (reference.getMonth() === birth.getMonth() && reference.getDate() < birth.getDate())
  if (birthdayPending) age -= 1
  return age
}

export function deriveCandidateEligibility(candidate = {}, referenceDate = new Date()) {
  const eligibility = new Set(candidate.eligibility || [])
  const isPcd = candidate.isPcd === true || normalized(candidate.isPcd) === 'sim'
  const age = candidateAge(candidate.birthDate, referenceDate)
  if (isPcd) eligibility.add('Pessoa com deficiência — PCD')
  if (age !== null && age >= 60) eligibility.add('60 anos ou mais')
  if (age !== null && age >= 14 && (age < 24 || isPcd)) eligibility.add('Jovem aprendiz')
  return [...eligibility]
}

function bestAverage(requirements, candidates, comparator) {
  if (!requirements.length) return 0
  return requirements.reduce((sum, requirement) => {
    const best = candidates.reduce((maximum, candidate) => Math.max(maximum, comparator(requirement, candidate)), 0)
    return sum + best
  }, 0) / requirements.length
}

function requirementValue(item, field) {
  return typeof item === 'string' ? item : item?.[field] ?? ''
}

function requirementPriority(item, fallback = 'desired') {
  return typeof item === 'object' && item?.priority ? item.priority : fallback
}

export function calculateVacancyCompatibility(vacancy, candidate) {
  const { job = {}, criteria = {} } = vacancy
  const breakdown = []
  let eligible = true

  function include(label, priority, adherence, reason, blocksApplication = false, details = {}) {
    if (!priority || priority === 'none') return
    const bounded = Math.max(0, Math.min(1, Number(adherence) || 0))
    const blocked = blocksApplication && bounded < 1
    if (blocked) eligible = false
    const scoreGroup = label === 'Disponibilidades' ? 'availability' : priority === 'required' ? 'required' : 'desired'
    breakdown.push({ label, priority, scoreGroup, adherence: bounded, blocked, reason, ...details })
  }

  if (criteria.exclusivity) {
    const unrestricted = criteria.exclusivity === 'Sem exclusividade'
    const eligibility = deriveCandidateEligibility(candidate, candidate.compatibilityReferenceDate)
    const matched = unrestricted || eligibility.includes(criteria.exclusivity)
    include('Exclusividade', 'required', matched ? 1 : 0, unrestricted ? 'Vaga sem restrição de público' : 'Critério eliminatório de exclusividade da vaga', !unrestricted, {
      requirement: criteria.exclusivity,
      evidence: unrestricted ? 'Vaga aberta a todos os públicos' : matched ? 'Condição identificada no perfil' : 'Condição não identificada no perfil',
    })
  }
  if (criteria.cnh?.length) {
    const matched = compareCnh(criteria.cnh, candidate.cnh || [])
    include('CNH', criteria.cnhPriority, matched ? 1 : 0, 'Categoria de CNH comparada pela matriz de equivalências', false, {
      requirement: `Categorias ${criteria.cnh.join(', ')}`,
      evidence: candidate.cnh?.length ? `Categorias ${candidate.cnh.join(', ')}` : 'Não informada no perfil',
    })
  }

  if (criteria.languages?.length) {
    const candidateLanguages = candidate.savedLanguages || []
    criteria.languages.forEach((required) => {
      const matching = candidateLanguages.filter((current) => normalized(required.language) === normalized(current.language)).sort((first, second) => (languageLevels[second.level] || 0) - (languageLevels[first.level] || 0))[0]
      const adherence = matching ? compareLanguage(languageLevels[required.level] || 0, languageLevels[matching.level] || 0).adherence : 0
      const otherLanguages = candidateLanguages.map((item) => `${item.language} · ${item.level}`).join(', ')
      include('Idiomas', requirementPriority(required, criteria.languagePriority), adherence, matching ? 'Idioma encontrado; nível comparado ao mínimo solicitado' : 'O idioma solicitado não foi encontrado no perfil', false, {
        requirement: `${required.language} · ${required.level}`,
        evidence: matching ? `${matching.language} · ${matching.level}` : otherLanguages || 'Nenhum idioma informado',
      })
    })
  }

  if (criteria.skills?.length) {
    const candidateSkills = (candidate.skills || []).map(normalized)
    criteria.skills.forEach((skill) => {
      const name = requirementValue(skill, 'name')
      const matched = candidateSkills.includes(normalized(name))
      include('Habilidades', requirementPriority(skill, criteria.skillsPriority), matched ? 1 : 0, 'Habilidade comportamental declarada no currículo', false, { requirement: name, evidence: matched ? name : 'Não identificada no perfil' })
    })
  }

  if (criteria.availability?.length) {
    const candidateAvailability = (candidate.availability || []).map(normalized)
    const candidateVehicles = (candidate.vehicles || []).map(normalized)
    criteria.availability.forEach((item) => {
      const name = requirementValue(item, 'name')
      const hasAvailability = candidateAvailability.includes(normalized(name))
      const vehicleMatches = normalized(name) !== normalized('Ter veículo próprio') || !criteria.vehicles?.length || criteria.vehicles.some((vehicle) => candidateVehicles.includes(normalized(vehicle)))
      const matched = hasAvailability && vehicleMatches
      include('Disponibilidades', requirementPriority(item, criteria.availabilityPriority), matched ? 1 : 0, 'Disponibilidade declarada no questionário da candidatura', false, { requirement: name, evidence: matched ? (normalized(name) === normalized('Ter veículo próprio') && candidate.vehicles?.length ? candidate.vehicles.join(', ') : 'Disponibilidade confirmada') : 'Não confirmada' })
    })
  }

  if (criteria.certificates?.length) {
    const certificates = (candidate.savedCourses || []).filter((item) => item.type === 'Certificação').map((item) => normalized(item.name))
    criteria.certificates.forEach((item) => {
      const name = requirementValue(item, 'name')
      const matching = certificates.find((certificate) => certificate.includes(normalized(name)) || normalized(name).includes(certificate))
      include('Certificados', requirementPriority(item, criteria.certificatesPriority), matching ? 1 : 0, 'Certificado informado no currículo', false, { requirement: name, evidence: matching ? name : 'Não identificado no perfil' })
    })
  }

  const usesCineCourse = ['Superior incompleto', 'Superior completo', 'Pós-graduação incompleta', 'Pós-graduação completa', 'Mestrado completo', 'Doutorado completo'].includes(criteria.educationLevel)
  const formationRequirements = usesCineCourse ? (criteria.formations || []) : []
  const hasEducationRequirement = formationRequirements.length || (criteria.educationLevel && criteria.educationLevel !== 'Sem escolaridade mínima')
  if (hasEducationRequirement) {
    const requiredEducation = educationLevels[criteria.educationLevel] || 0
    const candidateEducation = educationLevels[candidate.educationLevel] || 0
    const levelAdherence = requiredEducation ? (candidateEducation >= requiredEducation ? 1 : 0) : 1
    if (criteria.educationLevel && criteria.educationLevel !== 'Sem escolaridade mínima') include('Formação acadêmica', criteria.formationPriority, levelAdherence, 'Nível de escolaridade comparado ao perfil', false, { requirement: criteria.educationLevel, evidence: candidate.educationLevel || 'Não informada' })
    formationRequirements.forEach((required) => {
      const matches = (candidate.formations || []).map((current) => ({ current, adherence: compareCine(required, current).adherence })).sort((first, second) => second.adherence - first.adherence)
      const best = matches[0]
      include('Formação acadêmica', requirementPriority(required, criteria.formationPriority), Math.min(best?.adherence || 0, levelAdherence), 'Curso ou área comparado por equivalência CINE', false, { requirement: required.selectedTitle || required.area, evidence: best?.current ? best.current.selectedTitle || best.current.area || best.current.level : 'Não identificada no perfil' })
    })
  }

  if (criteria.experience && criteria.experience !== 'Sem experiência desejada' && job.cboId) {
    const experience = compareProfessionalExperience(criteria.experience, job.cboId, candidate.savedExperiences || [], candidate.compatibilityReferenceDate)
    include('Experiência profissional', 'desired', experience.adherence, 'CBO e tempo das experiências relacionadas à ocupação da vaga', false, {
      requirement: criteria.experience,
      evidence: experience.evidence,
      experienceMonths: experience.months,
      experienceStatus: experience.status,
      cboAdherence: experience.cboAdherence,
      durationAdherence: experience.durationAdherence,
      relatedExperiences: experience.relatedExperiences,
    })
  }

  if (criteria.courseAreas?.length) {
    const candidateCourses = (candidate.savedCourses || []).filter((item) => item.type !== 'Certificação')
    const candidateDigitalKnowledge = (candidate.savedDigital || []).map((item) => ({ ...item, name: `${item.tool || ''} ${item.level || ''}`.trim(), evidenceSource: 'Conhecimentos digitais' }))
    const candidateTechnicalSkills = (candidate.skills || []).map((item) => ({ name: typeof item === 'string' ? item : item.name, evidenceSource: 'Habilidades' }))
    const evidencePool = [
      ...candidateCourses.map((item) => ({ ...item, evidenceSource: 'Cursos complementares' })),
      ...candidateDigitalKnowledge,
      ...candidateTechnicalSkills,
    ]
    criteria.courseAreas.forEach((requiredCourse) => {
      const requiredId = complementaryCourseId(requiredCourse)
      const requiredName = requirementValue(requiredCourse, 'name')
      const matches = evidencePool.map((evidence) => ({ evidence, ...matchComplementaryCourseEvidence(requiredCourse, evidence) })).sort((first, second) => second.adherence - first.adherence)
      const matching = matches[0]?.adherence > 0 ? matches[0] : null
      include('Cursos complementares', 'desired', matching?.adherence || 0, 'Curso procurado em cursos, conhecimentos digitais e habilidades técnicas', false, {
        requirement: requiredName,
        evidence: matching ? `${matching.evidence.name} · ${matching.evidence.evidenceSource}` : 'Não identificado no currículo',
        requirementId: requiredId || undefined,
        evidenceId: matching ? complementaryCourseId(matching.evidence) || undefined : undefined,
        evidenceSource: matching?.evidence.evidenceSource,
      })
    })
  }

  if (criteria.digital?.length) {
    const adherence = bestAverage(criteria.digital, candidate.savedDigital || [], (required, current) => normalized(required.tool) === normalized(current.tool) ? ((digitalLevels[current.level] || 0) >= (digitalLevels[required.level] || 0) ? 1 : 0.5) : 0)
    include('Competências digitais', 'desired', adherence, 'Ferramentas e níveis declarados')
  }

  const groupPoints = { required: 50, desired: 35, availability: 15 }
  const scoredGroups = Object.entries(groupPoints).map(([group, points]) => {
    const items = breakdown.filter((item) => item.scoreGroup === group)
    if (!items.length) return null
    const adherence = items.reduce((sum, item) => sum + item.adherence, 0) / items.length
    const pointsEarned = points * adherence
    items.forEach((item) => {
      item.weight = points / items.length
      item.pointsEarned = item.weight * item.adherence
    })
    return { group, points, adherence, pointsEarned, itemCount: items.length }
  }).filter(Boolean)
  const possible = scoredGroups.reduce((sum, group) => sum + group.points, 0)
  const earned = scoredGroups.reduce((sum, group) => sum + group.pointsEarned, 0)

  return {
    score: possible ? Math.round((earned / possible) * 100) : 0,
    eligible,
    earnedWeight: earned,
    possibleWeight: possible,
    scoreGroups: scoredGroups,
    breakdown,
  }
}
