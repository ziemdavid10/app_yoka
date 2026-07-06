const API_URL = 'http://localhost:3000/api/auth';

export const loginService = async (credentials) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' // Pas besoin d'Authorization ici
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Une erreur est survenue lors de la connexion.');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

export const registerAdminService = async (adminData) => {
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Sécurisé par le token du superadmin
      },
      body: JSON.stringify({
        ...adminData,
        nom_role: 'ADMIN' // Forcé côté frontend pour cette action
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erreur lors de la création de l’administrateur.');
    return data;
  } catch (error) {
    throw error;
  }
};