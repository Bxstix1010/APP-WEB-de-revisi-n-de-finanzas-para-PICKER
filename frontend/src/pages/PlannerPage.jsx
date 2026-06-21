import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Clock, Calculator } from 'lucide-react'
import { daysAPI } from '../api'

const CLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

/**
 * Input numérico controlado como STRING para evitar el bug de
 * "el 0 inicial no se borra al escribir". El valor numérico real
 * se calcula al vuelo con Number(), nunca se guarda un 0 fantasma.
 */
function NumberField({ value, onChange, placeholder, prefix, className = '' }) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    setRaw(value === 0 ? '' : String(value))
  }, [value])

  const handleChange = (e) => {
    let v = e.target.value
    v = v.replace(/[^\d]/g, '')
    if (v.length > 1) v = v.replace(/^0+/, '')
    setRaw(v)
    onChange(v === '' ? 0 : Number(v))
  }

  return (
    <div className="flex items-center gap-2">
      {prefix && <span className="text-slate-500 text-sm">{prefix}</span>}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        onChange={handleChange}
        placeholder={placeholder}
        className={`input ${className}`}
      />
    </div>
  )
}

export default function PlannerPage() {
  const { dayId } = useParams()
  const navigate  = useNavigate()

  const [day,     setDay]     = useState(null)
  const [tariff,  setTariff]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const [tipo,        setTipo]        = useState('normal')
  const [skuPromedio, setSkuPromedio] = useState(12)
  const [metaDia,     setMetaDia]     = useState(32000)
  const [rachaInicio, setRachaInicio] = useState('08:00')
  const [rachaFin,    setRachaFin]    = useState('16:00')
  const [bonoRacha,   setBonoRacha]   = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const { data: d } = await daysAPI.get(dayId)
        setDay(d)
        if (d.meta_diaria)  setMetaDia(d.meta_diaria)
        if (d.racha_inicio) setRachaInicio(d.racha_inicio)
        if (d.racha_fin)    setRachaFin(d.racha_fin)
        if (d.bono_racha)   setBonoRacha(d.bono_racha)

        // El backend ahora incluye la tarifa vigente de la empresa
        // directamente en el detalle del día — un solo round-trip.
        if (d.tariff_activa) setTariff(d.tariff_activa)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dayId])

  // ── Lógica: Pedido = fijo_por_tipo + (SKU × valor_sku) ──────────
  // El fijo NUNCA cambia. Lo único variable pedido a pedido es el SKU.

  const fijoPorTipo  = () => !tariff ? 0 : (tipo === 'normal' ? tariff.normal_por_pedido : tariff.bip_por_pedido)
  const valorPorSku  = () => !tariff ? 0 : (tipo === 'normal' ? tariff.normal_por_sku    : tariff.bip_por_sku)
  const valorPorPedido = () => fijoPorTipo() + valorPorSku() * skuPromedio

  const restanteSinBono   = Math.max(0, metaDia - bonoRacha)
  const vpp                = valorPorPedido()
  const pedidosNecesarios  = vpp > 0 ? Math.ceil(restanteSinBono / vpp) : 0
  const pedidosConMargen   = pedidosNecesarios > 0 ? pedidosNecesarios + 1 : 0
  const estimadoConMargen  = pedidosConMargen * vpp + bonoRacha

  const horasDesdeRacha = () => {
    try {
      const [h1, m1] = rachaInicio.split(':').map(Number)
      const [h2, m2] = rachaFin.split(':').map(Number)
      return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60)
    } catch { return 0 }
  }
  const horas = horasDesdeRacha()

  const handleGuardar = async () => {
    setSaving(true)
    try {
      await daysAPI.update(dayId, {
        meta_diaria:  metaDia,
        racha_inicio: rachaInicio,
        racha_fin:    rachaFin,
        bono_racha:   bonoRacha,
        horas_reales: horas,
      })
      navigate(`/days/${dayId}`)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
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
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-100">Planificar día</h1>
          <p className="text-xs text-slate-500">{day?.fecha}</p>
        </div>
      </div>

      {/* RESULTADO ESTIMADO */}
      <div className="bg-emerald-950 border border-emerald-800/50 rounded-2xl p-4">
        <p className="text-xs text-emerald-400 uppercase tracking-widest mb-1">Estimado del día</p>
        <p className="text-3xl font-semibold text-emerald-400">{CLP(estimadoConMargen)}</p>
        <p className="text-xs text-emerald-700 mt-1">
          {estimadoConMargen >= metaDia
            ? `✓ Superas tu meta por ${CLP(estimadoConMargen - metaDia)}`
            : `Faltan ${CLP(metaDia - estimadoConMargen)} para tu meta`}
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { val: pedidosConMargen, lbl: 'pedidos' },
            { val: skuPromedio * pedidosConMargen, lbl: 'SKU est.' },
            { val: `${horas.toFixed(1)}h`, lbl: 'trabajadas' },
          ].map(({ val, lbl }) => (
            <div key={lbl} className="bg-emerald-900/40 rounded-xl p-2.5 text-center">
              <p className="text-base font-medium text-emerald-300">{val}</p>
              <p className="text-xs text-emerald-700 mt-0.5">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* TIPO DE PEDIDO */}
      <div>
        <p className="section-label">Tipo de pedido</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'normal',    label: 'Normal',    fijo: tariff?.normal_por_pedido, sku: tariff?.normal_por_sku },
            { id: 'bipicking', label: 'Bipicking', fijo: tariff?.bip_por_pedido,    sku: tariff?.bip_por_sku    },
          ].map(({ id, label, fijo, sku }) => (
            <button
              key={id}
              onClick={() => setTipo(id)}
              className={`card text-left transition-all ${
                tipo === id ? 'border-emerald-400/60 bg-emerald-950' : 'hover:border-slate-600'
              }`}
            >
              <p className={`text-sm font-medium ${tipo === id ? 'text-emerald-400' : 'text-slate-200'}`}>
                {label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {tariff ? `${CLP(fijo)} fijo + ${CLP(sku)}/SKU` : '—'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* DESGLOSE — fijo vs variable */}
      <div className="card">
        <p className="section-label">¿Cómo se calcula tu pedido?</p>
        <div className="flex items-center justify-between text-xs py-1.5">
          <span className="text-slate-500">Valor fijo ({tipo})</span>
          <span className="text-slate-300 font-medium">{CLP(fijoPorTipo())}</span>
        </div>
        <div className="flex items-center justify-between text-xs py-1.5 border-t border-slate-700/50">
          <span className="text-slate-500">+ SKU × {CLP(valorPorSku())}</span>
          <span className="text-slate-300 font-medium">{skuPromedio} × {CLP(valorPorSku())} = {CLP(valorPorSku() * skuPromedio)}</span>
        </div>
        <div className="flex items-center justify-between text-sm py-2 border-t border-slate-700 mt-1">
          <span className="text-slate-300 font-medium">Total por pedido</span>
          <span className="text-emerald-400 font-semibold">{CLP(vpp)}</span>
        </div>
      </div>

      {/* SKU PROMEDIO */}
      <div className="card">
        <p className="section-label">SKU promedio por pedido</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setSkuPromedio(Math.max(1, skuPromedio - 1))}
              className="bg-slate-900 text-slate-300 w-10 h-10 text-lg hover:bg-slate-800 transition-colors"
            >−</button>
            <div className="bg-slate-900 border-x border-slate-700 w-14 h-10 flex items-center justify-center
                            text-slate-100 font-medium text-sm">
              {skuPromedio}
            </div>
            <button
              onClick={() => setSkuPromedio(skuPromedio + 1)}
              className="bg-slate-900 text-slate-300 w-10 h-10 text-lg hover:bg-slate-800 transition-colors"
            >+</button>
          </div>
          <p className="text-xs text-slate-500">
            Ajusta según tu promedio real de productos por pedido
          </p>
        </div>
      </div>

      {/* META DEL DÍA */}
      <div className="card">
        <p className="section-label">¿Cuánto quieres ganar hoy?</p>
        <NumberField
          value={metaDia}
          onChange={setMetaDia}
          prefix="$"
          placeholder="32000"
          className="text-lg font-medium"
        />
        <p className="text-xs text-slate-500 mt-2">
          Necesitas{' '}
          <span className="text-violet-400 font-medium">{pedidosNecesarios} pedidos</span>
          {' '}con {skuPromedio} SKU promedio cada uno
          {bonoRacha > 0 && <> (ya descontado el bono de {CLP(bonoRacha)})</>}
        </p>
      </div>

      {/* RACHA HORARIA */}
      <div>
        <p className="section-label flex items-center gap-1.5">
          <Clock size={11} /> Racha horaria
        </p>
        <div className="card flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Inicio turno</label>
              <input
                type="time"
                value={rachaInicio}
                onChange={(e) => setRachaInicio(e.target.value)}
                className="input text-sky-400 font-medium"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Fin turno</label>
              <input
                type="time"
                value={rachaFin}
                onChange={(e) => setRachaFin(e.target.value)}
                className="input text-sky-400 font-medium"
              />
            </div>
          </div>

          <div className="bg-sky-950 border border-sky-800/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-sky-400">
              <Zap size={13} /> Bono racha
            </div>
            <div className="w-28">
              <NumberField
                value={bonoRacha}
                onChange={setBonoRacha}
                placeholder="0"
                className="!bg-transparent !border-0 !border-b !border-sky-700 !rounded-none
                           text-sky-400 font-medium text-sm text-right !py-0.5 !px-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1"><Clock size={11} /> Horas trabajadas</span>
            <span className="text-slate-300 font-medium">{horas.toFixed(1)} hrs</span>
          </div>
        </div>
      </div>

      {/* DESGLOSE FINAL */}
      <div className="bg-violet-950 border border-violet-800/30 rounded-2xl p-4">
        <p className="text-xs text-violet-400 flex items-center gap-1.5 mb-3">
          <Calculator size={13} /> Desglose para llegar a la meta
        </p>
        {[
          { label: 'Meta diaria',                                  val: CLP(metaDia),                  color: 'text-slate-200' },
          { label: 'Bono racha incluido',                           val: `− ${CLP(bonoRacha)}`,          color: 'text-sky-400'  },
          { label: 'Restante por cubrir con pedidos',               val: CLP(restanteSinBono),           color: 'text-slate-200' },
          { label: `Valor por pedido (fijo + ${skuPromedio} SKU)`,  val: CLP(vpp),                       color: 'text-slate-200' },
          { label: 'Pedidos mínimos para llegar exacto',            val: `${pedidosNecesarios} pedidos`, color: 'text-violet-300 font-medium' },
          { label: 'Recomendado (con margen)',                      val: `${pedidosConMargen} pedidos`,  color: 'text-violet-300 font-semibold' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-violet-900/50 last:border-0 text-xs gap-3">
            <span className="text-slate-500">{label}</span>
            <span className={`${color} text-right whitespace-nowrap`}>{val}</span>
          </div>
        ))}
      </div>

      <button onClick={handleGuardar} disabled={saving} className="btn-primary">
        {saving ? 'Guardando...' : 'Guardar planificación del día'}
      </button>

    </div>
  )
}
