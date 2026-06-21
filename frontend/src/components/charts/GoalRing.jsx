/**
 * GoalRing — Anillo circular de progreso SVG
 * Props:
 *   pct       (0-100)  porcentaje completado
 *   color     string   color del trazo (hex o tailwind arbitrary)
 *   size      number   tamaño en px (default 72)
 *   label     string   texto debajo del anillo
 *   value     string   texto grande dentro del anillo
 *   sub       string   texto pequeño debajo del value (dentro del anillo)
 *   valueSub  string   texto chico debajo del value, fuera del anillo (ej: monto bruto)
 */
export default function GoalRing({
  pct = 0,
  color = '#4ade80',
  size = 72,
  label = '',
  value = '',
  sub = '',
  valueSub = '',
}) {
  const r          = (size - 12) / 2   // radio dejando margen para el trazo
  const circ       = 2 * Math.PI * r
  const offset     = circ - (Math.min(pct, 100) / 100) * circ
  const fontSize   = size < 60 ? '11px' : '13px'

  // Color del anillo según progreso si no se pasa color explícito
  const strokeColor =
    pct >= 100 ? '#4ade80' :
    pct >= 60  ? color :
    pct >= 30  ? '#f59e0b' :
                 '#f87171'

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Fondo */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#1e293b" strokeWidth={6}
          />
          {/* Progreso */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* Texto centro */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center', lineHeight: 1.2,
        }}>
          <div style={{ fontSize, fontWeight: 500, color: strokeColor }}>
            {Math.round(pct)}%
          </div>
          {sub && (
            <div style={{ fontSize: '9px', color: '#64748b', marginTop: 1 }}>{sub}</div>
          )}
        </div>
      </div>

      {value && (
        <div className="text-center">
          <div className="text-xs font-medium text-slate-200">{value}</div>
          {valueSub && <div className="text-[10px] text-slate-600 -mt-0.5">{valueSub}</div>}
          {label && <div className="text-xs text-slate-500 mt-0.5">{label}</div>}
        </div>
      )}
      {!value && label && (
        <div className="text-xs text-slate-500 text-center">{label}</div>
      )}
    </div>
  )
}
