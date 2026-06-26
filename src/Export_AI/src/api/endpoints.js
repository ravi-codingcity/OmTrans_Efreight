import { api, API_BASE } from './client.js';

export const authApi = {
  // Existing backend /auth/me returns { success, data:{...} } → map to { user }.
  me: () => api.get('/auth/me').then((r) => ({ user: r.data.data || r.data.user })),
  updatePreferences: (data) => api.patch('/auth/preferences', data).then((r) => r.data),
};

export const aiApi = {
  models: () => api.get('/ai/models').then((r) => r.data),
  templates: () => api.get('/ai/templates').then((r) => r.data),
  usage: () => api.get('/ai/usage').then((r) => r.data),
};

export const jobApi = {
  create: (formData, onUploadProgress) =>
    api.post('/jobs', formData, { onUploadProgress }).then((r) => r.data),
  list: (params) => api.get('/jobs', { params }).then((r) => r.data),
  summary: () => api.get('/jobs/summary').then((r) => r.data),
  get: (id) => api.get(`/jobs/${id}`).then((r) => r.data),
  status: (id) => api.get(`/jobs/${id}/status`).then((r) => r.data),
  remove: (id) => api.delete(`/jobs/${id}`).then((r) => r.data),
  saveReportData: (id, data) => api.patch(`/jobs/${id}/report-data`, { data }).then((r) => r.data),
  generate: (id) => api.post(`/jobs/${id}/generate`).then((r) => r.data),
  mblData: (id) => api.get(`/jobs/${id}/mbl`).then((r) => r.data),
  saveMblData: (id, data) => api.patch(`/jobs/${id}/mbl-data`, { data }).then((r) => r.data),
  generateMbl: (id) => api.post(`/jobs/${id}/mbl/generate`).then((r) => r.data),
  isfData: (id) => api.get(`/jobs/${id}/isf`).then((r) => r.data),
  saveIsfData: (id, data) => api.patch(`/jobs/${id}/isf-data`, { data }).then((r) => r.data),
  generateIsf: (id) => api.post(`/jobs/${id}/isf/generate`).then((r) => r.data),
  downloadUrl: (id, format, template) =>
    `${API_BASE}/jobs/${id}/report?format=${format}${template ? `&template=${template}` : ''}`,
  download: (id, format, template) =>
    api.get(`/jobs/${id}/report`, { params: { format, template }, responseType: 'blob' }),
};
