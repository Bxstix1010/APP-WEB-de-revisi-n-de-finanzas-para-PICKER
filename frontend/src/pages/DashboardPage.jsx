import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { Plus, ChevronDown, TrendingUp, Clock, Package } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GoalRing from '../components/charts/GoalRing'
import { statsAPI, monthsAPI, companiesAPI, daysAPI } from '../api'
import useAuthStore from '../context/authStore'
import { CLP, calcularLiquido } from '../utils/money'
import clsx from 'clsx'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-emerald-400 font-medium">{CLP(payload[0]?.value)}</p>
      {payload[0]?.payload?.pedidos != null && (
        <p className="text-slate-500 mt-0.5">{payload[0].payload.pedidos} pedidos</p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [profiles,    setProfiles]    = useState([])
  const [companies,   setCompanies]   = useState([])
  const [activeCompany, setActiveCompany] = useState(null)
  const [months,      setMonths]      = useState([])
  const [activeMonth, setActiveMonth] = useState(null)
  const [stats,       setStats]       = useState(null)
  const [todayDay,    setTodayDay]    = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showCompanyPicker, setShowCompanyPicker] = useState(false)

  // Carga inicial: perfil → empresas → mes actual
  useEffect(() => {
    async function load() {
      try {
        // Por ahora usamos el primer perfil (Fase 4 expandirá esto)
        const { data: me } = await import('../api').then(m => m.authAPI.me())
        // Obtenemos perfiles del usuario desde companies listando por perfil 1
        // TODO: endpoint de perfiles
        const profileId = 1
        const { data: comps } = await companiesAPI.list(profileId)
        setCompanies(comps)

        if (comps.length > 0) {
          const comp = comps[0]
          setActiveCompany(comp)
          const { data: ms } = await monthsAPI.list(comp.id)
          setMonths(ms)
          if (ms.length > 0) {
            setActiveMonth(ms[0])
            const { data: st } = await statsAPI.month(ms[0].id)
            setStats(st)
            // Buscar día de hoy
            const hoy = format(new Date(), 'yyyy-MM-dd')
            const { data: days } = await daysAPI.list(ms[0].id)
            const hoyDay = days.find(d => d.fecha === hoy)
            setTodayDay(hoyDay || null)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Cargando datos...</p>
      </div>
    )
  }

  // Estado vacío — sin empresas
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="text-4xl">🏢</div>
        <p className="text-slate-300 font-medium">Aún no tienes empresas</p>
        <p className="text-slate-500 text-sm">Agrega tu primera empresa para empezar a registrar pedidos</p>
        <button onClick={() => navigate('/companies')} className="btn-primary max-w-xs">
          Agregar empresa
        </button>
      </div>
    )
  }

  const resumen = stats?.resumen || {}
  const barras  = stats?.barras  || []
  const hoy     = format(new Date(), "d 'de' MMMM", { locale: es })

  // Cálculos de objetivos
  const metaDia     = todayDay?.meta_diaria  || 0
  const totalDia    = todayDay?.total_dia    || 0
  const pctDia      = metaDia ? Math.round((totalDia / metaDia) * 100) : 0

  // Semana: estimamos meta semanal como meta_mensual / 4
  const metaSemana  = Math.round((activeMonth?.meta_mensual || 0) / 4)
  const totalSemana = resumen.total_semana || 0
  const pctSemana   = metaSemana ? Math.round((totalSemana / metaSemana) * 100) : 0

  const metaMes     = resumen.meta_mensual  || 0
  const totalMes    = resumen.total_mes     || 0
  const pctMes      = resumen.progreso_pct  || 0

  // Progreso de la racha — compara hora actual contra el rango definido.
  // No es un reloj en vivo, solo un cálculo que se actualiza al cargar/recargar el Dashboard.
  const calcularProgresoRacha = () => {
    if (!todayDay?.racha_inicio || !todayDay?.racha_fin) return null

    const ahora = new Date()
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes()

    const [h1, m1] = todayDay.racha_inicio.split(':').map(Number)
    const [h2, m2] = todayDay.racha_fin.split(':').map(Number)
    const minInicio = h1 * 60 + m1
    const minFin    = h2 * 60 + m2
    const duracionTotal = Math.max(1, minFin - minInicio)

    let transcurridos, estado
    if (minAhora < minInicio)      { transcurridos = 0;              estado = 'pendiente' }
    else if (minAhora > minFin)    { transcurridos = duracionTotal;  estado = 'finalizada' }
    else                            { transcurridos = minAhora - minInicio; estado = 'en curso' }

    return {
      pct: Math.round((transcurridos / duracionTotal) * 100),
      horasTranscurridas: (transcurridos / 60).toFixed(1),
      horasTotales: (duracionTotal / 60).toFixed(1),
      estado,
    }
  }

  const racha = calcularProgresoRacha()

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Selector de empresa */}
      <div className="relative">
        <button
          onClick={() => setShowCompanyPicker(!showCompanyPicker)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3
                     flex items-center gap-3 text-left"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {activeCompany?.nombre}
            </p>
            <p className="text-xs text-slate-500">{activeMonth?.nombre || 'Sin mes activo'}</p>
          </div>
          <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
        </button>

        {showCompanyPicker && companies.length > 1 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-slate-800 border border-slate-700
                          rounded-xl shadow-xl z-30 overflow-hidden">
            {companies.map(c => (
              <button
                key={c.id}
                onClick={async () => {
                  setActiveCompany(c)
                  setShowCompanyPicker(false)
                  const { data: ms } = await monthsAPI.list(c.id)
                  setMonths(ms)
                  if (ms.length > 0) {
                    setActiveMonth(ms[0])
                    const { data: st } = await statsAPI.month(ms[0].id)
                    setStats(st)
                  }
                }}
                className="w-full px-4 py-3 text-left text-sm text-slate-200
                           hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700/50 last:border-0"
              >
                <div className={clsx('w-2 h-2 rounded-full',
                  c.id === activeCompany?.id ? 'bg-emerald-400' : 'bg-slate-600')} />
                {c.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fecha */}
      <p className="text-slate-500 text-xs px-0.5 capitalize">{hoy}</p>

      {/* OBJETIVOS — 3 anillos */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="section-label !mb-0">Objetivos (líquido)</p>
          <span className="text-xs text-slate-600">−{user?.retencion_pct ?? 15.25}% boleta</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <GoalRing
            pct={pctDia} color="#4ade80" label="Hoy"
            value={CLP(calcularLiquido(totalDia, user?.retencion_pct))}
            valueSub={`bruto ${CLP(totalDia)}`}
            sub={`/ ${CLP(metaDia)}`}
          />
          <GoalRing
            pct={pctSemana} color="#38bdf8" label="Semana"
            value={CLP(calcularLiquido(totalSemana, user?.retencion_pct))}
            valueSub={`bruto ${CLP(totalSemana)}`}
            sub={`/ ${CLP(metaSemana)}`}
          />
          <GoalRing
            pct={pctMes} color="#a78bfa" label="Mes"
            value={CLP(calcularLiquido(totalMes, user?.retencion_pct))}
            valueSub={`bruto ${CLP(totalMes)}`}
            sub={`/ ${CLP(metaMes)}`}
          />
        </div>
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Package size={13} /> Pedidos hoy
          </div>
          <p className="text-xl font-medium text-slate-100">{todayDay?.orders?.length || 0}</p>
          <p className="text-xs text-slate-500">{todayDay?.total_sku || 0} SKU total</p>
        </div>
        <div className="card flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <Clock size={13} /> Racha hoy
          </div>
          <p className="text-xl font-medium text-sky-400">
            {todayDay?.bono_racha ? CLP(todayDay.bono_racha) : '—'}
          </p>
          <p className="text-xs text-slate-500">
            {todayDay?.racha_inicio && todayDay?.racha_fin
              ? `${todayDay.racha_inicio} — ${todayDay.racha_fin}`
              : 'Sin racha registrada'}
          </p>

          {racha && (
            <div className="mt-1.5">
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all"
                  style={{ width: `${racha.pct}%` }}
                />
              </div>
              <p className="text-xs text-sky-500 mt-1">
                {racha.estado === 'pendiente' && 'Aún no empieza'}
                {racha.estado === 'en curso'   && `Llevas ${racha.horasTranscurridas}h de ${racha.horasTotales}h`}
                {racha.estado === 'finalizada' && `Racha completa · ${racha.horasTotales}h`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* GRÁFICO DE BARRAS */}
      {barras.length > 0 && (
        <div className="card">
          <p className="section-label">Ingresos por día</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={barras} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="ingresos" radius={[3, 3, 0, 0]} maxBarSize={20}>
                {barras.map((entry, i) => {
                  const isToday = i === barras.length - 1
                  const pct = entry.meta ? entry.ingresos / entry.meta : 0
                  const color = isToday ? '#4ade80'
                    : pct >= 1 ? '#22c55e'
                    : pct >= 0.6 ? '#334155'
                    : '#1e293b'
                  return <Cell key={i} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* COMPARATIVA DE MESES */}
      {months.length > 1 && (
        <div>
          <p className="section-label">Comparar meses</p>
          <div className="grid grid-cols-2 gap-3">
            {months.slice(0, 4).map((m) => {
              const pct = m.meta_mensual
                ? Math.round((m.total_mes / m.meta_mensual) * 100)
                : 0
              const color = pct >= 100 ? '#4ade80'
                : pct >= 60 ? '#a78bfa'
                : pct >= 30 ? '#f59e0b'
                : '#f87171'
              return (
                <div
                  key={m.id}
                  onClick={() => navigate(`/months/${m.id}`)}
                  className="card flex flex-col items-center gap-2 cursor-pointer hover:border-slate-600 transition-colors"
                >
                  <GoalRing pct={pct} color={color} size={64} />
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-300">{m.nombre}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{CLP(m.total_mes)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* BOTÓN REGISTRAR PEDIDO */}
      <button
        onClick={() => todayDay
          ? navigate(`/days/${todayDay.id}`)
          : navigate(`/months/${activeMonth?.id}`)
        }
        className="btn-primary mt-2"
      >
        <Plus size={18} />
        {todayDay ? 'Registrar pedido' : 'Iniciar día de hoy'}
      </button>

      {/* Link al planificador */}
      {todayDay && (
        <button
          onClick={() => navigate(`/planner/${todayDay.id}`)}
          className="btn-secondary"
        >
          <TrendingUp size={16} />
          Planificar objetivos del día
        </button>
      )}

    </div>
  )
}
