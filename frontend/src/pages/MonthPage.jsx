// MonthPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CalendarDays } from 'lucide-react'
import { monthsAPI, daysAPI } from '../api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GoalRing from '../components/charts/GoalRing'

const CLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

export default function MonthPage() {
  const { monthId } = useParams()
  const navigate    = useNavigate()
  const [month, setMonth] = useState(null)
  const [days,  setDays]  = useState([])
  const [loading, setLoading] = useState(true)
  const [creatingDay, setCreatingDay] = useState(false)

  const load = async () => {
    const [{ data: m }, { data: d }] = await Promise.all([
      monthsAPI.list(1).then(() => ({ data: null })), // placeholder
      daysAPI.list(monthId),
    ])
    setDays(d)
  }

  useEffect(() => {
    daysAPI.list(monthId)
      .then(({ data }) => setDays(data))
      .finally(() => setLoading(false))
  }, [monthId])

  const handleNuevoDia = async () => {
    setCreatingDay(true)
    try {
      const { data } = await daysAPI.create(monthId, {
        fecha: format(new Date(), 'yyyy-MM-dd'),
      })
      navigate(`/days/${data.id}`)
    } catch (e) {
      alert(e.response?.data?.error || 'Error al crear día')
    } finally {
      setCreatingDay(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 p-1"><ArrowLeft size={20} /></button>
        <h1 className="text-base font-semibold">Días del mes</h1>
      </div>

      <button onClick={handleNuevoDia} disabled={creatingDay} className="btn-primary">
        <Plus size={16} /> {creatingDay ? 'Creando...' : 'Agregar día de hoy'}
      </button>

      {days.length === 0 ? (
        <div className="card text-center py-8 text-slate-500 text-sm">
          <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
          No hay días registrados
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...days].reverse().map(d => {
            const pct = d.meta_diaria ? Math.round((d.total_dia / d.meta_diaria) * 100) : 0
            const label = format(new Date(d.fecha + 'T12:00'), "EEEE d MMM", { locale: es })
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/days/${d.id}`)}
                className="card flex items-center gap-3 text-left hover:border-slate-600 transition-colors"
              >
                <GoalRing pct={pct} color="#4ade80" size={52} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 capitalize">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.orders?.length || 0} pedidos · {d.total_sku} SKU</p>
                </div>
                <p className="text-sm font-medium text-emerald-400">{CLP(d.total_dia)}</p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
