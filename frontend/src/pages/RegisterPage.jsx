import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../context/authStore'

export default function RegisterPage() {
  const [nombre,   setNombre]   = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const { register, loading, error } = useAuthStore()
  const navigate = useNavigate()

  const handle = async (e) => {
    e.preventDefault()
    const ok = await register(nombre, email, password)
    if (ok) navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-2xl font-semibold text-slate-100">Crear cuenta</h1>
          <p className="text-slate-500 text-sm mt-1">Picker Tracker</p>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800/50 text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handle} className="flex flex-col gap-3">
          <input className="input" type="text" placeholder="Tu nombre"
            value={nombre} onChange={e => setNombre(e.target.value)} required />
          <input className="input" type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Contraseña"
            value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-primary mt-1">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-emerald-400 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
