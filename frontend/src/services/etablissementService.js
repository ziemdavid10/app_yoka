// services/etablissementService.js
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

const api = async (path, options = {}) => {
  const res = await fetch(`/api${path}`, { headers: getHeaders(), ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur.');
  return data;
};

export const fetchEtablissements = () => api('/etablissements');
export const saveEtablissement = (data) => api('/etablissements', { method: 'POST', body: JSON.stringify(data) });
export const updateEtablissement = (id, data) => api(`/etablissements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteEtablissement = (id) => api(`/etablissements/${id}`, { method: 'DELETE' });

export const fetchAdminsSysteme = () => api('/auth/admins');
export const updateAdmin = (id, data) => api(`/auth/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteAdmin = (id) => api(`/auth/admins/${id}`, { method: 'DELETE' });
export const toggleAdminStatus = (id, actif) => api(`/auth/admins/${id}/status`, { method: 'PATCH', body: JSON.stringify({ actif }) });