import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, TrendingUp } from 'lucide-react'
import { daysAPI, ordersAPI } from '../api'
import GoalRing from '../components/charts/GoalRing'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const CLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

export default function DayPage() {
  const { dayId } = useParams()
  const navigate  = useNavigate()

  const [day,     setDay]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [adding,  setAdding]  = useState(false)

  // Form nuevo pedido
  const [tipo,     setTipo]     = useState('normal')
  const [sku,      setSku]      = useState(12)
  const [especial, setEspecial] = useState(false)
  const [nota,     setNota]     = useState('')

  const loadDay = async () => {
    const { data } = await daysAPI.get(dayId)
    setDay(data)
  }

  useEffect(() => {
    loadDay().finally(() => setLoading(false))
  }, [dayId])

  const handleAddOrder = async () => {
    if (adding) return
    setAdding(true)
    try {
      await ordersAPI.create(dayId, { tipo, sku, especial, nota })
      setNota('')
      setEspecial(false)
      await loadDay()
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (orderId) => {
    await ordersAPI.delete(orderId)
    await loadDay()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const pct = day?.meta_diaria
    ? Math.round((day.total_dia / day.meta_diaria) * 100)
    : 0

  const fechaLabel = day?.fecha
    ? format(new Date(day.fecha + 'T12:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold capitalize">{fechaLabel}</h1>
          <p className="text-xs text-slate-500">{day?.orders?.length || 0} pedidos registrados</p>
        </div>
        <button
          onClick={() => navigate(`/planner/${dayId}`)}
          className="ml-auto text-slate-500 hover:text-emerald-400 p-1 transition-colors"
        >
          <TrendingUp size={18} />
        </button>
      </div>

      {/* Resumen día */}
      <div className="card flex items-center gap-4">
        <GoalRing pct={pct} color="#4ade80" size={72} />
        <div className="flex-1">
          <p className="text-2xl font-semibold text-emerald-400">{CLP(day?.total_dia)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Meta: {CLP(day?.meta_diaria)} · {pct}% completado
          </p>
          {day?.bono_racha > 0 && (
            <p className="text-xs text-sky-400 mt-1">
              Bono racha: {CLP(day.bono_racha)}
              {day.racha_inicio && ` (${day.racha_inicio}–${day.racha_fin})`}
            </p>
          )}
        </div>
      </div>

      {/* Agregar pedido */}
      <div className="card flex flex-col gap-3">
        <p className="section-label">Registrar pedido</p>

        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2">
          {['normal', 'bipicking'].map(t => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                tipo === t
                  ? 'bg-emerald-950 border-emerald-400/60 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* SKU */}
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-500">SKU del pedido</label>
          <div className="flex items-center border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setSku(Math.max(1, sku - 1))}
              className="bg-slate-900 text-slate-300 w-9 h-9 text-base hover:bg-slate-800 transition-colors"
            >−</button>
            <div className="bg-slate-900 border-x border-slate-700 w-10 h-9
                            flex items-center justify-center text-slate-100 font-medium text-sm">
              {sku}
            </div>
            <button
              onClick={() => setSku(sku + 1)}
              className="bg-slate-900 text-slate-300 w-9 h-9 text-base hover:bg-slate-800 transition-colors"
            >+</button>
          </div>
        </div>

        {/* Especial */}
        <button
          onClick={() => setEspecial(!especial)}
          className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-sm transition-all ${
            especial
              ? 'bg-amber-950 border-amber-600/40 text-amber-400'
              : 'bg-slate-900 border-slate-700 text-slate-400'
          }`}
        >
          <span>Pedido especial</span>
          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center text-xs ${
            especial ? 'bg-amber-400 border-amber-400 text-slate-900' : 'border-slate-600'
          }`}>
            {especial ? '✓' : ''}
          </span>
        </button>

        {/* Nota opcional */}
        <input
          className="input text-xs"
          placeholder="Nota (opcional)"
          value={nota}
          onChange={e => setNota(e.target.value)}
        />

        <button onClick={handleAddOrder} disabled={adding} className="btn-primary">
          <Plus size={16} />
          {adding ? 'Agregando...' : 'Agregar pedido'}
        </button>
      </div>

      {/* Lista de pedidos */}
      {day?.orders?.length > 0 && (
        <div>
          <p className="section-label">Pedidos del día</p>
          <div className="flex flex-col gap-2">
            {[...day.orders].reverse().map((o) => (
              <div key={o.id} className="card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge-${o.tipo === 'normal' ? 'green' : 'blue'}`}>
                      {o.tipo}
                    </span>
                    {o.especial && <span className="badge-purple">especial</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{o.sku} SKU{o.nota ? ` · ${o.nota}` : ''}</p>
                </div>
                <p className="text-sm font-medium text-emerald-400">{CLP(o.total_orden)}</p>
                <button
                  onClick={() => handleDelete(o.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
