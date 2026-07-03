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