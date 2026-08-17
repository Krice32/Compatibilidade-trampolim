import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown } from 'lucide-react'

const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const currentValue = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthPicker({ value, onChange, placeholder = 'Selecione o mês e o ano', locked = false }) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value?.slice(0, 4)) || new Date().getFullYear())
  const ref = useRef(null)
  const selectedYear = Number(value?.slice(0, 4))
  const selectedMonth = Number(value?.slice(5, 7))
  const label = value ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(selectedYear, selectedMonth - 1)) : placeholder

  useEffect(() => {
    const close = (event) => ref.current && !ref.current.contains(event.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (index) => {
    onChange?.(`${year}-${String(index + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  return <div className={`month-picker ${locked ? 'locked' : ''}`} ref={ref}>
    <button type={'button'} className={`month-picker-trigger ${value ? 'filled' : ''}`} disabled={locked} onClick={() => { setYear(selectedYear || new Date().getFullYear()); setOpen(!open) }}><CalendarDays size={17}/><span>{label}</span><ChevronDown size={15}/></button>
    {open && <div className={'month-picker-popover'}>
      <header><button type={'button'} onClick={() => setYear(year - 1)}><ArrowLeft size={17}/></button><strong>{year}</strong><button type={'button'} onClick={() => setYear(year + 1)}><ArrowRight size={17}/></button></header>
      <div className={'month-picker-grid'}>{months.map((month, index) => <button type={'button'} key={month} className={selectedYear === year && selectedMonth === index + 1 ? 'selected' : ''} onClick={() => choose(index)}>{month}</button>)}</div>
      <footer><button type={'button'} onClick={() => { onChange?.(''); setOpen(false) }}>Limpar</button><button type={'button'} onClick={() => { onChange?.(currentValue()); setOpen(false) }}>Este mês</button></footer>
    </div>}
  </div>
}
