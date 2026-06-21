import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Info } from 'lucide-react'
import { companiesAPI } from '../api'
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
      className="input text-sm"
    />
  )
}

export default function EditTariffPage() {
  const { companyId } = useParams()
  const navigate       = useNavigate()

  const [company,  setCompany]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)

  const [normalPedido, setNormalPedido] = useState(0)
  const [normalSku,    setNormalSku]    = useState(0)
  const [bipPedido,    setBipPedido]    = useState(0)
  const [bipSku,       setBipSku]       = useState(0)

  useEffect(() => {
    async function load() {
      try {
        // No hay un GET individual de empresa, así que filtramos de la lista
        // del perfil — funciona igual de bien ya que companies suele ser una
        // lista corta.
        const { data: companies } = await companiesAPI.list(1)
        const c = companies.find(x => x.id === Number(companyId))
        if (!c) { setError('Empresa no encontrada'); return }
        setCompany(c)

        if (c.tariff_activa) {
          setNormalPedido(c.tariff_activa.normal_por_pedido)
          setNormalSku(c.tariff_activa.normal_por_sku)
          setBipPedido(c.tariff_activa.bip_por_pedido)
          setBipSku(c.tariff_activa.bip_por_sku)
        }
      } catch (e) {
        console.error(e)
        setError('Error al cargar la empresa')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companyId])

  const handleGuardar = async () => {
    setSaving(true)
    setError(null)
    try {
      await companiesAPI.updateTariffs(companyId, {
        normal_por_pedido: normalPedido,
        normal_por_sku:    normalSku,
        bip_por_pedido:    bipPedido,
        bip_por_sku:       bipSku,
      })
      navigate('/companies')
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar la tarifa')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const fechaVigente = company?.tariff_activa?.vigente_desde
    ? format(new Date(company.tariff_activa.vigente_desde + 'T12:00'), "d MMM yyyy", { locale: es })
    : null

  return (
    <div className="flex flex-col gap-4 pb-4">

      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white p-1">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold truncate">Editar tarifas — {company?.nombre}</h1>
      </div>

      {error && (
        <div className="bg-red-950 border border-red-800/50 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {fechaVigente && (
        <div className="bg-emerald-950 border border-emerald-800/50 rounded-xl px-4 py-3
                        flex items-center justify-between">
          <span className="text-xs text-emerald-400 flex items-center gap-1.5">
            <Check size={13} /> Tarifa vigente
          </span>
          <span className="text-xs text-emerald-700">Desde {fechaVigente}</span>
        </div>
      )}

      <div>
        <p className="section-label">Normal</p>
        <div className="card">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Fijo por pedido</label>
              <NumberField value={normalPedido} onChange={setNormalPedido} placeholder="1350" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Valor por SKU</label>
              <NumberField value={normalSku} onChange={setNormalSku} placeholder="65" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="section-label">Bipicking</p>
        <div className="card">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Fijo por pedido</label>
              <NumberField value={bipPedido} onChange={setBipPedido} placeholder="1080" />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Valor por SKU</label>
              <NumberField value={bipSku} onChange={setBipSku} placeholder="52" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-violet-950 border border-violet-800/30 rounded-xl px-4 py-3 text-xs
                      text-violet-400 leading-relaxed flex gap-2">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>
          Los pedidos ya registrados mantienen su valor original. Esta tarifa solo
          aplica a pedidos nuevos a partir de hoy.
        </span>
      </div>

      <button onClick={handleGuardar} disabled={saving} className="btn-primary">
        {saving ? 'Guardando...' : 'Guardar nueva tarifa'}
      </button>

    </div>
  )
}
