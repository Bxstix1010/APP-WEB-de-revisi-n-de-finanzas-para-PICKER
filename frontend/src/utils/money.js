/**
 * Formatea un número como pesos chilenos.
 */
export const CLP = (n) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0)

/**
 * Calcula el monto líquido después de la retención de boleta de honorarios.
 * @param {number} bruto         monto bruto generado
 * @param {number} retencionPct  porcentaje de retención (ej: 15.25)
 */
export const calcularLiquido = (bruto, retencionPct) => {
  if (!bruto) return 0
  const pct = retencionPct ?? 15.25
  return Math.round(bruto * (1 - pct / 100))
}
