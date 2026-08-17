import { useEffect, useRef, useState } from 'react'
import {
  Accessibility, ArrowLeft, ArrowRight, Bell, BookOpen, BriefcaseBusiness,
  Bold, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight,
  CalendarCheck2, CircleHelp, ClipboardCheck, Clock3, Copy, Download, Eye, FileCheck2, FileText, GraduationCap, Home, Info,
  Heading2, Italic, Languages, Laptop, LayoutDashboard, Lightbulb, Link2, List, ListChecks, ListOrdered, Lock,
  MapPin, Menu, Pencil, Plus, RefreshCw, Save, Search, ShieldCheck, Sparkles, EllipsisVertical,
  Quote, RemoveFormatting, Send, Star, Trash2, Underline, Upload, UserCheck, UserRound, Users, UserX, WandSparkles, X,
} from 'lucide-react'
import cboData from './data/cbo.json'
import cineData from './data/cine.json'
import { calculateVacancyCompatibility, deriveCandidateEligibility } from './lib/compatibility.js'
import { complementaryCourseCatalog, complementaryCourseId, customComplementaryCourseId, normalizeCourseName, searchComplementaryCourses } from './lib/complementaryCourses.js'
import MonthPicker from './components/MonthPicker.jsx'
import './product.css'

const cineCatalog = cineData.entries
const cboMarketAliases = {
  '142330': ['Product Owner', 'PO', 'Product Manager', 'Gerente de produto digital'],
  '142520': ['Scrum Master', 'Agile Master', 'Gerente de projetos ágeis'],
}
const cboOccupations = cboData.occupations.map((item) => ({ ...item, marketAliases: cboMarketAliases[item.id] || [] }))
const defaultCine = cineCatalog.find((item) => item.code === '0613S01') ?? cineCatalog[0]

function normalizeCatalogSearch(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}

function normalizeCatalogWords(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[a-z0-9]+/g) ?? []
}

function singularizeCatalogWord(word) {
  if (word.length > 4 && word.endsWith('s')) return word.slice(0, -1)
  return word
}

function matchesCatalogSearch(haystack, query) {
  if (!query.trim()) return true
  if (normalizeCatalogSearch(haystack).includes(normalizeCatalogSearch(query))) return true
  const haystackWords = normalizeCatalogWords(haystack).map(singularizeCatalogWord)
  const queryWords = normalizeCatalogWords(query).map(singularizeCatalogWord)
  return queryWords.every((word) => haystackWords.some((candidate) => candidate.includes(word) || word.includes(candidate)))
}

function catalogSearchPriority(item, type, query) {
  const primaryText = type === 'cine' ? `${item.area} ${item.courses}` : `${item.title} ${item.synonyms.join(' ')} ${(item.marketAliases || []).join(' ')}`
  const primary = normalizeCatalogWords(primaryText).map(singularizeCatalogWord).join('')
  const normalizedQuery = normalizeCatalogWords(query).map(singularizeCatalogWord).join('')
  if (primary === normalizedQuery) return 0
  if (primary.startsWith(normalizedQuery)) return 1
  if (primary.includes(normalizedQuery)) return 2
  return 3
}

function cboDisplayTitle(item, query) {
  const normalizedQuery = normalizeCatalogSearch(query)
  const marketTitle = (item.marketAliases || []).find((alias) => normalizeCatalogSearch(alias).includes(normalizedQuery) || normalizedQuery.includes(normalizeCatalogSearch(alias)))
  return marketTitle || item.title
}

function cineDisplayTitle(item, query = '') {
  const normalizedQuery = normalizeCatalogSearch(query)
  const alias = (item.aliases || []).find((title) => {
    const normalizedTitle = normalizeCatalogSearch(title)
    return normalizedQuery && (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle))
  })
  return item.selectedTitle || alias || item.area
}

function formatCbo(code) {
  return code?.length === 6 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

const educationLevels = [
  'Sem escolaridade mínima', 'Fundamental incompleto', 'Fundamental completo',
  'Ensino médio incompleto', 'Ensino médio completo', 'Superior incompleto',
  'Superior completo', 'Pós-graduação incompleta', 'Pós-graduação completa',
  'Mestrado completo', 'Doutorado completo',
]

const educationRequiresCourse = (level) => [
  'Superior incompleto', 'Superior completo',
  'Pós-graduação incompleta', 'Pós-graduação completa',
  'Mestrado completo', 'Doutorado completo',
].includes(level)

const cvEducationLevels = [
  'Fundamental incompleto', 'Fundamental completo',
  'Ensino médio incompleto', 'Ensino médio completo',
  'Superior incompleto', 'Superior completo',
  'Pós-graduação incompleta', 'Pós-graduação completa',
  'Mestrado completo', 'Doutorado completo',
]

const legacyCitizenEducationMap = {
  'Sem escolaridade formal': '',
  'Ensino Fundamental incompleto': 'Fundamental incompleto',
  'Ensino Fundamental completo': 'Fundamental completo',
  'Ensino Médio incompleto': 'Ensino médio incompleto',
  'Ensino Médio completo': 'Ensino médio completo',
  'Curso técnico incompleto': 'Ensino médio completo',
  'Curso técnico completo': 'Ensino médio completo',
  'Tecnólogo incompleto': 'Superior incompleto',
  'Tecnólogo completo': 'Superior completo',
  'Graduação incompleta': 'Superior incompleto',
  'Graduação completa': 'Superior completo',
  'Mestrado incompleto': 'Pós-graduação completa',
  'Doutorado incompleto': 'Mestrado completo',
}

function normalizeCitizenEducationLevel(level) {
  return legacyCitizenEducationMap[level] ?? level ?? ''
}

const digitalToolOptions = [
  'Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Microsoft Outlook',
  'Google Docs', 'Google Planilhas', 'Google Apresentações', 'Microsoft Teams',
  'Google Meet', 'Zoom', 'Canva', 'Adobe Photoshop', 'Adobe Illustrator',
  'Power BI', 'Tableau', 'Trello', 'Asana', 'Jira', 'Slack', 'Notion',
  'Windows', 'Linux', 'HTML e CSS', 'JavaScript', 'Python', 'Java', 'SQL',
  'Git e GitHub', 'SAP', 'AutoCAD', 'Outro',
]

const behavioralSkillOptions = [
  'Adaptabilidade', 'Agilidade', 'Atenção aos detalhes', 'Autonomia', 'Colaboração',
  'Comunicação', 'Comunicação escrita', 'Comunicação verbal', 'Criatividade',
  'Empatia', 'Escuta ativa', 'Ética profissional', 'Flexibilidade', 'Foco em resultados',
  'Gestão de conflitos', 'Gestão do tempo', 'Iniciativa', 'Inteligência emocional',
  'Liderança', 'Negociação', 'Organização', 'Pensamento analítico', 'Pensamento crítico',
  'Planejamento', 'Proatividade', 'Resiliência', 'Resolução de problemas',
  'Responsabilidade', 'Tomada de decisão', 'Trabalho em equipe',
]

const marketCertificateOptions = [
  { name: 'Professional Scrum Product Owner I (PSPO I)', issuer: 'Scrum.org' },
  { name: 'Professional Scrum Master I (PSM I)', issuer: 'Scrum.org' },
  { name: 'Certified ScrumMaster (CSM)', issuer: 'Scrum Alliance' },
  { name: 'Project Management Professional (PMP)', issuer: 'PMI' },
  { name: 'Certified Associate in Project Management (CAPM)', issuer: 'PMI' },
  { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services' },
  { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services' },
  { name: 'Microsoft Azure Fundamentals (AZ-900)', issuer: 'Microsoft' },
  { name: 'Microsoft Power BI Data Analyst (PL-300)', issuer: 'Microsoft' },
  { name: 'Google Cloud Associate Cloud Engineer', issuer: 'Google Cloud' },
  { name: 'Google Data Analytics Professional Certificate', issuer: 'Google' },
  { name: 'ITIL 4 Foundation', issuer: 'PeopleCert' },
  { name: 'Cisco Certified Network Associate (CCNA)', issuer: 'Cisco' },
  { name: 'CompTIA Security+', issuer: 'CompTIA' },
  { name: 'Oracle Certified Professional: Java SE', issuer: 'Oracle' },
  { name: 'Salesforce Certified Administrator', issuer: 'Salesforce' },
  { name: 'Lean Six Sigma Green Belt', issuer: 'IASSC / entidade certificadora' },
]

function requirementItemName(item, field = 'name') {
  return typeof item === 'string' ? item : item?.[field] || ''
}

function requirementItemPriority(item, fallback = 'desired') {
  return typeof item === 'object' && item?.priority ? item.priority : fallback
}

function priorityText(priority) {
  return priority === 'required' ? 'Importante' : 'Desejável'
}

function isBasicEducation(level) {
  return ['', 'Sem escolaridade formal', 'Fundamental incompleto', 'Fundamental completo', 'Ensino médio incompleto', 'Ensino médio completo', 'Ensino Fundamental incompleto', 'Ensino Fundamental completo', 'Ensino Médio incompleto', 'Ensino Médio completo'].includes(level)
}

function cvEducationRequiresCourse(level) {
  return ['Superior incompleto', 'Superior completo', 'Pós-graduação incompleta', 'Pós-graduação completa', 'Mestrado completo', 'Doutorado completo'].includes(normalizeCitizenEducationLevel(level))
}

function formationHasNamedCourse(formation) {
  if (!formation || isBasicEducation(formation.level)) return false
  const title = formation.selectedTitle || formation.area || ''
  return Boolean(formation.code || (title && title !== formation.level))
}

function cvAcademicValidationIssue(cv) {
  if (!cvEducationRequiresCourse(cv.educationLevel)) return null
  if ((cv.formations || []).some(formationHasNamedCourse)) return null
  return {
    title: 'Informe sua formação acadêmica',
    description: `Seu perfil indica “${cv.educationLevel}”. Para concluir este currículo, adicione o curso ou a área de formação correspondente.`,
  }
}

function cvProfessionalLinks(cv) {
  if (Array.isArray(cv.professionalLinks) && cv.professionalLinks.length) return cv.professionalLinks.filter((item) => item.url)
  return [
    cv.link ? { id: 'legacy-link', type: 'Perfil profissional', title: 'Perfil profissional', url: cv.link } : null,
    cv.otherLink ? { id: 'legacy-other-link', type: 'Portfólio ou projeto', title: 'Portfólio ou projeto', url: cv.otherLink } : null,
  ].filter(Boolean)
}

function formationDisplay(formation) {
  const basic = isBasicEducation(formation.level)
  return {
    title: basic ? formation.level : (formation.selectedTitle || formation.area || formation.level),
    subtitle: basic ? formation.institution : [formation.level, formation.institution].filter(Boolean).join(' · '),
    period: [formation.start, formation.end].filter(Boolean).join(' — '),
  }
}

function externalLinkHref(value) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function createEntryId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const VACANCY_STORAGE_KEY = 'trampolim.published-vacancy.v1'
const VACANCIES_STORAGE_KEY = 'trampolim.published-vacancies.v2'
const ACTIVE_VACANCY_STORAGE_KEY = 'trampolim.active-vacancy.v2'
const APPLICATIONS_STORAGE_KEY = 'trampolim.vacancy-applications.v1'

function readStoredValue(key, fallback) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

function compatibilityRecommendation(compatibility) {
  if (!compatibility?.eligible) return { label: 'Candidatura indisponível', tone: 'blocked', text: 'Esta vaga possui uma regra de exclusividade que não é atendida pelo seu perfil.' }
  if ((compatibility?.score || 0) >= 80) return { label: 'Muito compatível', tone: 'very-high', text: 'Seu perfil atende muito bem aos requisitos informados pela empresa.' }
  if ((compatibility?.score || 0) >= 55) return { label: 'Compatível', tone: 'high', text: 'Seu perfil tem boa aderência aos requisitos desta oportunidade.' }
  return { label: 'Compatibilidade parcial', tone: 'partial', text: 'Seu perfil atende parte dos requisitos e ainda pode se candidatar.' }
}

function applicationTab(status) {
  if (status === 'Contratado') return 'hired'
  if (['Selecionado', 'Não contratado'].includes(status)) return 'selected'
  if (['Pré-selecionado', 'Convidado para entrevista', 'Entrevista agendada'].includes(status)) return 'preselected'
  return 'candidates'
}

function applicationStatusTone(status) {
  if (status === 'Contratado') return 'success'
  if (status === 'Não contratado') return 'danger'
  if (status === 'Entrevista agendada') return 'scheduled'
  if (status === 'Convidado para entrevista') return 'invited'
  if (status === 'Selecionado') return 'selected'
  if (status === 'Pré-selecionado') return 'preselected'
  return 'new'
}

function formatPublishedDate(value) {
  if (!value) return 'hoje'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value + 'T12:00:00'))
}

function vacancyLocation(job) {
  if (job.workMode === 'Remoto' || job.workMode === 'Online') return 'Remoto'
  if (job.useCompanyAddress) return 'São Paulo — SP'
  return [job.district, job.city, job.state].filter(Boolean).join(' · ') || 'São Paulo — SP'
}

function candidateWithQuestionnaire(cv, criteria, answers) {
  const affirmativeAvailability = (criteria.availability || []).map((item) => requirementItemName(item)).filter((item) => answers[item]?.answer === 'yes')
  return {
    ...cv,
    availability: affirmativeAvailability,
    vehicles: answers['Ter veículo próprio']?.vehicle ? [answers['Ter veículo próprio'].vehicle] : [],
  }
}

function mergeCandidateProfiles(models) {
  const data = models.map((model) => model.data).filter(Boolean)
  const base = cloneCv(data[0] || createInitialCv())
  const mergeObjects = (field, key) => [...new Map(data.flatMap((cv) => cv[field] || []).map((item) => [key(item), item])).values()]
  const mergeStrings = (field) => [...new Set(data.flatMap((cv) => cv[field] || []))]
  const highestEducation = data.reduce((highest, cv) => cvEducationLevels.indexOf(cv.educationLevel) > cvEducationLevels.indexOf(highest) ? cv.educationLevel : highest, base.educationLevel)
  return {
    ...base,
    educationLevel: highestEducation,
    savedExperiences: mergeObjects('savedExperiences', (item) => `${item.cbo}-${item.company}-${item.start}`),
    formations: mergeObjects('formations', (item) => `${item.code || item.area}-${item.institution}-${item.start}`),
    savedCourses: mergeObjects('savedCourses', (item) => `${item.name}-${item.institution}`),
    savedLanguages: mergeObjects('savedLanguages', (item) => item.language),
    savedDigital: mergeObjects('savedDigital', (item) => item.tool),
    skills: mergeStrings('skills'), cnh: mergeStrings('cnh'), eligibility: mergeStrings('eligibility'), availability: mergeStrings('availability'),
  }
}

function evaluateCandidateModels(vacancy, models = loadStoredCvModels(), answers = null) {
  const aggregateProfile = mergeCandidateProfiles(models)
  const candidate = answers ? candidateWithQuestionnaire(aggregateProfile, vacancy.criteria, answers) : aggregateProfile
  const compatibility = calculateVacancyCompatibility({ job: vacancy.job, criteria: vacancy.criteria }, candidate)
  const sharedProfile = { cnh: aggregateProfile.cnh, eligibility: aggregateProfile.eligibility, availability: aggregateProfile.availability }
  const rankedModels = models.map((model) => {
    const modelProfile = { ...model.data, ...sharedProfile }
    const evaluatedProfile = answers ? candidateWithQuestionnaire(modelProfile, vacancy.criteria, answers) : modelProfile
    return { id: model.id, compatibility: calculateVacancyCompatibility({ job: vacancy.job, criteria: vacancy.criteria }, evaluatedProfile) }
  }).sort((first, second) => Number(second.compatibility.eligible) - Number(first.compatibility.eligible) || second.compatibility.score - first.compatibility.score)
  return { compatibility, aggregateProfile: candidate, recommendedModelId: rankedModels[0]?.id || models[0]?.id }
}

function visibleCompatibilityBreakdown(vacancy, compatibility, { includeAvailability = true } = {}) {
  const { job = {}, criteria = {} } = vacancy || {}
  const labels = new Set()
  if (criteria.exclusivity) labels.add('Exclusividade')
  if (criteria.cnh?.length) labels.add('CNH')
  if (criteria.languages?.length) labels.add('Idiomas')
  if (criteria.skills?.length) labels.add('Habilidades')
  if (includeAvailability && criteria.availability?.length) labels.add('Disponibilidades')
  if (criteria.certificates?.length) labels.add('Certificados')
  if (criteria.formations?.length || (criteria.educationLevel && criteria.educationLevel !== 'Sem escolaridade mínima')) labels.add('Formação acadêmica')
  if (criteria.experience && criteria.experience !== 'Sem experiência desejada' && job.cboId) labels.add('Experiência profissional')
  if (criteria.courseAreas?.length) labels.add('Cursos complementares')
  if (criteria.digital?.length) labels.add('Competências digitais')
  return (compatibility?.breakdown || []).filter((item) => labels.has(item.label))
}

function localIsoDate(date) {
  const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
  return local.toISOString().slice(0, 10)
}

function dateFromIso(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function datesBetween(start, end) {
  const first = dateFromIso(start)
  const last = dateFromIso(end)
  if (!first || !last) return []
  const dates = []
  for (const current = new Date(first); current <= last; current.setDate(current.getDate() + 1)) dates.push(localIsoDate(current))
  return dates
}

function formatShortDate(value) {
  const date = dateFromIso(value)
  return date ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date) : ''
}

function minutesFromDuration(value, customValue = '') {
  if (value === 'Sem intervalo') return 0
  if (value === 'Personalizado') {
    const [hours = 0, minutes = 0] = customValue.split(':').map(Number)
    return (hours * 60) + minutes
  }
  if (value.includes('hora')) {
    const hours = Number(value.match(/^(\d+)/)?.[1] || 1)
    const minutes = Number(value.match(/e (\d+) minutos/)?.[1] || 0)
    return (hours * 60) + minutes
  }
  return Number(value.match(/\d+/)?.[0] || 0)
}

function timeFromMinutes(total) {
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hours = Math.floor(normalized / 60).toString().padStart(2, '0')
  const minutes = (normalized % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function minutesFromTime(value) {
  const [hours = 0, minutes = 0] = String(value || '').split(':').map(Number)
  return (hours * 60) + minutes
}

const companySteps = [
  { id: 'vacancy', label: 'Informações da vaga', icon: BriefcaseBusiness },
  { id: 'contract', label: 'Contrato e benefícios', icon: FileText },
  { id: 'location', label: 'Local de trabalho', icon: MapPin },
  { id: 'criteria', label: 'Critérios', icon: ListChecks },
  { id: 'review', label: 'Revisão', icon: FileCheck2 },
]

const scheduleStep = { id: 'schedule', label: 'Agenda de entrevistas', icon: CalendarDays }

function companyStepsFor(processType) {
  if (processType !== 'scheduled') return companySteps
  return [...companySteps.slice(0, -1), scheduleStep, companySteps.at(-1)]
}

const citizenSections = [
  { id: 'experience', label: 'Histórico profissional', icon: BriefcaseBusiness },
  { id: 'education', label: 'Formação acadêmica', icon: GraduationCap },
  { id: 'courses', label: 'Cursos e certificações', icon: FileCheck2 },
  { id: 'languages', label: 'Idiomas', icon: Languages },
  { id: 'digital', label: 'Conhecimentos digitais', icon: Laptop },
  { id: 'skills', label: 'Habilidades', icon: Star },
  { id: 'links', label: 'Portfólio e trabalhos', icon: Link2 },
  { id: 'summary', label: 'Resumo profissional', icon: FileText },
]

function percentageOfFilled(values) {
  if (!values.length) return 0
  return Math.round((values.filter((value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value ?? '').trim())).length / values.length) * 100)
}

function getCitizenSections(cv) {
  const completion = {
    experience: cv.savedExperiences.length ? 100 : 0,
    education: cv.formations.length ? 100 : 0,
    courses: cv.savedCourses.length ? 100 : 0,
    languages: cv.savedLanguages.length ? 100 : 0,
    digital: cv.savedDigital.length ? 100 : 0,
    skills: Math.min(100, Math.round((cv.skills.length / 3) * 100)),
    links: cvProfessionalLinks(cv).length ? 100 : 0,
    summary: cv.summary.trim() ? 100 : 0,
  }
  return citizenSections.map((item) => ({ ...item, completion: completion[item.id] }))
}

function Brand() {
  return <div className="brand"><div><strong>SÃO PAULO</strong><small>GOVERNO DO ESTADO</small></div></div>
}

function Field({ label, required, hint, children, wide = false }) {
  return <div className={`field ${wide ? 'wide' : ''}`}><span className="field-label">{label}{required && <b>*</b>}</span>{children}{hint && <small>{hint}</small>}</div>
}

function Input({ value, onChange, placeholder, locked = false, type = 'text', min, max }) {
  if (type === 'month') return <MonthPicker value={value} onChange={onChange} placeholder={placeholder} locked={locked} />
  return <div className={`input-shell ${locked ? 'locked' : ''}`}><input type={type} value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} readOnly={locked} min={min} max={max} />{locked && <Lock size={14} />}</div>
}

function Select({ value, onChange, children, disabled = false }) {
  return <div className={`select-shell ${disabled ? 'disabled' : ''} ${value === '' ? 'empty' : ''}`}><select value={value} onChange={(event) => onChange?.(event.target.value)} disabled={disabled}>{children}</select><ChevronDown size={15} /></div>
}

function CertificatePicker({ value, onChange, onChoose, placeholder = 'Busque ou digite uma certificação' }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const normalizedQuery = normalizeCatalogSearch(value)
  const filtered = marketCertificateOptions.filter((item) => matchesCatalogSearch(`${item.name} ${item.issuer}`, value)).slice(0, 8)
  const exact = marketCertificateOptions.some((item) => normalizeCatalogSearch(item.name) === normalizedQuery)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function choose(item) {
    onChange(item.name)
    onChoose?.(item)
    setOpen(false)
  }

  return <div className="certificate-picker" ref={pickerRef}>
    <div className="catalog-input"><Search size={16} /><input value={value} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true) }} placeholder={placeholder} /><ChevronDown size={15} /></div>
    {open && <div className="certificate-menu"><div className="certificate-menu-caption"><strong>Certificações conhecidas no mercado</strong><small>Selecione uma opção ou use o texto digitado.</small></div>{filtered.map((item) => <button type="button" key={item.name} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><span><FileCheck2 size={16} /></span><div><strong>{item.name}</strong><small>{item.issuer}</small></div><Plus size={15} /></button>)}{value.trim() && !exact && <button type="button" className="certificate-custom" onMouseDown={(event) => event.preventDefault()} onClick={() => choose({ name: value.trim(), issuer: '' })}><span><Pencil size={16} /></span><div><strong>Usar “{value.trim()}”</strong><small>Adicionar certificação personalizada</small></div><Plus size={15} /></button>}{!filtered.length && !value.trim() && <div className="empty-result">Digite para pesquisar uma certificação.</div>}</div>}
  </div>
}

function ComplementaryCoursePicker({ value, onChange, onChoose, selected = [], placeholder = 'Busque ou digite o nome do curso' }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const results = searchComplementaryCourses(value).filter((item) => !selected.some((selectedItem) => complementaryCourseId(selectedItem) === item.id))
  const normalizedQuery = normalizeCourseName(value)
  const exactCatalogItem = complementaryCourseCatalog.find((item) => [item.name, ...(item.aliases || [])].some((name) => normalizeCourseName(name) === normalizedQuery))

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function choose(item) {
    onChange(item.name)
    onChoose({ ...item, catalogId: item.id })
    setOpen(false)
  }

  function chooseCustom() {
    const name = value.trim()
    choose({ id: customComplementaryCourseId(name), name, category: 'Curso personalizado', aliases: [], custom: true })
  }

  return <div className="complementary-course-picker" ref={pickerRef}>
    <div className="catalog-input"><Search size={16} /><input value={value} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true) }} placeholder={placeholder} /><ChevronDown size={15} /></div>
    {open && <div className="complementary-course-menu">
      <div className="certificate-menu-caption"><strong>Catálogo de cursos complementares</strong><small>Busque pelo nome. Termos próximos também geram recomendações.</small></div>
      {results.map((item) => <button type="button" key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}><span className="course-catalog-id">{item.id}</span><div><strong>{item.name}</strong><small>{item.category}{item.fuzzy ? ' · sugestão por similaridade' : ''}</small></div>{item.fuzzy ? <WandSparkles size={15} /> : <Plus size={15} />}</button>)}
      {value.trim() && !exactCatalogItem && <button type="button" className="course-custom" onMouseDown={(event) => event.preventDefault()} onClick={chooseCustom}><span className="course-catalog-id custom">NOVO</span><div><strong>Adicionar “{value.trim()}”</strong><small>Curso personalizado com identificador próprio</small></div><Plus size={15} /></button>}
      {!results.length && !value.trim() && <div className="empty-result">Digite para pesquisar um curso.</div>}
    </div>}
  </div>
}

function Switch({ checked, onChange, label, description, disabled = false }) {
  return <button type="button" className="switch-row" disabled={disabled} onClick={() => onChange(!checked)}><span className={`switch ${checked ? 'on' : ''}`}><i /></span><span><strong>{label}</strong>{description && <small>{description}</small>}</span></button>
}

function Chips({ items, onRemove, variant = 'default' }) {
  if (!items.length) return null
  return <div className="chips">{items.map((item, index) => <span className={`chip ${variant}`} key={`${typeof item === 'string' ? item : item.code}-${index}`}>{typeof item === 'string' ? item : <><b>{item.code}</b>{item.area}</>}{onRemove && <button type="button" onClick={() => onRemove(index)} aria-label="Remover"><X size={12} /></button>}</span>)}</div>
}

function CatalogPicker({ type, selected, onAdd, label, value = '', onInputChange, showMetadata = true, fillSelection = false, disabled = false }) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const source = type === 'cine' ? cineCatalog : cboOccupations
  const results = source.filter((item) => {
    const haystack = type === 'cine'
      ? `${item.code} ${item.area} ${item.courses} ${item.detailedTitle} ${item.specificTitle} ${item.generalTitle}`
      : `${item.title} ${item.id} ${item.familyTitle} ${item.synonyms.join(' ')} ${(item.marketAliases || []).join(' ')}`
    return matchesCatalogSearch(haystack, query)
  }).sort((first, second) => catalogSearchPriority(first, type, query) - catalogSearchPriority(second, type, query))
  const visibleResults = type === 'cine' ? results : results.slice(0, 20)

  useEffect(() => {
    if (!open) setQuery(value || '')
  }, [value, open])

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function choose(item) {
    const selectedItem = type === 'cbo'
      ? { ...item, selectedTitle: cboDisplayTitle(item, query) }
      : { ...item, selectedTitle: cineDisplayTitle(item, query) }
    onAdd(selectedItem)
    setQuery(fillSelection ? selectedItem.selectedTitle : '')
    setOpen(false)
  }

  return <div className={`catalog-picker ${disabled ? 'disabled' : ''}`} ref={pickerRef}>
    <div className="catalog-input"><Search size={16} /><input value={query} disabled={disabled} onFocus={() => !disabled && setOpen(true)} onChange={(event) => { setQuery(event.target.value); onInputChange?.(event.target.value); setOpen(true) }} placeholder={disabled ? 'Escolha primeiro se o item é desejável ou importante' : label} /><ChevronDown size={15} /></div>
    {open && <div className="catalog-menu">
      {showMetadata && type === 'cine' && <div className="catalog-caption">Catálogo de cursos e áreas de formação</div>}
      {visibleResults.map((item) => {
        const already = selected.some((entry) => (type === 'cine' ? entry.code === item.code : entry.id === item.id))
        return <button type="button" key={type === 'cine' ? item.code : item.id} disabled={already} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>
          {type === 'cine' && showMetadata && <span className="catalog-code">{item.code}</span>}
          <span><strong>{type === 'cine' ? cineDisplayTitle(item, query) : cboDisplayTitle(item, query)}</strong><small>{type === 'cine' ? (showMetadata ? `${item.detailedCode} · ${item.detailedTitle}${cineDisplayTitle(item, query) !== item.area ? ` · Rótulo CINE: ${item.area}` : ''}` : (item.detailedTitle || item.area)) : ((item.marketAliases || []).some((alias) => alias === cboDisplayTitle(item, query)) ? `Equivalência CBO: ${item.title}` : item.familyTitle)}</small></span>
          {already ? <Check size={15} /> : <Plus size={15} />}
        </button>
      })}
      {!results.length && <div className="empty-result">Nenhum resultado para “{query}”</div>}
    </div>}
  </div>
}

function AppHeader({ persona, sidebarOpen, setSidebarOpen, citizenProfile }) {
  const citizenInitials = (citizenProfile?.socialName || citizenProfile?.name || 'Joana Silva').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const PersonaIcon = persona === 'company' ? Building2 : UserRound
  return <header className="app-header">
    <button className="mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={21} /></button>
    <Brand />
    <div className="persona-context"><PersonaIcon size={15} /><span>{persona === 'company' ? 'Área da empresa' : 'Área do cidadão'}</span></div>
    <div className="header-actions"><button><Accessibility size={18} /><span>Acessibilidade</span></button><button><Bell size={18} /></button><span className="header-avatar">{persona === 'company' ? 'EC' : citizenInitials}</span></div>
  </header>
}

function Sidebar({ persona, open, onClose, companySection, onCompanyNavigate, citizenSection, onCitizenNavigate, citizenProfile, onEditCitizenProfile, citizenApplicationCount = 0 }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const citizenName = citizenProfile?.socialName || citizenProfile?.name || 'Joana Silva'
  const citizenInitials = citizenName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    function closeAccountMenu(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', closeAccountMenu)
    return () => document.removeEventListener('mousedown', closeAccountMenu)
  }, [])

  return <aside className={`product-sidebar ${open ? 'open' : ''}`}>
    <button className="sidebar-close" onClick={onClose}><X size={20} /></button>
    <div className="sidebar-account-menu" ref={accountMenuRef}>
      <button type="button" className={`account-card ${accountOpen ? 'open' : ''}`} onClick={() => persona === 'citizen' && setAccountOpen((value) => !value)}><span className={`account-avatar ${persona}`}>{persona === 'company' ? 'EC' : citizenInitials}</span><div><strong>{persona === 'company' ? 'Empresa Cidadã' : citizenName}</strong><small>{persona === 'company' ? 'CNPJ verificado' : 'Conta GOV.br'}</small></div><ChevronDown size={15} /></button>
      {persona === 'citizen' && accountOpen && <div className="account-popover"><div><span className="account-avatar citizen">{citizenInitials}</span><div><strong>{citizenName}</strong><small>Dados compartilhados com seus currículos</small></div></div><button type="button" onClick={() => { setAccountOpen(false); onEditCitizenProfile(); onClose() }}><Pencil size={15} /><span><strong>Editar perfil</strong><small>Contatos, escolaridade e CNH</small></span><ChevronRight size={14} /></button></div>}
    </div>
    <div className="portal-search"><Search size={15} /><span>Buscar no portal</span></div>
    <nav>
      <button><Home size={18} />Início</button>
      {persona === 'company' ? <>
        <button><CalendarDays size={18} />Agenda</button>
        <button className="active"><BriefcaseBusiness size={18} />Vagas<ChevronDown size={14} /></button>
        <div className="sub-links"><button className={companySection === 'create' ? 'active' : ''} onClick={() => { onCompanyNavigate('create'); onClose() }}>Criar vaga</button><button className={companySection === 'published' ? 'active' : ''} onClick={() => { onCompanyNavigate('published'); onClose() }}>Publicadas</button><button>Rascunhos <em>2</em></button></div>
        <button><Users size={18} />Candidatos</button>
      </> : <>
        <button><LayoutDashboard size={18} />Meu painel</button>
        <button className={citizenSection === 'cv' ? 'active' : ''} onClick={() => { onCitizenNavigate('cv'); onClose() }}><FileText size={18} />Currículo</button>
        <button className={citizenSection === 'published' || citizenSection === 'applications' ? 'active' : ''}><BriefcaseBusiness size={18} />Vagas<ChevronDown size={14} /></button>
        <div className="sub-links citizen-vacancy-links"><button className={citizenSection === 'published' ? 'active' : ''} onClick={() => { onCitizenNavigate('published'); onClose() }}>Vagas publicadas</button><button className={citizenSection === 'applications' ? 'active' : ''} onClick={() => { onCitizenNavigate('applications'); onClose() }}>Candidaturas{citizenApplicationCount > 0 && <em>{citizenApplicationCount}</em>}</button></div>
        <div className='sub-links recommended-vacancy-link'><button className={citizenSection === 'recommended' ? 'active' : ''} onClick={() => { onCitizenNavigate('recommended'); onClose() }}><Sparkles size={14} />Vagas recomendadas</button></div>
        <button><BookOpen size={18} />Meus cursos</button>
      </>}
    </nav>
    <div className="sidebar-help"><CircleHelp size={18} /><span><strong>Precisa de ajuda?</strong><small>Acesse a central de suporte</small></span></div>
    <div className="trampolim-wordmark">trampo<span>lim</span><i /></div>
  </aside>
}

function DescriptionMode({ mode, onChange, canSuggest, onRestore }) {
  const assisted = mode === 'assisted'
  return <div className={`description-mode ${assisted ? 'active' : ''}`}>
    <button type="button" role="switch" aria-checked={assisted} onClick={() => onChange(assisted ? 'manual' : 'assisted')} disabled={!canSuggest}>
      <span className={`switch ${assisted ? 'on' : ''}`}><i /></span>
      <span><strong>Preencher com descrição sugerida pelo CBO</strong><small>Somente a descrição é sugerida. Todos os outros campos continuam manuais.</small></span>
    </button>
    {assisted && canSuggest && <button type="button" className="restore-description" onClick={onRestore}><RefreshCw size={14} /> Restaurar sugestão</button>}
    {!canSuggest && <em>Selecione primeiro um cargo ou ocupação.</em>}
  </div>
}

function FormSection({ icon: Icon, title, description, badge, children }) {
  return <section className="form-section">
    <header><span className="form-section-icon"><Icon size={20} /></span><div><h2>{title}</h2><p>{description}</p></div>{badge && <em>{badge}</em>}</header>
    <div className="form-section-body">{children}</div>
  </section>
}

function plainTextToRichHtml(value = '') {
  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.split(/\n{2,}/).map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('')
}

function sanitizeRichText(html = '') {
  if (typeof DOMParser === 'undefined') return html
  const documentNode = new DOMParser().parseFromString(html, 'text/html')
  const allowed = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'UL', 'OL', 'LI', 'H3', 'BLOCKQUOTE', 'P', 'DIV', 'BR'])
  function clean(node) {
    ;[...node.childNodes].forEach((child) => {
      if (child.nodeType !== 1) return
      clean(child)
      if (!allowed.has(child.tagName)) child.replaceWith(...child.childNodes)
      else [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name))
    })
  }
  clean(documentNode.body)
  return documentNode.body.innerHTML
}

function RichTextEditor({ value, htmlValue, onChange, maxLength = 2000, placeholder }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current || document.activeElement === editorRef.current) return
    const nextHtml = htmlValue || plainTextToRichHtml(value)
    if (editorRef.current.innerHTML !== nextHtml) editorRef.current.innerHTML = nextHtml
  }, [htmlValue, value])

  function emitChange(sanitize = false) {
    if (!editorRef.current) return
    const text = editorRef.current.innerText.replace(/\n{3,}/g, '\n\n').trimStart().slice(0, maxLength)
    const html = sanitize ? sanitizeRichText(editorRef.current.innerHTML) : editorRef.current.innerHTML
    if (sanitize && editorRef.current.innerHTML !== html) editorRef.current.innerHTML = html
    onChange({ text, html })
  }

  function activeRange() {
    const selection = window.getSelection()
    if (!selection?.rangeCount) return null
    const range = selection.getRangeAt(0)
    return editorRef.current?.contains(range.commonAncestorContainer) ? { range, selection } : null
  }

  function placeCaret(node) {
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(node)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }

  function runCommand(action) {
    editorRef.current?.focus()
    const context = activeRange()
    if (!context) return
    const { range } = context
    const selectedText = range.toString()
    let node
    if (['strong', 'em', 'u'].includes(action)) {
      node = document.createElement(action)
      if (range.collapsed) node.appendChild(document.createTextNode('\u200b'))
      else node.appendChild(range.extractContents())
    } else if (action === 'ul' || action === 'ol') {
      node = document.createElement(action)
      const lines = selectedText ? selectedText.split(/\n+/).filter(Boolean) : ['']
      lines.forEach((line) => {
        const item = document.createElement('li')
        if (line) item.textContent = line
        else item.appendChild(document.createElement('br'))
        node.appendChild(item)
      })
      range.deleteContents()
    } else if (action === 'remove') {
      node = document.createTextNode(selectedText)
      range.deleteContents()
    } else {
      node = document.createElement(action)
      if (range.collapsed) node.appendChild(document.createElement('br'))
      else node.appendChild(range.extractContents())
    }
    range.insertNode(node)
    placeCaret(action === 'ul' || action === 'ol' ? node.firstElementChild : node)
    emitChange()
  }

  const tools = [
    { label: 'Título', icon: Heading2, action: 'h3' },
    { label: 'Negrito', icon: Bold, action: 'strong' },
    { label: 'Itálico', icon: Italic, action: 'em' },
    { label: 'Sublinhado', icon: Underline, action: 'u' },
    { label: 'Lista com marcadores', icon: List, action: 'ul' },
    { label: 'Lista numerada', icon: ListOrdered, action: 'ol' },
    { label: 'Citação', icon: Quote, action: 'blockquote' },
  ]

  return <div className="rich-text-editor">
    <div className="rich-text-toolbar" role="toolbar" aria-label="Formatação da descrição">
      {tools.map(({ label, icon: Icon, action }) => <button type="button" key={label} title={label} aria-label={label} onMouseDown={(event) => { event.preventDefault(); runCommand(action) }}><Icon size={17} /></button>)}
      <span />
      <button type="button" title="Limpar formatação" aria-label="Limpar formatação" onMouseDown={(event) => { event.preventDefault(); runCommand('remove') }}><RemoveFormatting size={17} /></button>
    </div>
    <div ref={editorRef} className="rich-text-area" contentEditable="true" role="textbox" aria-multiline="true" data-placeholder={placeholder} onBeforeInput={(event) => { if (value.length >= maxLength && event.data && !window.getSelection()?.toString()) event.preventDefault() }} onInput={() => emitChange()} onBlur={() => emitChange(true)} onPaste={(event) => { event.preventDefault(); const remaining = Math.max(0, maxLength - value.length + (window.getSelection()?.toString().length || 0)); const text = event.clipboardData.getData('text/plain').slice(0, remaining); const context = activeRange(); if (!context) return; context.range.deleteContents(); const node = document.createTextNode(text); context.range.insertNode(node); placeCaret(node); emitChange() }} suppressContentEditableWarning />
    <footer><span>Use listas para separar responsabilidades e requisitos.</span><strong>{value.length}/{maxLength}</strong></footer>
  </div>
}

function RequirementLevel({ value, onChange, disabled = false, fixed }) {
  if (fixed) return <span className={`requirement-level fixed ${fixed}`}><Lock size={12} />{fixed === 'required' ? 'Eliminatório' : 'Desejável'}</span>
  if (disabled || value === 'none') return <span className="requirement-level waiting">Adicione uma informação para classificar</span>
  return <div className="requirement-level choices" role="group" aria-label="Importância deste requisito">
    <button type="button" className={value === 'desired' ? 'active desired' : ''} onClick={() => onChange('desired')}><Sparkles size={13} /><span><strong>Desejável</strong><small>Valoriza quem atende</small></span></button>
    <button type="button" className={value === 'required' ? 'active required' : ''} onClick={() => onChange('required')}><ShieldCheck size={13} /><span><strong>Importante</strong><small>Reduz bastante a nota se faltar</small></span></button>
  </div>
}

function ItemPriorityChoice({ value, onChange, compact = false }) {
  return <div className={`item-priority-choice ${compact ? 'compact' : ''}`} role="group" aria-label="Classificação deste item"><button type="button" className={value === 'desired' ? 'active desired' : ''} onClick={() => onChange('desired')}><Sparkles size={compact ? 12 : 14} /><span><strong>Desejável</strong>{!compact && <small>Valoriza quem atende</small>}</span></button><button type="button" className={value === 'required' ? 'active required' : ''} onClick={() => onChange('required')}><ShieldCheck size={compact ? 12 : 14} /><span><strong>Importante</strong>{!compact && <small>Tem impacto maior</small>}</span></button></div>
}

function RequirementList({ items, icon: Icon, renderTitle, renderMeta, onEdit, onRemove, priorityFallback = 'desired', onPriorityChange }) {
  if (!items.length) return <div className="requirement-empty">Nenhum requisito adicionado. Este critério não participa da compatibilidade.</div>
  return <div className="requirement-list">{items.map((item, index) => <div key={item.id || item.code || item.language || item.tool || requirementItemName(item) || item}><span><Icon size={17} /></span><div className="requirement-item-copy"><strong>{renderTitle(item)}</strong>{renderMeta && <small>{renderMeta(item)}</small>}</div>{onPriorityChange && <ItemPriorityChoice compact value={requirementItemPriority(item, priorityFallback)} onChange={(priority) => onPriorityChange(index, priority)} />}<div className="requirement-actions">{onEdit && <button type="button" className="edit" onClick={() => onEdit(item, index)} aria-label={`Editar ${renderTitle(item)}`}><Pencil size={14} /></button>}<button type="button" onClick={() => onRemove(index)} aria-label={`Remover ${renderTitle(item)}`}><X size={14} /></button></div></div>)}</div>
}

function VacancyStep({ job, setJob, mode, setMode }) {
  const [occupationOpen, setOccupationOpen] = useState(false)
  const occupationRef = useRef(null)
  const filteredOccupations = cboOccupations.filter((item) => matchesCatalogSearch(
    `${item.id} ${item.title} ${item.familyTitle} ${item.synonyms.join(' ')} ${item.marketAliases.join(' ')}`,
    job.cboQuery,
  )).sort((first, second) => catalogSearchPriority(first, 'cbo', job.cboQuery) - catalogSearchPriority(second, 'cbo', job.cboQuery)).slice(0, 20)

  useEffect(() => {
    function closeOccupationOnOutsideClick(event) {
      if (occupationRef.current && !occupationRef.current.contains(event.target)) setOccupationOpen(false)
    }
    document.addEventListener('mousedown', closeOccupationOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOccupationOnOutsideClick)
  }, [])

  function chooseOccupation(occupation) {
    const displayTitle = cboDisplayTitle(occupation, job.cboQuery)
    setJob((current) => ({
      ...current,
      cboQuery: displayTitle,
      cboId: occupation.id,
      description: mode === 'assisted' ? occupation.description : current.description,
      descriptionHtml: mode === 'assisted' ? plainTextToRichHtml(occupation.description) : current.descriptionHtml,
    }))
    setOccupationOpen(false)
  }

  function changeDescriptionMode(nextMode) {
    setMode(nextMode)
    if (nextMode === 'assisted' && job.cboId) {
      const description = cboOccupations.find((item) => item.id === job.cboId)?.description ?? job.description
      setJob({ ...job, description, descriptionHtml: plainTextToRichHtml(description) })
    }
  }

  return <>
    <FormSection icon={BriefcaseBusiness} title="Informações da vaga" description="Apresente a oportunidade de forma clara para os candidatos." badge="Campos obrigatórios">
      <div className="form-grid">
        <div className="anonymous-setting anonymous-first wide"><Switch checked={job.anonymous} onChange={(anonymous) => setJob({ ...job, anonymous })} label="Publicar vaga como empresa anônima" description="Quando ativada, o nome e a identidade visual da empresa não serão exibidos aos candidatos." /><div className={`anonymous-preview ${job.anonymous ? 'active' : ''}`}><Eye size={16} /><span>{job.anonymous ? <>A vaga será publicada como <strong>Empresa anônima</strong></> : <>Os candidatos verão <strong>o nome e a marca da empresa</strong></>}</span></div></div>
        <Field label="Cargo ou ocupação CBO" required wide hint="Busque pelo código, nome oficial ou sinônimo da ocupação.">
          <div className="occupation-field" ref={occupationRef}>
            <div className="input-shell"><Search size={15} /><input value={job.cboQuery} onFocus={() => setOccupationOpen(true)} onChange={(event) => { setJob({ ...job, cboQuery: event.target.value, cboId: '' }); setMode('manual'); setOccupationOpen(true) }} placeholder="Ex.: 3171-10 ou desenvolvedor de sistemas" /><ChevronDown size={15} /></div>
            {occupationOpen && <div className="occupation-menu">{filteredOccupations.map((item) => { const displayTitle = cboDisplayTitle(item, job.cboQuery); return <button key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseOccupation(item)}><span className="catalog-code">{formatCbo(item.id)}</span><span><strong>{displayTitle}</strong><small>{displayTitle !== item.title ? `Equivalência CBO: ${item.title}` : item.familyTitle}</small></span><Plus size={15} /></button> })}{!filteredOccupations.length && <div className="empty-result">Nenhuma ocupação encontrada</div>}</div>}
          </div>
        </Field>
        <Field label="Nome público da vaga" required wide><Input value={job.title} onChange={(value) => setJob({ ...job, title: value })} placeholder="Ex.: Pessoa desenvolvedora júnior" /></Field>
        <Field label="Descrição da oportunidade" required wide><RichTextEditor value={job.description} htmlValue={job.descriptionHtml} onChange={({ text, html }) => setJob({ ...job, description: text, descriptionHtml: html })} placeholder="Conte sobre atividades, responsabilidades, rotina e contexto da vaga." maxLength={2000} /><DescriptionMode mode={mode} onChange={changeDescriptionMode} canSuggest={Boolean(job.cboId)} onRestore={() => { const description = cboOccupations.find((item) => item.id === job.cboId)?.description ?? ''; setJob({ ...job, description, descriptionHtml: plainTextToRichHtml(description) }) }} /></Field>
        <Field label="Relação de trabalho" required><Select value={job.relationship} onChange={(value) => setJob({ ...job, relationship: value })}><option>Efetivo</option><option>Temporário</option><option>Estágio</option></Select></Field>
        <Field label="Formato de trabalho" required><Select value={job.workMode} onChange={(value) => setJob({ ...job, workMode: value, useCompanyAddress: value === 'Online' })}><option>Presencial</option><option>Híbrido</option><option>Online</option></Select></Field>
        <Field label="Número de vagas" required><Input type="number" value={job.openings} onChange={(value) => setJob({ ...job, openings: value })} /></Field>
      </div>
    </FormSection>
  </>
}

const standardBenefits = [
  'Vale-alimentação (VA)', 'Vale-transporte (VT)', 'Vale-refeição (VR)',
  'Plano de saúde', 'Plano odontológico', 'Seguro de vida',
  'Auxílio home office', 'Participação nos lucros (PLR ou PPR)', 'Auxílio-creche',
  'Descontos em academias', 'Horário flexível', 'Jornada híbrida ou remota',
  'Day off no aniversário', 'Vale-cultura', 'Auxílio-educação',
]

function BenefitsPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const filteredBenefits = standardBenefits.filter((benefit) => matchesCatalogSearch(benefit, query))
  const customBenefit = query.trim()
  const exactOption = [...standardBenefits, ...value].some((benefit) => normalizeCatalogSearch(benefit) === normalizeCatalogSearch(customBenefit))

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function toggleBenefit(benefit) {
    onChange(value.includes(benefit) ? value.filter((item) => item !== benefit) : [...value, benefit])
  }

  function addCustomBenefit() {
    if (!customBenefit || exactOption) return
    onChange([...value, customBenefit])
    setQuery('')
    setOpen(false)
  }

  return <div className="benefits-picker" ref={pickerRef}>
    <div className="catalog-input"><Search size={16} /><input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} placeholder="Selecione ou digite um benefício" /><ChevronDown size={15} /></div>
    {open && <div className="benefits-menu">
      {filteredBenefits.map((benefit) => <button type="button" key={benefit} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleBenefit(benefit)}><span className={`benefit-check ${value.includes(benefit) ? 'checked' : ''}`}>{value.includes(benefit) && <Check size={12} />}</span><span>{benefit}</span></button>)}
      {customBenefit && !exactOption && <button type="button" className="custom-benefit" onMouseDown={(event) => event.preventDefault()} onClick={addCustomBenefit}><span><Plus size={13} /></span><div><strong>Adicionar “{customBenefit}”</strong><small>Benefício personalizado</small></div></button>}
      {!filteredBenefits.length && (!customBenefit || exactOption) && <div className="empty-result">Nenhum benefício encontrado</div>}
    </div>}
    <Chips items={value} onRemove={(index) => onChange(value.filter((_, itemIndex) => itemIndex !== index))} />
  </div>
}

const standardVehicles = ['Bicicleta', 'Moto', 'Carro', 'Caminhão', 'Van', 'Outro veículo motorizado', 'Outro veículo não motorizado', 'Veículo de tração animal']

function VehiclePicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const filtered = standardVehicles.filter((vehicle) => matchesCatalogSearch(vehicle, query))
  const customVehicle = query.trim()
  const exactOption = [...standardVehicles, ...value].some((vehicle) => normalizeCatalogSearch(vehicle) === normalizeCatalogSearch(customVehicle))

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function toggleVehicle(vehicle) {
    onChange(value.includes(vehicle) ? value.filter((item) => item !== vehicle) : [...value, vehicle])
  }

  function addCustomVehicle() {
    if (!customVehicle || exactOption) return
    onChange([...value, customVehicle])
    setQuery('')
    setOpen(false)
  }

  return <div className="benefits-picker vehicle-picker" ref={pickerRef}>
    <div className="catalog-input"><Search size={16} /><input value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true) }} placeholder="Selecione ou digite o tipo de veículo" /><ChevronDown size={15} /></div>
    {open && <div className="benefits-menu">
      {filtered.map((vehicle) => <button type="button" key={vehicle} onMouseDown={(event) => event.preventDefault()} onClick={() => toggleVehicle(vehicle)}><span className={`benefit-check ${value.includes(vehicle) ? 'checked' : ''}`}>{value.includes(vehicle) && <Check size={12} />}</span><span>{vehicle}</span></button>)}
      {customVehicle && !exactOption && <button type="button" className="custom-benefit" onMouseDown={(event) => event.preventDefault()} onClick={addCustomVehicle}><span><Plus size={13} /></span><div><strong>Adicionar “{customVehicle}”</strong><small>Tipo de veículo personalizado</small></div></button>}
      {!filtered.length && (!customVehicle || exactOption) && <div className="empty-result">Nenhum veículo encontrado</div>}
    </div>}
    <Chips items={value} onRemove={(index) => onChange(value.filter((_, itemIndex) => itemIndex !== index))} />
  </div>
}

const cnhCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE', 'ACC', 'ACCB', 'ACCC', 'ACCD', 'ACCE']

function CnhPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function toggleCategory(category) {
    onChange(value.includes(category) ? value.filter((item) => item !== category) : [...value, category])
  }

  return <div className="cnh-picker" ref={pickerRef}>
    <button type="button" className={`cnh-picker-trigger ${open ? 'open' : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}><span>{value.length ? `${value.length} ${value.length === 1 ? 'categoria selecionada' : 'categorias selecionadas'}` : 'Selecione as categorias'}</span><ChevronDown size={17} /></button>
    {open && <div className="benefits-menu cnh-picker-menu">
      {cnhCategories.map((category) => <button type="button" key={category} onClick={() => toggleCategory(category)}><span className={`benefit-check ${value.includes(category) ? 'checked' : ''}`}>{value.includes(category) && <Check size={12} />}</span><span>Categoria {category}</span></button>)}
    </div>}
    <Chips items={value.map((category) => `Categoria ${category}`)} onRemove={(index) => onChange(value.filter((_, itemIndex) => itemIndex !== index))} />
  </div>
}

function ContractStep({ job, setJob }) {
  return <>
    <FormSection icon={FileText} title="Dados do contrato" description="Informe remuneração, jornada e condições de trabalho.">
      <div className="form-grid">
        <Field label="Formato do salário" required><Select value={job.salaryType} onChange={(value) => setJob({ ...job, salaryType: value })}><option>Valor fechado</option><option>Faixa salarial</option><option>À combinar</option></Select></Field>
        {job.salaryType === 'Valor fechado' && <Field label="Valor mensal" required><div className="money-input"><span>R$</span><Input value={job.salary} onChange={(value) => setJob({ ...job, salary: value })} placeholder="0,00" /></div></Field>}
        {job.salaryType === 'Faixa salarial' && <><Field label="Valor inicial" required><div className="money-input"><span>R$</span><Input value={job.salary} onChange={(value) => setJob({ ...job, salary: value })} /></div></Field><Field label="Valor final" required><div className="money-input"><span>R$</span><Input value={job.salaryMax} onChange={(value) => setJob({ ...job, salaryMax: value })} /></div></Field></>}
        {job.salaryType === 'À combinar' && <div className="assist-banner wide"><Info size={17} /><div><strong>Salário a combinar</strong><span>O candidato verá que a remuneração será informada durante o processo seletivo.</span></div></div>}
        <Field label="Escala" required><Select value={job.scale} onChange={(value) => setJob({ ...job, scale: value })}>{['5x2','5x1','4x2','6x1','12x36','18x36','24x48','Outro'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
        <Field label="Turno" required><Select value={job.shift} onChange={(value) => setJob({ ...job, shift: value })}>{['Integral','Manhã','Tarde','Noite'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
        <Field label="Horário de entrada"><Input type="time" value={job.startTime} onChange={(value) => setJob({ ...job, startTime: value })} /></Field>
        <Field label="Horário de saída"><Input type="time" value={job.endTime} onChange={(value) => setJob({ ...job, endTime: value })} /></Field>
      </div>
    </FormSection>
    <FormSection icon={Star} title="Benefícios oferecidos" description="Selecione quantos benefícios forem necessários." badge="Opcional">
      <BenefitsPicker value={job.benefits} onChange={(benefits) => setJob({ ...job, benefits })} />
    </FormSection>
  </>
}

function LocationStep({ job, setJob }) {
  return <FormSection icon={MapPin} title="Local de trabalho" description="A divulgação da vaga é restrita ao estado de São Paulo.">
    <Switch checked={job.useCompanyAddress} disabled={job.workMode !== 'Online'} onChange={(value) => setJob({ ...job, useCompanyAddress: value })} label="Usar endereço cadastrado da empresa" description={job.workMode === 'Online' ? 'Praça da Sé, 100 · Sé · São Paulo — SP' : 'Disponível somente para vagas online'} />
    {job.useCompanyAddress ? <div className="address-card"><span><Building2 size={20} /></span><div><strong>Sede da Empresa Cidadã</strong><p>Praça da Sé, 100 · Sé<br />São Paulo — SP · 01001-000</p></div><button onClick={() => setJob({ ...job, useCompanyAddress: false })}><Pencil size={14} /> Alterar</button></div> : <div className="form-grid address-grid">
      <Field label="CEP" required hint="Digite um CEP de São Paulo"><Input value={job.cep} onChange={(value) => setJob({ ...job, cep: value })} placeholder="00000-000" /></Field>
      <Field label="Endereço" required><Input value={job.street} onChange={(value) => setJob({ ...job, street: value })} /></Field>
      <Field label="Número" required><Input value={job.number} onChange={(value) => setJob({ ...job, number: value })} /></Field>
      <Field label="Complemento"><Input value={job.complement} onChange={(value) => setJob({ ...job, complement: value })} /></Field>
      <Field label="Bairro" required><Input value={job.district} onChange={(value) => setJob({ ...job, district: value })} /></Field>
      <Field label="Município" required><Input value={job.city} onChange={(value) => setJob({ ...job, city: value })} /></Field>
      <Field label="UF" required><Input value="SP" locked /></Field>
    </div>}
    <div className="scope-note"><Info size={16} /><span>Para vagas online, o endereço é usado apenas para definir a área de cobertura e não aparece como local de comparecimento.</span></div>
  </FormSection>
}

function CriteriaStep({ criteria, setCriteria, job }) {
  const [languageDraft, setLanguageDraft] = useState('')
  const [languageLevelDraft, setLanguageLevelDraft] = useState('')
  const [languagePriorityDraft, setLanguagePriorityDraft] = useState('')
  const [editingLanguageIndex, setEditingLanguageIndex] = useState(null)
  const [skillDraft, setSkillDraft] = useState('')
  const [skillPriorityDraft, setSkillPriorityDraft] = useState('')
  const [digitalDraft, setDigitalDraft] = useState('')
  const [digitalLevelDraft, setDigitalLevelDraft] = useState('')
  const [availabilityDraft, setAvailabilityDraft] = useState('')
  const [availabilityPriorityDraft, setAvailabilityPriorityDraft] = useState('')
  const [certificateDraft, setCertificateDraft] = useState('')
  const [certificatePriorityDraft, setCertificatePriorityDraft] = useState('')
  const [complementaryCourseDraft, setComplementaryCourseDraft] = useState('')
  const [formationPriorityDraft, setFormationPriorityDraft] = useState('')
  const academicCourseRequired = educationRequiresCourse(criteria.educationLevel)

  function changeItemPriority(key, index, priority, field = 'name') {
    const items = criteria[key].map((item, itemIndex) => itemIndex !== index ? item : typeof item === 'string' ? { id: createEntryId(`vac-${key}`), [field]: item, priority } : { ...item, priority })
    setCriteria({ ...criteria, [key]: items })
  }

  function removeRequirement(key, priorityKey, index) {
    const nextItems = criteria[key].filter((_, itemIndex) => itemIndex !== index)
    const stillHasRequirement = nextItems.length || (key === 'formations' && criteria.educationLevel)
    setCriteria({ ...criteria, [key]: nextItems, ...(stillHasRequirement ? {} : { [priorityKey]: 'none' }) })
  }

  function addLanguage() {
    if (!languageDraft || !languageLevelDraft || !languagePriorityDraft || criteria.languages.some((item, index) => item.language === languageDraft && index !== editingLanguageIndex)) return
    const languages = editingLanguageIndex === null
      ? [...criteria.languages, { id: createEntryId('vac-language'), language: languageDraft, level: languageLevelDraft, priority: languagePriorityDraft }]
      : criteria.languages.map((item, index) => index === editingLanguageIndex ? { ...item, language: languageDraft, level: languageLevelDraft, priority: languagePriorityDraft } : item)
    setCriteria({ ...criteria, languages, languagePriority: 'desired' })
    setLanguageDraft('')
    setLanguageLevelDraft('')
    setLanguagePriorityDraft('')
    setEditingLanguageIndex(null)
  }

  function editLanguage(item, index) {
    setLanguageDraft(item.language)
    setLanguageLevelDraft(item.level)
    setLanguagePriorityDraft(requirementItemPriority(item, criteria.languagePriority))
    setEditingLanguageIndex(index)
  }

  function removeLanguage(index) {
    removeRequirement('languages', 'languagePriority', index)
    if (editingLanguageIndex === index) {
      setLanguageDraft('')
      setLanguageLevelDraft('')
      setLanguagePriorityDraft('')
      setEditingLanguageIndex(null)
    } else if (editingLanguageIndex !== null && index < editingLanguageIndex) {
      setEditingLanguageIndex(editingLanguageIndex - 1)
    }
  }

  function addSkill() {
    if (!skillDraft || !skillPriorityDraft || criteria.skills.some((item) => requirementItemName(item) === skillDraft)) return
    setCriteria({ ...criteria, skills: [...criteria.skills, { id: createEntryId('vac-skill'), name: skillDraft, priority: skillPriorityDraft }], skillsPriority: 'desired' })
    setSkillDraft('')
    setSkillPriorityDraft('')
  }

  function addDigital() {
    if (!digitalDraft || criteria.digital.some((item) => item.tool === digitalDraft)) return
    setCriteria({ ...criteria, digital: [...criteria.digital, { id: createEntryId('vac-digital'), tool: digitalDraft, level: digitalLevelDraft }] })
    setDigitalDraft('')
  }

  function addAvailability() {
    if (!availabilityDraft || !availabilityPriorityDraft || criteria.availability.some((item) => requirementItemName(item) === availabilityDraft)) return
    setCriteria({ ...criteria, availability: [...criteria.availability, { id: createEntryId('vac-availability'), name: availabilityDraft, priority: availabilityPriorityDraft }], availabilityPriority: 'desired' })
    setAvailabilityDraft('')
    setAvailabilityPriorityDraft('')
  }

  function removeAvailability(index) {
    const removed = requirementItemName(criteria.availability[index])
    const availability = criteria.availability.filter((_, itemIndex) => itemIndex !== index)
    setCriteria({ ...criteria, availability, vehicles: removed === 'Ter veículo próprio' ? [] : criteria.vehicles, availabilityPriority: availability.length ? criteria.availabilityPriority : 'none' })
  }

  function addCertificate() {
    if (!certificateDraft.trim() || !certificatePriorityDraft || criteria.certificates.some((item) => requirementItemName(item) === certificateDraft.trim())) return
    setCriteria({ ...criteria, certificates: [...criteria.certificates, { id: createEntryId('vac-certificate'), name: certificateDraft.trim(), priority: certificatePriorityDraft }], certificatesPriority: 'desired' })
    setCertificateDraft('')
    setCertificatePriorityDraft('')
  }

  function addComplementaryCourse(course) {
    const catalogId = complementaryCourseId(course)
    const alreadyAdded = criteria.courseAreas.some((item) => (catalogId && complementaryCourseId(item) === catalogId) || normalizeCourseName(requirementItemName(item)) === normalizeCourseName(course.name))
    if (alreadyAdded) return
    setCriteria({ ...criteria, courseAreas: [...criteria.courseAreas, { id: catalogId, catalogId, name: course.name, category: course.category, custom: Boolean(course.custom) }] })
    setComplementaryCourseDraft('')
  }

  return <>
    <section className="criteria-guide">
      <header><span><Sparkles size={21} /></span><div><span className="section-kicker">Compatibilidade vaga-candidato</span><h2>Como os critérios serão usados?</h2><p>Você informa apenas o que importa para a vaga. O sistema compara esses requisitos com o currículo de cada candidato.</p></div></header>
      <div className="criteria-guide-flow">
        <article><b>1</b><div><strong>Adicione o requisito</strong><small>Campos vazios ficam fora da comparação.</small></div></article>
        <ChevronRight size={17} />
        <article><b>2</b><div><strong>Defina a importância</strong><small>Escolha como ele influencia a nota.</small></div></article>
        <ChevronRight size={17} />
        <article><b>3</b><div><strong>Compare com o currículo</strong><small>A aderência compõe o score final.</small></div></article>
      </div>
      <div className="criteria-guide-levels">
        <div className="desired"><Sparkles size={17} /><span><strong>Desejável</strong><small>Valoriza candidatos que atendem ao requisito.</small></span></div>
        <div className="important"><ShieldCheck size={17} /><span><strong>Importante</strong><small>Tem impacto maior na nota quando não é atendido.</small></span></div>
        <p><Info size={15} />Somente a exclusividade da vaga pode impedir uma candidatura.</p>
      </div>
    </section>
    <FormSection icon={ShieldCheck} title="Regras de participação" description="Exclusividade é sempre eliminatória quando definida; os demais requisitos podem ser configurados." badge="Entrada na vaga">
      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><ShieldCheck size={18} /></span><div><strong>Exclusividade da vaga</strong><small>A seleção é obrigatória e participa dos requisitos importantes. Uma exclusividade específica também bloqueia quem não atende.</small></div><RequirementLevel fixed="required" /></div><Field label="Definição de exclusividade" required wide hint="Escolha Sem exclusividade quando a vaga estiver aberta a todos os públicos."><Select value={criteria.exclusivity} onChange={(value) => setCriteria({ ...criteria, exclusivity: value })}><option value="" disabled hidden>Selecione uma opção</option><option>Sem exclusividade</option><option>Pessoa com deficiência — PCD</option><option>Jovem aprendiz</option><option>60 anos ou mais</option></Select></Field></div>
      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><FileCheck2 size={18} /></span><div><strong>CNH</strong><small>Só participa da compatibilidade quando houver categorias selecionadas.</small></div><RequirementLevel value={criteria.cnhPriority} disabled={!criteria.cnh.length} onChange={(value) => setCriteria({ ...criteria, cnhPriority: value })} /></div><Field label="Categorias de habilitação" wide><CnhPicker value={criteria.cnh} onChange={(cnh) => setCriteria({ ...criteria, cnh, cnhPriority: cnh.length ? (criteria.cnhPriority === 'none' ? 'desired' : criteria.cnhPriority) : 'none' })} /></Field></div>
    </FormSection>
    <FormSection icon={ListChecks} title="Requisitos configuráveis" description="Depois de adicionar cada requisito, indique se ele é desejável ou importante para a vaga." badge="Personalize a comparação">
      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><GraduationCap size={18} /></span><div><strong>Formação acadêmica</strong><small>A escolaridade possui uma classificação geral; cada curso pode ter importância própria.</small></div><RequirementLevel value={criteria.formationPriority} disabled={!criteria.educationLevel || criteria.educationLevel === 'Sem escolaridade mínima'} onChange={(value) => setCriteria({ ...criteria, formationPriority: value })} /></div><Field label="Escolaridade mínima" wide><Select value={criteria.educationLevel || 'Sem escolaridade mínima'} onChange={(value) => { const hasRequirement = value !== 'Sem escolaridade mínima'; setCriteria({ ...criteria, educationLevel: value, formationPriority: hasRequirement ? (criteria.formationPriority === 'none' ? 'desired' : criteria.formationPriority) : 'none' }) }}>{educationLevels.map((item) => <option key={item}>{item}</option>)}</Select></Field>{academicCourseRequired && <><div className={`academic-course-field ${!criteria.formations.length ? 'required-missing' : ''}`}><span>Curso ou área de formação<b>*</b></span><div className="formation-priority-before"><strong>Antes de buscar, classifique este curso:</strong><ItemPriorityChoice value={formationPriorityDraft} onChange={setFormationPriorityDraft} /></div><CatalogPicker disabled={!formationPriorityDraft} type="cine" selected={criteria.formations} onAdd={(item) => { if (criteria.formations.length < 10 && !criteria.formations.some((entry) => entry.code === item.code)) { setCriteria({ ...criteria, formations: [...criteria.formations, { ...item, priority: formationPriorityDraft }], formationPriority: criteria.formationPriority === 'none' ? 'desired' : criteria.formationPriority }); setFormationPriorityDraft('') } }} label="Busque por código, área ou nome do curso" />{!criteria.formations.length && <small>Para ensino superior ou nível posterior, informe ao menos um curso ou área de formação.</small>}</div><RequirementList items={criteria.formations} icon={GraduationCap} renderTitle={(item) => item.selectedTitle || item.area} renderMeta={(item) => item.detailedTitle} onRemove={(index) => removeRequirement('formations', 'formationPriority', index)} priorityFallback={criteria.formationPriority} onPriorityChange={(index, priority) => changeItemPriority('formations', index, priority, 'area')} /></>}</div>

      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><Languages size={18} /></span><div><strong>Idiomas</strong><small>Cadastre cada idioma com nível e importância próprios.</small></div><em className="per-item-label">Classificação por item</em></div><div className={`requirement-add-panel ${editingLanguageIndex !== null ? 'editing' : ''}`}><div className="requirement-add-grid"><Select value={languageDraft} onChange={setLanguageDraft}><option value="">Selecione o idioma</option>{['Inglês','Espanhol','Libras','Francês','Alemão','Italiano','Mandarim','Japonês','Outro'].map((item) => <option key={item}>{item}</option>)}</Select><Select value={languageLevelDraft} onChange={setLanguageLevelDraft}><option value="">Selecione o nível</option>{['Básico','Intermediário','Avançado','Fluente / nativo'].map((item) => <option key={item}>{item}</option>)}</Select></div><div className="requirement-classify-row"><span><strong>Como este idioma participa da vaga?</strong><small>Escolha antes de adicionar.</small></span><ItemPriorityChoice value={languagePriorityDraft} onChange={setLanguagePriorityDraft} /><button type="button" onClick={addLanguage} disabled={!languageDraft || !languageLevelDraft || !languagePriorityDraft}>{editingLanguageIndex !== null ? <Save size={14} /> : <Plus size={14} />}{editingLanguageIndex !== null ? 'Salvar' : 'Adicionar'}</button></div></div><RequirementList items={criteria.languages} icon={Languages} renderTitle={(item) => item.language} renderMeta={(item) => `Nível mínimo: ${item.level}`} onEdit={editLanguage} onRemove={removeLanguage} priorityFallback={criteria.languagePriority} onPriorityChange={(index, priority) => changeItemPriority('languages', index, priority, 'language')} /></div>

      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><Star size={18} /></span><div><strong>Habilidades</strong><small>Classifique separadamente cada habilidade esperada.</small></div><em className="per-item-label">Classificação por item</em></div><div className="requirement-add-panel"><Select value={skillDraft} onChange={setSkillDraft}><option value="">Selecione uma habilidade</option>{behavioralSkillOptions.filter((item) => !criteria.skills.some((entry) => requirementItemName(entry) === item)).map((item) => <option key={item}>{item}</option>)}</Select><div className="requirement-classify-row"><span><strong>Qual a importância desta habilidade?</strong><small>Ela pode ter peso diferente das demais.</small></span><ItemPriorityChoice value={skillPriorityDraft} onChange={setSkillPriorityDraft} /><button type="button" onClick={addSkill} disabled={!skillDraft || !skillPriorityDraft}><Plus size={14} /> Adicionar</button></div></div><RequirementList items={criteria.skills} icon={Star} renderTitle={(item) => requirementItemName(item)} onRemove={(index) => removeRequirement('skills', 'skillsPriority', index)} priorityFallback={criteria.skillsPriority} onPriorityChange={(index, priority) => changeItemPriority('skills', index, priority)} /></div>

      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><Clock3 size={18} /></span><div><strong>Disponibilidades</strong><small>Defina a importância de cada condição adicional.</small></div><em className="per-item-label">Classificação por item</em></div><div className="requirement-add-panel"><Select value={availabilityDraft} onChange={setAvailabilityDraft}><option value="">Selecione uma disponibilidade</option>{['Dormir no local de trabalho','Ausentar-se por longos períodos','Ter veículo próprio','Viajar a trabalho','Trabalhar aos fins de semana'].filter((item) => !criteria.availability.some((entry) => requirementItemName(entry) === item)).map((item) => <option key={item}>{item}</option>)}</Select><div className="requirement-classify-row"><span><strong>Como esta disponibilidade influencia a compatibilidade?</strong><small>Somente a exclusividade bloqueia a candidatura.</small></span><ItemPriorityChoice value={availabilityPriorityDraft} onChange={setAvailabilityPriorityDraft} /><button type="button" onClick={addAvailability} disabled={!availabilityDraft || !availabilityPriorityDraft}><Plus size={14} /> Adicionar</button></div></div><RequirementList items={criteria.availability} icon={Clock3} renderTitle={(item) => requirementItemName(item)} renderMeta={(item) => requirementItemName(item) === 'Ter veículo próprio' && criteria.vehicles.length ? `Veículos aceitos: ${criteria.vehicles.join(', ')}` : ''} onRemove={removeAvailability} priorityFallback={criteria.availabilityPriority} onPriorityChange={(index, priority) => changeItemPriority('availability', index, priority)} />{criteria.availability.some((item) => requirementItemName(item) === 'Ter veículo próprio') && <div className="vehicle-requirement-detail"><div><strong>Quais veículos atendem ao requisito?</strong><small>Selecione uma ou mais opções. Se necessário, digite outro tipo de veículo.</small></div><VehiclePicker value={criteria.vehicles} onChange={(vehicles) => setCriteria({ ...criteria, vehicles })} /></div>}</div>

      <div className="criterion-block requirement-block"><div className="criterion-heading"><span><FileCheck2 size={18} /></span><div><strong>Certificados</strong><small>Pesquise certificações conhecidas ou informe uma opção personalizada.</small></div><em className="per-item-label">Classificação por item</em></div><div className="requirement-add-panel"><CertificatePicker value={certificateDraft} onChange={setCertificateDraft} /><div className="requirement-classify-row"><span><strong>Qual a importância desta certificação?</strong><small>Cada certificado pode ter uma classificação diferente.</small></span><ItemPriorityChoice value={certificatePriorityDraft} onChange={setCertificatePriorityDraft} /><button type="button" onClick={addCertificate} disabled={!certificateDraft.trim() || !certificatePriorityDraft}><Plus size={14} /> Adicionar</button></div></div><RequirementList items={criteria.certificates} icon={FileCheck2} renderTitle={(item) => requirementItemName(item)} onRemove={(index) => removeRequirement('certificates', 'certificatesPriority', index)} priorityFallback={criteria.certificatesPriority} onPriorityChange={(index, priority) => changeItemPriority('certificates', index, priority)} /></div>
    </FormSection>

    <FormSection icon={Sparkles} title="Diferenciais da vaga" description="Quando preenchidos, ajudam a ordenar os candidatos, mas nunca bloqueiam a candidatura." badge="Opcionais">
      <div className="criterion-block requirement-block">
        <div className="criterion-heading"><span><BriefcaseBusiness size={18} /></span><div><strong>Experiência profissional</strong><small>Defina apenas o tempo de experiência que gostaria de encontrar.</small></div><em>Desejável</em></div>
        <Field label="Tempo de experiência desejado"><Select value={criteria.experience} onChange={(value) => setCriteria({ ...criteria, experience: value })}><option value="">Não informado</option>{['Até 6 meses de experiência','1 ano ou mais','3 anos ou mais','5 anos ou mais'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
      </div>
      <div className="criterion-columns learning-criteria">
        <div className="criterion-block requirement-block"><div className="criterion-heading"><span><BookOpen size={18} /></span><div><strong>Cursos complementares</strong><small>Busque pelo catálogo ou adicione um curso personalizado. Sempre desejável quando preenchido.</small></div>{criteria.courseAreas.length > 0 && <RequirementLevel fixed="desired" />}</div><ComplementaryCoursePicker value={complementaryCourseDraft} onChange={setComplementaryCourseDraft} onChoose={addComplementaryCourse} selected={criteria.courseAreas} placeholder="Digite o curso que deseja encontrar" /><RequirementList items={criteria.courseAreas} icon={BookOpen} renderTitle={(item) => requirementItemName(item)} renderMeta={(item) => typeof item === 'string' ? 'Item anterior sem identificador' : `${complementaryCourseId(item)} · ${item.category || 'Curso personalizado'}`} onRemove={(index) => setCriteria({ ...criteria, courseAreas: criteria.courseAreas.filter((_, itemIndex) => itemIndex !== index) })} /></div>
        <div className="criterion-block requirement-block"><div className="criterion-heading"><span><Laptop size={18} /></span><div><strong>Competências digitais</strong><small>Sempre desejável quando preenchido.</small></div>{criteria.digital.length > 0 && <RequirementLevel fixed="desired" />}</div><div className="requirement-add-grid"><Select value={digitalDraft} onChange={setDigitalDraft}><option value="">Selecione uma ferramenta</option>{digitalToolOptions.filter((item) => !criteria.digital.some((entry) => entry.tool === item)).map((item) => <option key={item}>{item}</option>)}</Select><Select value={digitalLevelDraft} onChange={setDigitalLevelDraft}><option value="">Selecione o nível</option>{['Básico','Intermediário','Avançado'].map((item) => <option key={item}>{item}</option>)}</Select><button type="button" onClick={addDigital} disabled={!digitalDraft || !digitalLevelDraft}><Plus size={14} /> Adicionar</button></div><RequirementList items={criteria.digital} icon={Laptop} renderTitle={(item) => item.tool} renderMeta={(item) => item.level} onRemove={(index) => setCriteria({ ...criteria, digital: criteria.digital.filter((_, itemIndex) => itemIndex !== index) })} /></div>
      </div>
    </FormSection>
  </>
}

function VacancyFlowHub({ onSelect }) {
  return <section className="vacancy-flow-hub">
    <header><span className="section-kicker">Novo cadastro</span><h1>Como deseja conduzir esta seleção?</h1><p>Escolha o formato inicial. As informações da vaga e os critérios são os mesmos nos dois caminhos.</p></header>
    <div className="flow-choice-grid">
      <button type="button" onClick={() => onSelect('direct')}>
        <span className="flow-choice-icon direct"><Users size={24} /></span>
        <div><em>Sem agenda no Trampolim</em><h2>Contato direto</h2><p>Analise os candidatos e entre em contato pelos canais informados no currículo.</p><ul><li><Check size={14} />Cadastro padrão da vaga</li><li><Check size={14} />Contato realizado fora do sistema</li></ul></div>
        <span className="flow-choice-action">Criar com contato direto <ArrowRight size={16} /></span>
      </button>
      <button type="button" onClick={() => onSelect('scheduled')}>
        <span className="flow-choice-icon scheduled"><CalendarDays size={24} /></span>
        <div><em>Com agenda no Trampolim</em><h2>Processo com entrevistas</h2><p>Configure datas, horários e quantas pessoas podem participar de cada entrevista.</p><ul><li><Check size={14} />1 pessoa por horário: entrevista individual</li><li><Check size={14} />2 ou mais: entrevista em grupo</li></ul></div>
        <span className="flow-choice-action">Criar com agenda <ArrowRight size={16} /></span>
      </button>
    </div>
    <div className="flow-hub-note"><Info size={17} /><span>Não é necessário escolher entre entrevista individual e em grupo agora. Essa definição será feita pela capacidade de cada horário na etapa de agenda.</span></div>
  </section>
}

const calendarWeekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const calendarMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

function CalendarMonth({ monthDate, min, max, rangeStart, rangeEnd, selectedDates = [], onSelect, multiple = false }) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const leadingDays = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(leadingDays).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  return <div className="calendar-month">
    <h3>{calendarMonthFormatter.format(monthDate)}</h3>
    <div className="calendar-weekdays">{calendarWeekdays.map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-days">{cells.map((day, index) => {
      if (!day) return <span className="calendar-empty" key={`empty-${index}`} />
      const iso = localIsoDate(new Date(year, month, day))
      const disabled = iso < min || iso > max
      const selected = multiple ? selectedDates.includes(iso) : iso === rangeStart || iso === rangeEnd
      const inRange = !multiple && rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd
      return <button type="button" key={iso} disabled={disabled} className={`${selected ? 'selected' : ''} ${inRange ? 'in-range' : ''} ${iso === rangeStart ? 'range-start' : ''} ${iso === rangeEnd ? 'range-end' : ''}`} onClick={() => onSelect(iso)}>{day}</button>
    })}</div>
  </div>
}

function DateRangePicker({ startDate, endDate, min, max, onChange, displayPart = 'range' }) {
  const [open, setOpen] = useState(false)
  const [draftStart, setDraftStart] = useState(startDate)
  const [draftEnd, setDraftEnd] = useState(endDate)
  const [visibleMonth, setVisibleMonth] = useState(() => dateFromIso(startDate || min))
  function openPicker() {
    setDraftStart(startDate)
    setDraftEnd(endDate)
    setVisibleMonth(dateFromIso(startDate || min))
    setOpen(true)
  }
  function selectDate(iso) {
    if (!draftStart || draftEnd) {
      setDraftStart(iso)
      setDraftEnd('')
    } else if (iso < draftStart) {
      setDraftStart(iso)
      setDraftEnd(draftStart)
    } else {
      setDraftEnd(iso)
    }
  }
  const secondMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
  return <>
    <button type="button" className={`date-range-trigger ${displayPart !== 'range' ? 'single-date' : ''} ${startDate && endDate ? 'filled' : ''}`} onClick={openPicker}>
      <CalendarDays size={19} />
      <span>{displayPart === 'start' ? (startDate ? <strong>{dateFromIso(startDate).toLocaleDateString('pt-BR')}</strong> : <em>Selecione a data</em>) : displayPart === 'end' ? (endDate ? <strong>{dateFromIso(endDate).toLocaleDateString('pt-BR')}</strong> : <em>Selecione a data</em>) : startDate && endDate ? <><strong>{formatShortDate(startDate)}</strong><small>até</small><strong>{formatShortDate(endDate)}</strong></> : <em>Selecione a data de início e de término</em>}</span>
      <ChevronDown size={17} />
    </button>
    {open && <div className="calendar-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="date-range-dialog" role="dialog" aria-modal="true" aria-label="Selecionar período das entrevistas">
        <header><div><span className="section-kicker">Período da agenda</span><h2>Selecione as datas das entrevistas</h2><p>Escolha primeiro a data inicial e depois a data final.</p></div><button type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={20} /></button></header>
        <div className="calendar-navigation"><button type="button" aria-label="Mês anterior" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><ArrowLeft size={18} /></button><span>{draftStart && (draftEnd ? `${formatShortDate(draftStart)} até ${formatShortDate(draftEnd)}` : `${formatShortDate(draftStart)} — selecione o término`)}</span><button type="button" aria-label="Próximo mês" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><ArrowRight size={18} /></button></div>
        <div className="calendar-months"><CalendarMonth monthDate={visibleMonth} min={min} max={max} rangeStart={draftStart} rangeEnd={draftEnd} onSelect={selectDate} /><CalendarMonth monthDate={secondMonth} min={min} max={max} rangeStart={draftStart} rangeEnd={draftEnd} onSelect={selectDate} /></div>
        <footer><p><Info size={15} />O período pode ter até 30 dias corridos.</p><div><button type="button" className="secondary-button" onClick={() => setOpen(false)}>Cancelar</button><button type="button" className="primary-button" disabled={!draftStart || !draftEnd} onClick={() => { onChange({ startDate: draftStart, endDate: draftEnd }); setOpen(false) }}>Aplicar período</button></div></footer>
      </section>
    </div>}
  </>
}

function ScheduleStep({ schedule, setSchedule }) {
  const groupInterview = Number(schedule.capacity || 1) > 1
  const [slotModalOpen, setSlotModalOpen] = useState(false)
  const [selectedSlotDates, setSelectedSlotDates] = useState([])
  const [slotDrafts, setSlotDrafts] = useState([])
  const [editingSlotDates, setEditingSlotDates] = useState([])
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState(null)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressDraft, setAddressDraft] = useState({ name: 'Local de entrevistas', cep: '', street: '', number: '', complement: '', district: '', city: '', state: 'SP' })
  const today = new Date()
  const maxScheduleDate = new Date(today)
  maxScheduleDate.setDate(maxScheduleDate.getDate() + 30)
  const todayIso = localIsoDate(today)
  const maxDateIso = localIsoDate(maxScheduleDate)
  const selectableDates = datesBetween(schedule.startDate, schedule.endDate)
  const slotCalendarMonths = [...new Set(selectableDates.map((date) => date.slice(0, 7)))].map((month) => dateFromIso(`${month}-01`))
  const durationMinutes = minutesFromDuration(schedule.duration, schedule.customDuration)
  const intervalMinutes = minutesFromDuration(schedule.interval, schedule.customInterval)
  const generatedSlots = selectedSlotDates.flatMap((date) => {
    return slotDrafts.map((slot) => ({ date, start: slot.start, end: slot.end }))
  })
  const slotDraftsValid = slotDrafts.length > 0 && slotDrafts.every((slot) => slot.start && slot.end && minutesFromTime(slot.end) > minutesFromTime(slot.start))
  const addressCanSave = addressDraft.name.trim() && addressDraft.cep && addressDraft.street.trim() && addressDraft.number.trim() && addressDraft.district.trim() && addressDraft.city.trim()
  const slotsByDate = [...new Set(schedule.slots.map((slot) => slot.date))].sort().map((date) => ({
    date,
    times: schedule.slots.filter((slot) => slot.date === date).sort((a, b) => a.start.localeCompare(b.start)).map((slot) => ({ start: slot.start, end: slot.end })),
  }))
  const scheduleGroups = slotsByDate.reduce((groups, entry) => {
    const signature = entry.times.map((slot) => `${slot.start}-${slot.end}`).join('|')
    const previous = groups.at(-1)
    const previousDay = previous ? dateFromIso(previous.dates.at(-1)) : null
    const currentDay = dateFromIso(entry.date)
    if (previous && previous.signature === signature && previousDay && currentDay && (currentDay - previousDay) === 86400000) previous.dates.push(entry.date)
    else groups.push({ signature, dates: [entry.date], times: entry.times })
    return groups
  }, [])

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, area, first, last) => [area && '(' + area + ')', first, last && '-' + last].filter(Boolean).join(' '))
    return digits.replace(/^(\d{2})(\d)(\d{4})(\d{4}).*/, '($1) $2 $3-$4')
  }

  function useCompanyResponsible(useCompanyContact) {
    setSchedule({ ...schedule, useCompanyContact, ...(useCompanyContact ? { responsibleName: 'Rafaela Souza', responsibleEmail: 'rafaela@empresa.com.br', responsiblePhone: '(11) 9 9999-0000' } : {}) })
  }

  function editResponsible(key, value) {
    setSchedule({ ...schedule, [key]: key.toLowerCase().includes('phone') ? formatPhone(value) : value, useCompanyContact: false })
  }

  function applySchedulePeriod({ startDate, endDate }) {
    setSchedule({ ...schedule, startDate, endDate, slots: schedule.slots.filter((slot) => slot.date >= startDate && slot.date <= endDate) })
  }

  function toggleSlotDate(date) {
    if (editingSlotDates.length) {
      const existingDate = slotsByDate.find((entry) => entry.date === date)
      setSelectedSlotDates([date])
      setSlotDrafts(existingDate?.times.length ? existingDate.times.map((slot) => ({ ...slot, id: createEntryId('slot-draft') })) : [createSlotDraft()])
      return
    }
    setSelectedSlotDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort())
  }

  function createSlotDraft(startMinutes = 9 * 60) {
    return { id: createEntryId('slot-draft'), start: timeFromMinutes(startMinutes), end: timeFromMinutes(startMinutes + durationMinutes) }
  }

  function openSlotGenerator() {
    if (!selectableDates.length) return
    setEditingSlotDates([])
    setSelectedSlotDates([])
    setSlotDrafts([createSlotDraft()])
    setSlotModalOpen(true)
  }

  function openSlotGroupEditor(group) {
    setEditingSlotDates(group.dates)
    setSelectedSlotDates(group.dates)
    setSlotDrafts(group.times.map((slot) => ({ ...slot, id: createEntryId('slot-draft') })))
    setSlotModalOpen(true)
  }

  function openFullAgendaEditor() {
    const dates = slotsByDate.map((entry) => entry.date)
    const firstDate = slotsByDate[0]
    setEditingSlotDates(dates)
    setSelectedSlotDates(firstDate ? [firstDate.date] : [])
    setSlotDrafts(firstDate ? firstDate.times.map((slot) => ({ ...slot, id: createEntryId('slot-draft') })) : [])
    setSlotModalOpen(true)
  }

  function addSlotDraft() {
    const lastSlot = slotDrafts.at(-1)
    const nextStart = lastSlot ? minutesFromTime(lastSlot.end) + intervalMinutes : 9 * 60
    setSlotDrafts([...slotDrafts, createSlotDraft(nextStart)])
  }

  function updateSlotDraft(index, key, value) {
    setSlotDrafts(slotDrafts.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } : slot))
  }

  function saveGeneratedSlots() {
    const retainedSlots = editingSlotDates.length ? schedule.slots.filter((slot) => !selectedSlotDates.includes(slot.date)) : schedule.slots
    const existing = new Set(retainedSlots.map((slot) => `${slot.date}-${slot.start}-${slot.end}`))
    const additions = generatedSlots
      .filter((slot) => !existing.has(`${slot.date}-${slot.start}-${slot.end}`))
      .map((slot) => ({ ...slot, id: createEntryId('slot') }))
    setSchedule({ ...schedule, slots: [...retainedSlots, ...additions] })
    setSlotModalOpen(false)
  }

  function formatScheduleGroupDates(dates) {
    if (dates.length === 1) return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(dateFromIso(dates[0]))
    const first = dateFromIso(dates[0])
    const last = dateFromIso(dates.at(-1))
    if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
      const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(first).replace('.', '')
      return `${String(first.getDate()).padStart(2, '0')} – ${String(last.getDate()).padStart(2, '0')} de ${month}, ${first.getFullYear()}`
    }
    return `${formatShortDate(dates[0])} – ${formatShortDate(dates.at(-1))}`
  }

  function locationText(location) {
    const address = [location.street, location.number, location.complement, location.district, location.city, location.state, location.cep].filter(Boolean).join(' · ')
    return `${location.name} · ${address}`
  }

  function selectLocation(location) {
    setSchedule({ ...schedule, locationId: location.id, location: locationText(location) })
  }

  function openAddressEditor(location = null) {
    setEditingAddressId(location?.id || null)
    setAddressDraft(location ? { ...location } : { name: 'Local de entrevistas', cep: '', street: '', number: '', complement: '', district: '', city: '', state: 'SP' })
    setAddressModalOpen(true)
  }

  function updateAddressDraft(key, value) {
    const formattedValue = key === 'cep' ? value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2') : value
    setAddressDraft({ ...addressDraft, [key]: formattedValue })
  }

  function saveAddress() {
    if (!addressDraft.name.trim() || !addressDraft.cep || !addressDraft.street.trim() || !addressDraft.number.trim() || !addressDraft.district.trim() || !addressDraft.city.trim()) return
    const savedAddress = { ...addressDraft, id: editingAddressId || createEntryId('interview-location'), locked: false }
    const locations = editingAddressId
      ? schedule.locations.map((location) => location.id === editingAddressId ? savedAddress : location)
      : [...schedule.locations, savedAddress]
    setSchedule({ ...schedule, locations, locationId: savedAddress.id, location: locationText(savedAddress) })
    setAddressModalOpen(false)
  }

  function removeAddress(locationId) {
    const locations = schedule.locations.filter((location) => location.id !== locationId)
    const nextLocation = schedule.locationId === locationId ? locations[0] : locations.find((location) => location.id === schedule.locationId)
    setSchedule({ ...schedule, locations, locationId: nextLocation?.id || '', location: nextLocation ? locationText(nextLocation) : '' })
    setAddressToDelete(null)
  }

  return <>
    <section className="schedule-guidance">
      <span><Info size={18} /></span><div><strong>Como esta etapa funciona</strong><p>Defina responsável, formato e horários. A quantidade de pessoas por horário determina se a entrevista será individual ou em grupo.</p></div>
      <em className={groupInterview ? 'group' : ''}>{groupInterview ? 'Em grupo · até ' + schedule.capacity + ' pessoas' : 'Individual · 1 pessoa'}</em>
    </section>

    <FormSection icon={UserRound} title="Responsável pelas entrevistas" description="Pessoa que receberá os agendamentos e os dados dos candidatos.">
      <Switch checked={schedule.useCompanyContact} onChange={useCompanyResponsible} label="Utilizar os dados da pessoa responsável cadastrada na empresa" description="Ao editar qualquer campo abaixo, esta opção será desligada automaticamente." />
      <div className="form-grid schedule-fields"><Field label="Nome completo" required><Input value={schedule.responsibleName} onChange={(value) => editResponsible('responsibleName', value)} placeholder="Nome e sobrenome" /></Field><Field label="E-mail" required><Input type="email" value={schedule.responsibleEmail} onChange={(value) => editResponsible('responsibleEmail', value)} placeholder="nome@empresa.com.br" /></Field><Field label="Telefone principal" required><Input value={schedule.responsiblePhone} onChange={(value) => editResponsible('responsiblePhone', value)} placeholder="(11) 9 9999-9999" /></Field><Field label="Telefone secundário"><Input value={schedule.secondaryPhone} onChange={(value) => editResponsible('secondaryPhone', value)} placeholder="Opcional" /></Field></div>
    </FormSection>

    <FormSection icon={MapPin} title="Formato e local da entrevista" description="Defina onde a conversa será realizada.">
      <div className="form-grid schedule-fields">
        <Field label="Formato da entrevista" required><Select value={schedule.format} onChange={(format) => setSchedule({ ...schedule, format, meetingLink: format === 'Online' ? schedule.meetingLink : '' })}><option value="">Selecione o formato</option><option>Presencial</option><option>Online</option></Select></Field>
        {schedule.format === 'Presencial' && <div className="interview-location-picker"><div className="location-picker-heading"><div><strong>Selecione o local das entrevistas</strong><small>Escolha um endereço cadastrado ou adicione um novo local.</small></div><button type="button" onClick={() => openAddressEditor()}><Plus size={15} /> Adicionar endereço</button></div><div className="interview-location-list">{(schedule.locations || []).map((location) => <article key={location.id} className={schedule.locationId === location.id ? 'selected' : ''} onClick={() => selectLocation(location)}><button type="button" className="location-radio" aria-label={`Selecionar ${location.name}`}><span /></button><div><strong>{location.name}</strong><small>{[location.street, location.number, location.complement, location.district, location.city, location.state, location.cep].filter(Boolean).join(' · ')}</small></div>{!location.locked && <div className="location-actions"><button type="button" aria-label="Editar local" onClick={(event) => { event.stopPropagation(); openAddressEditor(location) }}><Pencil size={15} /></button><button type="button" aria-label="Excluir local" onClick={(event) => { event.stopPropagation(); setAddressToDelete(location) }}><Trash2 size={15} /></button></div>}</article>)}</div></div>}
        {schedule.format === 'Online' && <Field label="Link da sala virtual" required hint="O candidato receberá este link ao confirmar o agendamento."><Input type="url" value={schedule.meetingLink} onChange={(meetingLink) => setSchedule({ ...schedule, meetingLink })} placeholder="https://meet.google.com/..." /></Field>}
      </div>
    </FormSection>

    <FormSection icon={CalendarDays} title="Disponibilidade da agenda" description="Informe o período, a duração e os horários que poderão ser escolhidos." badge="Pode configurar depois">
      <div className="schedule-basic-info">
        <div className="schedule-basic-heading"><h3>Informações básicas</h3><p>Escolha as datas que os candidatos poderão escolher, a duração de cada entrevista e o intervalo entre elas.</p></div>
        <div className="schedule-basic-grid">
          <div className="field"><span className="field-label">Data de início</span><DateRangePicker displayPart="start" startDate={schedule.startDate} endDate={schedule.endDate} min={todayIso} max={maxDateIso} onChange={applySchedulePeriod} /></div>
          <div className="field"><span className="field-label">Data de término</span><DateRangePicker displayPart="end" startDate={schedule.startDate} endDate={schedule.endDate} min={todayIso} max={maxDateIso} onChange={applySchedulePeriod} /></div>
          <Field label="Duração de cada entrevista"><Select value={schedule.duration} onChange={(duration) => setSchedule({ ...schedule, duration })}>{['15 minutos','30 minutos','45 minutos','1 hora','1 hora e 15 minutos','1 hora e 30 minutos','1 hora e 45 minutos','2 horas','Personalizado'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="Intervalo entre entrevistas"><Select value={schedule.interval} onChange={(interval) => setSchedule({ ...schedule, interval })}>{['Sem intervalo','15 minutos','30 minutos','45 minutos','1 hora','1 hora e 15 minutos','1 hora e 30 minutos','1 hora e 45 minutos','2 horas','Personalizado'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
        </div>
        {(schedule.duration === 'Personalizado' || schedule.interval === 'Personalizado') && <div className="form-grid schedule-custom-times">{schedule.duration === 'Personalizado' && <Field label="Duração personalizada" hint="Informe no formato HH:MM."><Input type="time" value={schedule.customDuration} onChange={(customDuration) => setSchedule({ ...schedule, customDuration })} /></Field>}{schedule.interval === 'Personalizado' && <Field label="Intervalo personalizado" hint="Informe no formato HH:MM."><Input type="time" value={schedule.customInterval} onChange={(customInterval) => setSchedule({ ...schedule, customInterval })} /></Field>}</div>}
      </div>
      <div className="schedule-slots"><div className="schedule-slots-heading"><div><h3>Horários de agenda</h3><p>Configure os horários que estarão disponíveis para as entrevistas.</p></div></div><button type="button" className="add-schedule-slot standalone" onClick={openSlotGenerator} disabled={!selectableDates.length}><Plus size={15} /> Adicionar novo horário</button>{!selectableDates.length && <div className="schedule-empty-note"><CalendarDays size={17} />Defina o período das entrevistas para adicionar horários.</div>}{scheduleGroups.length > 0 && <div className="schedule-overview grouped"><div className="schedule-overview-header"><h4>Agenda de horários</h4><button type="button" aria-label="Editar agenda de horários" onClick={openFullAgendaEditor}><Pencil size={17} /></button></div><div className="schedule-overview-columns">{scheduleGroups.map((group) => <article key={group.dates.join('-')}><strong>{formatScheduleGroupDates(group.dates)}</strong><div>{group.times.map((slot) => <span key={`${slot.start}-${slot.end}`}><Clock3 size={13} />{slot.start} – {slot.end}</span>)}</div></article>)}</div></div>}</div>
    </FormSection>

    <FormSection icon={Users} title="Capacidade e regras" description="A capacidade define se cada horário será individual ou em grupo.">
      <div className="capacity-card"><div><span className={groupInterview ? 'group' : ''}><Users size={20} /></span><div><strong>Quantas pessoas podem participar por horário?</strong><small>Use 1 para entrevista individual ou um número maior para entrevista em grupo.</small></div></div><div className="capacity-input"><Input type="number" value={schedule.capacity} onChange={(capacity) => setSchedule({ ...schedule, capacity: capacity || '1' })} /><em>{groupInterview ? 'Em grupo' : 'Individual'}</em></div></div>
      <div className="schedule-rules"><div className="schedule-rule-card"><Switch checked={schedule.dailyLimitEnabled} onChange={(dailyLimitEnabled) => setSchedule({ ...schedule, dailyLimitEnabled })} label="Limitar entrevistas por dia" description="Ao atingir o limite, o dia deixa de aceitar novos agendamentos." />{schedule.dailyLimitEnabled && <Field label="Quantidade máxima por dia" required><Input type="number" min="1" value={schedule.dailyLimit} onChange={(dailyLimit) => setSchedule({ ...schedule, dailyLimit })} placeholder="Ex.: 5" /></Field>}</div><div className="schedule-rule-card"><Switch checked={schedule.noticeEnabled} onChange={(noticeEnabled) => setSchedule({ ...schedule, noticeEnabled })} label="Exigir antecedência mínima" description="Mostra apenas horários que respeitem o prazo configurado." />{schedule.noticeEnabled && <Field label="Prazo mínimo" required><Select value={schedule.minimumNotice} onChange={(minimumNotice) => setSchedule({ ...schedule, minimumNotice })}>{['2 horas','6 horas','12 horas','24 horas','48 horas'].map((item) => <option key={item}>{item}</option>)}</Select></Field>}</div></div>
    </FormSection>

    {slotModalOpen && <div className="calendar-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSlotModalOpen(false)}>
      <section className="slot-generator-dialog" role="dialog" aria-modal="true" aria-label="Gerar horários de entrevista">
        <header><div><h2>{editingSlotDates.length ? 'Edite os horários de uma data' : 'Selecione os dias e os horários livres para entrevistas'}</h2></div><button type="button" aria-label="Fechar" onClick={() => setSlotModalOpen(false)}><X size={20} /></button></header>
        <div className={`slot-calendar-months ${slotCalendarMonths.length === 1 ? 'single' : ''}`}>{slotCalendarMonths.map((month) => <CalendarMonth key={localIsoDate(month)} monthDate={month} min={schedule.startDate} max={schedule.endDate} selectedDates={selectedSlotDates} onSelect={toggleSlotDate} multiple />)}</div>
        {editingSlotDates.length ? <div className="edit-date-guidance"><CalendarDays size={16} /><span><strong>Selecione uma data no calendário</strong><small>Os horários já salvos naquele dia serão carregados abaixo. As outras datas não serão alteradas.</small></span></div> : <label className="select-all-dates"><input type="checkbox" checked={selectedSlotDates.length === selectableDates.length && selectableDates.length > 0} onChange={(event) => setSelectedSlotDates(event.target.checked ? selectableDates : [])} /><span><strong>Selecionar todas as datas do período</strong></span></label>}
        <div className="slot-time-editor">
          <div className="slot-time-editor-heading"><div><strong>Quais horários estão livres?</strong></div><button type="button" aria-label="Adicionar outro horário" onClick={addSlotDraft}><Plus size={19} /> Adicionar horário</button></div>
          <div className="slot-draft-labels"><span>Início</span><span>Fim</span></div>
          {!slotDrafts.length && <div className="slot-draft-empty">Selecione uma data para visualizar os horários cadastrados.</div>}
          {slotDrafts.map((slot, index) => <div className="slot-draft-row" key={slot.id}><input type="time" value={slot.start} onChange={(event) => updateSlotDraft(index, 'start', event.target.value)} /><input type="time" value={slot.end} onChange={(event) => updateSlotDraft(index, 'end', event.target.value)} /><button type="button" aria-label="Excluir horário" disabled={slotDrafts.length === 1} onClick={() => setSlotDrafts(slotDrafts.filter((_, slotIndex) => slotIndex !== index))}><Trash2 size={16} /></button>{minutesFromTime(slot.end) <= minutesFromTime(slot.start) && <small>O término deve ser posterior ao início.</small>}</div>)}
        </div>
        <footer><button type="button" className="secondary-button" onClick={() => setSlotModalOpen(false)}>Cancelar</button><button type="button" className="primary-button" disabled={!selectedSlotDates.length || !slotDraftsValid} onClick={saveGeneratedSlots}>Salvar configuração de horários</button></footer>
      </section>
    </div>}

    {addressModalOpen && <div className="calendar-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAddressModalOpen(false)}>
      <section className="address-editor-dialog" role="dialog" aria-modal="true" aria-label={editingAddressId ? 'Editar endereço' : 'Adicionar novo endereço'}>
        <header><div><span className="section-kicker">Entrevista presencial</span><h2>{editingAddressId ? 'Editar local de entrevistas' : 'Adicionar novo endereço'}</h2><p>Este endereço ficará disponível para seleção nesta vaga.</p></div><button type="button" aria-label="Fechar" onClick={() => setAddressModalOpen(false)}><X size={20} /></button></header>
        <div className="address-editor-grid">
          <Field label="Nome do local" required wide><Input value={addressDraft.name} onChange={(value) => updateAddressDraft('name', value)} placeholder="Ex.: Escritório Paulista" /></Field>
          <Field label="CEP" required><Input value={addressDraft.cep} onChange={(value) => updateAddressDraft('cep', value)} placeholder="00000-000" /></Field>
          <Field label="Endereço" required><Input value={addressDraft.street} onChange={(value) => updateAddressDraft('street', value)} placeholder="Rua ou avenida" /></Field>
          <Field label="Número" required><Input value={addressDraft.number} onChange={(value) => updateAddressDraft('number', value)} placeholder="Nº" /></Field>
          <Field label="Complemento"><Input value={addressDraft.complement} onChange={(value) => updateAddressDraft('complement', value)} placeholder="Sala, bloco..." /></Field>
          <Field label="Bairro" required><Input value={addressDraft.district} onChange={(value) => updateAddressDraft('district', value)} placeholder="Bairro" /></Field>
          <Field label="Município" required><Input value={addressDraft.city} onChange={(value) => updateAddressDraft('city', value)} placeholder="Cidade" /></Field>
          <Field label="UF" required><div className="locked-state-field"><span>{addressDraft.state}</span><Lock size={15} /></div></Field>
        </div>
        <footer><button type="button" className="secondary-button" onClick={() => setAddressModalOpen(false)}>Cancelar</button><button type="button" className="primary-button" disabled={!addressCanSave} onClick={saveAddress}>{editingAddressId ? 'Salvar alterações' : 'Adicionar endereço'}</button></footer>
      </section>
    </div>}

    {addressToDelete && <div className="calendar-modal-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAddressToDelete(null)}>
      <section className="delete-address-dialog" role="alertdialog" aria-modal="true" aria-label="Confirmar exclusão do endereço">
        <header><div><span className="delete-dialog-icon"><Trash2 size={19} /></span><div><h2>Deseja excluir este endereço?</h2><p>Essa ação removerá o local da configuração desta vaga.</p></div></div><button type="button" aria-label="Fechar" onClick={() => setAddressToDelete(null)}><X size={20} /></button></header>
        <div className="delete-address-body"><strong>{addressToDelete.name}</strong><span>{[addressToDelete.street, addressToDelete.number, addressToDelete.district, addressToDelete.city, addressToDelete.state, addressToDelete.cep].filter(Boolean).join(' · ')}</span><p>Deseja continuar e excluir este endereço?</p></div>
        <footer><button type="button" className="secondary-button" onClick={() => setAddressToDelete(null)}>Cancelar</button><button type="button" className="danger-button" onClick={() => removeAddress(addressToDelete.id)}>Excluir endereço</button></footer>
      </section>
    </div>}
  </>
}

function ReviewStep({ job, criteria, schedule, processType, goTo, publishedView = false }) {
  const salary = job.salaryType === 'À combinar' ? 'À combinar' : job.salaryType === 'Faixa salarial' ? `R$ ${job.salary} a R$ ${job.salaryMax}` : `R$ ${job.salary}`
  const address = job.useCompanyAddress ? 'Praça da Sé, 100 · Sé · São Paulo — SP · 01001-000' : [job.street, job.number, job.complement, job.district, job.city, 'SP', job.cep].filter(Boolean).join(' · ')
  const requiredValues = [job.title, job.cboId, job.description, job.relationship, job.workMode, job.openings]
  const readiness = Math.round((requiredValues.filter(Boolean).length / requiredValues.length) * 100)
  const compatibility = evaluateCandidateModels({ job, criteria }, loadStoredCvModels()).compatibility
  const priorityLabel = (priority) => priority === 'required' ? 'Importante' : priority === 'desired' ? 'Desejável' : 'Não informado'
  const reviewSlotsByDate = [...new Set(schedule.slots.map((slot) => slot.date))].sort().map((date) => ({
    date,
    times: schedule.slots.filter((slot) => slot.date === date).sort((a, b) => a.start.localeCompare(b.start)).map((slot) => ({ start: slot.start, end: slot.end })),
  }))
  const reviewScheduleGroups = reviewSlotsByDate.reduce((groups, entry) => {
    const signature = entry.times.map((slot) => `${slot.start}-${slot.end}`).join('|')
    const previous = groups.at(-1)
    const previousDay = previous ? dateFromIso(previous.dates.at(-1)) : null
    const currentDay = dateFromIso(entry.date)
    if (previous && previous.signature === signature && previousDay && currentDay && (currentDay - previousDay) === 86400000) previous.dates.push(entry.date)
    else groups.push({ signature, dates: [entry.date], times: entry.times })
    return groups
  }, [])
  const reviewDuration = timeFromMinutes(minutesFromDuration(schedule.duration, schedule.customDuration))
  const reviewInterval = timeFromMinutes(minutesFromDuration(schedule.interval, schedule.customInterval))

  function reviewDateLabel(value, includeYear = false) {
    const date = dateFromIso(value)
    if (!date) return 'Não informado'
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', ...(includeYear ? { year: 'numeric' } : {}) }).format(date)
  }

  function reviewDateGroup(dates) {
    if (dates.length === 1) return reviewDateLabel(dates[0], true)
    return `${reviewDateLabel(dates[0])} – ${reviewDateLabel(dates.at(-1), true)}`
  }

  function Detail({ label, value, wide = false }) {
    return <div className={`vacancy-review-detail ${wide ? 'wide' : ''}`}><span>{label}</span><strong>{value || 'Não informado'}</strong></div>
  }

  function Tags({ items, empty = 'Nenhum item informado' }) {
    const text = (item) => {
      if (typeof item === 'string') return item
      const value = item.area || item.language && `${item.language} · ${item.level}` || item.tool && `${item.tool} · ${item.level}` || item.name || ''
      return item.priority ? `${value} · ${priorityText(item.priority)}` : value
    }
    return items.length ? <div className="vacancy-review-tags">{items.map((item) => <span key={item.id || item.code || text(item)}>{text(item)}</span>)}</div> : <p className="vacancy-review-empty">{empty}</p>
  }

  return <div className="vacancy-review-page">
    <section className="vacancy-review-hero"><div><span className="vacancy-review-icon"><BriefcaseBusiness size={23} /></span><div><span className="section-kicker">{publishedView ? 'Detalhes da vaga publicada' : 'Vaga pronta para conferência'}</span><h2>{job.title || 'Nova vaga'}</h2><p>{publishedView ? 'Visualização das informações cadastradas na publicação.' : 'Rascunho · confira todos os dados antes da publicação.'}</p></div></div><div className="review-readiness"><strong>{readiness}%</strong><span>dos campos principais</span><i><b style={{ width: `${readiness}%` }} /></i></div></section>

    <section className="vacancy-review-section"><header><div><span><BriefcaseBusiness size={18} /></span><div><h3>Informações da vaga</h3><p>Dados apresentados aos candidatos.</p></div></div><button type="button" onClick={() => goTo('vacancy')}><Pencil size={14} /> Editar</button></header><div className="vacancy-review-body"><div className="vacancy-review-grid"><Detail label="Título da vaga" value={job.title} /><Detail label="Cargo ou ocupação" value={job.cboQuery} /><Detail label="Vagas abertas" value={job.openings} /><Detail label="Relação de trabalho" value={job.relationship} /><Detail label="Formato de trabalho" value={job.workMode} /><Detail label="Identificação da empresa" value={job.anonymous ? 'Empresa anônima' : 'Nome e identidade visual exibidos'} /><div className="vacancy-review-detail wide"><span>Descrição da oportunidade</span><div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: sanitizeRichText(job.descriptionHtml || plainTextToRichHtml(job.description)) }} /></div></div>{job.anonymous && <div className="confidential-review-note"><Eye size={16} /><span>Esta vaga será apresentada como <strong>Empresa anônima</strong>, sem nome ou identidade visual.</span></div>}</div></section>

    <section className="vacancy-review-section"><header><div><span><FileText size={18} /></span><div><h3>Contrato e benefícios</h3><p>Remuneração, jornada e condições oferecidas.</p></div></div><button type="button" onClick={() => goTo('contract')}><Pencil size={14} /> Editar</button></header><div className="vacancy-review-body"><div className="vacancy-review-grid"><Detail label="Remuneração" value={salary} /><Detail label="Escala" value={job.scale} /><Detail label="Turno" value={job.shift} /><Detail label="Horário" value={[job.startTime, job.endTime].filter(Boolean).join(' às ')} /></div><div className="vacancy-review-subsection"><h4>Benefícios oferecidos</h4><Tags items={job.benefits} /></div></div></section>

    <section className="vacancy-review-section"><header><div><span><MapPin size={18} /></span><div><h3>Local de trabalho</h3><p>Endereço e área de atuação da vaga.</p></div></div><button type="button" onClick={() => goTo('location')}><Pencil size={14} /> Editar</button></header><div className="vacancy-review-body"><Detail label={job.useCompanyAddress ? 'Endereço da empresa' : 'Endereço informado'} value={address} wide /></div></section>

    {processType === 'scheduled' && <section className="vacancy-review-section schedule-review-section">
      <header><div><span><CalendarDays size={18} /></span><div><h3>Agenda</h3><p>Responsável, local e horários disponíveis para entrevista.</p></div></div><button type="button" onClick={() => goTo('schedule')}><Pencil size={14} /> Editar</button></header>
      <div className="vacancy-review-body schedule-review-body">
        <div className="schedule-review-block">
          <h4>Responsável pelas entrevistas</h4>
          <div className="schedule-review-grid responsible">
            <Detail label="Nome" value={schedule.responsibleName} />
            <Detail label="E-mail" value={schedule.responsibleEmail} />
            <Detail label="Telefone principal" value={schedule.responsiblePhone} />
            <Detail label="Telefone secundário" value={schedule.secondaryPhone || '—'} />
          </div>
        </div>
        <div className="schedule-review-block">
          <h4>{schedule.format === 'Online' ? 'Canal da entrevista' : 'Local das entrevistas'}</h4>
          <div className="schedule-review-location"><strong>{schedule.format === 'Online' ? 'Entrevista online' : schedule.locations?.find((location) => location.id === schedule.locationId)?.name || 'Local selecionado'}</strong><span>{schedule.format === 'Online' ? schedule.meetingLink : schedule.location?.replace(/^[^·]+·\s*/, '')}</span></div>
        </div>
        <div className="schedule-review-block configuration">
          <h4>Configurações de agenda</h4>
          <div className="schedule-review-config-grid">
            <Detail label="Data de início e término" value={schedule.startDate && schedule.endDate ? `${reviewDateLabel(schedule.startDate)} a ${reviewDateLabel(schedule.endDate)}` : 'Será configurado depois'} />
            <Detail label="Duração da entrevista" value={reviewDuration} />
            <Detail label="Intervalo entre entrevistas" value={reviewInterval} />
            <Detail label="Tipo de agenda" value={Number(schedule.capacity) > 1 ? `Entrevistas em grupo · até ${schedule.capacity} pessoas` : 'Entrevistas individuais'} />
            <Detail label="Limite de entrevistas diárias" value={schedule.dailyLimitEnabled ? schedule.dailyLimit : 'Sem limite'} />
            <Detail label="Prazo de antecedência" value={schedule.noticeEnabled ? schedule.minimumNotice : 'Não configurado'} />
          </div>
          {reviewScheduleGroups.length ? <div className="schedule-review-times"><h5>Agenda de horários</h5><div>{reviewScheduleGroups.map((group) => <article key={group.dates.join('-')}><strong>{reviewDateGroup(group.dates)}</strong><div>{group.times.map((slot) => <span key={`${slot.start}-${slot.end}`}><Clock3 size={13} />{slot.start} – {slot.end}</span>)}</div></article>)}</div></div> : <div className="vacancy-review-empty">Horários serão configurados posteriormente</div>}
        </div>
      </div>
    </section>}

    <section className="vacancy-review-section"><header><div><span><ListChecks size={18} /></span><div><h3>Critérios da vaga</h3><p>Entrada e ordenação dos candidatos conforme o CR034.</p></div></div><button type="button" onClick={() => goTo('criteria')}><Pencil size={14} /> Editar</button></header><div className="vacancy-review-body">
      <div className="vacancy-review-subsection"><div className="review-subtitle"><h4>Critérios de participação</h4><em>Exclusividade obrigatória</em></div><div className="vacancy-review-grid"><Detail label="Exclusividade · importante e eliminatória quando específica" value={criteria.exclusivity} /><Detail label={`CNH · ${priorityLabel(criteria.cnhPriority)}`} value={criteria.cnh.length ? `Categorias ${criteria.cnh.join(', ')}` : 'Não informada'} /><Detail label={`Formação · ${priorityLabel(criteria.formationPriority)}`} value={criteria.educationLevel} /></div></div>
      <div className="vacancy-review-subsection"><div className="review-subtitle"><h4>Requisitos da compatibilidade</h4><em>Importância definida por item</em></div><div className="review-criteria-groups"><div><h5>Formações · classificação por item</h5><Tags items={educationRequiresCourse(criteria.educationLevel) ? criteria.formations : []} /></div><div><h5>Idiomas · classificação por item</h5><Tags items={criteria.languages} /></div><div><h5>Habilidades · classificação por item</h5><Tags items={criteria.skills} /></div><div><h5>Disponibilidades · classificação por item</h5><Tags items={[...criteria.availability, ...(criteria.vehicles || []).map((vehicle) => `Veículo: ${vehicle}`)]} /></div><div><h5>Certificados · classificação por item</h5><Tags items={criteria.certificates} /></div><div><h5>Experiência · diferencial</h5><p>{criteria.experience || 'Não informada'}</p></div><div><h5>Cursos · diferenciais</h5><Tags items={criteria.courseAreas} /></div><div><h5>Competências digitais · diferenciais</h5><Tags items={criteria.digital} /></div></div></div>
    </div></section>

    <section className="compatibility-preview"><header><div><span><Sparkles size={19} /></span><div><h3>Simulação de compatibilidade</h3><p>Comparação desta vaga com todos os currículos e dados do perfil do candidato no protótipo.</p></div></div><div className={`eligibility-badge ${compatibility.eligible ? 'eligible' : 'blocked'}`}>{compatibility.eligible ? 'Pode se candidatar' : 'Vaga exclusiva não atendida'}</div></header><div className="compatibility-preview-body"><div className="compatibility-score"><strong>{compatibility.breakdown.length ? compatibilityRecommendation(compatibility).label : '—'}</strong><span>{compatibility.breakdown.length ? 'resultado simulado' : 'sem critérios informados'}</span></div><div className="compatibility-breakdown detailed">{compatibility.breakdown.length ? compatibility.breakdown.map((item, index) => <CompatibilityRequirementItem compact showPriority item={item} key={`${item.label}-${item.requirement || index}`} />) : <div className="compatibility-empty"><Info size={16} /><span>Adicione requisitos para visualizar a compatibilidade com o perfil.</span></div>}</div></div></section>

    <div className="vacancy-review-confirm"><CheckCircle2 size={19} /><div><strong>Revisão concluída</strong><p>Você ainda pode editar qualquer seção. Ao publicar, a vaga ficará disponível para os candidatos.</p></div></div>
  </div>
}

function ApplicationStatus({ status }) {
  return <span className={'application-status ' + applicationStatusTone(status)}>{status}</span>
}

function VacancyCompatibilityBadge({ compatibility, compact = false, showScore = false }) {
  const recommendation = compatibilityRecommendation(compatibility)
  return <div className={'vacancy-match ' + recommendation.tone + (compact ? ' compact' : '')}><Sparkles size={compact ? 14 : 17} /><div><strong>{recommendation.label}{showScore && compatibility?.breakdown?.length ? ` · ${compatibility.score}%` : ''}</strong>{!compact && <small>{recommendation.text}</small>}</div></div>
}

function CompatibilityRequirementItem({ item, compact = false, showPriority = false }) {
  const status = item.adherence >= .8 ? 'Atende' : item.adherence > 0 ? 'Atende parcialmente' : 'Não atende'
  const tone = item.adherence >= .8 ? 'met' : item.adherence > 0 ? 'partial' : 'missing'
  return <div className={`compatibility-requirement-item ${tone} ${compact ? 'compact' : ''}`}>{item.adherence >= .8 ? <CheckCircle2 size={16} /> : <Info size={16} />}<span><span className="compatibility-item-heading"><strong>{item.label}</strong>{showPriority && <em className={item.priority === 'required' ? 'important' : 'desired'}>{priorityText(item.priority)}</em>}</span>{item.requirement && <small><b>Solicitado:</b> {item.requirement}</small>}{item.evidence && <small><b>Encontrado:</b> {item.evidence}</small>}</span><b className="compatibility-item-status">{status}</b></div>
}

function JobPublication({ vacancy, cv, compatibilityOverride, application, onApply, onOpenApplications }) {
  const { job, criteria } = vacancy
  const compatibility = compatibilityOverride || calculateVacancyCompatibility({ job, criteria }, cv)
  const compatibilityItems = visibleCompatibilityBreakdown(vacancy, compatibility, { includeAvailability: false })
  const requirements = [
    criteria.educationLevel && criteria.educationLevel !== 'Sem escolaridade mínima' ? { id: 'education', label: 'Escolaridade', value: criteria.educationLevel, priority: criteria.formationPriority } : null,
    criteria.experience && criteria.experience !== 'Sem experiência desejada' ? { id: 'experience', label: 'Experiência', value: criteria.experience, priority: 'desired' } : null,
    criteria.cnh?.length ? { id: 'cnh', label: 'CNH', value: `Categorias ${criteria.cnh.join(', ')}`, priority: criteria.cnhPriority } : null,
    ...(educationRequiresCourse(criteria.educationLevel) ? (criteria.formations || []).map((item, index) => ({ id: item.id || item.code || `formation-${index}`, label: 'Curso ou área de formação', value: item.selectedTitle || item.area })) : []),
    ...(criteria.languages || []).map((item) => ({ id: item.id || `language-${item.language}`, label: 'Idioma', value: `${item.language} · ${item.level}`, priority: requirementItemPriority(item, criteria.languagePriority) })),
    ...(criteria.skills || []).map((item, index) => ({ id: item.id || `skill-${index}`, label: 'Habilidade', value: requirementItemName(item), priority: requirementItemPriority(item, criteria.skillsPriority) })),
    ...(criteria.certificates || []).map((item, index) => ({ id: item.id || `certificate-${index}`, label: 'Certificação', value: requirementItemName(item), priority: requirementItemPriority(item, criteria.certificatesPriority) })),
    ...(criteria.courseAreas || []).map((item, index) => ({ id: complementaryCourseId(item) || `course-${index}`, label: 'Curso complementar', value: requirementItemName(item) })),
    ...(criteria.digital || []).map((item, index) => ({ id: item.id || `digital-${index}`, label: 'Competência digital', value: `${item.tool} · ${item.level}` })),
  ].filter(Boolean)
  return <div className="published-job-layout"><article className="published-job-main">
    <header className="published-job-header"><span><Building2 size={23} /></span><div><em>Vaga de emprego</em><h1>{job.title}</h1><p>{job.anonymous ? 'Empresa anônima' : 'Empresa Tecnologia Cidadã'}</p></div><button type="button" aria-label="Favoritar"><Star size={21} /></button></header>
    <div className="published-job-facts">
      <div><MapPin size={18} /><span><small>Local</small><strong>{vacancyLocation(job)}</strong></span></div>
      <div><BriefcaseBusiness size={18} /><span><small>Relação de trabalho</small><strong>{job.relationship}</strong></span></div>
      <div><Home size={18} /><span><small>Formato</small><strong>{job.workMode}</strong></span></div>
      <div><GraduationCap size={18} /><span><small>Escolaridade</small><strong>{criteria.educationLevel || 'Não exigida'}</strong></span></div>
      <div><Clock3 size={18} /><span><small>Jornada</small><strong>{job.shift || 'A combinar'}</strong></span></div>
      <div><Users size={18} /><span><small>Oportunidades</small><strong>{job.openings} vagas</strong></span></div>
    </div>
    <section className="published-content-section"><h2>Sobre a oportunidade</h2><div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: job.descriptionHtml || '<p>' + job.description + '</p>' }} /></section>
    {requirements.length > 0 && <section className="published-content-section"><div className="published-section-heading"><div><h2>O que a empresa procura</h2><p>Confira os requisitos informados para esta oportunidade.</p></div><span><Sparkles size={14} /> Requisitos da vaga</span></div><div className="candidate-requirements detailed">{requirements.map((item) => <div key={item.id}><span className="candidate-requirement-icon"><CheckCircle2 size={17} /></span><span><strong>{item.label}</strong><small>{item.value}</small></span></div>)}</div></section>}
    {job.benefits?.length > 0 && <section className="published-content-section"><h2>Benefícios</h2><div className="published-tags">{job.benefits.map((item) => <span key={item}>{item}</span>)}</div></section>}
    <section className="published-content-section"><h2>Jornada de trabalho</h2><p>{job.scale || 'Escala a combinar'}{job.startTime && job.endTime ? ' · ' + job.startTime + ' às ' + job.endTime : ''}</p></section>
  </article><aside className="published-job-side">
    <div className="publication-summary"><span>Detalhes da vaga</span><strong>{job.salary ? 'R$ ' + job.salary : 'Salário a combinar'}</strong><p><Users size={17} /> {job.openings} vagas</p><p><Home size={17} /> {job.workMode} · {vacancyLocation(job)}</p><p><CalendarDays size={17} /> Publicada em {formatPublishedDate(vacancy.publishedAt)}</p>{application ? <button type="button" className="applied-button" onClick={onOpenApplications}><CheckCircle2 size={17} /> Acompanhar candidatura</button> : <button type="button" className="publication-apply" onClick={onApply} disabled={!compatibility.eligible}>Candidate-se</button>}</div>
    {compatibilityItems.length > 0 && <div className="publication-match-card detailed"><VacancyCompatibilityBadge compatibility={compatibility} /><div className="publication-match-intro"><strong>Como seu perfil se compara</strong><small>Confira o requisito exato e a informação encontrada nos seus currículos.</small></div>{compatibilityItems.slice(0, 6).map((item, index) => <CompatibilityRequirementItem compact item={item} key={`${item.label}-${item.requirement || index}`} />)}</div>}
    <button type="button" className="report-vacancy"><Info size={15} /> Denunciar vaga</button>
  </aside></div>
}

function AvailabilityQuestion({ item, index, value = {}, vehicles, onChange }) {
  const question = item === 'Ter veículo próprio' ? 'Possui veículo próprio disponível para trabalhar?' : 'Tem disponibilidade para ' + item.toLowerCase() + '?'
  function choose(answer) {
    onChange({ ...value, answer, vehicle: answer === 'yes' ? value.vehicle || '' : '' })
  }
  return <fieldset><legend>{index + 1}. {question} <b>*</b></legend><div className="answer-options"><label className={value.answer === 'yes' ? 'selected' : ''}><input type="radio" checked={value.answer === 'yes'} onChange={() => choose('yes')} />Sim</label><label className={value.answer === 'no' ? 'selected' : ''}><input type="radio" checked={value.answer === 'no'} onChange={() => choose('no')} />Não</label></div>{item === 'Ter veículo próprio' && value.answer === 'yes' && <Field label="Tipo de veículo" required><Select value={value.vehicle || ''} onChange={(vehicle) => onChange({ ...value, vehicle })}><option value="">Selecione</option>{vehicles.map((vehicle) => <option key={vehicle}>{vehicle}</option>)}</Select></Field>}</fieldset>
}

function ApplicationQuestionnaire({ criteria, onCancel, onSubmit }) {
  const [answers, setAnswers] = useState({})
  const requirements = (criteria.availability || []).map((item) => requirementItemName(item))
  const vehicles = [...new Set([...standardVehicles, ...(criteria.vehicles || [])])]
  const complete = requirements.every((item) => answers[item]?.answer) && (!requirements.includes('Ter veículo próprio') || answers['Ter veículo próprio']?.answer !== 'yes' || answers['Ter veículo próprio']?.vehicle)
  return <div className="flow-modal-overlay" onMouseDown={onCancel}><section className="flow-modal questionnaire-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="section-kicker">Antes de enviar</span><h2>Confirme suas disponibilidades</h2><p>As respostas serão usadas na compatibilidade desta candidatura.</p></div><button type="button" onClick={onCancel}><X size={20} /></button></header>
    <div className="questionnaire-body">{requirements.map((item, index) => <AvailabilityQuestion key={item} item={item} index={index} value={answers[item]} vehicles={vehicles} onChange={(value) => setAnswers((current) => ({ ...current, [item]: value }))} />)}</div>
    <div className="questionnaire-privacy"><ShieldCheck size={18} /><p><strong>Uso das respostas:</strong> compartilhadas somente com a empresa responsável por esta vaga.</p></div>
    <footer><button type="button" className="back-action" onClick={onCancel}>Cancelar</button><button type="button" className="next-action" disabled={!complete} onClick={() => onSubmit(answers)}>Enviar candidatura <ArrowRight size={16} /></button></footer>
  </section></div>
}

function ApplicationTimeline({ application }) {
  const milestones = ['Candidatura enviada', 'Pré-seleção', 'Seleção', 'Resultado']
  const reached = application.status === 'Candidatou-se' ? 0 : ['Pré-selecionado','Convidado para entrevista','Entrevista agendada'].includes(application.status) ? 1 : application.status === 'Selecionado' ? 2 : 3
  return <section className="application-timeline"><h2>Andamento do processo</h2><div>{milestones.map((label, index) => <article className={index <= reached ? 'reached' : ''} key={label}><span>{index < reached ? <Check size={15} /> : index + 1}</span><div><strong>{label}</strong>{index === reached && <small>Status atual: {application.status}</small>}</div></article>)}</div></section>
}

function InterviewInvitation({ vacancy, application, onUpdate }) {
  const slot = application.invite?.slot || (vacancy.schedule.slots || []).find((item) => application.invite?.slotIds?.includes(item.id))
  const meetingLink = application.invite?.meetingLink || vacancy.schedule.meetingLink
  function accept() {
    if (slot) onUpdate(application.id, { status: 'Entrevista agendada', interviewSlot: slot, inviteAcceptedAt: localIsoDate(new Date()) })
  }
  return <section className="candidate-invitation"><header><div><span><CalendarCheck2 size={20} /></span><div><strong>Convite para entrevista</strong><p>{vacancy.job.title}</p></div></div><ApplicationStatus status={application.status} /></header><p>A empresa gostaria de conversar com você e reservou o horário abaixo.</p>{slot ? <><div className="invitation-appointed-slot"><CalendarDays size={22} /><div><small>Data da entrevista</small><strong>{formatShortDate(slot.date)}</strong><span>{slot.start} – {slot.end}</span></div><em>{vacancy.schedule.format}</em></div><div className="invitation-place"><strong>{vacancy.schedule.format === 'Online' ? 'Sala virtual' : 'Local da entrevista'}</strong>{vacancy.schedule.format === 'Online' ? <a href={meetingLink} target="_blank" rel="noreferrer">{meetingLink}</a> : <span>{vacancy.schedule.location}</span>}</div></> : <div className="empty-slots">O horário deste convite não está mais disponível. Aguarde um novo contato da empresa.</div>}<footer><span>Confirme sua participação para concluir o agendamento.</span><button type="button" className="next-action" disabled={!slot} onClick={accept}>Confirmar participação</button></footer></section>
}

function CvSelectionModal({ models, selectedId, recommendedModelId, onSelect, onCancel, onConfirm }) {
  return <div className="flow-modal-overlay" onMouseDown={onCancel}><section className="flow-modal cv-selection-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="section-kicker">Currículo da candidatura</span><h2>Qual currículo deseja enviar?</h2><p>A empresa receberá somente o modelo escolhido para esta vaga.</p></div><button type="button" onClick={onCancel}><X size={20} /></button></header>
    <div className="cv-selection-list">{models.map((model) => <button type="button" key={model.id} className={selectedId === model.id ? 'selected' : ''} onClick={() => onSelect(model.id)}><span><FileText size={20} /></span><div><div className="cv-option-title"><strong>{model.name}</strong>{recommendedModelId === model.id && <em>Recomendado</em>}</div><small>{model.data.professionalTitle || 'Título profissional não informado'}</small><p>{model.data.summary || 'Resumo profissional não informado.'}</p></div><em>{selectedId === model.id ? <CheckCircle2 size={19} /> : <span />}</em></button>)}</div>
    <footer><button type="button" className="back-action" onClick={onCancel}>Cancelar</button><button type="button" className="next-action" disabled={!selectedId} onClick={onConfirm}>Usar este currículo <ArrowRight size={16} /></button></footer>
  </section></div>
}

function CitizenJobPortal({ vacancy, applications, onApply, onUpdateApplication, onOpenCv, notify, initialView = 'opportunity' }) {
  const [view, setView] = useState(initialView)
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false)
  const [cvSelectionOpen, setCvSelectionOpen] = useState(false)
  const [cvAcademicAlert, setCvAcademicAlert] = useState(null)
  const cvModels = loadStoredCvModels()
  const activeCvId = window.localStorage.getItem(CV_ACTIVE_STORAGE_KEY)
  const initialModel = cvModels.find((model) => model.id === activeCvId) || cvModels[0]
  const [submissionModelId, setSubmissionModelId] = useState(initialModel?.id || '')
  const selectedModel = cvModels.find((model) => model.id === submissionModelId) || initialModel
  const cv = loadActiveCandidateCv()
  const modelEvaluation = evaluateCandidateModels(vacancy, cvModels)
  const application = applications.find((item) => item.vacancyId === vacancy.id && item.candidateId === 'citizen-current')

  useEffect(() => {
    setView(initialView)
  }, [vacancy.id, initialView])

  function createApplication(answers = {}, model = selectedModel) {
    const submittedCv = model?.data || cv
    const sharedProfile = modelEvaluation.aggregateProfile
    const candidate = candidateWithQuestionnaire({ ...submittedCv, cnh: sharedProfile.cnh, eligibility: sharedProfile.eligibility }, vacancy.criteria, answers)
    const compatibility = calculateVacancyCompatibility({ job: vacancy.job, criteria: vacancy.criteria }, candidate)
    onApply({
      id: createEntryId('application'), vacancyId: vacancy.id, candidateId: 'citizen-current',
      candidateName: submittedCv.socialName || submittedCv.name, candidateTitle: submittedCv.professionalTitle || 'Perfil profissional',
      candidateCity: submittedCv.city, candidateEmail: submittedCv.email, candidatePhone: submittedCv.mobile,
      appliedAt: localIsoDate(new Date()), status: 'Candidatou-se', answers,
      compatibility, assessed: false, cv: candidate, profileSnapshot: candidate, cvModelId: model?.id, cvModelName: model?.name,
    })
    setCvSelectionOpen(false)
    setQuestionnaireOpen(false)
    setView('applications')
    notify('Candidatura enviada com sucesso')
  }

  function continueWithCv() {
    const model = cvModels.find((item) => item.id === submissionModelId) || initialModel
    const academicIssue = cvAcademicValidationIssue(model?.data || cv)
    if (academicIssue) {
      setCvSelectionOpen(false)
      setCvAcademicAlert(academicIssue)
      return
    }
    setCvSelectionOpen(false)
    if (vacancy.criteria.availability?.length) setQuestionnaireOpen(true)
    else createApplication({}, model)
  }

  function startApplication() {
    if (cvModels.length > 1) setCvSelectionOpen(true)
    else continueWithCv()
  }

  return <div className="citizen-jobs-shell">
    <nav className="portal-view-tabs"><button type="button" className={view === 'opportunity' ? 'active' : ''} onClick={() => setView('opportunity')}><BriefcaseBusiness size={17} /> Oportunidade</button><button type="button" className={view === 'applications' ? 'active' : ''} onClick={() => setView('applications')}><ClipboardCheck size={17} /> Minha candidatura{application && <span>1</span>}</button><button type="button" onClick={onOpenCv}><FileText size={17} /> Meu currículo</button></nav>
    {view === 'opportunity' && <JobPublication vacancy={vacancy} cv={cv} compatibilityOverride={application?.compatibility || modelEvaluation.compatibility} application={application} onApply={startApplication} onOpenApplications={() => setView('applications')} />}
    {view === 'applications' && <div className="candidate-process-page"><header><span className="section-kicker">Acompanhamento</span><h1>Minha candidatura</h1><p>Acompanhe as atualizações enviadas pela empresa.</p></header>{application ? <><section className="candidate-process-card"><div><Building2 size={22} /><span><strong>{vacancy.job.title}</strong><small>{vacancy.job.anonymous ? 'Empresa anônima' : 'Empresa Tecnologia Cidadã'} · candidatura em {formatPublishedDate(application.appliedAt)}</small></span></div><ApplicationStatus status={application.status} /></section>{application.status === 'Convidado para entrevista' && <InterviewInvitation vacancy={vacancy} application={application} onUpdate={onUpdateApplication} />}{application.status === 'Entrevista agendada' && <section className="confirmed-interview"><CheckCircle2 size={22} /><div><strong>Entrevista confirmada</strong><p>{formatShortDate(application.interviewSlot.date)} · {application.interviewSlot.start} – {application.interviewSlot.end}</p><small>{vacancy.schedule.format === 'Online' ? <a href={application.invite?.meetingLink || vacancy.schedule.meetingLink} target="_blank" rel="noreferrer">Acessar sala da entrevista</a> : vacancy.schedule.location}</small></div></section>}{application.status === 'Não contratado' && application.feedback && <section className="candidate-feedback"><Info size={20} /><div><strong>Retorno da empresa</strong><p>{application.feedback}</p></div></section>}<ApplicationTimeline application={application} /></> : <div className="empty-process"><ClipboardCheck size={30} /><h2>Você ainda não se candidatou</h2><p>Conheça a vaga e envie sua candidatura quando estiver pronto.</p><button type="button" className="next-action" onClick={() => setView('opportunity')}>Ver oportunidade</button></div>}</div>}
    {cvSelectionOpen && <CvSelectionModal models={cvModels} selectedId={submissionModelId} recommendedModelId={modelEvaluation.recommendedModelId} onSelect={setSubmissionModelId} onCancel={() => setCvSelectionOpen(false)} onConfirm={continueWithCv} />}
    {cvAcademicAlert && <CvAcademicAlertModal issue={cvAcademicAlert} onCancel={() => setCvAcademicAlert(null)} onFix={() => { setCvAcademicAlert(null); onOpenCv() }} />}
    {questionnaireOpen && <ApplicationQuestionnaire criteria={vacancy.criteria} onCancel={() => setQuestionnaireOpen(false)} onSubmit={(answers) => createApplication(answers, selectedModel)} />}
  </div>
}

function InterviewInviteModal({ vacancy, application, applications, onCancel, onSend }) {
  const capacity = Math.max(1, Number(vacancy.schedule.capacity || 1))
  const slots = (vacancy.schedule.slots || []).filter((slot) => applications.filter((item) => item.id !== application.id && (item.interviewSlot?.id === slot.id || (item.status === 'Convidado para entrevista' && item.invite?.slot?.id === slot.id))).length < capacity)
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [meetingLink, setMeetingLink] = useState(vacancy.schedule.meetingLink || '')
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId)
  const online = vacancy.schedule.format === 'Online'
  const validMeetingLink = !online || /^https?:\/\//i.test(meetingLink.trim())
  return <div className="flow-modal-overlay" onMouseDown={onCancel}><section className="flow-modal invite-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-kicker">Convite para entrevista</span><h2>{application.candidateName}</h2><p>Escolha um dia e horário da agenda para reservar ao candidato.</p></div><button type="button" onClick={onCancel}><X size={20} /></button></header><div className="invite-vacancy-summary"><Building2 size={20} /><div><strong>{vacancy.job.title}</strong><small>{vacancy.schedule.format} · {Number(vacancy.schedule.capacity) > 1 ? 'até ' + vacancy.schedule.capacity + ' pessoas por horário' : 'entrevista individual'}</small></div></div><div className="invite-slot-list">{slots.length ? slots.map((slot) => <label key={slot.id} className={selectedSlotId === slot.id ? 'selected' : ''}><input type="radio" name="interview-slot" checked={selectedSlotId === slot.id} onChange={() => setSelectedSlotId(slot.id)} /><CalendarDays size={16} /><span><strong>{formatShortDate(slot.date)}</strong><small>{slot.start} – {slot.end}</small></span></label>) : <div className="empty-slots">Não há horários disponíveis. Edite a agenda da vaga para enviar o convite.</div>}</div>{online && <div className="invite-room-field"><Field label="Link da sala virtual" required hint="O candidato receberá este link junto com a data e o horário do convite."><div className="input-shell"><Link2 size={16} /><input type="url" value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder="https://meet.google.com/..." /></div></Field>{meetingLink && !validMeetingLink && <small>Informe um endereço iniciado por http:// ou https://.</small>}</div>}<footer><button className="back-action" type="button" onClick={onCancel}>Cancelar</button><button className="next-action" type="button" disabled={!selectedSlot || !validMeetingLink} onClick={() => onSend({ slot: selectedSlot, meetingLink: online ? meetingLink.trim() : '' })}><Send size={16} /> Enviar convite</button></footer></section></div>
}

function CandidateAssessmentModal({ application, onCancel, onComplete }) {
  return <div className="flow-modal-overlay" onMouseDown={onCancel}><section className="flow-modal assessment-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-kicker">Avaliação do perfil</span><h2>{application.candidateName}</h2><p>Confira currículo, compatibilidade e respostas antes de registrar o desfecho.</p></div><button type="button" onClick={onCancel}><X size={20} /></button></header><div className="assessment-profile"><div className="candidate-avatar">{application.candidateName.split(' ').map((item) => item[0]).slice(0, 2).join('')}</div><div><strong>{application.candidateTitle}</strong><p>{application.candidateCity}</p><small>{application.cv?.summary}</small></div></div><div className="assessment-breakdown">{application.compatibility?.breakdown?.map((item) => <div key={item.label}><span>{item.adherence >= .5 ? <CheckCircle2 size={16} /> : <Info size={16} />}{item.label}</span><strong>{item.adherence >= .8 ? 'Atende' : item.adherence >= .5 ? 'Atende parcialmente' : 'Não identificado'}</strong></div>)}</div><footer><button className="back-action" type="button" onClick={onCancel}>Voltar</button><button className="next-action" type="button" onClick={onComplete}><ClipboardCheck size={16} /> Concluir avaliação</button></footer></section></div>
}

function NotHiredModal({ application, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  return <div className="flow-modal-overlay" onMouseDown={onCancel}><section className="flow-modal feedback-modal" onMouseDown={(event) => event.stopPropagation()}><header><div><span className="section-kicker">Retorno obrigatério</span><h2>Marcar como não contratado</h2><p>O candidato continuará em Selecionados e poderá visualizar este feedback.</p></div><button type="button" onClick={onCancel}><X size={20} /></button></header><Field label={'Motivo para ' + application.candidateName} required><textarea rows="5" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explique o motivo de forma objetiva e respeitosa." /></Field><footer><button className="back-action" type="button" onClick={onCancel}>Cancelar</button><button className="danger-action" type="button" disabled={reason.trim().length < 10} onClick={() => onConfirm(reason.trim())}><UserX size={16} /> Confirmar não contratação</button></footer></section></div>
}

function CandidateDetailDrawer({ vacancy, application, onClose, onPreselect, onInvite, onSelect, onAssess, onHire, onReject, notify }) {
  const [tab, setTab] = useState('about')
  const stage = applicationTab(application.status)
  const answers = Object.entries(application.answers || {})
  const compatibilityItems = visibleCompatibilityBreakdown(vacancy, application.compatibility)

  async function downloadCandidateCv() {
    await downloadCvPdf(application.cv, application.cvModelName || `Currículo de ${application.candidateName}`)
    notify('Currículo do candidato baixado em PDF')
  }

  return <div className="candidate-drawer-overlay" role="presentation" onMouseDown={onClose}>
    <aside className="candidate-detail-drawer" role="dialog" aria-modal="true" aria-label={`Perfil de ${application.candidateName}`} onMouseDown={(event) => event.stopPropagation()}>
      <header className="candidate-drawer-top"><button type="button" className="drawer-back" onClick={onClose}><ArrowLeft size={18} /> Voltar</button><button type="button" className="drawer-download" onClick={downloadCandidateCv}><Download size={17} /> Baixar currículo</button><button type="button" className="drawer-close" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
      <section className="candidate-drawer-profile"><div className="candidate-avatar">{application.candidateName.split(' ').map((item) => item[0]).slice(0, 2).join('')}</div><div><h2>{application.candidateName}</h2><p>{application.candidateTitle} · {application.candidateCity}</p><small>Candidatura enviada em {formatPublishedDate(application.appliedAt)}{application.cvModelName ? ` · ${application.cvModelName}` : ''}</small></div><ApplicationStatus status={application.status} /></section>
      <nav className="candidate-drawer-tabs"><button type="button" className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>Sobre</button><button type="button" className={tab === 'cv' ? 'active' : ''} onClick={() => setTab('cv')}>Currículo</button></nav>
      <div className="candidate-drawer-scroll">
        {tab === 'about' ? <>
          <section className={`drawer-contact-card ${application.contactsUnlocked ? 'unlocked' : 'locked'}`}><header><strong>Contatos</strong>{application.contactsUnlocked ? <span><CheckCircle2 size={14} /> Liberados</span> : <span><Lock size={14} /> Protegidos</span>}</header><div className="drawer-contact-fields"><p><strong>E-mail</strong><span>{application.contactsUnlocked ? application.candidateEmail : 'candidato@email.com'}</span></p><p><strong>Telefone</strong><span>{application.contactsUnlocked ? application.candidatePhone : '(11) 99999-9999'}</span></p></div>{!application.contactsUnlocked && <div className="contact-lock-message"><Lock size={18} /><span><strong>Contatos ainda bloqueados</strong><small>Pré-selecione o candidato para liberar essas informações.</small></span></div>}</section>
          <section className="drawer-information-card"><h3>Informações do perfil</h3><div className="drawer-profile-grid"><p><small>Localização</small><strong>{application.candidateCity || 'Não informada'}</strong></p><p><small>Escolaridade</small><strong>{application.cv?.educationLevel || 'Não informada'}</strong></p>{application.cv?.cnh?.length > 0 && <p><small>CNH</small><strong>{application.cv.cnh.map((item) => `Categoria ${item}`).join(', ')}</strong></p>}<p><small>Currículo enviado</small><strong>{application.cvModelName || 'Currículo principal'}</strong></p></div></section>
          {compatibilityItems.length > 0 && <section className="drawer-information-card"><header className="drawer-match-heading"><div><h3>Compatibilidade com a vaga</h3><p>Veja exatamente o que a vaga solicitou e o que foi localizado no currículo enviado.</p></div><VacancyCompatibilityBadge compatibility={application.compatibility} compact showScore /></header><div className="drawer-match-details detailed">{compatibilityItems.map((item, index) => <CompatibilityRequirementItem showPriority item={item} key={`${item.label}-${item.requirement || index}`} />)}</div></section>}
          {answers.length > 0 && <section className="drawer-information-card"><h3>Respostas da candidatura</h3><div className="drawer-answer-list">{answers.map(([label, value]) => <p key={label}><span>{label}</span><strong>{value.answer === 'yes' ? 'Sim' : 'Não'}{value.vehicle ? ` · ${value.vehicle}` : ''}</strong></p>)}</div></section>}
        </> : <div className="candidate-drawer-cv"><CvDocument cv={application.cv} modelName={application.cvModelName} /></div>}
      </div>
      <footer className="candidate-drawer-actions"><span>Próxima ação recomendada</span><div>{stage === 'candidates' && <button type="button" className="next-action" onClick={onPreselect}><UserCheck size={16} /> Pré-selecionar e liberar contatos</button>}{application.status === 'Pré-selecionado' && vacancy.processType === 'scheduled' && <button type="button" className="secondary-action" onClick={onInvite}><CalendarDays size={16} /> Convidar para entrevista</button>}{stage === 'preselected' && <button type="button" className="next-action" onClick={onSelect}>Selecionar candidato</button>}{application.status === 'Selecionado' && !application.assessed && <button type="button" className="next-action" onClick={onAssess}><ClipboardCheck size={16} /> Avaliar candidato</button>}{application.status === 'Selecionado' && application.assessed && <><button type="button" className="secondary-action danger-text" onClick={onReject}>Não contratar</button><button type="button" className="next-action" onClick={onHire}><UserCheck size={16} /> Contratar</button></>}</div></footer>
    </aside>
  </div>
}

function CandidateManagementCard({ vacancy, application, onOpen, onPreselect, onInvite, onSelect, onAssess, onHire, onReject }) {
  const tab = applicationTab(application.status)
  const recommendation = compatibilityRecommendation(application.compatibility)
  const answers = Object.entries(application.answers || {})
  const compatibilityItems = visibleCompatibilityBreakdown(vacancy, application.compatibility)
  return <article className="management-candidate-card" role="button" tabIndex="0" onClick={onOpen} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen() }}>
    <header><div className="candidate-avatar">{application.candidateName.split(' ').map((item) => item[0]).slice(0, 2).join('')}</div><div><strong>{application.candidateName}</strong><small>{application.candidateTitle} · {application.candidateCity}</small></div><ApplicationStatus status={application.status} /></header>
    <VacancyCompatibilityBadge compatibility={application.compatibility} compact showScore />
    {compatibilityItems.length > 0 && <div className="candidate-match-list">{compatibilityItems.slice(0, 6).map((item, index) => <span className={item.adherence >= .5 ? 'met' : ''} key={`${item.label}-${item.requirement || index}`}>{item.adherence >= .5 ? <CheckCircle2 size={14} /> : <Info size={14} />}{item.label}</span>)}</div>}
    {application.contactsUnlocked && <div className="candidate-unlocked-contacts"><Lock size={14} /><span><strong>Contatos liberados</strong><small>{application.candidateEmail} · {application.candidatePhone}</small></span></div>}
    {answers.length > 0 && <details className="application-answers"><summary>Respostas da candidatura</summary>{answers.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value.answer === 'yes' ? 'Sim' : 'Não'}{value.vehicle ? ' · ' + value.vehicle : ''}</strong></div>)}</details>}
    {application.interviewSlot && <div className="candidate-scheduled-slot"><CalendarCheck2 size={16} /><span><strong>Entrevista agendada</strong><small>{formatShortDate(application.interviewSlot.date)} · {application.interviewSlot.start} – {application.interviewSlot.end}</small></span></div>}
    {!application.interviewSlot && application.status === 'Convidado para entrevista' && application.invite?.slot && <div className="candidate-scheduled-slot pending"><CalendarDays size={16} /><span><strong>Convite enviado · aguardando confirmação</strong><small>{formatShortDate(application.invite.slot.date)} · {application.invite.slot.start} – {application.invite.slot.end}</small></span></div>}
    {application.feedback && <div className="candidate-feedback-compact"><strong>Feedback registrado</strong><p>{application.feedback}</p></div>}
    <footer>
      <span>Candidatura em {formatPublishedDate(application.appliedAt)}</span>
      <div onClick={(event) => event.stopPropagation()}>{tab === 'candidates' && <button type="button" className="secondary-action" onClick={onPreselect}><UserCheck size={15} /> Pré-selecionar</button>}{application.status === 'Pré-selecionado' && vacancy.processType === 'scheduled' && <button type="button" className="secondary-action" onClick={onInvite}><CalendarDays size={15} /> Convidar</button>}{tab === 'preselected' && <button type="button" className="next-action" onClick={onSelect}>Selecionar</button>}{application.status === 'Selecionado' && !application.assessed && <button type="button" className="next-action" onClick={onAssess}><ClipboardCheck size={15} /> Avaliar perfil</button>}{application.status === 'Selecionado' && application.assessed && <><button type="button" className="secondary-action danger-text" onClick={onReject}>Não contratar</button><button type="button" className="next-action" onClick={onHire}><UserCheck size={15} /> Contratar</button></>}</div>
    </footer>
  </article>
}

function CompanyCandidateManagement({ vacancy, vacancies, applications, onSelectVacancy, onEditVacancy, onUpdate, onNewVacancy, notify }) {
  const [tab, setTab] = useState('candidates')
  const [preview, setPreview] = useState(false)
  const [inviteCandidate, setInviteCandidate] = useState(null)
  const [assessmentCandidate, setAssessmentCandidate] = useState(null)
  const [feedbackCandidate, setFeedbackCandidate] = useState(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState(null)
  const vacancyApplications = applications.filter((item) => item.vacancyId === vacancy.id)
  const tabs = [
    ['candidates','Candidatos',Users], ['preselected','Pré-selecionados',Star],
    ['selected','Selecionados',CheckCircle2], ['hired','Contratados',BriefcaseBusiness],
  ]
  const filtered = vacancyApplications.filter((item) => applicationTab(item.status) === tab)
  const selectedCandidate = vacancyApplications.find((item) => item.id === selectedCandidateId)
  const update = (id, changes, message) => { onUpdate(id, changes); if (message) notify(message) }
  if (preview) return <div className="company-public-preview"><div className="management-preview-bar"><button type="button" onClick={() => setPreview(false)}><ArrowLeft size={16} /> Voltar à gestão</button><span>Prévia da publicação para o candidato</span></div><JobPublication vacancy={vacancy} cv={loadActiveCandidateCv()} application={null} onApply={() => {}} /></div>
  return <div className="company-management-page">
    <div className="management-heading"><div><span className="section-kicker">Gestão da vaga</span><h1>{vacancy.job.title}</h1><p>Publicada em {formatPublishedDate(vacancy.publishedAt)} · {vacancy.job.openings} vagas abertas</p></div><div><button type="button" className="secondary-action" onClick={onNewVacancy}><Plus size={16} /> Nova vaga</button><button type="button" className="next-action" onClick={() => setPreview(true)}><Eye size={16} /> Ver publicação</button></div></div>
    <section className="published-vacancy-manager"><header><div><BriefcaseBusiness size={19} /><span><strong>Vagas publicadas</strong><small>Gerencie candidaturas ou edite vagas que ainda não receberam inscrições.</small></span></div><em>{vacancies.length} {vacancies.length === 1 ? 'publicada' : 'publicadas'}</em></header><div>{vacancies.map((item) => { const candidateCount = applications.filter((application) => application.vacancyId === item.id).length; const active = item.id === vacancy.id; return <article className={active ? 'active' : ''} key={item.id}><button type="button" className="published-vacancy-main" onClick={() => onSelectVacancy(item.id)}><span><Building2 size={17} /></span><div><strong>{item.job.title}</strong><small>{item.job.workMode} · {item.job.relationship} · {candidateCount} {candidateCount === 1 ? 'candidato' : 'candidatos'}</small></div>{active && <em>Em gestão</em>}</button><button type="button" className="published-vacancy-edit" disabled={candidateCount > 0} title={candidateCount > 0 ? 'A edição é bloqueada após a primeira candidatura' : 'Editar vaga'} onClick={() => onEditVacancy(item)}><Pencil size={15} /> Editar</button></article> })}</div></section>
    <section className="management-job-summary"><div><MapPin size={18} /><span><small>Local</small><strong>{vacancyLocation(vacancy.job)}</strong></span></div><div><Home size={18} /><span><small>Formato</small><strong>{vacancy.job.workMode}</strong></span></div><div><BriefcaseBusiness size={18} /><span><small>Relação</small><strong>{vacancy.job.relationship}</strong></span></div><div><GraduationCap size={18} /><span><small>Escolaridade</small><strong>{vacancy.criteria.educationLevel || 'Não exigida'}</strong></span></div></section>
    <section className="candidate-management-panel"><nav>{tabs.map(([id, label, Icon]) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={17} />{label}<span>{vacancyApplications.filter((item) => applicationTab(item.status) === id).length}</span></button>)}</nav><div className="candidate-tools"><div className="input-shell"><Search size={16} /><input placeholder="Buscar candidato" /></div><span><Sparkles size={15} /> Ordenados por compatibilidade</span></div><div className="management-candidate-list">{filtered.length ? filtered.sort((a, b) => (b.compatibility?.score || 0) - (a.compatibility?.score || 0)).map((application) => <CandidateManagementCard key={application.id} vacancy={vacancy} application={application} onOpen={() => setSelectedCandidateId(application.id)} onPreselect={() => update(application.id, { status: 'Pré-selecionado', contactsUnlocked: true }, 'Candidato pré-selecionado e contatos liberados')} onInvite={() => setInviteCandidate(application)} onSelect={() => update(application.id, { status: 'Selecionado' }, 'Candidato movido para Selecionados')} onAssess={() => setAssessmentCandidate(application)} onHire={() => update(application.id, { status: 'Contratado' }, 'Contratação registrada')} onReject={() => setFeedbackCandidate(application)} />) : <div className="management-empty"><Users size={30} /><h2>Ainda não há {tab === 'candidates' ? 'candidatos' : tabs.find((item) => item[0] === tab)[1].toLowerCase()}</h2><p>{tab === 'candidates' ? 'As novas candidaturas aparecerão aqui.' : 'Avalie e movimente os candidatos de interesse para esta etapa.'}</p></div>}</div></section>
    {vacancy.processType === 'scheduled' && <ScheduleOccupancy vacancy={vacancy} applications={vacancyApplications} />}
    {selectedCandidate && <CandidateDetailDrawer vacancy={vacancy} application={selectedCandidate} notify={notify} onClose={() => setSelectedCandidateId(null)} onPreselect={() => update(selectedCandidate.id, { status: 'Pré-selecionado', contactsUnlocked: true }, 'Candidato pré-selecionado e contatos liberados')} onInvite={() => setInviteCandidate(selectedCandidate)} onSelect={() => update(selectedCandidate.id, { status: 'Selecionado' }, 'Candidato movido para Selecionados')} onAssess={() => setAssessmentCandidate(selectedCandidate)} onHire={() => update(selectedCandidate.id, { status: 'Contratado' }, 'Contratação registrada')} onReject={() => setFeedbackCandidate(selectedCandidate)} />}
    {inviteCandidate && <InterviewInviteModal vacancy={vacancy} application={inviteCandidate} applications={vacancyApplications} onCancel={() => setInviteCandidate(null)} onSend={({ slot, meetingLink }) => { update(inviteCandidate.id, { status: 'Convidado para entrevista', invite: { slot, slotIds: [slot.id], meetingLink, sentAt: localIsoDate(new Date()) } }, 'Convite enviado com data e horário reservados'); setInviteCandidate(null) }} />}
    {assessmentCandidate && <CandidateAssessmentModal application={assessmentCandidate} onCancel={() => setAssessmentCandidate(null)} onComplete={() => { update(assessmentCandidate.id, { assessed: true }, 'Avaliação concluída; desfecho liberado'); setAssessmentCandidate(null) }} />}
    {feedbackCandidate && <NotHiredModal application={feedbackCandidate} onCancel={() => setFeedbackCandidate(null)} onConfirm={(feedback) => { update(feedbackCandidate.id, { status: 'Não contratado', feedback }, 'Não contratação e feedback registrados'); setFeedbackCandidate(null) }} />}
  </div>
}

function ScheduleOccupancy({ vacancy, applications }) {
  const commitments = applications.map((application) => ({ application, slot: application.interviewSlot || (application.status === 'Convidado para entrevista' ? application.invite?.slot : null) })).filter((item) => item.slot)
  return <section className="schedule-occupancy"><header><div><CalendarCheck2 size={19} /><span><strong>Ocupação da agenda</strong><small>Inclui convites aguardando confirmação e entrevistas confirmadas</small></span></div><em>{commitments.length} {commitments.length === 1 ? 'horário reservado' : 'horários reservados'}</em></header>{commitments.length ? <div>{commitments.map(({ application, slot }) => <article key={application.id}><span><strong>{formatShortDate(slot.date)}</strong><small>{slot.start} – {slot.end}</small></span><div><strong>{application.candidateName}</strong><small>{Number(vacancy.schedule.capacity) > 1 ? 'Entrevista em grupo' : 'Entrevista individual'}</small></div><ApplicationStatus status={application.status} /></article>)}</div> : <p>Nenhum convite ou entrevista ocupa a agenda neste momento.</p>}</section>
}

function CompanyPublishedVacancies({ vacancies, applications, onCreate, onManage, onEdit, onDuplicate }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [detailVacancyId, setDetailVacancyId] = useState(null)
  const pageRef = useRef(null)
  const detailVacancy = vacancies.find((item) => item.id === detailVacancyId)

  useEffect(() => {
    function closeMenu(event) {
      if (pageRef.current && !pageRef.current.contains(event.target)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [])

  if (detailVacancy) {
    const candidateCount = applications.filter((application) => application.vacancyId === detailVacancy.id).length
    return <div className="workspace-shell published-details-page"><div className="page-breadcrumb"><button type="button" onClick={() => setDetailVacancyId(null)}><ArrowLeft size={16} /></button><span>Vagas</span><ChevronRight size={13} /><span>Publicadas</span><ChevronRight size={13} /><strong>{detailVacancy.job.title}</strong></div><main className="product-content"><div className="published-details-heading"><div><span className="section-kicker">Vaga publicada</span><h1>Detalhes da vaga</h1><p>{candidateCount ? `Esta publicação possui ${candidateCount} ${candidateCount === 1 ? 'candidato' : 'candidatos'} e está disponível somente para consulta.` : 'Esta publicação ainda pode ser editada porque não recebeu candidaturas.'}</p></div>{candidateCount === 0 && <button type="button" className="next-action" onClick={() => onEdit(detailVacancy, 'vacancy')}><Pencil size={16} /> Editar vaga</button>}</div><div className={candidateCount > 0 ? 'readonly-published-review' : ''}><ReviewStep job={detailVacancy.job} criteria={detailVacancy.criteria} schedule={detailVacancy.schedule} processType={detailVacancy.processType} publishedView goTo={(targetStep) => onEdit(detailVacancy, targetStep)} /></div></main></div>
  }

  return <div className="workspace-shell published-vacancies-page" ref={pageRef}><div className="page-breadcrumb"><span>Vagas</span><ChevronRight size={13} /><strong>Publicadas</strong><em>{vacancies.length} {vacancies.length === 1 ? 'vaga' : 'vagas'}</em></div><main className="product-content"><div className="published-page-heading"><div><span className="section-kicker">Gestão de vagas</span><h1>Vagas publicadas</h1><p>Acompanhe as publicações, consulte os detalhes e acesse os candidatos inscritos.</p></div><button type="button" className="next-action" onClick={onCreate}><Plus size={16} /> Criar nova vaga</button></div>{vacancies.length ? <div className="published-card-grid">{vacancies.map((vacancy) => { const candidateCount = applications.filter((application) => application.vacancyId === vacancy.id).length; return <article key={vacancy.id}><header><span><Building2 size={20} /></span><div><small>Publicada em {formatPublishedDate(vacancy.publishedAt)}</small><h2>{vacancy.job.title}</h2><p>{vacancy.job.anonymous ? 'Empresa anônima' : 'Empresa Tecnologia Cidadã'}</p></div><div className="published-card-menu"><button type="button" aria-label={`Mais opções para ${vacancy.job.title}`} onClick={() => setOpenMenuId(openMenuId === vacancy.id ? null : vacancy.id)}><EllipsisVertical size={20} /></button>{openMenuId === vacancy.id && <div><button type="button" onClick={() => { setDetailVacancyId(vacancy.id); setOpenMenuId(null) }}><Eye size={15} /> Ver detalhes da vaga</button><button type="button" onClick={() => onManage(vacancy)}><Users size={15} /> Gerenciar candidatos</button><button type="button" onClick={() => { onDuplicate(vacancy); setOpenMenuId(null) }}><Copy size={15} /> Duplicar vaga</button>{candidateCount === 0 && <button type="button" onClick={() => onEdit(vacancy, 'vacancy')}><Pencil size={15} /> Editar vaga</button>}</div>}</div></header><div className="published-card-facts"><span><MapPin size={15} />{vacancyLocation(vacancy.job)}</span><span><BriefcaseBusiness size={15} />{vacancy.job.relationship}</span><span><Home size={15} />{vacancy.job.workMode}</span><span><Users size={15} />{candidateCount} {candidateCount === 1 ? 'candidato' : 'candidatos'}</span></div><p>{vacancy.job.description}</p><footer><span className={candidateCount ? 'has-candidates' : ''}>{candidateCount ? 'Recebendo candidaturas' : 'Sem candidaturas'}</span><button type="button" className="secondary-action" onClick={() => onManage(vacancy)}>Acessar gestão <ArrowRight size={15} /></button></footer></article> })}</div> : <div className="management-empty published-empty"><BriefcaseBusiness size={34} /><h2>Nenhuma vaga publicada</h2><p>Crie sua primeira vaga para começar a receber candidaturas.</p><button type="button" className="next-action" onClick={onCreate}>Criar vaga</button></div>}</main></div>
}

function CompanyWorkspace({ notify, companySection, onCompanyNavigate, publishedVacancy, publishedVacancies, applications, onPublish, onSelectVacancy, onUpdateApplication, onStartNewVacancy }) {
  const [step, setStep] = useState(() => companySection === 'create' ? 'hub' : publishedVacancy ? 'manage' : 'hub')
  const [processType, setProcessType] = useState(() => publishedVacancy?.processType || null)
  const [mode, setMode] = useState('manual')
  const [editingVacancyId, setEditingVacancyId] = useState(null)
  const [duplicatingVacancyTitle, setDuplicatingVacancyTitle] = useState('')
  const [job, setJob] = useState({
    cboQuery: 'Desenvolvedor de sistemas de tecnologia da informação (técnico)', cboId: '317110',
    title: 'Pessoa desenvolvedora júnior', description: 'Desenvolver, testar e manter aplicações web, colaborando com o time de produto na evolução dos serviços digitais.',
    descriptionHtml: '<p>Desenvolver, testar e manter aplicações web, colaborando com o time de produto na evolução dos serviços digitais.</p>',
    relationship: 'Efetivo', workMode: 'Híbrido', openings: '2', anonymous: false, salaryType: 'Valor fechado',
    salary: '4.200,00', salaryMax: '5.200,00', scale: '5x2', shift: 'Integral',
    startTime: '09:00', endTime: '18:00', benefits: ['Vale-transporte (VT)', 'Vale-refeição (VR)'],
    useCompanyAddress: false, cep: '', street: '', number: '', complement: '', district: '', city: '', state: 'SP',
  })
  const [criteria, setCriteria] = useState({
    educationLevel: 'Sem escolaridade mínima', exclusivity: '',
    cnhPriority: 'none', cnh: [], formationPriority: 'none', formations: [], experience: '',
    languagePriority: 'none', languages: [],
    skillsPriority: 'none', skills: [], availabilityPriority: 'none', availability: [], vehicles: [],
    certificatesPriority: 'none', certificates: [], courseAreas: [], digital: [],
  })
  const [schedule, setSchedule] = useState({
    useCompanyContact: true, responsibleName: 'Rafaela Souza', responsibleEmail: 'rafaela@empresa.com.br', responsiblePhone: '(11) 9 9999-0000', secondaryPhone: '',
    format: '', locationId: 'company-address', location: 'Empresa · Praça da Sé, 100 · Sé · São Paulo — SP · 01001-000',
    locations: [{ id: 'company-address', name: 'Empresa', cep: '01001-000', street: 'Praça da Sé', number: '100', complement: '', district: 'Sé', city: 'São Paulo', state: 'SP', locked: true }],
    meetingLink: '',
    startDate: '', endDate: '', duration: '30 minutos', interval: '15 minutos',
    customDuration: '', customInterval: '', slots: [], capacity: '1',
    dailyLimitEnabled: false, dailyLimit: '', noticeEnabled: false, minimumNotice: '24 horas',
  })
  const activeSteps = companyStepsFor(processType)
  const stepIndex = activeSteps.findIndex((item) => item.id === step)

  useEffect(() => {
    if (companySection === 'create' && step === 'manage' && !editingVacancyId) setStep('hub')
  }, [companySection, step, editingVacancyId])

  function beginEditVacancy(vacancy) {
    if (applications.some((application) => application.vacancyId === vacancy.id)) {
      notify('Esta vaga já possui candidatos e não pode mais ser editada.')
      return
    }
    onSelectVacancy(vacancy.id)
    setDuplicatingVacancyTitle('')
    setEditingVacancyId(vacancy.id)
    setProcessType(vacancy.processType)
    setJob({ ...cloneCv(vacancy.job), useCompanyAddress: vacancy.job.workMode === 'Online' && Boolean(vacancy.job.useCompanyAddress) })
    setCriteria({ ...cloneCv(vacancy.criteria), educationLevel: vacancy.criteria.educationLevel || 'Sem escolaridade mínima' })
    setSchedule(cloneCv(vacancy.schedule))
    setMode('manual')
    onCompanyNavigate('create')
    setStep('vacancy')
  }

  function beginDuplicateVacancy(vacancy) {
    setEditingVacancyId(null)
    setDuplicatingVacancyTitle(vacancy.job.title)
    setProcessType(vacancy.processType)
    setJob({ ...cloneCv(vacancy.job), title: `Cópia de ${vacancy.job.title}`, useCompanyAddress: vacancy.job.workMode === 'Online' && Boolean(vacancy.job.useCompanyAddress) })
    setCriteria({ ...cloneCv(vacancy.criteria), educationLevel: vacancy.criteria.educationLevel || 'Sem escolaridade mínima' })
    setSchedule(cloneCv(vacancy.schedule))
    setMode('manual')
    onCompanyNavigate('create')
    setStep('vacancy')
    notify('Cópia criada. Revise as informações antes de publicar a nova vaga.')
  }

  if (companySection === 'published') return <CompanyPublishedVacancies vacancies={publishedVacancies} applications={applications} onCreate={() => { setEditingVacancyId(null); setDuplicatingVacancyTitle(''); setProcessType(null); setStep('hub'); onCompanyNavigate('create') }} onManage={(vacancy) => { onSelectVacancy(vacancy.id); setStep('manage'); onCompanyNavigate('manage') }} onEdit={beginEditVacancy} onDuplicate={beginDuplicateVacancy} />

  if (companySection === 'manage' && step === 'manage' && publishedVacancy) return <CompanyCandidateManagement vacancy={publishedVacancy} vacancies={publishedVacancies} applications={applications} onSelectVacancy={onSelectVacancy} onEditVacancy={beginEditVacancy} onUpdate={onUpdateApplication} notify={notify} onNewVacancy={() => { onStartNewVacancy(); setEditingVacancyId(null); setProcessType(null); setStep('hub'); onCompanyNavigate('create') }} />

  if (companySection === 'create' && step === 'manage') return null

  function selectProcessType(type) {
    setProcessType(type)
    setStep('vacancy')
  }

  function next() {
    if (step === 'criteria' && !criteria.exclusivity) {
      notify('Selecione a definição de exclusividade da vaga.')
      return
    }
    if (step === 'criteria' && educationRequiresCourse(criteria.educationLevel) && !criteria.formations.length) {
      notify('Informe o curso ou a área de formação exigida para esta escolaridade.')
      return
    }
    if (step === 'schedule') {
      if (schedule.responsibleName.trim().split(/\s+/).length < 2) return notify('Preenchimento incompleto do nome do responsável')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(schedule.responsibleEmail)) return notify('Formato de e-mail inválido')
      if (![10, 11].includes(schedule.responsiblePhone.replace(/\D/g, '').length)) return notify('Preenchimento incorreto do telefone do responsável')
      if (!schedule.format) return notify('Selecione o formato da entrevista')
      if (schedule.format === 'Online' && !/^https?:\/\//i.test(schedule.meetingLink.trim())) return notify('Informe um link válido para a sala virtual')
      if ((schedule.startDate && !schedule.endDate) || (!schedule.startDate && schedule.endDate)) return notify('Informe as datas de início e término da agenda')
      if (schedule.slots.some((slot) => !slot.date || !slot.start || !slot.end || slot.start >= slot.end)) return notify('Revise as datas e horários configurados')
      const hasConflict = schedule.slots.some((slot, index) => schedule.slots.some((other, otherIndex) => otherIndex !== index && other.date === slot.date && slot.start < other.end && slot.end > other.start))
      if (hasConflict) return notify('Horário já ocupado')
      if (Number(schedule.capacity) < 1) return notify('Informe ao menos uma pessoa por horário')
      if (schedule.dailyLimitEnabled && Number(schedule.dailyLimit) < 1) return notify('Informe o limite diário de entrevistas')
      if (schedule.duration === 'Personalizado' && !schedule.customDuration) return notify('Informe a duração personalizada')
      if (schedule.interval === 'Personalizado' && !schedule.customInterval) return notify('Informe o intervalo personalizado')
    }
    if (stepIndex < activeSteps.length - 1) setStep(activeSteps[stepIndex + 1].id)
  }
  function back() {
    if (stepIndex > 0) setStep(activeSteps[stepIndex - 1].id)
    else if (editingVacancyId) { setEditingVacancyId(null); setStep('manage') }
    else if (duplicatingVacancyTitle) { setDuplicatingVacancyTitle(''); setStep('hub'); onCompanyNavigate('published') }
    else setStep('hub')
  }

  function publishVacancy() {
    if (!criteria.exclusivity) {
      setStep('criteria')
      notify('Selecione a definição de exclusividade antes de publicar a vaga.')
      return
    }
    const previousVacancy = publishedVacancies.find((item) => item.id === editingVacancyId)
    const vacancy = {
      id: editingVacancyId || createEntryId('vacancy'),
      job: cloneCv(job),
      criteria: cloneCv(criteria),
      schedule: cloneCv(schedule),
      processType,
      publishedAt: previousVacancy?.publishedAt || localIsoDate(new Date()),
    }
    onPublish(vacancy)
    setEditingVacancyId(null)
    const wasDuplicating = Boolean(duplicatingVacancyTitle)
    setDuplicatingVacancyTitle('')
    setStep('manage')
    onCompanyNavigate('manage')
    notify(previousVacancy ? 'Alterações da vaga salvas com sucesso' : wasDuplicating ? 'Cópia publicada como uma nova vaga' : 'Vaga publicada e disponível para candidaturas')
  }

  function handlePublishCapture(event) {
    if (step !== 'review' || !event.target.closest('.next-action')) return
    event.preventDefault()
    event.stopPropagation()
    publishVacancy()
  }

  return <div className="workspace-shell">
    <div className="page-breadcrumb"><button onClick={() => step === 'hub' ? null : back()}><ArrowLeft size={16} /></button><span>Vagas</span><ChevronRight size={13} /><strong>{step === 'hub' ? 'Novo cadastro' : editingVacancyId ? 'Editar vaga' : duplicatingVacancyTitle ? 'Duplicar vaga' : 'Criar vaga'}</strong>{step !== 'hub' && <em>{processType === 'scheduled' ? 'Processo com entrevistas' : 'Contato direto'}</em>}</div>
    {step !== 'hub' && <div className="company-stepper">{activeSteps.map((item, index) => { const Icon = item.icon; return <button key={item.id} className={(step === item.id ? 'active ' : '') + (index < stepIndex ? 'done' : '')} onClick={() => index <= stepIndex && setStep(item.id)}><span>{index < stepIndex ? <Check size={14} /> : <Icon size={15} />}</span><strong>{item.label}</strong>{index < activeSteps.length - 1 && <i />}</button> })}</div>}
    <main className="product-content">
      {step === 'hub' ? <VacancyFlowHub onSelect={selectProcessType} /> : <>
      <div className="page-title"><div><span className="section-kicker">Cadastro de vaga</span><h1>{activeSteps[stepIndex].label}</h1><p>{step === 'criteria' ? 'Configure quem pode se candidatar e como os perfis serão ordenados.' : step === 'schedule' ? 'Defina responsável, formato, horários e capacidade das entrevistas.' : step === 'review' ? 'Valide a experiência completa antes da publicação.' : 'Preencha as informações da oportunidade no seu ritmo.'}</p></div><button className="support-link"><CircleHelp size={16} /> Ajuda sobre esta etapa</button></div>
      {step === 'vacancy' && <VacancyStep job={job} setJob={setJob} mode={mode} setMode={setMode} />}
      {step === 'contract' && <ContractStep job={job} setJob={setJob} />}
      {step === 'location' && <LocationStep job={job} setJob={setJob} />}
      {step === 'criteria' && <CriteriaStep criteria={criteria} setCriteria={setCriteria} job={job} />}
      {step === 'schedule' && <ScheduleStep schedule={schedule} setSchedule={setSchedule} />}
      {step === 'review' && <ReviewStep job={job} criteria={criteria} schedule={schedule} processType={processType} goTo={setStep} />}
      </>}
    </main>
    <div onClickCapture={handlePublishCapture}>
    {step !== 'hub' && <footer className="sticky-actions"><button className="save-draft" onClick={() => notify('Rascunho salvo com sucesso')}><Save size={16} /> Salvar como rascunho</button><div><button className="back-action" onClick={back}>{stepIndex === 0 ? (editingVacancyId ? 'Voltar à gestão' : duplicatingVacancyTitle ? 'Cancelar duplicação' : 'Alterar fluxo') : 'Voltar'}</button><button className="next-action" onClick={step === 'review' ? () => notify(editingVacancyId ? 'Alterações prontas para salvar' : duplicatingVacancyTitle ? 'Cópia pronta para publicação' : 'Vaga pronta para publicação') : next}>{step === 'review' ? (editingVacancyId ? 'Salvar alterações' : duplicatingVacancyTitle ? 'Publicar cópia' : 'Publicar vaga') : 'Continuar'} <ArrowRight size={16} /></button></div></footer>}
    </div>
  </div>
}

function CvLibraryCards({ models, activeModelId, cv, onSelect, onEdit, onCopy, onDelete, onCreate, onRename, onTitleChange }) {
  const activeModel = models.find((model) => model.id === activeModelId)
  return <section className="cv-library-cards">
    <header><div><span className="section-kicker">Meus currículos</span><h2>Escolha um currículo para continuar</h2><p>Crie versões para objetivos profissionais diferentes e mantenha cada candidatura organizada.</p></div><div className="cv-library-actions"><span>{models.length} {models.length === 1 ? 'modelo salvo' : 'modelos salvos'}</span><button type="button" onClick={onCreate}><Plus size={15} /> Novo currículo</button></div></header>
    <div className="cv-library-grid">{models.map((model) => {
      const sections = getCitizenSections(model.data)
      const completion = Math.round(sections.reduce((sum, item) => sum + item.completion, 0) / sections.length)
      const initials = (model.data.socialName || model.data.name || 'CV').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
      return <article className={model.id === activeModelId ? 'active' : ''} key={model.id} role="button" tabIndex="0" aria-label={`Selecionar ${model.name}`} onClick={() => onSelect(model.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(model.id) } }}>
        <div className="cv-card-preview"><span>{initials}</span><div><small>Currículo profissional</small><strong>{model.data.socialName || model.data.name}</strong><em>{model.data.professionalTitle || 'Título profissional não informado'}</em></div><FileText size={18} /></div>
        <div className="cv-card-content"><div><strong>{model.name}</strong>{model.id === activeModelId && <em>Em edição</em>}</div><p>{model.data.summary || 'Adicione um resumo profissional para apresentar melhor este currículo.'}</p><div className="cv-card-progress"><span><i style={{ width: `${completion}%` }} /></span><strong>{completion}% preenchido</strong></div><div className="cv-card-facts"><span>{model.data.savedExperiences.length} experiências</span><span>{model.data.formations.length} formações</span></div></div>
        <footer onClick={(event) => event.stopPropagation()}><button type="button" className="cv-card-delete" onClick={() => onDelete(model.id)} disabled={models.length === 1} title={models.length === 1 ? 'Mantenha pelo menos um currículo' : 'Excluir currículo'}><Trash2 size={15} /> Excluir</button><button type="button" onClick={() => onCopy(model.id)}><Copy size={15} /> Fazer cópia</button><button type="button" className="primary-card-action" onClick={() => onEdit(model.id)}><Pencil size={15} /> {model.id === activeModelId ? 'Continuar edição' : 'Editar currículo'}</button></footer>
      </article>
    })}</div>
    <div className="cv-active-profile">
      <header><div><span><Pencil size={16} /></span><div><strong>Identidade do currículo em edição</strong><small>Personalize este modelo para o cargo ou objetivo profissional desejado.</small></div></div><em>{activeModel?.name}</em></header>
      <div className="cv-active-profile-fields"><Field label="Nome do modelo"><Input value={activeModel?.name || ''} onChange={onRename} placeholder="Ex.: CV principal" /></Field><Field label="Título ou objetivo profissional" hint="Ex.: Product Owner, Scrum Master ou Analista de negócios"><Input value={cv.professionalTitle} onChange={onTitleChange} placeholder="Informe o cargo que deseja destacar" /></Field></div>
    </div>
  </section>
}

function CvDocument({ cv, modelName }) {
  const links = cvProfessionalLinks(cv)
  return <article className="cv-document">
    <header><div className="document-monogram">{(cv.socialName || cv.name).split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><h1>{cv.socialName || cv.name}</h1>{cv.professionalTitle && <h2>{cv.professionalTitle}</h2>}<p>{[cv.city, cv.email, cv.mobile].filter(Boolean).join(' · ')}</p></div></header>
    {cv.summary && <section><h3>Perfil profissional</h3><p>{cv.summary}</p></section>}
    {cv.savedExperiences.length > 0 && <section><h3>Experiência profissional</h3>{cv.savedExperiences.map((item) => <div className="document-entry" key={item.id}><strong>{item.role}</strong><b>{item.company}{item.city ? ` · ${item.city}` : ''}</b><small>{item.period}{item.mode ? ` · ${item.mode}` : ''}</small>{item.summary && <p>{item.summary}</p>}</div>)}</section>}
    {cv.formations.length > 0 && <section><h3>Formação acadêmica</h3>{cv.formations.map((item) => { const display = formationDisplay(item); return <div className="document-entry" key={item.id}><strong>{display.title}</strong>{display.subtitle && <b>{display.subtitle}</b>}{display.period && <small>{display.period}</small>}{item.description && <p>{item.description}</p>}</div> })}</section>}
    {cv.savedCourses.length > 0 && <section><h3>Cursos e certificações</h3>{cv.savedCourses.map((item) => <div className="document-entry" key={item.id}><strong>{item.name}</strong><b>{item.type} · {item.institution}</b><small>{item.date}</small>{item.description && <p>{item.description}</p>}</div>)}</section>}
    <div className="document-columns">
      {cv.savedLanguages.length > 0 && <section><h3>Idiomas</h3>{cv.savedLanguages.map((item) => <p key={item.id}><b>{item.language}</b> — {item.level}</p>)}</section>}
      {cv.savedDigital.length > 0 && <section><h3>Conhecimentos digitais</h3>{cv.savedDigital.map((item) => <p key={item.id}><b>{item.tool}</b> — {item.level}</p>)}</section>}
    </div>
    {cv.skills.length > 0 && <section><h3>Habilidades</h3><div className="document-tags">{cv.skills.map((item) => <span key={item}>{item}</span>)}</div></section>}
    {cv.cnh?.length > 0 && <section><h3>Carteira de habilitação</h3><p>{cv.cnh.map((item) => `Categoria ${item}`).join(' · ')}</p></section>}
    {links.length > 0 && <section><h3>Portfólio e trabalhos</h3><div className="document-links">{links.map((item) => <a key={item.id || item.url} href={externalLinkHref(item.url)} target="_blank" rel="noreferrer"><b>{item.title || item.type}</b><span>{item.url}</span></a>)}</div></section>}
  </article>
}

async function downloadCvPdf(cv, modelName) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = 210
  const margin = 18
  const textWidth = pageWidth - (margin * 2)
  let y = 20

  function ensureSpace(height) {
    if (y + height <= 282) return
    pdf.addPage()
    y = 20
    pdf.setDrawColor(0, 143, 123)
    pdf.setLineWidth(1.2)
    pdf.line(margin, 13, pageWidth - margin, 13)
  }

  function writeWrapped(text, size = 9, color = [70, 66, 68], style = 'normal', gap = 4.2) {
    if (!text) return
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    const lines = pdf.splitTextToSize(String(text), textWidth)
    ensureSpace(lines.length * gap + 2)
    pdf.text(lines, margin, y)
    y += lines.length * gap
  }

  function sectionTitle(title) {
    ensureSpace(13)
    y += 4
    pdf.setFillColor(218, 28, 48)
    pdf.roundedRect(margin, y - 3.6, 3, 3, .7, .7, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(37, 33, 35)
    pdf.text(title.toUpperCase(), margin + 6, y - .5)
    pdf.setDrawColor(226, 221, 218)
    pdf.setLineWidth(.3)
    pdf.line(margin, y + 2, pageWidth - margin, y + 2)
    y += 9
  }

  function entry(title, subtitle, meta, description) {
    ensureSpace(20)
    writeWrapped(title, 10, [38, 34, 36], 'bold')
    writeWrapped(subtitle, 8.5, [76, 72, 74], 'bold', 3.8)
    writeWrapped(meta, 8, [126, 119, 122], 'normal', 3.6)
    if (description) writeWrapped(description, 8.5, [75, 71, 73], 'normal', 3.9)
    y += 3
  }

  pdf.setFillColor(36, 32, 34)
  pdf.rect(0, 0, pageWidth, 57, 'F')
  pdf.setFillColor(0, 143, 123)
  pdf.circle(27, 27, 10, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.text((cv.socialName || cv.name).split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase(), 27, 29, { align: 'center' })
  pdf.setFontSize(20)
  pdf.text(cv.socialName || cv.name, 43, 23)
  if (cv.professionalTitle) {
    pdf.setTextColor(95, 210, 194)
    pdf.setFontSize(12)
    pdf.text(cv.professionalTitle, 43, 31)
  }
  pdf.setTextColor(215, 210, 212)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.text(pdf.splitTextToSize([cv.city, cv.email, cv.mobile].filter(Boolean).join('  ·  '), 145), 43, cv.professionalTitle ? 39 : 32)
  y = 67

  if (cv.summary) { sectionTitle('Perfil profissional'); writeWrapped(cv.summary); y += 2 }
  if (cv.savedExperiences.length) {
    sectionTitle('Experiência profissional')
    cv.savedExperiences.forEach((item) => entry(item.role, `${item.company}${item.city ? ` · ${item.city}` : ''}`, `${item.period}${item.mode ? ` · ${item.mode}` : ''}`, item.summary))
  }
  if (cv.formations.length) {
    sectionTitle('Formação acadêmica')
    cv.formations.forEach((item) => { const display = formationDisplay(item); entry(display.title, display.subtitle, display.period, item.description) })
  }
  if (cv.savedCourses.length) { sectionTitle('Cursos e certificações'); cv.savedCourses.forEach((item) => entry(item.name, `${item.type} · ${item.institution}`, item.date, item.description)) }
  if (cv.savedLanguages.length) { sectionTitle('Idiomas'); cv.savedLanguages.forEach((item) => writeWrapped(`${item.language} — ${item.level}`, 9)) }
  if (cv.savedDigital.length) { sectionTitle('Conhecimentos digitais'); cv.savedDigital.forEach((item) => writeWrapped(`${item.tool} — ${item.level}`, 9)) }
  if (cv.skills.length) { sectionTitle('Habilidades'); writeWrapped(cv.skills.join('  ·  '), 9) }
  if (cv.cnh?.length) { sectionTitle('Carteira de habilitação'); writeWrapped(cv.cnh.map((item) => `Categoria ${item}`).join('  ·  '), 9) }
  const links = cvProfessionalLinks(cv)
  if (links.length) { sectionTitle('Portfólio e trabalhos'); links.forEach((item) => writeWrapped(`${item.title || item.type}: ${item.url}`, 8.5, [0, 112, 98])) }
  const safeName = `${modelName || 'curriculo'}-${cv.name || 'candidato'}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  pdf.save(`${safeName}.pdf`)
}

function CvReviewModal({ cv, modelName, onClose, notify }) {
  const [downloading, setDownloading] = useState(false)
  async function download() {
    try {
      setDownloading(true)
      await downloadCvPdf(cv, modelName)
      notify('PDF do currículo gerado com sucesso')
    } catch {
      notify('Não foi possível gerar o PDF')
    } finally {
      setDownloading(false)
    }
  }
  return <div className="cv-review-overlay" role="dialog" aria-modal="true" aria-label="Revisão completa do currículo"><div className="cv-review-modal"><header><div><span className="section-kicker">Revisão completa</span><h2>{modelName}</h2><p>Confira todas as informações antes de usar ou baixar este currículo.</p></div><div><button type="button" className="download-cv" onClick={download} disabled={downloading}><Download size={16} /> {downloading ? 'Gerando PDF...' : 'Baixar PDF'}</button><button type="button" className="close-review" onClick={onClose} aria-label="Fechar revisão"><X size={19} /></button></div></header><div className="cv-review-scroll"><CvDocument cv={cv} modelName={modelName} /></div></div></div>
}

function DeleteCvModal({ model, onCancel, onConfirm }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  return <div className="delete-cv-overlay" role="presentation" onMouseDown={onCancel}><div className="delete-cv-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-cv-title" aria-describedby="delete-cv-description" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="delete-cv-icon"><Trash2 size={20} /></span><div><span className="section-kicker">Excluir modelo</span><h2 id="delete-cv-title">Excluir currículo?</h2></div></div><button type="button" onClick={onCancel} aria-label="Fechar confirmação"><X size={20} /></button></header>
    <div className="delete-cv-content"><p id="delete-cv-description">Você está prestes a excluir o currículo <strong>“{model.name}”</strong>.</p><p>Esta ação não pode ser desfeita, mas as informações dos seus outros currículos continuarão salvas.</p></div>
    <footer><button type="button" className="cancel-delete" onClick={onCancel}>Cancelar</button><button type="button" className="confirm-delete" onClick={onConfirm}><Trash2 size={16} /> Excluir currículo</button></footer>
  </div></div>
}

function CvAcademicAlertModal({ issue, onCancel, onFix }) {
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  return <div className="delete-cv-overlay" role="presentation" onMouseDown={onCancel}><div className="delete-cv-modal cv-academic-alert" role="alertdialog" aria-modal="true" aria-labelledby="cv-academic-alert-title" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="delete-cv-icon"><GraduationCap size={20} /></span><div><span className="section-kicker">Currículo incompleto</span><h2 id="cv-academic-alert-title">{issue.title}</h2></div></div><button type="button" onClick={onCancel} aria-label="Fechar alerta"><X size={20} /></button></header>
    <div className="delete-cv-content"><p>{issue.description}</p><p>O currículo continuará salvo como rascunho. Complete a formação para revisar, baixar ou enviar este modelo a uma vaga.</p></div>
    <footer><button type="button" className="cancel-delete" onClick={onCancel}>Agora não</button><button type="button" className="next-action" onClick={onFix}><GraduationCap size={16} /> Completar formação</button></footer>
  </div></div>
}

function CitizenOverview({ cv, sections, onReview }) {
  const completed = Math.round(sections.reduce((sum, item) => sum + item.completion, 0) / sections.length)
  return <section className="cv-overview">
    <div className="cv-person"><span>{(cv.socialName || cv.name).split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><div><small>Meu currículo</small><h1>{cv.socialName || cv.name}</h1><p>{[cv.professionalTitle, cv.city].filter(Boolean).join(' · ')}</p></div></div>
    <div className="cv-progress"><div><strong>{completed}%</strong><span>do currículo preenchido</span></div><div className="progress-track"><i style={{ width: completed + '%' }} /></div><p>Complete mais informações para melhorar a qualidade das correspondências.</p></div>
    <button type="button" onClick={onReview}><Eye size={16} /> Revisar currículo</button>
  </section>
}

function PersonalForm({ cv, setCv }) {
  return <FormSection icon={UserRound} title="Dados pessoais e perfil" description="Edite aqui as informações exibidas no seu perfil e no currículo.">
    <div className="source-banner"><span><RefreshCw size={18} /></span><div><strong>Perfil e currículo conectados</strong><p>As alterações feitas nesta seção são refletidas automaticamente no seu currículo.</p></div><em className="sync-status"><CheckCircle2 size={14} /> Sincronizado</em></div>
    <div className="profile-photo-row"><span className="large-avatar">JS</span><div><strong>Foto do currículo</strong><small>JPG ou PNG de até 5 MB.</small><button><Upload size={14} /> Adicionar foto</button></div></div>
    <div className="form-grid">
      <Field label="Nome" required><Input value={cv.name} onChange={(value) => setCv({ ...cv, name: value })} /></Field>
      <Field label="Nome social"><Input value={cv.socialName} onChange={(value) => setCv({ ...cv, socialName: value })} placeholder="Como prefere ser chamado(a)" /></Field>
      <Field label="Município" required><Input value={cv.city} onChange={(value) => setCv({ ...cv, city: value })} /></Field>
      <Field label="E-mail" required><Input value={cv.email} onChange={(value) => setCv({ ...cv, email: value })} type="email" /></Field>
      <Field label="Celular"><Input value={cv.mobile} onChange={(value) => setCv({ ...cv, mobile: value })} /></Field>
      <Field label="Telefone"><Input value={cv.phone} onChange={(value) => setCv({ ...cv, phone: value })} /></Field>
      <Field label="Título ou objetivo profissional" wide><Input value={cv.professionalTitle} onChange={(value) => setCv({ ...cv, professionalTitle: value })} placeholder="Ex.: Desenvolvedora de sistemas" /></Field>
      <Field label="Maior nível de escolaridade" required wide hint="Esta informação também será usada na seção Formação acadêmica e na compatibilidade com vagas."><Select value={cv.educationLevel} onChange={(value) => setCv({ ...cv, educationLevel: value })}><option value="" disabled>Selecione sua escolaridade</option>{cvEducationLevels.map((level) => <option key={level}>{level}</option>)}</Select></Field>
      <Field label="Categorias da CNH" wide hint="Selecione todas as categorias válidas. Elas serão comparadas aos requisitos das vagas."><CnhPicker value={cv.cnh || []} onChange={(cnh) => setCv({ ...cv, cnh })} /></Field>
      <Field label="Link profissional"><div className="input-shell"><Link2 size={15} /><input value={cv.link} onChange={(event) => setCv({ ...cv, link: event.target.value })} placeholder="LinkedIn, portfólio ou site" /></div></Field>
      <Field label="Outro link profissional"><div className="input-shell"><Link2 size={15} /><input value={cv.otherLink} onChange={(event) => setCv({ ...cv, otherLink: event.target.value })} placeholder="GitHub, Behance..." /></div></Field>
    </div>
  </FormSection>
}

function ExperienceForm({ cv, setCv }) {
  const [selectedOccupation, setSelectedOccupation] = useState(cv.experienceOccupation ? [{ id: cv.experienceCbo, title: cv.experienceOccupation }] : [])
  const [editingId, setEditingId] = useState(null)

  function clearForm() {
    setSelectedOccupation([])
    setEditingId(null)
    setCv((current) => ({ ...current, experienceOccupation: '', experienceCbo: '', experienceCompany: '', experienceCity: '', experienceMode: 'Presencial', experienceStart: '', experienceEnd: '', currentJob: false, experienceSummary: '' }))
  }

  function editExperience(item) {
    setEditingId(item.id)
    setSelectedOccupation(item.cbo ? [{ id: item.cbo, title: item.role }] : [])
    setCv((current) => ({ ...current, experienceOccupation: item.role, experienceCbo: item.cbo || '', experienceCompany: item.company, experienceCity: item.city || '', experienceMode: item.mode || 'Presencial', experienceStart: item.start || '', experienceEnd: item.end || '', currentJob: Boolean(item.current), experienceSummary: item.summary || '' }))
  }

  function saveExperience() {
    if (!cv.experienceOccupation || !cv.experienceCompany) return
    const entry = { id: editingId || createEntryId('exp'), role: cv.experienceOccupation, cbo: cv.experienceCbo, company: cv.experienceCompany, city: cv.experienceCity, mode: cv.experienceMode, start: cv.experienceStart, end: cv.experienceEnd, current: cv.currentJob, summary: cv.experienceSummary, period: cv.currentJob ? `${cv.experienceStart || 'Início não informado'} — atual` : `${cv.experienceStart || 'Início não informado'} — ${cv.experienceEnd || 'Término não informado'}` }
    setCv((current) => ({ ...current, savedExperiences: editingId ? current.savedExperiences.map((item) => item.id === editingId ? entry : item) : [...current.savedExperiences, entry], experienceOccupation: '', experienceCbo: '', experienceCompany: '', experienceCity: '', experienceMode: 'Presencial', experienceStart: '', experienceEnd: '', currentJob: false, experienceSummary: '' }))
    setSelectedOccupation([])
    setEditingId(null)
  }

  const experienceEditor = <div className="record-editor-body">
    <div className="form-grid">
      <Field label="Função ou ocupação" required wide hint="Pesquise pelo nome da atividade que melhor representa seu trabalho.">
        <CatalogPicker type="cbo" selected={selectedOccupation} value={cv.experienceOccupation} fillSelection showMetadata={false} onInputChange={() => { setSelectedOccupation([]); setCv((current) => ({ ...current, experienceOccupation: '', experienceCbo: '' })) }} onAdd={(item) => { setSelectedOccupation([item]); setCv((current) => ({ ...current, experienceOccupation: item.selectedTitle || item.title, experienceCbo: item.id })) }} label="Ex.: Desenvolvedor de sistemas ou Product Owner" />
      </Field>
      <Field label="Empresa" required><Input value={cv.experienceCompany} onChange={(value) => setCv({ ...cv, experienceCompany: value })} placeholder="Nome da empresa" /></Field>
      <Field label="Cidade" required><Input value={cv.experienceCity} onChange={(value) => setCv({ ...cv, experienceCity: value })} /></Field>
      <Field label="Modalidade" required><Select value={cv.experienceMode} onChange={(value) => setCv({ ...cv, experienceMode: value })}><option>Presencial</option><option>Híbrido</option><option>Remoto</option></Select></Field>
      <Field label="Início" required><Input type="month" value={cv.experienceStart} onChange={(value) => setCv({ ...cv, experienceStart: value })} /></Field>
      <Field label="Término" required={!cv.currentJob}><Input type="month" value={cv.experienceEnd} onChange={(value) => setCv({ ...cv, experienceEnd: value })} locked={cv.currentJob} /></Field>
      <div className="wide"><Switch checked={cv.currentJob} onChange={(value) => setCv({ ...cv, currentJob: value, experienceEnd: value ? '' : cv.experienceEnd })} label="Estou trabalhando neste cargo atualmente" /></div>
      <Field label="Resumo das atividades" wide hint={cv.experienceSummary.length + '/500 caracteres'}><textarea rows="5" maxLength="500" value={cv.experienceSummary} onChange={(event) => setCv({ ...cv, experienceSummary: event.target.value })} /></Field>
    </div>
    <div className="record-editor-actions"><button type="button" className="primary-entry" disabled={!cv.experienceOccupation || !cv.experienceCompany} onClick={saveExperience}>{editingId ? <Save size={15} /> : <Plus size={15} />} {editingId ? 'Salvar alterações' : 'Adicionar experiência'}</button>{editingId && <button type="button" onClick={clearForm}>Cancelar</button>}</div>
  </div>

  return <FormSection icon={BriefcaseBusiness} title="Histórico profissional" description="Adicione suas experiências. A ocupação é associada à CBO sem mostrar códigos.">
    <div className="entry-heading"><div><strong>Experiências adicionadas</strong><small>{cv.savedExperiences.length ? 'Use as ações para editar ou excluir um item.' : 'Nenhuma experiência adicionada.'}</small></div><span>{cv.savedExperiences.length}</span></div>
    {cv.savedExperiences.length > 0 && <div className="saved-records">{cv.savedExperiences.map((item) => <div className={`saved-record ${editingId === item.id ? 'expanded' : ''}`} key={item.id}><div className="record-summary"><span><BriefcaseBusiness size={18} /></span><div><strong>{item.role}</strong><p>{item.company} · {item.period}</p></div><div className="item-actions"><button type="button" onClick={() => editExperience(item)} aria-label={`Editar ${item.role}`} title="Editar"><Pencil size={14} /></button><button type="button" className="delete" onClick={() => { if (editingId === item.id) clearForm(); setCv((current) => ({ ...current, savedExperiences: current.savedExperiences.filter((entry) => entry.id !== item.id) })) }} aria-label={`Excluir ${item.role}`} title="Excluir"><X size={14} /></button></div></div>{editingId === item.id && experienceEditor}</div>)}</div>}
    {!editingId && <><div className="editor-heading"><div><strong>Adicionar experiência</strong><small>Preencha os dados da experiência profissional.</small></div></div>{experienceEditor}</>}
  </FormSection>
}

function EducationForm({ cv, setCv }) {
  const [editingId, setEditingId] = useState(null)
  const basicEducation = isBasicEducation(cv.educationLevel)

  function clearForm() {
    setEditingId(null)
    setCv((current) => ({ ...current, pendingFormation: null, institution: '', educationStart: '', educationEnd: '', educationDescription: '' }))
  }

  function editFormation(item) {
    setEditingId(item.id)
    setCv((current) => ({ ...current, educationLevel: item.level, pendingFormation: item.code ? item : null, institution: item.institution || '', educationStart: item.start || '', educationEnd: item.end || '', educationDescription: item.description || '' }))
  }

  function saveFormation() {
    if (!cv.educationLevel || (!basicEducation && !cv.pendingFormation)) return
    const entry = { ...(cv.pendingFormation || {}), id: editingId || createEntryId('edu'), level: cv.educationLevel, selectedTitle: cv.pendingFormation?.selectedTitle || cv.pendingFormation?.area || cv.educationLevel, area: cv.pendingFormation?.area || cv.educationLevel, institution: cv.institution, start: cv.educationStart, end: cv.educationEnd, description: cv.educationDescription }
    setCv((current) => ({ ...current, formations: editingId ? current.formations.map((item) => item.id === editingId ? entry : item) : [...current.formations, entry], pendingFormation: null, institution: '', educationStart: '', educationEnd: '', educationDescription: '' }))
    setEditingId(null)
  }

  const educationEditor = <div className="record-editor-body">
    <div className="form-grid">
      <Field label="Nível de escolaridade" required wide hint="Sincronizado com os dados pessoais do seu perfil."><Select value={cv.educationLevel} onChange={(value) => setCv({ ...cv, educationLevel: value, pendingFormation: isBasicEducation(value) ? null : cv.pendingFormation })}><option value="" disabled>Selecione sua escolaridade</option>{cvEducationLevels.map((level) => <option key={level}>{level}</option>)}</Select></Field>
      {basicEducation && <div className="conditional-note wide"><Info size={17} /><div><strong>Cadastro simplificado</strong><p>Para Ensino Médio ou níveis anteriores, curso, instituição e datas são opcionais.</p></div></div>}
      {!basicEducation && <Field label="Curso ou área de formação" required wide hint="Pesquise pelo nome do curso ou da área de formação."><CatalogPicker type="cine" selected={cv.formations.filter((item) => item.code)} value={cv.pendingFormation?.selectedTitle || cv.pendingFormation?.area || ''} fillSelection showMetadata={false} onInputChange={() => setCv((current) => ({ ...current, pendingFormation: null }))} onAdd={(item) => setCv((current) => ({ ...current, pendingFormation: item }))} label="Busque pelo nome do curso" /></Field>}
      <Field label="Instituição de ensino" required={!basicEducation}><Input value={cv.institution} onChange={(value) => setCv({ ...cv, institution: value })} /></Field>
      <Field label="Início" required={!basicEducation}><Input type="month" value={cv.educationStart} onChange={(value) => setCv({ ...cv, educationStart: value })} /></Field>
      <Field label="Término ou previsão" required={!basicEducation}><Input type="month" value={cv.educationEnd} onChange={(value) => setCv({ ...cv, educationEnd: value })} /></Field>
      <Field label="Descrição" wide hint={cv.educationDescription.length + '/500 caracteres'}><textarea rows="4" maxLength="500" value={cv.educationDescription} onChange={(event) => setCv({ ...cv, educationDescription: event.target.value })} /></Field>
    </div>
    <div className="record-editor-actions"><button type="button" className="primary-entry" disabled={!cv.educationLevel || (!basicEducation && !cv.pendingFormation)} onClick={saveFormation}>{editingId ? <Save size={15} /> : <Plus size={15} />} {editingId ? 'Salvar alterações' : 'Adicionar formação'}</button>{editingId && <button type="button" onClick={clearForm}>Cancelar</button>}</div>
  </div>

  return <FormSection icon={GraduationCap} title="Formação acadêmica" description="Use o catálogo CINE Brasil para identificar sua formação com precisão.">
    <div className="entry-heading"><div><strong>Formações adicionadas</strong><small>{cv.formations.length ? 'Use as ações para editar ou excluir um item.' : 'Nenhuma formação adicionada.'}</small></div><span>{cv.formations.length}</span></div>
    {cv.formations.length > 0 && <div className="saved-records">{cv.formations.map((item) => <div className={`saved-record ${editingId === item.id ? 'expanded' : ''}`} key={item.id}><div className="record-summary"><span><GraduationCap size={18} /></span><div><strong>{item.selectedTitle || item.area || item.level}</strong><p>{item.level}{item.institution ? ` · ${item.institution}` : ''}</p></div><div className="item-actions"><button type="button" onClick={() => editFormation(item)} aria-label={`Editar ${item.selectedTitle || item.area || item.level}`} title="Editar"><Pencil size={14} /></button><button type="button" className="delete" onClick={() => { if (editingId === item.id) clearForm(); setCv((current) => ({ ...current, formations: current.formations.filter((entry) => entry.id !== item.id) })) }} aria-label={`Excluir ${item.selectedTitle || item.area || item.level}`} title="Excluir"><X size={14} /></button></div></div>{editingId === item.id && educationEditor}</div>)}</div>}
    {!editingId && <><div className="editor-heading"><div><strong>Adicionar formação</strong><small>O nível informado aqui também atualiza a escolaridade do seu perfil.</small></div></div>{educationEditor}</>}
  </FormSection>
}

function CoursesForm({ cv, setCv }) {
  const [editingId, setEditingId] = useState(null)

  function clearCourseForm() {
    setEditingId(null)
    setCv((current) => ({ ...current, courseType: 'Curso', courseName: '', courseCatalogId: '', courseInstitution: '', courseDate: '', certificateLink: '', courseDescription: '', courseSkills: [] }))
  }

  function editCourse(item) {
    setEditingId(item.id)
    setCv((current) => ({ ...current, courseType: item.type, courseName: item.name, courseCatalogId: item.catalogId || '', courseInstitution: item.institution, courseDate: item.date, certificateLink: item.link || '', courseDescription: item.description || '', courseSkills: item.skills || [] }))
  }

  function saveCourse() {
    if (!cv.courseName || !cv.courseInstitution || !cv.courseDate) return
    const entry = { id: editingId || createEntryId('course'), type: cv.courseType, name: cv.courseName, catalogId: cv.courseType === 'Curso' ? cv.courseCatalogId || customComplementaryCourseId(cv.courseName) : '', institution: cv.courseInstitution, date: cv.courseDate, link: cv.certificateLink, description: cv.courseDescription, skills: cv.courseSkills }
    setCv((current) => ({ ...current, savedCourses: editingId ? current.savedCourses.map((item) => item.id === editingId ? entry : item) : [...current.savedCourses, entry], courseType: 'Curso', courseName: '', courseCatalogId: '', courseInstitution: '', courseDate: '', certificateLink: '', courseDescription: '', courseSkills: [] }))
    setEditingId(null)
  }

  const courseEditor = <div className="record-editor-body">
    <div className="form-grid">
      <Field label="Tipo"><Select value={cv.courseType} onChange={(value) => setCv({ ...cv, courseType: value, courseName: '', courseCatalogId: '' })}><option>Curso</option><option>Certificação</option></Select></Field>
      <Field label={cv.courseType === 'Certificação' ? 'Certificação' : 'Nome do curso'} required>{cv.courseType === 'Certificação' ? <CertificatePicker value={cv.courseName} onChange={(courseName) => setCv((current) => ({ ...current, courseName }))} onChoose={(certificate) => setCv((current) => ({ ...current, courseName: certificate.name, courseInstitution: certificate.issuer || current.courseInstitution }))} placeholder="Busque ou digite a certificação" /> : <ComplementaryCoursePicker value={cv.courseName} onChange={(courseName) => setCv((current) => ({ ...current, courseName, courseCatalogId: '' }))} onChoose={(course) => setCv((current) => ({ ...current, courseName: course.name, courseCatalogId: complementaryCourseId(course) }))} placeholder="Busque ou digite o curso realizado" />}</Field>
      <Field label="Instituição emissora" required><Input value={cv.courseInstitution} onChange={(value) => setCv({ ...cv, courseInstitution: value })} /></Field>
      <Field label="Data de conclusão" required><Input type="month" value={cv.courseDate} onChange={(value) => setCv({ ...cv, courseDate: value })} /></Field>
      <Field label="Link do certificado"><div className="input-shell"><Link2 size={15} /><input value={cv.certificateLink} onChange={(event) => setCv({ ...cv, certificateLink: event.target.value })} /></div></Field>
      <Field label="Descrição" wide><textarea rows="4" maxLength="500" value={cv.courseDescription} onChange={(event) => setCv({ ...cv, courseDescription: event.target.value })} /></Field>
      <Field label="Habilidades desenvolvidas" wide><div className="quick-options">{['React','JavaScript','Trabalho em equipe','Gestão ágil'].map((item) => <button type="button" key={item} className={cv.courseSkills.includes(item) ? 'selected' : ''} onClick={() => setCv({ ...cv, courseSkills: cv.courseSkills.includes(item) ? cv.courseSkills.filter((value) => value !== item) : [...cv.courseSkills, item] })}>{cv.courseSkills.includes(item) ? <Check size={13} /> : <Plus size={13} />}{item}</button>)}</div></Field>
    </div>
    <div className="record-editor-actions"><button type="button" className="primary-entry" disabled={!cv.courseName || !cv.courseInstitution || !cv.courseDate} onClick={saveCourse}>{editingId ? <Save size={15} /> : <Plus size={15} />} {editingId ? 'Salvar alterações' : 'Adicionar curso ou certificação'}</button>{editingId && <button type="button" onClick={clearCourseForm}>Cancelar</button>}</div>
  </div>

  return <FormSection icon={FileCheck2} title="Cursos e certificações" description="Inclua apenas cursos e certificações já concluídos.">
    <div className="entry-heading"><div><strong>Cursos e certificações adicionados</strong><small>{cv.savedCourses.length ? 'Os itens ficam disponíveis no currículo.' : 'Nenhum item adicionado.'}</small></div><span>{cv.savedCourses.length}</span></div>
    {cv.savedCourses.length > 0 && <div className="saved-records">{cv.savedCourses.map((item) => <div className={`saved-record ${editingId === item.id ? 'expanded' : ''}`} key={item.id}><div className="record-summary"><span><FileCheck2 size={18} /></span><div><strong>{item.name}</strong><p>{item.type}{item.type === 'Curso' && item.catalogId ? ` · ${item.catalogId}` : ''} · {item.institution} · {item.date}</p></div><div className="item-actions"><button type="button" onClick={() => editCourse(item)} aria-label={`Editar ${item.name}`} title="Editar"><Pencil size={14} /></button><button type="button" className="delete" onClick={() => { if (editingId === item.id) clearCourseForm(); setCv((current) => ({ ...current, savedCourses: current.savedCourses.filter((entry) => entry.id !== item.id) })) }} aria-label={`Excluir ${item.name}`} title="Excluir"><X size={14} /></button></div></div>{editingId === item.id && courseEditor}</div>)}</div>}
    {!editingId && <><div className="editor-heading"><div><strong>Adicionar curso ou certificação</strong><small>Preencha os campos obrigatórios e confirme a inclusão.</small></div></div>{courseEditor}</>}
  </FormSection>
}

function LanguagesForm({ cv, setCv }) {
  const [editingId, setEditingId] = useState(null)

  function clearLanguageForm() {
    setEditingId(null)
    setCv((current) => ({ ...current, language: '', languageLevel: 'Básico' }))
  }

  function editLanguage(item) {
    setEditingId(item.id)
    setCv((current) => ({ ...current, language: item.language, languageLevel: item.level }))
  }

  function saveLanguage() {
    if (!cv.language) return
    const entry = { id: editingId || createEntryId('language'), language: cv.language, level: cv.languageLevel }
    setCv((current) => ({ ...current, savedLanguages: editingId ? current.savedLanguages.map((item) => item.id === editingId ? entry : item) : [...current.savedLanguages.filter((item) => item.language !== entry.language), entry], language: '', languageLevel: 'Básico' }))
    setEditingId(null)
  }

  const languageEditor = <div className="record-editor-body">
    <div className="form-grid">
      <Field label="Idioma" required><Select value={cv.language} onChange={(value) => setCv({ ...cv, language: value })}><option value="">Selecione um idioma</option>{['Inglês','Espanhol','Libras','Português','Mandarim','Alemão','Francês','Italiano','Japonês','Árabe','Coreano','Russo','Outro'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
      <Field label="Nível" required><Select value={cv.languageLevel} onChange={(value) => setCv({ ...cv, languageLevel: value })}><option>Básico</option><option>Intermediário</option><option>Avançado</option><option>Fluente / nativo</option></Select></Field>
    </div>
    <div className="record-editor-actions"><button type="button" className="primary-entry" disabled={!cv.language} onClick={saveLanguage}>{editingId ? <Save size={15} /> : <Plus size={15} />} {editingId ? 'Salvar alterações' : 'Adicionar idioma'}</button>{editingId && <button type="button" onClick={clearLanguageForm}>Cancelar</button>}</div>
  </div>

  return <FormSection icon={Languages} title="Idiomas" description="Informe seu nível real; ele será comparado ao nível desejado pela vaga.">
    <div className="entry-heading"><div><strong>Idiomas adicionados</strong><small>{cv.savedLanguages.length ? 'Edite o idioma para atualizar seu nível.' : 'Nenhum idioma adicionado.'}</small></div><span>{cv.savedLanguages.length}</span></div>
    {cv.savedLanguages.length > 0 && <div className="saved-records">{cv.savedLanguages.map((item) => <div className={`saved-record ${editingId === item.id ? 'expanded' : ''}`} key={item.id}><div className="record-summary"><span><Languages size={18} /></span><div><strong>{item.language}</strong><p>{item.level}</p></div><div className="item-actions"><button type="button" onClick={() => editLanguage(item)} aria-label={`Editar ${item.language}`} title="Editar"><Pencil size={14} /></button><button type="button" className="delete" onClick={() => { if (editingId === item.id) clearLanguageForm(); setCv((current) => ({ ...current, savedLanguages: current.savedLanguages.filter((entry) => entry.id !== item.id) })) }} aria-label={`Excluir ${item.language}`} title="Excluir"><X size={14} /></button></div></div>{editingId === item.id && languageEditor}</div>)}</div>}
    {!editingId && <><div className="editor-heading"><div><strong>Adicionar idioma</strong><small>Escolha o idioma e informe seu nível atual.</small></div></div>{languageEditor}</>}
  </FormSection>
}

function DigitalForm({ cv, setCv }) {
  function addDigitalKnowledge() {
    if (!cv.digitalTool) return
    const entry = { id: createEntryId('digital'), tool: cv.digitalTool, level: cv.digitalLevel }
    setCv((current) => ({ ...current, savedDigital: [...current.savedDigital.filter((item) => item.tool !== entry.tool), entry], digitalTool: '', digitalLevel: 'Básico' }))
  }

  return <FormSection icon={Laptop} title="Conhecimentos em informática" description="Adicione ferramentas, tecnologias ou linguagens que você utiliza.">
    <div className="entry-heading"><div><strong>Conhecimentos adicionados</strong><small>{cv.savedDigital.length ? 'Você pode remover e adicionar outras ferramentas.' : 'Nenhum conhecimento adicionado.'}</small></div><span>{cv.savedDigital.length}</span></div>
    {cv.savedDigital.length > 0 && <div className="saved-items">{cv.savedDigital.map((item) => <div key={item.id}><span><Laptop size={18} /></span><div><strong>{item.tool}</strong><p>{item.level}</p></div><div className="item-actions"><button type="button" className="delete" onClick={() => setCv((current) => ({ ...current, savedDigital: current.savedDigital.filter((entry) => entry.id !== item.id) }))} aria-label={`Excluir ${item.tool}`} title="Excluir"><X size={14} /></button></div></div>)}</div>}
    <div className="editor-heading"><div><strong>Adicionar conhecimento</strong><small>Escolha uma opção da lista e informe seu nível.</small></div></div>
    <div className="form-grid"><Field label="Conhecimento ou ferramenta" required><Select value={cv.digitalTool} onChange={(value) => setCv({ ...cv, digitalTool: value })}><option value="">Selecione uma opção</option>{digitalToolOptions.map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Nível" required><Select value={cv.digitalLevel} onChange={(value) => setCv({ ...cv, digitalLevel: value })}><option>Básico</option><option>Intermediário</option><option>Avançado</option></Select></Field></div>
    <button type="button" className="add-entry primary-entry" disabled={!cv.digitalTool} onClick={addDigitalKnowledge}><Plus size={15} /> Adicionar conhecimento</button>
  </FormSection>
}

function SkillsForm({ cv, setCv }) {
  function addSkill() {
    if (!cv.pendingSkill || cv.skills.includes(cv.pendingSkill)) return
    setCv((current) => ({ ...current, skills: [...current.skills, current.pendingSkill], pendingSkill: '' }))
  }

  return <FormSection icon={Star} title="Habilidades comportamentais" description="Escolha as habilidades que melhor representam sua forma de trabalhar.">
    <div className="entry-heading"><div><strong>Habilidades adicionadas</strong><small>{cv.skills.length ? 'Adicione outras opções ou remova as que não representam mais seu perfil.' : 'Nenhuma habilidade adicionada.'}</small></div><span>{cv.skills.length}</span></div>
    {cv.skills.length > 0 && <div className="saved-items">{cv.skills.map((item) => <div key={item}><span><Star size={18} /></span><div><strong>{item}</strong><p>Habilidade comportamental</p></div><div className="item-actions"><button type="button" className="delete" onClick={() => setCv((current) => ({ ...current, skills: current.skills.filter((skill) => skill !== item) }))} aria-label={`Excluir ${item}`} title="Excluir"><X size={14} /></button></div></div>)}</div>}
    <div className="editor-heading"><div><strong>Adicionar habilidade</strong><small>Escolha uma opção da lista.</small></div></div>
    <div className="form-grid"><Field label="Habilidade comportamental" required wide><Select value={cv.pendingSkill} onChange={(value) => setCv({ ...cv, pendingSkill: value })}><option value="">Selecione uma opção</option>{behavioralSkillOptions.filter((item) => !cv.skills.includes(item)).map((item) => <option key={item}>{item}</option>)}</Select></Field></div>
    <button type="button" className="add-entry primary-entry" disabled={!cv.pendingSkill} onClick={addSkill}><Plus size={15} /> Adicionar habilidade</button>
  </FormSection>
}

const professionalLinkTypes = ['Portfólio', 'Projeto acadêmico', 'Artigo ou publicação', 'Repositório de código', 'Site profissional', 'Outro']

function LinksForm({ cv, setCv }) {
  const [editingId, setEditingId] = useState(null)
  const links = cvProfessionalLinks(cv)

  function clearLinkForm() {
    setEditingId(null)
    setCv((current) => ({ ...current, linkType: 'Portfólio', linkTitle: '', linkUrl: '' }))
  }

  function editLink(item) {
    setEditingId(item.id)
    setCv((current) => ({ ...current, linkType: item.type || 'Portfólio', linkTitle: item.title || '', linkUrl: item.url || '' }))
  }

  function saveLink() {
    if (!cv.linkTitle?.trim() || !cv.linkUrl?.trim()) return
    const entry = { id: editingId || createEntryId('link'), type: cv.linkType || 'Portfólio', title: cv.linkTitle.trim(), url: cv.linkUrl.trim() }
    setCv((current) => ({
      ...current,
      link: '', otherLink: '',
      professionalLinks: editingId ? cvProfessionalLinks(current).map((item) => item.id === editingId ? entry : item) : [...cvProfessionalLinks(current), entry],
      linkType: 'Portfólio', linkTitle: '', linkUrl: '',
    }))
    setEditingId(null)
  }

  function removeLink(id) {
    if (editingId === id) clearLinkForm()
    setCv((current) => ({ ...current, link: '', otherLink: '', professionalLinks: cvProfessionalLinks(current).filter((item) => item.id !== id) }))
  }

  return <FormSection icon={Link2} title="Portfólio e trabalhos" description="Inclua projetos, trabalhos acadêmicos, artigos, repositórios ou outros materiais que valorizem seu currículo." badge="Opcional">
    <div className="entry-heading"><div><strong>Links adicionados</strong><small>{links.length ? 'Estes materiais aparecerão na revisão e no PDF do currículo.' : 'Nenhum portfólio ou trabalho adicionado.'}</small></div><span>{links.length}</span></div>
    {links.length > 0 && <div className="saved-records">{links.map((item) => <div className={`saved-record ${editingId === item.id ? 'expanded' : ''}`} key={item.id}><div className="record-summary"><span><Link2 size={18} /></span><div><strong>{item.title}</strong><p>{item.type} · {item.url}</p></div><div className="item-actions"><button type="button" onClick={() => editLink(item)} aria-label={`Editar ${item.title}`} title="Editar"><Pencil size={14} /></button><button type="button" className="delete" onClick={() => removeLink(item.id)} aria-label={`Excluir ${item.title}`} title="Excluir"><X size={14} /></button></div></div>{editingId === item.id && <div className="record-editor-body"><div className="form-grid"><Field label="Tipo de material" required><Select value={cv.linkType || 'Portfólio'} onChange={(value) => setCv({ ...cv, linkType: value })}>{professionalLinkTypes.map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Título" required><Input value={cv.linkTitle || ''} onChange={(value) => setCv({ ...cv, linkTitle: value })} placeholder="Ex.: Meu portfólio de design" /></Field><Field label="Endereço do link" required wide><div className="input-shell"><Link2 size={15} /><input type="url" value={cv.linkUrl || ''} onChange={(event) => setCv({ ...cv, linkUrl: event.target.value })} placeholder="https://..." /></div></Field></div><div className="record-editor-actions"><button type="button" className="primary-entry" disabled={!cv.linkTitle?.trim() || !cv.linkUrl?.trim()} onClick={saveLink}><Save size={15} /> Salvar alterações</button><button type="button" onClick={clearLinkForm}>Cancelar</button></div></div>}</div>)}</div>}
    {!editingId && <><div className="editor-heading"><div><strong>Adicionar material</strong><small>Dê um título claro para a empresa entender o conteúdo do link.</small></div></div><div className="form-grid"><Field label="Tipo de material" required><Select value={cv.linkType || 'Portfólio'} onChange={(value) => setCv({ ...cv, linkType: value })}>{professionalLinkTypes.map((item) => <option key={item}>{item}</option>)}</Select></Field><Field label="Título" required><Input value={cv.linkTitle || ''} onChange={(value) => setCv({ ...cv, linkTitle: value })} placeholder="Ex.: Projeto final da graduação" /></Field><Field label="Endereço do link" required wide><div className="input-shell"><Link2 size={15} /><input type="url" value={cv.linkUrl || ''} onChange={(event) => setCv({ ...cv, linkUrl: event.target.value })} placeholder="https://drive.google.com/..." /></div></Field></div><button type="button" className="add-entry primary-entry" disabled={!cv.linkTitle?.trim() || !cv.linkUrl?.trim()} onClick={saveLink}><Plus size={15} /> Adicionar ao currículo</button></>}
  </FormSection>
}

function SummaryForm({ cv, setCv }) {
  return <FormSection icon={FileText} title="Resumo profissional" description="Apresente seu perfil, seus pontos fortes e o objetivo deste currículo." badge="Importante">
    <div className="summary-tip"><Lightbulb size={18} /><div><strong>Uma boa apresentação é direta</strong><p>Conte sua experiência geral, principais habilidades e objetivo profissional em dois ou três parágrafos.</p></div></div>
    <Field label="Seu resumo profissional" required hint={cv.summary.length + '/1.000 caracteres'}><textarea rows="10" maxLength="1000" value={cv.summary} onChange={(event) => setCv({ ...cv, summary: event.target.value })} placeholder="Ex.: Sou profissional de tecnologia com experiência em..." /></Field>
  </FormSection>
}

function createInitialCv() {
  return {
    name: 'Joana Silva', socialName: '', city: 'São Paulo — SP', email: 'joana.silva@email.com',
    mobile: '(11) 99945-5579', phone: '(11) 3214-5678', link: '', otherLink: '',
    professionalLinks: [{ id: 'link-inicial', type: 'Site profissional', title: 'LinkedIn', url: 'linkedin.com/in/joanasilva' }], linkType: 'Portfólio', linkTitle: '', linkUrl: '',
    birthDate: '1995-05-15', isPcd: 'Não', disabilityType: '', disabilityCid: '', disabilityAssistance: '',
    professionalTitle: 'Desenvolvedora de sistemas', educationLevel: 'Superior incompleto',
    eligibility: [], cnh: [], availability: [],
    savedExperiences: [{ id: 'exp-inicial', role: 'Assistente de desenvolvimento', cbo: '317110', company: 'Tecnologia Cidadã', city: 'São Paulo', mode: 'Híbrido', start: '2024-05', end: '', current: true, summary: '', period: 'mai 2024 — atual' }],
    experienceOccupation: '', experienceCbo: '', experienceCompany: '', experienceCity: 'São Paulo',
    experienceMode: 'Híbrido', experienceStart: '2025-01', experienceEnd: '', currentJob: false, experienceSummary: '',
    formations: [{ ...defaultCine, selectedTitle: defaultCine.aliases?.[0] || defaultCine.area, id: 'edu-inicial', level: 'Superior incompleto', institution: 'FATEC São Paulo', start: '2024-02', end: '2026-12', description: '' }], pendingFormation: null,
    educationType: 'Superior', institution: '', educationStart: '2024-02', educationEnd: '2026-12', educationDescription: '',
    savedCourses: [], courseType: 'Curso', courseName: '', courseCatalogId: '', courseInstitution: '', courseDate: '', certificateLink: '', courseDescription: '', courseSkills: [],
    savedLanguages: [{ id: 'language-inicial', language: 'Inglês', level: 'Intermediário' }], language: '', languageLevel: 'Básico', savedDigital: [], digitalTool: '', digitalLevel: 'Básico',
    skills: ['Colaboração', 'Proatividade', 'Resolução de problemas'], pendingSkill: '',
    summary: 'Profissional em início de carreira na área de tecnologia, com experiência em desenvolvimento web e suporte a produtos digitais. Busco oportunidades para aprofundar conhecimentos e colaborar com soluções de impacto social.',
  }
}

function cloneCv(cv) {
  return JSON.parse(JSON.stringify(cv))
}

const CV_MODELS_STORAGE_KEY = 'trampolim.cv-models.v1'
const CV_ACTIVE_STORAGE_KEY = 'trampolim.cv-active-model.v1'
const CITIZEN_PROFILE_STORAGE_KEY = 'trampolim.citizen-profile.v1'

function migrateCvCatalogData(data) {
  const cv = { ...createInitialCv(), ...data }
  cv.educationLevel = normalizeCitizenEducationLevel(cv.educationLevel)
  cv.cnh = Array.isArray(cv.cnh) ? cv.cnh : []
  const legacyLinks = [
    data?.link ? { id: 'legacy-link', type: 'Perfil profissional', title: 'Perfil profissional', url: data.link } : null,
    data?.otherLink ? { id: 'legacy-other-link', type: 'Portfólio ou projeto', title: 'Portfólio ou projeto', url: data.otherLink } : null,
  ].filter(Boolean)
  cv.professionalLinks = Array.isArray(data?.professionalLinks) ? data.professionalLinks : legacyLinks
  cv.link = ''
  cv.otherLink = ''
  cv.savedCourses = (cv.savedCourses || []).map((course) => {
    if (course.type === 'Certificação' || course.catalogId) return course
    const catalogItem = complementaryCourseCatalog.find((item) => [item.name, ...(item.aliases || [])].some((name) => normalizeCourseName(name) === normalizeCourseName(course.name)))
    return { ...course, catalogId: catalogItem?.id || customComplementaryCourseId(course.name) }
  })
  cv.formations = (cv.formations || []).map((formation) => {
    const isAnalysisAndDevelopment = formation.code === '0615S02' || (formation.aliases || []).includes('Análise e desenvolvimento de sistemas') || String(formation.courses || '').includes('Análise e desenvolvimento de sistemas')
    const normalizedFormation = { ...formation, level: normalizeCitizenEducationLevel(formation.level) }
    return isAnalysisAndDevelopment ? { ...normalizedFormation, code: '0613S01', detailedCode: '0613', detailedTitle: 'Produção de software', selectedTitle: 'Análise e desenvolvimento de sistemas' } : normalizedFormation
  })
  return cv
}

function loadStoredCvModels() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(CV_MODELS_STORAGE_KEY))
    if (Array.isArray(stored) && stored.length) return stored.map((model) => ({ ...model, data: migrateCvCatalogData(model.data) }))
  } catch {
    // O protótipo continua com o modelo inicial quando o armazenamento não está disponível.
  }
  return [{ id: 'cv-principal', name: 'CV principal', data: createInitialCv() }]
}

function loadActiveCandidateCv() {
  const models = loadStoredCvModels()
  const activeId = window.localStorage.getItem(CV_ACTIVE_STORAGE_KEY)
  return models.find((model) => model.id === activeId)?.data || models[0]?.data || createInitialCv()
}

function createBlankCvFrom(profile) {
  const cv = createInitialCv()
  const sharedFields = ['name', 'socialName', 'city', 'email', 'mobile', 'phone', 'birthDate', 'isPcd', 'disabilityType', 'disabilityCid', 'disabilityAssistance', 'educationLevel', 'cnh', 'eligibility']
  sharedFields.forEach((field) => { cv[field] = Array.isArray(profile[field]) ? [...profile[field]] : profile[field] })
  return { ...cv, link: '', otherLink: '', professionalLinks: [], linkType: 'Portfólio', linkTitle: '', linkUrl: '', professionalTitle: '', savedExperiences: [], formations: [], savedCourses: [], savedLanguages: [], savedDigital: [], skills: [], summary: '' }
}

const citizenProfileFields = ['name', 'socialName', 'city', 'email', 'mobile', 'phone', 'birthDate', 'isPcd', 'disabilityType', 'disabilityCid', 'disabilityAssistance', 'educationLevel', 'cnh', 'eligibility']

function profileFromCv(cv) {
  const source = { ...cv, eligibility: deriveCandidateEligibility(cv) }
  return citizenProfileFields.reduce((profile, field) => ({ ...profile, [field]: Array.isArray(source[field]) ? [...source[field]] : (source[field] || '') }), {})
}

function applyCitizenProfile(cv, profile) {
  return citizenProfileFields.reduce((updated, field) => ({ ...updated, [field]: Array.isArray(profile[field]) ? [...profile[field]] : (profile[field] || '') }), { ...cv })
}

function loadCitizenProfile() {
  const initialProfile = profileFromCv(loadActiveCandidateCv())
  const stored = readStoredValue(CITIZEN_PROFILE_STORAGE_KEY, null)
  return stored ? { ...initialProfile, ...stored, educationLevel: normalizeCitizenEducationLevel(stored.educationLevel), cnh: Array.isArray(stored.cnh) ? stored.cnh : initialProfile.cnh } : initialProfile
}

function CitizenProfileModal({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState(() => cloneCv(profile))
  const displayName = draft.socialName || draft.name || 'Cidadão'
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  const birthDateValid = /^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate || '') && draft.birthDate <= localIsoDate(new Date())
  const pcdDetailsComplete = draft.isPcd === 'Não' || (draft.isPcd === 'Sim' && draft.disabilityType?.trim() && draft.disabilityCid?.trim() && draft.disabilityAssistance?.trim())
  const profileComplete = draft.name?.trim() && draft.city?.trim() && draft.email?.trim() && draft.educationLevel && birthDateValid && draft.isPcd && pcdDetailsComplete

  return <div className="flow-modal-overlay citizen-profile-overlay" onMouseDown={onClose}><section className="flow-modal citizen-profile-modal" role="dialog" aria-modal="true" aria-labelledby="citizen-profile-title" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><span className="section-kicker">Minha conta</span><h2 id="citizen-profile-title">Editar perfil do cidadão</h2><p>Estes dados pertencem à sua conta e serão atualizados em todos os modelos de currículo.</p></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button></header>
    <div className="citizen-profile-body">
      <div className="profile-modal-identity"><span>{initials}</span><div><strong>{displayName}</strong><small>Conta GOV.br</small></div></div>
      <div className="form-grid">
        <Field label="Nome" required><Input value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} /></Field>
        <Field label="Nome social"><Input value={draft.socialName} onChange={(value) => setDraft((current) => ({ ...current, socialName: value }))} placeholder="Como prefere ser chamado(a)" /></Field>
        <Field label="Município" required><Input value={draft.city} onChange={(value) => setDraft((current) => ({ ...current, city: value }))} /></Field>
        <Field label="E-mail" required><Input type="email" value={draft.email} onChange={(value) => setDraft((current) => ({ ...current, email: value }))} /></Field>
        <Field label="Celular"><Input value={draft.mobile} onChange={(value) => setDraft((current) => ({ ...current, mobile: value }))} /></Field>
        <Field label="Telefone"><Input value={draft.phone} onChange={(value) => setDraft((current) => ({ ...current, phone: value }))} /></Field>
        <Field label="Data de nascimento" required><Input type="date" max={localIsoDate(new Date())} value={draft.birthDate || ''} onChange={(value) => setDraft((current) => ({ ...current, birthDate: value }))} /></Field>
        <Field label="Pessoa com deficiência?" required><Select value={draft.isPcd || ''} onChange={(value) => setDraft((current) => ({ ...current, isPcd: value, disabilityType: value === 'Sim' ? current.disabilityType : '', disabilityCid: value === 'Sim' ? current.disabilityCid : '', disabilityAssistance: value === 'Sim' ? current.disabilityAssistance : '' }))}><option value="" disabled>Selecione</option><option>Não</option><option>Sim</option></Select></Field>
        {draft.isPcd === 'Sim' && <>
          <Field label="Tipo de deficiência" required><Select value={draft.disabilityType || ''} onChange={(value) => setDraft((current) => ({ ...current, disabilityType: value }))}><option value="" disabled>Selecione</option>{['Deficiência física','Deficiência auditiva','Deficiência visual','Deficiência intelectual','Deficiência múltipla','Deficiência psicossocial','Transtorno do Espectro Autista','Outro tipo de deficiência'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
          <Field label="CID — Classificação Internacional de Doenças" required><div className="input-shell"><Search size={15} /><input value={draft.disabilityCid || ''} onChange={(event) => setDraft((current) => ({ ...current, disabilityCid: event.target.value }))} placeholder="Digite o código CID ou o nome da condição" /></div></Field>
          <Field label="Tecnologia ou assistência especial necessária" required wide hint="Se não precisar de adaptação, informe Não necessita."><textarea rows="4" value={draft.disabilityAssistance || ''} onChange={(event) => setDraft((current) => ({ ...current, disabilityAssistance: event.target.value }))} placeholder="Descreva recursos, adaptações ou assistência necessária para participar do processo e trabalhar." /></Field>
        </>}
        <Field label="Maior nível de escolaridade" required wide hint="Ao salvar, esta escolaridade será refletida em todos os seus currículos e na compatibilidade com vagas."><Select value={draft.educationLevel} onChange={(value) => setDraft((current) => ({ ...current, educationLevel: value }))}><option value="" disabled>Selecione sua escolaridade</option>{cvEducationLevels.map((level) => <option key={level}>{level}</option>)}</Select></Field>
        <Field label="Categorias da CNH" wide hint="Selecione todas as categorias válidas para a comparação com requisitos de vagas."><CnhPicker value={draft.cnh || []} onChange={(cnh) => setDraft((current) => ({ ...current, cnh }))} /></Field>
      </div>
    </div>
    <footer><button type="button" className="back-action" onClick={onClose}>Cancelar</button><button type="button" className="next-action" disabled={!profileComplete} onClick={() => onSave(draft)}><Save size={16} /> Salvar perfil</button></footer>
  </section></div>
}

function CitizenVacancyCatalog({ vacancies, applications, onApply, onUpdateApplication, onOpenCv, notify, recommended = false }) {
  const [selectedVacancyId, setSelectedVacancyId] = useState(null)
  const selectedVacancy = vacancies.find((item) => item.id === selectedVacancyId)
  const cvModels = loadStoredCvModels()
  if (recommended) vacancies = [...vacancies].sort((first, second) => evaluateCandidateModels(second, cvModels).compatibility.score - evaluateCandidateModels(first, cvModels).compatibility.score)
  if (selectedVacancy) return <div className="citizen-vacancy-detail"><button type="button" className="vacancy-catalog-back" onClick={() => setSelectedVacancyId(null)}><ArrowLeft size={16} /> Voltar para todas as vagas</button><CitizenJobPortal vacancy={selectedVacancy} applications={applications} onApply={onApply} onUpdateApplication={onUpdateApplication} onOpenCv={onOpenCv} notify={notify} /></div>
  return <div className="citizen-vacancy-catalog"><header><div><span className="section-kicker">Oportunidades publicadas</span><h1>Encontre uma vaga compatível com você</h1><p>Use os diferentes requisitos para testar sua compatibilidade e o envio de currículos.</p></div><em>{vacancies.length} {vacancies.length === 1 ? 'vaga disponível' : 'vagas disponíveis'}</em></header><div className="citizen-vacancy-list">{vacancies.map((vacancy) => {
    const compatibility = evaluateCandidateModels(vacancy, cvModels).compatibility
    const application = applications.find((item) => item.vacancyId === vacancy.id && item.candidateId === 'citizen-current')
    return <article key={vacancy.id}><header><span><Building2 size={21} /></span><div><small>Vaga de emprego</small><h2>{vacancy.job.title}</h2><p>{vacancy.job.anonymous ? 'Empresa anônima' : 'Empresa Tecnologia Cidadã'}</p></div><VacancyCompatibilityBadge compatibility={compatibility} compact /></header><div className="vacancy-list-facts"><span><MapPin size={15} />{vacancyLocation(vacancy.job)}</span><span><BriefcaseBusiness size={15} />{vacancy.job.relationship}</span><span><Users size={15} />{vacancy.job.openings} vagas</span></div><p className="vacancy-list-description">{vacancy.job.description}</p><div className="vacancy-list-tags"><span>{vacancy.job.workMode}</span><span>{vacancy.criteria.educationLevel || 'Sem escolaridade mínima'}</span></div><footer><span>Publicada em {formatPublishedDate(vacancy.publishedAt)}</span><button type="button" className={application ? 'secondary-action' : 'next-action'} onClick={() => setSelectedVacancyId(vacancy.id)}>{application ? 'Acompanhar candidatura' : 'Ver detalhes'} <ArrowRight size={15} /></button></footer></article>
  })}</div></div>
}

function CitizenApplicationsPage({ vacancies, applications, onApply, onUpdateApplication, onOpenCv, notify }) {
  const citizenApplications = applications.filter((item) => item.candidateId === 'citizen-current' && vacancies.some((vacancy) => vacancy.id === item.vacancyId))
  const [selectedVacancyId, setSelectedVacancyId] = useState(null)
  const selectedVacancy = vacancies.find((item) => item.id === selectedVacancyId)

  if (selectedVacancy) return <div className="citizen-vacancy-detail"><button type="button" className="vacancy-catalog-back" onClick={() => setSelectedVacancyId(null)}><ArrowLeft size={16} /> Voltar para minhas candidaturas</button><CitizenJobPortal vacancy={selectedVacancy} applications={applications} onApply={onApply} onUpdateApplication={onUpdateApplication} onOpenCv={onOpenCv} notify={notify} initialView="applications" /></div>

  return <div className="citizen-applications-page">
    <header><div><span className="section-kicker">Minha jornada</span><h1>Acompanhe suas candidaturas</h1><p>Consulte o currículo enviado, o andamento do processo e eventuais convites para entrevista.</p></div><em>{citizenApplications.length} {citizenApplications.length === 1 ? 'candidatura' : 'candidaturas'}</em></header>
    {citizenApplications.length ? <div className="citizen-application-list">{citizenApplications.map((application) => {
      const vacancy = vacancies.find((item) => item.id === application.vacancyId)
      return <article key={application.id}><div className="application-card-icon"><Building2 size={21} /></div><div className="application-card-main"><small>Candidatura enviada em {formatPublishedDate(application.appliedAt)}</small><h2>{vacancy.job.title}</h2><p>{vacancy.job.anonymous ? 'Empresa anônima' : 'Empresa Tecnologia Cidadã'} · {vacancyLocation(vacancy.job)}</p><div><ApplicationStatus status={application.status} /><span><FileText size={14} />{application.cvModelName || 'Currículo enviado'}</span>{application.interviewSlot && <span><CalendarCheck2 size={14} />Entrevista em {formatShortDate(application.interviewSlot.date)}</span>}</div></div><div className="application-card-side"><VacancyCompatibilityBadge compatibility={application.compatibility} compact /><button type="button" className="secondary-action" onClick={() => setSelectedVacancyId(vacancy.id)}>Acompanhar <ArrowRight size={15} /></button></div></article>
    })}</div> : <div className="citizen-applications-empty"><BriefcaseBusiness size={34} /><h2>Você ainda não enviou candidaturas</h2><p>Quando escolher uma vaga e enviar um currículo, o acompanhamento aparecerá aqui.</p></div>}
  </div>
}

function CitizenWorkspace({ notify, publishedVacancies, applications, onApply, onUpdateApplication, citizenSection, onCitizenNavigate, citizenProfile }) {
  const [section, setSection] = useState('experience')
  const [models, setModels] = useState(loadStoredCvModels)
  const [activeModelId, setActiveModelId] = useState(() => {
    const storedActiveId = window.localStorage.getItem(CV_ACTIVE_STORAGE_KEY)
    return models.some((model) => model.id === storedActiveId) ? storedActiveId : models[0].id
  })
  const [cv, setCv] = useState(() => cloneCv(models.find((model) => model.id === activeModelId)?.data || createInitialCv()))
  const [reviewOpen, setReviewOpen] = useState(false)
  const [cvAcademicAlert, setCvAcademicAlert] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const sections = getCitizenSections(cv)
  const currentIndex = sections.findIndex((item) => item.id === section)
  const activeModel = models.find((model) => model.id === activeModelId)

  useEffect(() => {
    setModels((current) => current.map((model) => model.id === activeModelId ? { ...model, data: cloneCv(cv) } : model))
  }, [cv, activeModelId])

  useEffect(() => {
    if (!citizenSections.some((item) => item.id === section)) setSection(citizenSections[0].id)
  }, [section])

  useEffect(() => {
    setModels((current) => current.map((model) => ({ ...model, data: applyCitizenProfile(model.data, citizenProfile) })))
    setCv((current) => applyCitizenProfile(current, citizenProfile))
  }, [citizenProfile])

  useEffect(() => {
    window.localStorage.setItem(CV_MODELS_STORAGE_KEY, JSON.stringify(models))
    window.localStorage.setItem(CV_ACTIVE_STORAGE_KEY, activeModelId)
  }, [models, activeModelId])

  function selectModel(id) {
    const model = models.find((item) => item.id === id)
    if (!model) return
    if (id !== activeModelId) {
      setActiveModelId(id)
      setCv(applyCitizenProfile(cloneCv(model.data), citizenProfile))
    }
    setSection('experience')
  }

  function openModel(id) {
    selectModel(id)
    window.requestAnimationFrame(() => document.getElementById('cv-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function createModel() {
    const id = createEntryId('cv')
    const data = createBlankCvFrom(citizenProfile)
    const model = { id, name: `Novo currículo ${models.length + 1}`, data }
    setModels((current) => [...current, model])
    setActiveModelId(id)
    setCv(cloneCv(data))
    setSection('experience')
    const academicIssue = cvAcademicValidationIssue(data)
    if (academicIssue) setCvAcademicAlert(academicIssue)
    notify('Novo modelo de currículo criado')
  }

  function copyModel(id) {
    const source = models.find((item) => item.id === id)
    if (!source) return
    const newId = createEntryId('cv-copy')
    const data = cloneCv(id === activeModelId ? cv : source.data)
    const model = { id: newId, name: `Cópia de ${source.name}`, data }
    setModels((current) => [...current, model])
    setActiveModelId(newId)
    setCv(data)
    setSection('experience')
    notify('Cópia criada e aberta para edição')
  }

  function requestDeleteModel(id) {
    if (models.length === 1) {
      notify('É necessário manter pelo menos um currículo')
      return
    }
    setPendingDeleteId(id)
  }

  function confirmDeleteModel() {
    if (!pendingDeleteId) return
    const remaining = models.filter((item) => item.id !== pendingDeleteId)
    setModels(remaining)
    if (pendingDeleteId === activeModelId) {
      const nextModel = remaining[0]
      setActiveModelId(nextModel.id)
      setCv(cloneCv(nextModel.data))
      setSection('experience')
    }
    setPendingDeleteId(null)
    notify('Currículo excluído com sucesso')
  }

  function renameActiveModel(value) {
    setModels((current) => current.map((model) => model.id === activeModelId ? { ...model, name: value } : model))
  }

  function requestReview() {
    const academicIssue = cvAcademicValidationIssue(cv)
    if (academicIssue) {
      setCvAcademicAlert(academicIssue)
      return
    }
    setReviewOpen(true)
  }

  function goToAcademicFormation() {
    setCvAcademicAlert(null)
    setSection('education')
    window.requestAnimationFrame(() => document.getElementById('cv-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  if (citizenSection === 'recommended') return <div className='workspace-shell citizen-workspace'><div className='page-breadcrumb'><span>Para você</span><ChevronRight size={13}/><strong>Vagas recomendadas</strong><em>Ordenadas para o seu perfil</em></div><main className='citizen-content jobs-content'><CitizenVacancyCatalog recommended vacancies={publishedVacancies} applications={applications} onApply={onApply} onUpdateApplication={onUpdateApplication} onOpenCv={() => onCitizenNavigate('cv')} notify={notify}/></main></div>

  if (citizenSection === 'published') return <div className="workspace-shell citizen-workspace"><div className="page-breadcrumb"><span>Para você</span><ChevronRight size={13} /><strong>Vagas publicadas</strong><em>{publishedVacancies.length} oportunidades para testar</em></div><main className="citizen-content jobs-content"><CitizenVacancyCatalog vacancies={publishedVacancies} applications={applications} onApply={onApply} onUpdateApplication={onUpdateApplication} onOpenCv={() => onCitizenNavigate('cv')} notify={notify} /></main></div>

  if (citizenSection === 'applications') return <div className="workspace-shell citizen-workspace"><div className="page-breadcrumb"><span>Vagas</span><ChevronRight size={13} /><strong>Candidaturas</strong><em>{applications.filter((item) => item.candidateId === 'citizen-current').length} em acompanhamento</em></div><main className="citizen-content jobs-content"><CitizenApplicationsPage vacancies={publishedVacancies} applications={applications} onApply={onApply} onUpdateApplication={onUpdateApplication} onOpenCv={() => onCitizenNavigate('cv')} notify={notify} /></main></div>

  return <div className="workspace-shell citizen-workspace">
    <div className="page-breadcrumb"><span>Minha conta</span><ChevronRight size={13} /><strong>Meu currículo</strong><em>Última atualização: hoje</em></div>
    <main className="citizen-content">
      <CvLibraryCards models={models} activeModelId={activeModelId} cv={cv} onSelect={selectModel} onEdit={openModel} onCopy={copyModel} onDelete={requestDeleteModel} onCreate={createModel} onRename={renameActiveModel} onTitleChange={(value) => setCv((current) => ({ ...current, professionalTitle: value }))} />
      <CitizenOverview cv={cv} sections={sections} onReview={requestReview} />
      <div className="cv-layout" id="cv-editor">
        <aside className="cv-navigation"><div><strong>Seções do currículo</strong><small>O progresso acompanha os dados preenchidos</small></div>{sections.map((item) => { const Icon = item.icon; return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}><span><Icon size={16} /></span><div><strong>{item.label}</strong><small>{item.completion === 100 ? 'Bloco concluído' : item.completion ? `${item.completion}% preenchido` : 'Não iniciado'}</small></div>{item.completion === 100 ? <CheckCircle2 size={15} /> : <ChevronRight size={15} />}</button> })}</aside>
        <div className="cv-form">
          {section === 'experience' && <ExperienceForm cv={cv} setCv={setCv} />}
          {section === 'education' && <EducationForm cv={cv} setCv={setCv} />}
          {section === 'courses' && <CoursesForm cv={cv} setCv={setCv} />}
          {section === 'languages' && <LanguagesForm cv={cv} setCv={setCv} />}
          {section === 'digital' && <DigitalForm cv={cv} setCv={setCv} />}
          {section === 'skills' && <SkillsForm cv={cv} setCv={setCv} />}
          {section === 'links' && <LinksForm cv={cv} setCv={setCv} />}
          {section === 'summary' && <SummaryForm cv={cv} setCv={setCv} />}
        </div>
      </div>
    </main>
    <footer className="sticky-actions"><button className="save-draft" onClick={() => notify('Modelo salvo automaticamente')}><Save size={16} /> Salvo automaticamente</button><div><span className={`block-completion ${sections[currentIndex].completion === 100 ? 'done' : ''}`}>{sections[currentIndex].completion}% do bloco</span>{currentIndex > 0 && <button className="back-action" onClick={() => setSection(sections[currentIndex - 1].id)}>Seção anterior</button>}<button className="next-action" onClick={() => currentIndex < sections.length - 1 ? setSection(sections[currentIndex + 1].id) : requestReview()}>{currentIndex < sections.length - 1 ? 'Salvar e continuar' : 'Revisar currículo'} <ArrowRight size={16} /></button></div></footer>
    {reviewOpen && <CvReviewModal cv={cv} modelName={activeModel?.name || 'Currículo'} onClose={() => setReviewOpen(false)} notify={notify} />}
    {cvAcademicAlert && <CvAcademicAlertModal issue={cvAcademicAlert} onCancel={() => setCvAcademicAlert(null)} onFix={goToAcademicFormation} />}
    {pendingDeleteId && <DeleteCvModal model={models.find((model) => model.id === pendingDeleteId)} onCancel={() => setPendingDeleteId(null)} onConfirm={confirmDeleteModel} />}
  </div>
}

function ProductPrototype() {
  function personaFromUrl() {
    const parameters = new URLSearchParams(window.location.search)
    const requestedProfile = parameters.get('perfil') || parameters.get('persona')
    return ['cidadao', 'cidadão', 'citizen'].includes(requestedProfile?.toLowerCase()) ? 'citizen' : 'company'
  }

  const [persona, setPersona] = useState(personaFromUrl)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [citizenSection, setCitizenSection] = useState('cv')
  const [citizenProfile, setCitizenProfile] = useState(loadCitizenProfile)
  const [citizenProfileOpen, setCitizenProfileOpen] = useState(false)
  const [publishedVacancies, setPublishedVacancies] = useState(() => {
    const stored = readStoredValue(VACANCIES_STORAGE_KEY, [])
    const legacy = readStoredValue(VACANCY_STORAGE_KEY, null)
    return stored.length ? stored : legacy ? [legacy] : []
  })
  const [companySection, setCompanySection] = useState(() => readStoredValue(VACANCIES_STORAGE_KEY, []).length || readStoredValue(VACANCY_STORAGE_KEY, null) ? 'published' : 'create')
  const [activeVacancyId, setActiveVacancyId] = useState(() => window.localStorage.getItem(ACTIVE_VACANCY_STORAGE_KEY) || '')
  const [applications, setApplications] = useState(() => readStoredValue(APPLICATIONS_STORAGE_KEY, []).map((application) => ({ ...application, cv: application.cv ? migrateCvCatalogData(application.cv) : application.cv })))
  const publishedVacancy = publishedVacancies.find((item) => item.id === activeVacancyId) || publishedVacancies.at(-1) || null

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search)
    if (!parameters.has('perfil')) {
      parameters.set('perfil', persona === 'citizen' ? 'cidadao' : 'empresa')
      parameters.delete('persona')
      window.history.replaceState({}, '', `${window.location.pathname}?${parameters.toString()}${window.location.hash}`)
    }
    document.title = persona === 'citizen' ? 'Trampolim · Área do cidadão' : 'Trampolim · Área da empresa'
    function synchronizeProfileFromUrl() {
      setPersona(personaFromUrl())
    }
    window.addEventListener('popstate', synchronizeProfileFromUrl)
    return () => window.removeEventListener('popstate', synchronizeProfileFromUrl)
  }, [persona])

  useEffect(() => {
    window.localStorage.setItem(VACANCIES_STORAGE_KEY, JSON.stringify(publishedVacancies))
  }, [publishedVacancies])

  useEffect(() => {
    if (publishedVacancy) {
      window.localStorage.setItem(ACTIVE_VACANCY_STORAGE_KEY, publishedVacancy.id)
      if (publishedVacancy.id !== activeVacancyId) setActiveVacancyId(publishedVacancy.id)
    }
  }, [publishedVacancy, activeVacancyId])

  useEffect(() => {
    window.localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications))
  }, [applications])

  useEffect(() => {
    setApplications((current) => current.map((application) => {
      const vacancy = publishedVacancies.find((item) => item.id === application.vacancyId)
      if (!vacancy || !application.cv) return application
      return { ...application, compatibility: calculateVacancyCompatibility({ job: vacancy.job, criteria: vacancy.criteria }, application.cv), profileSnapshot: application.cv }
    }))
  }, [publishedVacancies])

  useEffect(() => {
    window.localStorage.setItem(CITIZEN_PROFILE_STORAGE_KEY, JSON.stringify(citizenProfile))
  }, [citizenProfile])

  function notify(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2300)
  }

  function addApplication(application) {
    setApplications((current) => [...current.filter((item) => !(item.vacancyId === application.vacancyId && item.candidateId === application.candidateId)), application])
  }

  function updateApplication(id, changes) {
    setApplications((current) => current.map((item) => item.id === id ? { ...item, ...changes, updatedAt: localIsoDate(new Date()) } : item))
  }

  function publishVacancy(vacancy) {
    setPublishedVacancies((current) => [...current.filter((item) => item.id !== vacancy.id), vacancy])
    setActiveVacancyId(vacancy.id)
  }

  function saveCitizenProfile(profile) {
    setCitizenProfile(profileFromCv(profile))
    setCitizenProfileOpen(false)
    notify('Perfil atualizado em todos os currículos')
  }

  return <div className="product-app">
    <AppHeader persona={persona} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} citizenProfile={citizenProfile} />
    <div className="product-body"><Sidebar persona={persona} open={sidebarOpen} onClose={() => setSidebarOpen(false)} companySection={companySection} onCompanyNavigate={setCompanySection} citizenSection={citizenSection} onCitizenNavigate={setCitizenSection} citizenProfile={citizenProfile} onEditCitizenProfile={() => setCitizenProfileOpen(true)} citizenApplicationCount={applications.filter((item) => item.candidateId === 'citizen-current').length} />{sidebarOpen && <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}{persona === 'company' ? <CompanyWorkspace notify={notify} companySection={companySection} onCompanyNavigate={setCompanySection} publishedVacancy={publishedVacancy} publishedVacancies={publishedVacancies} applications={applications} onPublish={publishVacancy} onSelectVacancy={setActiveVacancyId} onUpdateApplication={updateApplication} onStartNewVacancy={() => {}} /> : <CitizenWorkspace notify={notify} publishedVacancies={publishedVacancies} applications={applications} onApply={addApplication} onUpdateApplication={updateApplication} citizenSection={citizenSection} onCitizenNavigate={setCitizenSection} citizenProfile={citizenProfile} />}</div>
    {citizenProfileOpen && <CitizenProfileModal profile={citizenProfile} onClose={() => setCitizenProfileOpen(false)} onSave={saveCitizenProfile} />}
    {toast && <div className="product-toast"><CheckCircle2 size={17} />{toast}</div>}
  </div>
}

export default ProductPrototype
