// CompaniesPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Trash2, Settings2 } from 'lucide-react'
import { companiesAPI, monthsAPI } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import useAuthStore from '../context/authStore'

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

export function CompaniesPage() {
  const navigate = useNavigate()
  const { profileId } = useAuthStore()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)

  // Form nueva empresa
  const [nombre, setNombre]   = useState('')
  const [normalPedido, setNormalPedido] = useState(1350)
  const [normalSku,    setNormalSku]    = useState(65)
  const [bipPedido,    setBipPedido]    = useState(1080)
  const [bipSku,       setBipSku]       = useState(52)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [companyToDelete, setCompanyToDelete] = useState(null)

  const load = async () => {
    if (!profileId) return
    const { data } = await companiesAPI.list(profileId)
    setCompanies(data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [profileId])

  const handleCreate = async () => {
    if (!nombre.trim()) return
    setSaving(true)
    try {
      await companiesAPI.create(profileId, {
        nombre,
        tarifa: {
          normal_por_pedido: normalPedido,
          normal_por_sku:    normalSku,
          bip_por_pedido:    bipPedido,
          bip_por_sku:       bipSku,
        }
      })
      setNombre('')
      setShowForm(false)
      await load()
    } catch (e) {
      alert(e.response?.data?.error || 'Error al crear empresa')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (company) => setCompanyToDelete(company)

  const confirmDelete = async () => {
    if (!companyToDelete) return
    setDeletingId(companyToDelete.id)
    try {
      await companiesAPI.delete(companyToDelete.id)
      await load()
      setCompanyToDelete(null)
    } catch (e) {
      console.error(e)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold">Empresas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-emerald-400 hover:text-emerald-300 p-1"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Form nueva empresa */}
      {showForm && (
        <div className="card flex flex-col gap-3">
          <p className="section-label">Nueva empresa</p>
          <input className="input" placeholder="Nombre (ej: Walmart)" value={nombre}
            onChange={e => setNombre(e.target.value)} />

          <p className="text-xs text-slate-500 mt-1">Tarifas iniciales</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Normal / pedido', val: normalPedido, set: setNormalPedido },
              { label: 'Normal / SKU',    val: normalSku,    set: setNormalSku    },
              { label: 'Bip / pedido',    val: bipPedido,    set: setBipPedido    },
              { label: 'Bip / SKU',       val: bipSku,       set: setBipSku       },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <label className="text-xs text-slate-500 block mb-1">{label}</label>
                <NumberField value={val} onChange={set} placeholder="0" />
              </div>
            ))}
          </div>
          <button onClick={handleCreate} disabled={saving} className="btn-primary">
            {saving ? 'Creando...' : 'Crear empresa'}
          </button>
        </div>
      )}

      {/* Lista empresas */}
      {companies.length === 0 ? (
        <div className="card text-center py-8 text-slate-500 text-sm">
          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
          No tienes empresas registradas
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {companies.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-slate-700 rounded-xl flex items-center justify-center">
                  <Building2 size={18} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{c.nombre}</p>
                  {c.tariff_activa && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Normal: ${c.tariff_activa.normal_por_pedido} + ${c.tariff_activa.normal_por_sku}/SKU
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/companies/${c.id}/tariff`)}
                  className="text-slate-600 hover:text-emerald-400 transition-colors p-1 flex-shrink-0"
                >
                  <Settings2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  disabled={deletingId === c.id}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Meses de esta empresa */}
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <MesesEmpresa companyId={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!companyToDelete}
        title="Eliminar empresa"
        message={
          <>
            Se eliminará <b className="text-slate-300">{companyToDelete?.nombre}</b> junto
            con todos sus meses, días y pedidos registrados. Esta acción no se puede deshacer.
          </>
        }
        loading={!!deletingId}
        onCancel={() => setCompanyToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function MesesEmpresa({ companyId }) {
  const navigate = useNavigate()
  const [months, setMonths]     = useState([])
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre]     = useState('')
  const [meta, setMeta]         = useState(0)
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    monthsAPI.list(companyId).then(({ data }) => setMonths(data))
  }, [companyId])

  const handleCreate = async () => {
    if (!nombre.trim() || !meta) return
    setSaving(true)
    try {
      await monthsAPI.create(companyId, { nombre, meta_mensual: meta })
      const { data } = await monthsAPI.list(companyId)
      setMonths(data)
      setNombre('')
      setMeta(0)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500">Meses</p>
        <button onClick={() => setShowForm(!showForm)} className="text-emerald-400 text-xs">
          + Agregar mes
        </button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-2 mb-3">
          <input className="input text-xs" placeholder="Ej: Junio 2025"
            value={nombre} onChange={e => setNombre(e.target.value)} />
          <NumberField value={meta} onChange={setMeta} placeholder="Meta mensual, ej: 200000" className="text-xs" />
          <button onClick={handleCreate} disabled={saving || !nombre.trim() || !meta} className="btn-primary py-2 text-xs">
            {saving ? 'Creando...' : 'Crear mes'}
          </button>
        </div>
      )}

      {months.map(m => (
        <button key={m.id} onClick={() => navigate(`/months/${m.id}`)}
          className="w-full flex items-center justify-between text-xs py-1.5 text-slate-400 hover:text-slate-200 transition-colors">
          <span>{m.nombre}</span>
          <span className="text-emerald-400">{m.progreso_pct}%</span>
        </button>
      ))}
    </div>
  )
}

export default CompaniesPage
