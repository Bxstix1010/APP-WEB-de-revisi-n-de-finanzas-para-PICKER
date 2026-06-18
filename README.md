# 🛒 Picker Income Tracker — v2

Registro de ingresos para pickers de supermercado.  
Multi-empresa · Tarifas dinámicas · Dashboard con gráficos · Mobile-first.

---

## Stack

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Backend    | Python · Flask · SQLAlchemy         |
| Base datos | PostgreSQL (prod) / SQLite (dev)    |
| Auth       | JWT (access + refresh tokens)       |
| Frontend   | React 18 · Vite · Tailwind CSS      |
| Gráficos   | Recharts                            |
| Deploy     | Railway (backend + DB) · Vercel (frontend) |

---

## Estructura del repo

```
picker_v2/
├── backend/
│   ├── app/
│   │   ├── __init__.py       # App factory
│   │   ├── config.py         # Dev / Prod config
│   │   ├── models/           # User, Profile, Company, Tariff, Month, Day, Order
│   │   └── routes/           # auth, companies, months, days, orders, stats
│   ├── run.py
│   ├── requirements.txt
│   ├── Procfile              # Para Railway
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/              # axios client + métodos por recurso
    │   ├── context/          # authStore (Zustand)
    │   ├── pages/            # Dashboard, Month, Day, Login, Settings
    │   └── components/       # AppLayout, Charts, Cards, Forms
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Setup local

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env             # completar variables
python run.py
# → corre en http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → corre en http://localhost:5173
```

---

## Deploy en Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Agregar servicio PostgreSQL al proyecto
4. En el servicio Flask, agregar variables de entorno:
   - `FLASK_ENV=production`
   - `SECRET_KEY=<clave segura>`
   - `FRONTEND_URL=https://tu-app.vercel.app`
   - `DATABASE_URL` (Railway lo agrega automáticamente)
5. Railway detecta el `Procfile` y despliega automáticamente

---

## Modelo de datos

```
User
└── Profile            ("Picker Lider", "Picker Normal")
    └── Company        ("Walmart", "Falabella")
        ├── Tariff     (versionado — cada cambio de tarifa queda registrado)
        └── Month      ("Junio 2025")
            └── Day    (fecha, racha, bono, horas)
                └── Order  (tipo, SKU, monto calculado con snapshot de tarifa)
```

**Punto clave:** cada `Order` guarda un snapshot de la tarifa vigente al momento de registrarse. Así si la empresa cambia las tarifas en el futuro, los registros históricos no se ven afectados.

---

## Fases de desarrollo

- [x] **Fase 1** — Migración de stack (Flask API + React + PostgreSQL)
- [ ] **Fase 2** — Dashboard con gráficos (Recharts, dark mode)
- [ ] **Fase 3** — Multi-empresa y tarifas dinámicas (UI completa)
- [ ] **Fase 4** — Múltiples perfiles por usuario
