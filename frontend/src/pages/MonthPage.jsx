import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, CalendarDays, Lock, Trash2 } from 'lucide-react'
import { daysAPI, statsAPI, monthsAPI } from '../api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import GoalRing from '../components/charts/GoalRing'
import ConfirmModal from '../components/ConfirmModal'

const CLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

export default function MonthPage() {
  const { monthId } = useParams()
  const navigate     = useNavigate()

  const [days,        setDays]        = useState([])
  const [resumen,     setResumen]     = useState(null)
  const [companyId,   setCompanyId]   = useState(null)
  const [monthNombre, setMonthNombre] = useState('')
  const [loading,     setLoading]     = useState(true)
  const [creatingDay, setCreatingDay] = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = async () => {
    const [{ data: d }, { data: s }, { data: mes }] = await Promise.all([
      daysAPI.list(monthId),
      statsAPI.month(monthId),
      monthsAPI.get(monthId),
    ])
    setDays(d)
    setResumen(s.resumen)
    setCompanyId(mes.company_id)
    setMonthNombre(mes.nombre)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
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

  const handleDeleteMonth = () => setConfirmOpen(true)

  const confirmDeleteMonth = async () => {
    setDeleting(true)
    try {
      await monthsAPI.delete(monthId)
      navigate('/companies')
    } catch (e) {
      console.error(e)
      setDeleting(false)
      setConfirmOpen(false)
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
        <h1 className="text-base font-semibold flex-1 truncate">{monthNombre || 'Días del mes'}</h1>
        <button
          onClick={handleDeleteMonth}
          disabled={deleting}
          className="text-slate-600 hover:text-red-400 transition-colors p-1"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Resumen del mes — el anillo reacciona a los días cerrados */}
      {resumen && (
        <div className="card flex items-center gap-4">
          <GoalRing pct={resumen.progreso_pct} color="#a78bfa" size={76} />
          <div className="flex-1">
            <p className="text-2xl font-semibold text-violet-400">{CLP(resumen.total_mes)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Meta: {CLP(resumen.meta_mensual)} · {resumen.dias_trabajados} días trabajados
            </p>
          </div>
        </div>
      )}

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
            const pct   = d.meta_diaria ? Math.round((d.total_dia / d.meta_diaria) * 100) : 0
            const label = format(new Date(d.fecha + 'T12:00'), "EEEE d MMM", { locale: es })
            return (
              <button
                key={d.id}
                onClick={() => navigate(`/days/${d.id}`)}
                className="card flex items-center gap-3 text-left hover:border-slate-600 transition-colors"
              >
                <GoalRing pct={pct} color="#4ade80" size={52} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-200 capitalize truncate">{label}</p>
                    {d.cerrado && <Lock size={11} className="text-slate-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{d.orders?.length || 0} pedidos · {d.total_sku} SKU</p>
                </div>
                <p className="text-sm font-medium text-emerald-400">{CLP(d.total_dia)}</p>
              </button>
            )
          })}
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar mes"
        message={
          <>
            Se eliminará <b className="text-slate-300">{monthNombre || 'este mes'}</b> junto
            con sus <b className="text-slate-300">{days.length} días</b> y todos los pedidos registrados.
            Esta acción no se puede deshacer.
          </>
        }
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDeleteMonth}
      />
    </div>
  )
}
