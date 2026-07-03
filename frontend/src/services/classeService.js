const API_URL = 'http://localhost:3000/api/classes';
// Génération dynamique des en-têtes sécurisés
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export const fetchClasses = async () => {
  const response = await fetch(API_URL, { headers: getHeaders() });
  if (!response.ok) throw new Error('Impossible de charger les classes.');
  return await response.json();
};

export const saveClasse = async (classeData) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(classeData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error);
  return data;
};