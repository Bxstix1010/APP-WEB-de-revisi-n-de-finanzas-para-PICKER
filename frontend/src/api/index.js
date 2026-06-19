import api from './client'

// ── Auth ──────────────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
  refresh:  ()     => api.post('/auth/refresh'),
}

// ── Companies ─────────────────────────────────────────────────────
export const companiesAPI = {
  list:           (profileId)       => api.get(`/companies/profile/${profileId}`),
  create:         (profileId, data) => api.post(`/companies/profile/${profileId}`, data),
  delete:         (companyId)       => api.delete(`/companies/${companyId}`),
  getTariffs:     (companyId)       => api.get(`/companies/${companyId}/tariffs`),
  updateTariffs:  (companyId, data) => api.post(`/companies/${companyId}/tariffs`, data),
}

// ── Months ────────────────────────────────────────────────────────
export const monthsAPI = {
  list:    (companyId)       => api.get(`/months/company/${companyId}`),
  create:  (companyId, data) => api.post(`/months/company/${companyId}`, data),
  update:  (monthId, data)   => api.patch(`/months/${monthId}`, data),
  delete:  (monthId)         => api.delete(`/months/${monthId}`),
}

// ── Days ──────────────────────────────────────────────────────────
export const daysAPI = {
  list:    (monthId)       => api.get(`/days/month/${monthId}`),
  get:     (dayId)         => api.get(`/days/${dayId}`),
  create:  (monthId, data) => api.post(`/days/month/${monthId}`, data),
  update:  (dayId, data)   => api.patch(`/days/${dayId}`, data),
  delete:  (dayId)         => api.delete(`/days/${dayId}`),
}

// ── Orders ────────────────────────────────────────────────────────
export const ordersAPI = {
  list:    (dayId)       => api.get(`/orders/day/${dayId}`),
  create:  (dayId, data) => api.post(`/orders/day/${dayId}`, data),
  delete:  (orderId)     => api.delete(`/orders/${orderId}`),
}

// ── Stats ─────────────────────────────────────────────────────────
export const statsAPI = {
  month:   (monthId)   => api.get(`/stats/month/${monthId}`),
  company: (companyId) => api.get(`/stats/company/${companyId}/resumen`),
}