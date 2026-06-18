"""
Endpoint de estadísticas para el dashboard.
Devuelve los datos listos para Recharts en el frontend.
"""
from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Month, Day, Company, Profile

stats_bp = Blueprint("stats", __name__)


@stats_bp.get("/month/<int:month_id>")
@jwt_required()
def stats_mes(month_id):
    user_id = int(get_jwt_identity())
    month   = Month.query.get_or_404(month_id)

    if month.company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    dias = sorted(month.days, key=lambda d: d.fecha)

    # Datos para gráfico de barras (ingresos por día)
    barras = [
        {
            "fecha":        d.fecha.strftime("%d %b"),
            "ingresos":     d.total_dia,
            "meta":         d.meta_diaria,
            "pedidos":      len(d.orders),
            "sku_total":    d.total_sku,
            "horas":        d.horas_reales,
        }
        for d in dias
    ]

    # Acumulado del mes (línea)
    acumulado = 0
    linea = []
    for d in dias:
        acumulado += d.total_dia
        linea.append({
            "fecha":      d.fecha.strftime("%d %b"),
            "acumulado":  acumulado,
            "meta_mes":   month.meta_mensual,
        })

    # Semana actual
    hoy           = date.today()
    inicio_semana = hoy - timedelta(days=hoy.weekday())
    fin_semana    = inicio_semana + timedelta(days=6)

    dias_semana = [
        d for d in dias
        if inicio_semana <= d.fecha <= fin_semana
    ]
    total_semana = sum(d.total_dia for d in dias_semana)

    # Distribución por tipo de pedido (pie chart)
    conteo_tipos: dict = {}
    for d in dias:
        for o in d.orders:
            conteo_tipos[o.tipo] = conteo_tipos.get(o.tipo, 0) + o.total_orden

    pie = [{"tipo": k, "valor": v} for k, v in conteo_tipos.items()]

    return jsonify({
        "resumen": {
            "total_mes":     month.total_mes,
            "meta_mensual":  month.meta_mensual,
            "progreso_pct":  month.progreso_pct,
            "total_semana":  total_semana,
            "dias_trabajados": len(dias),
        },
        "barras":    barras,
        "acumulado": linea,
        "pie":       pie,
    })


@stats_bp.get("/company/<int:company_id>/resumen")
@jwt_required()
def resumen_empresa(company_id):
    """Resumen histórico por meses de una empresa."""
    user_id = int(get_jwt_identity())
    company = Company.query.get_or_404(company_id)

    if company.profile.user_id != user_id:
        return jsonify({"error": "Sin acceso"}), 403

    meses = sorted(company.months, key=lambda m: m.created_at)

    return jsonify([
        {
            "mes":          m.nombre,
            "total":        m.total_mes,
            "meta":         m.meta_mensual,
            "progreso_pct": m.progreso_pct,
        }
        for m in meses
    ])
