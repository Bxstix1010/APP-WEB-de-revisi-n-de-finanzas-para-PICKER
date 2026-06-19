import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Zap, Clock, Calculator } from 'lucide-react'
import { daysAPI, companiesAPI } from '../api'

const CLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

export default function PlannerPage() {
  const { dayId } = useParams()
  const navigate  = useNavigate()

  const [day,      setDay]      = useState(null)
  const [tariff,   setTariff]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // Inputs del planificador
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
        // Pre-llenar con datos existentes
        if (d.meta_diaria)  setMetaDia(d.meta_diaria)
        if (d.racha_inicio) setRachaInicio(d.racha_inicio)
        if (d.racha_fin)    setRachaFin(d.racha_fin)
        if (d.bono_racha)   setBonoRacha(d.bono_racha)

        // Cargar tarifa de la empresa
        const companyId = d.company_id
        if (companyId) {
          const { data: c } = await companiesAPI.list(1) // TODO: perfil dinámico
          const comp = c.find(x => x.id === companyId)
          if (comp?.tariff_activa) setTariff(comp.tariff_activa)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dayId])

  // ── Cálculos en tiempo real ─────────────────────────────────────
  const valorPorPedido = () => {
    if (!tariff) return 0
    if (tipo === 'normal')    return tariff.normal_por_pedido + tariff.normal_por_sku * skuPromedio
    if (tipo === 'bipicking') return tariff.bip_por_pedido   + tariff.bip_por_sku   * skuPromedio
    return 0
  }

  const restanteSinBono = Math.max(0, metaDia - bonoRacha)
  const vpp             = valorPorPedido()
  const pedidosNecesarios = vpp > 0 ? Math.ceil(restanteSinBono / vpp) : 0
  const pedidosConMargen  = pedidosNecesarios + 1
  const estimadoConMargen = pedidosConMargen * vpp + bonoRacha

  // Horas trabajadas desde racha
  const horasDesdeRacha = () => {
    try {
      const [h1, m1] = rachaInicio.split(':').map(Number)
      const [h2, m2] = rachaFin.split(':').map(Number)
      return Math.max(0, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60)
    } catch { return 0 }
  }
  const horas = horasDesdeRacha()

  // Guardar planificación en el día
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

      {/* Header */}
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
            { id: 'normal',    label: 'Normal',    sub: tariff ? `${CLP(tariff.normal_por_pedido)} + ${tariff.normal_por_sku}/SKU` : '—' },
            { id: 'bipicking', label: 'Bipicking',  sub: tariff ? `${CLP(tariff.bip_por_pedido)} + ${tariff.bip_por_sku}/SKU` : '—' },
          ].map(({ id, label, sub }) => (
            <button
              key={id}
              onClick={() => setTipo(id)}
              className={`card text-left transition-all ${
                tipo === id
                  ? 'border-emerald-400/60 bg-emerald-950'
                  : 'hover:border-slate-600'
              }`}
            >
              <p className={`text-sm font-medium ${tipo === id ? 'text-emerald-400' : 'text-slate-200'}`}>{label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
            </button>
          ))}
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
            <div className="bg-slate-900 border-x border-slate-700 w-12 h-10 flex items-center justify-center
                            text-slate-100 font-medium text-sm">
              {skuPromedio}
            </div>
            <button
              onClick={() => setSkuPromedio(skuPromedio + 1)}
              className="bg-slate-900 text-slate-300 w-10 h-10 text-lg hover:bg-slate-800 transition-colors"
            >+</button>
          </div>
          <p className="text-xs text-slate-500">
            Valor por pedido: <span className="text-emerald-400 font-medium">{CLP(vpp)}</span>
          </p>
        </div>
      </div>

      {/* META DEL DÍA */}
      <div className="card">
        <p className="section-label">¿Cuánto quieres ganar hoy?</p>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">$</span>
          <input
            type="number"
            value={metaDia}
            onChange={(e) => setMetaDia(Number(e.target.value))}
            className="input"
            placeholder="32000"
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Necesitas{' '}
          <span className="text-violet-400 font-medium">{pedidosNecesarios} pedidos</span>
          {' '}con {skuPromedio} SKU promedio
          {bonoRacha > 0 && ` (ya incluye bono de ${CLP(bonoRacha)})`}
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
            <input
              type="number"
              value={bonoRacha}
              onChange={(e) => setBonoRacha(Number(e.target.value))}
              className="bg-transparent text-sky-400 font-medium text-sm text-right w-28
                         focus:outline-none border-b border-sky-700 pb-0.5"
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1"><Clock size={11} /> Horas trabajadas</span>
            <span className="text-slate-300 font-medium">{horas.toFixed(1)} hrs</span>
          </div>
        </div>
      </div>

      {/* DESGLOSE */}
      <div className="bg-violet-950 border border-violet-800/30 rounded-2xl p-4">
        <p className="text-xs text-violet-400 flex items-center gap-1.5 mb-3">
          <Calculator size={13} /> Desglose para llegar a la meta
        </p>
        {[
          { label: 'Meta diaria',             val: CLP(metaDia),               color: 'text-slate-200' },
          { label: 'Bono racha incluido',      val: `− ${CLP(bonoRacha)}`,      color: 'text-sky-400'  },
          { label: 'Restante por pedidos',     val: CLP(restanteSinBono),        color: 'text-slate-200' },
          { label: `Valor por pedido (${skuPromedio} SKU)`, val: CLP(vpp),      color: 'text-slate-200' },
          { label: 'Pedidos mínimos',          val: `${pedidosNecesarios} pedidos`, color: 'text-violet-300 font-medium' },
          { label: 'Con margen de seguridad',  val: `${pedidosConMargen} pedidos`,  color: 'text-violet-300 font-semibold' },
        ].map(({ label, val, color }) => (
          <div key={label} className="flex justify-between items-center py-2 border-b border-violet-900/50 last:border-0 text-xs">
            <span className="text-slate-500">{label}</span>
            <span className={color}>{val}</span>
          </div>
        ))}
      </div>

      {/* GUARDAR */}
      <button onClick={handleGuardar} disabled={saving} className="btn-primary">
        {saving ? 'Guardando...' : 'Guardar planificación del día'}
      </button>

    </div>
  )
}
