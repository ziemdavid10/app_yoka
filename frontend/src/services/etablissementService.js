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

// --- ÉTABLISSEMENTS ---
export const fetchEtablissements = () => api('/etablissements');
export const saveEtablissement = (data) => api('/etablissements', { method: 'POST', body: JSON.stringify(data) });
export const updateEtablissement = (id, data) => api(`/etablissements/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleEtablissementStatus = (id, actif) => api(`/etablissements/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ actif }) });
export const deleteEtablissement = (id) => api(`/etablissements/${id}`, { method: 'DELETE' });

// --- ADMINISTRATEURS ---
export const fetchAdminsSysteme = () => api('/auth/admins');
export const updateAdmin = (id, data) => api(`/auth/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const toggleAdminStatus = (id, actif) => api(`/auth/admins/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ actif }) });
export const resetAdminPassword = (id, nouveau_mot_de_passe) => api(`/auth/admins/${id}/reinitialiser-mot-de-passe`, { method: 'PATCH', body: JSON.stringify({ nouveau_mot_de_passe }) });
export const deleteAdmin = (id) => api(`/auth/admins/${id}`, { method: 'DELETE' });