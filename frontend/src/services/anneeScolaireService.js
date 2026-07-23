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

export const fetchAnneesScolaires = () => api('/annees-scolaires');
export const saveAnneeScolaire = (data) => api('/annees-scolaires', { method: 'POST', body: JSON.stringify(data) });
export const activerAnneeScolaire = (id) => api(`/annees-scolaires/${id}/activer`, { method: 'PATCH' });
export const desactiverAnneeScolaire = (id) => api(`/annees-scolaires/${id}/desactiver`, { method: 'PATCH' });