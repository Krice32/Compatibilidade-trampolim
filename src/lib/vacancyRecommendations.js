const entryExperience = ['Sem experiência', 'Até 6 meses']

export function selectRecommendationScenario(candidate = {}) {
  if (candidate.professionalHistory?.length) return 'experience-cbo'
  if (candidate.recentlyViewedVacancyIds?.length) return 'first-job-behavioral'
  return 'cold-start'
}

function activeVacanciesFilter() {
  return [{ term: { status: 'published' } }, { range: { expires_at: { gte: 'now' } } }]
}

function entryExperienceFilter() {
  return { terms: { 'requirements.experience.keyword': entryExperience } }
}

function educationBoost(candidate) {
  const should = []
  if (candidate.cineCode) {
    should.push({ term: { 'requirements.cine.code.keyword': { value: candidate.cineCode, boost: 5 } } })
    should.push({ term: { 'requirements.cine.family.keyword': { value: candidate.cineCode.slice(0, 4), boost: 3 } } })
  }
  if (candidate.educationLevel) should.push({ range: { 'requirements.education_rank': { lte: candidate.educationLevel, boost: 2 } } })
  return should
}

function geoSort(candidate) {
  return {
    _geo_distance: {
      location: { lat: candidate.location.lat, lon: candidate.location.lon },
      order: 'asc',
      unit: 'km',
      mode: 'min',
      distance_type: 'arc',
      ignore_unmapped: true,
    },
  }
}

export function buildExperienceCboQuery(candidate, { size = 50 } = {}) {
  const codes = candidate.professionalHistory.map((item) => String(item.cboCode).replace(/\D/g, '')).filter(Boolean)
  const families = [...new Set(codes.map((code) => code.slice(0, 4)))]
  return {
    size,
    query: {
      script_score: {
        query: { bool: {
          filter: activeVacanciesFilter(),
          should: [
            { terms: { 'occupation.cbo_code.keyword': codes, boost: 5 } },
            { terms: { 'occupation.cbo_family.keyword': families, boost: 3 } },
          ],
          minimum_should_match: 1,
        } },
        script: { id: 'cr034_compatibility_score', params: { candidate } },
      },
    },
    sort: [{ _score: 'desc' }, geoSort(candidate)],
    track_scores: true,
  }
}

export function buildBehavioralFirstJobQuery(candidate, { index = 'vacancies', size = 50 } = {}) {
  const viewed = candidate.recentlyViewedVacancyIds.slice(0, 20)
  return {
    size,
    min_score: 60,
    query: {
      script_score: {
        query: { bool: {
          filter: [...activeVacanciesFilter(), entryExperienceFilter()],
          must: [{ more_like_this: {
            fields: ['title^3', 'description', 'occupation.title^2', 'skills', 'course_tags'],
            like: viewed.map((id) => ({ _index: index, _id: id })),
            min_term_freq: 1,
            min_doc_freq: 1,
            max_query_terms: 40,
            minimum_should_match: '20%',
          } }],
          should: educationBoost(candidate),
        } },
        script: { id: 'cr034_score_with_semantic_tiebreak', params: { candidate } },
      },
    },
    sort: [{ _score: 'desc' }, geoSort(candidate)],
    track_scores: true,
  }
}

export function buildColdStartQuery(candidate, { size = 50 } = {}) {
  return {
    size,
    query: { bool: {
      filter: [...activeVacanciesFilter(), entryExperienceFilter()],
      should: educationBoost(candidate),
      minimum_should_match: educationBoost(candidate).length ? 1 : 0,
    } },
    sort: [geoSort(candidate), { published_at: 'desc' }],
    track_scores: false,
  }
}

export function buildRecommendationPlan(candidate, options = {}) {
  const scenario = selectRecommendationScenario(candidate)
  const builders = {
    'experience-cbo': buildExperienceCboQuery,
    'first-job-behavioral': buildBehavioralFirstJobQuery,
    'cold-start': buildColdStartQuery,
  }
  return {
    scenario,
    query: builders[scenario](candidate, options),
    scoreVisibility: 'company-candidate-management-only',
    notes: scenario === 'first-job-behavioral'
      ? ['CR034 mínimo de 60%', 'More Like This usa as vagas visualizadas como documentos de referência']
      : scenario === 'experience-cbo'
        ? ['CBO exato ou mesma família', 'CR034 antes da distância']
        : ['Primeiro emprego', 'Distância como ordenação principal'],
  }
}
