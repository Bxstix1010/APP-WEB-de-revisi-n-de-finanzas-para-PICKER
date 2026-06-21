import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, TrendingUp, Lock, LockOpen } from 'lucide-react'
import { daysAPI, ordersAPI } from '../api'
import GoalRing from '../components/charts/GoalRing'
import ConfirmModal from '../components/ConfirmModal'
import useAuthStore from '../context/authStore'
import { CLP, calcularLiquido } from '../utils/money'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Input numérico controlado como STRING — evita que un 0 inicial
 * bloquee la escritura de nuevos dígitos.
 */
function NumberField({ value, onChange, placeholder, className = '' }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    setRaw(value === 0 ? '' : String(value))
  }, [value])

  const handleChange = (e) => {
    let v = e.target.value.replace(/[^\d]/g, '')
    if (v.length > 1) v = v.replace(/^0+/, '')
    setRaw(v)
    onChange(v === '' ? 0 : Number(v))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      onChange={handleChange}
      placeholder={placeholder}
      className={`input ${className}`}
    />
  )
}

export default function DayPage() {
  const { dayId } = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuthStore()

  const [day,      setDay]      = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [closing,  setClosing]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Form nuevo pedido
  const [tipo,       setTipo]       = useState('normal')
  const [sku,        setSku]        = useState(12)
  const [especial,   setEspecial]   = useState(false)
  const [extraMonto, setExtraMonto] = useState(0)
  const [nota,       setNota]       = useState('')

  const loadDay = async () => {
    const { data } = await daysAPI.get(dayId)
    setDay(data)
  }

  useEffect(() => {
    loadDay().finally(() => setLoading(false))
  }, [dayId])

  const handleAddOrder = async () => {
    if (adding || day?.cerrado) return
    setAdding(true)
    try {
      await ordersAPI.create(dayId, {
        tipo, sku, especial, nota,
        extra_monto: especial ? extraMonto : 0,
      })
      setNota('')
      setEspecial(false)
      setExtraMonto(0)
      await loadDay()
    } catch (e) {
      console.error(e)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (orderId) => {
    if (day?.cerrado) return
    await ordersAPI.delete(orderId)
    await loadDay()
  }

  const handleToggleCerrado = async () => {
    setClosing(true)
    try {
      await daysAPI.update(dayId, { cerrado: !day.cerrado })
      await loadDay()
    } catch (e) {
      console.error(e)
    } finally {
      setClosing(false)
    }
  }

  const handleDeleteDay = () => setConfirmOpen(true)

  const confirmDeleteDay = async () => {
    setDeleting(true)
    try {
      await daysAPI.delete(dayId)
      navigate(`/months/${day.month_id}`)
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

  const pct = day?.meta_diaria
    ? Math.round((day.total_dia / day.meta_diaria) * 100)
    : 0

  const fechaLabel = day?.fecha
    ? format(new Date(day.fecha + 'T12:00'), "EEEE d 'de' MMMM", { locale: es })
    : ''

  const cerrado = day?.cerrado

  // Estimado de pedidos restantes para llegar a la meta diaria,
  // usando el tipo y SKU actualmente seleccionados en el formulario.
  const calcularRestantes = () => {
    if (!day?.tariff_activa || !day?.meta_diaria) return null
    const t = day.tariff_activa
    const fijo = tipo === 'normal' ? t.normal_por_pedido : t.bip_por_pedido
    const vSku = tipo === 'normal' ? t.normal_por_sku    : t.bip_por_sku
    const valorPorPedido = fijo + vSku * sku
    if (valorPorPedido <= 0) return null

    const faltante = Math.max(0, day.meta_diaria - day.total_dia)
    if (faltante === 0) return { completado: true }

    return {
      completado: false,
      pedidos: Math.ceil(faltante / valorPorPedido),
      valorPorPedido,
      faltante,
    }
  }
  const restantes = calcularRestantes()

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold capitalize">{fechaLabel}</h1>
            {cerrado && (
              <span className="badge-red flex items-center gap-1">
                <Lock size={10} /> Cerrado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{day?.orders?.length || 0} pedidos registrados</p>
        </div>
        {!cerrado && (
          <button
            onClick={() => navigate(`/planner/${dayId}`)}
            className="text-slate-500 hover:text-emerald-400 p-1 transition-colors"
          >
            <TrendingUp size={18} />
          </button>
        )}
      </div>

      {/* Resumen día */}
      <div className="card flex items-center gap-4">
        <GoalRing pct={pct} color="#4ade80" size={72} />
        <div className="flex-1">
          <p className="text-2xl font-semibold text-emerald-400">
            {CLP(calcularLiquido(day?.total_dia, user?.retencion_pct))}
          </p>
          <p className="text-xs text-slate-600">
            bruto {CLP(day?.total_dia)} · −{user?.retencion_pct ?? 15.25}% boleta
          </p>
          <p className="text-xs text-slate-500 mt-1">
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

      {/* Estimado de pedidos restantes — usa el tipo y SKU del formulario actual */}
      {!cerrado && restantes && !restantes.completado && (
        <div className="bg-violet-950 border border-violet-800/30 rounded-xl px-4 py-3 text-xs">
          <span className="text-violet-400">
            Te faltan <span className="font-semibold">{CLP(restantes.faltante)}</span>
            {' '}para tu meta · aprox.{' '}
            <span className="font-semibold">{restantes.pedidos} pedidos</span> más
            {' '}({tipo}, {sku} SKU c/u ≈ {CLP(restantes.valorPorPedido)})
          </span>
        </div>
      )}
      {!cerrado && restantes?.completado && (
        <div className="bg-emerald-950 border border-emerald-800/30 rounded-xl px-4 py-3 text-xs text-emerald-400">
          ✓ Ya alcanzaste tu meta diaria
        </div>
      )}

      {/* Botón cerrar / reabrir día */}
      <button
        onClick={handleToggleCerrado}
        disabled={closing}
        className={cerrado ? 'btn-secondary' : 'btn-secondary text-amber-400 border-amber-900/50'}
      >
        {cerrado ? <LockOpen size={16} /> : <Lock size={16} />}
        {closing
          ? 'Actualizando...'
          : cerrado
            ? 'Reabrir día (permitir más pedidos)'
            : 'Cerrar día (no se podrán agregar más pedidos)'}
      </button>

      {/* Botón eliminar día */}
      <button
        onClick={handleDeleteDay}
        disabled={deleting}
        className="btn-secondary text-red-400 border-red-900/50"
      >
        <Trash2 size={16} />
        {deleting ? 'Eliminando...' : 'Eliminar día'}
      </button>

      {/* Agregar pedido — bloqueado si el día está cerrado */}
      {cerrado ? (
        <div className="card text-center py-6">
          <Lock size={24} className="mx-auto mb-2 text-slate-600" />
          <p className="text-slate-400 text-sm font-medium">Este día está cerrado</p>
          <p className="text-slate-500 text-xs mt-1">
            Reabre el día si necesitas agregar o eliminar pedidos
          </p>
        </div>
      ) : (
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
          <div>
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

            {especial && (
              <div className="mt-2 bg-amber-950/50 border border-amber-800/30 rounded-xl px-3 py-2.5
                              flex items-center justify-between">
                <span className="text-xs text-amber-400">Monto extra de este pedido</span>
                <div className="w-24">
                  <NumberField
                    value={extraMonto}
                    onChange={setExtraMonto}
                    placeholder="500"
                    className="!bg-transparent !border-0 !border-b !border-amber-700 !rounded-none
                               text-amber-400 font-medium text-sm text-right !py-0.5 !px-0"
                  />
                </div>
              </div>
            )}
          </div>

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
      )}

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
                    {o.especial && (
                      <span className="badge-purple">
                        especial{o.extra_monto > 0 ? ` +${CLP(o.extra_monto)}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{o.sku} SKU{o.nota ? ` · ${o.nota}` : ''}</p>
                </div>
                <p className="text-sm font-medium text-emerald-400">{CLP(o.total_orden)}</p>
                {!cerrado && (
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        title="Eliminar día"
        message={
          <>
            Se eliminará el día <b className="text-slate-300">{fechaLabel}</b> junto
            con sus <b className="text-slate-300">{day?.orders?.length || 0} pedidos</b> registrados.
            Esta acción no se puede deshacer.
          </>
        }
        loading={deleting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmDeleteDay}
      />

    </div>
  )
}
