import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginService } from '../services/authService';

const Login = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    identifiant: '',
    mot_de_passe: '',
    code_etablissement: '',
    isSuperAdmin: false
  });

  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials({
      ...credentials,
      [name]: type === 'checkbox' ? checked : value
    });
    // Effacer l'erreur dès que l'utilisateur modifie un champ
    if (erreur) setErreur('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChargement(true);
    setErreur('');

    try {
      const response = await loginService(credentials);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // REDIRECTION DYNAMIQUE SELON LE RÔLE
      if (response.user.roles.includes('SUPERADMIN')) {
        navigate('/superadmin/dashboard');
      } else if (response.user.roles.includes('ADMIN')) {
        navigate('/admin/dashboard');
      } else {
        setErreur("Votre rôle ne vous donne pas accès à l'application.");
      }

    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>App Yoka — Connexion</h2>
        <p style={styles.subtitle}>Gestion de la Scolarité</p>

        {/* Affichage de l'erreur si elle existe */}
        {erreur && <div style={styles.errorBox}>{erreur}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="isSuperAdmin"
              checked={credentials.isSuperAdmin}
              onChange={handleChange}
              disabled={chargement}
            />
            Se connecter en tant que Superadmin
          </label>

          {!credentials.isSuperAdmin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Code de l'établissement</label>
              <input
                type="text"
                name="code_etablissement"
                placeholder="Ex: YOKA-CAMPUS"
                value={credentials.code_etablissement}
                onChange={handleChange}
                required
                disabled={chargement}
                style={styles.input}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Identifiant</label>
            <input
              type="text"
              name="identifiant"
              placeholder="Nom d'utilisateur"
              value={credentials.identifiant}
              onChange={handleChange}
              required
              disabled={chargement}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              name="mot_de_passe"
              placeholder="••••••••"
              value={credentials.mot_de_passe}
              onChange={handleChange}
              required
              disabled={chargement}
              style={styles.input}
            />
          </div>

          <button type="submit" style={styles.button} disabled={chargement}>
            {chargement ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif' },
  card: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
  title: { margin: '0 0 10px 0', textAlign: 'center', color: '#333', fontSize: '24px' },
  subtitle: { margin: '0 0 30px 0', textAlign: 'center', color: '#777', fontSize: '14px' },
  form: { display: 'flex', flexDirection: 'column' },
  inputGroup: { marginBottom: '20px' },
  label: { marginBottom: '5px', fontSize: '14px', color: '#555', fontWeight: 'bold', display: 'block' },
  input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' },
  checkboxLabel: { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#555', cursor: 'pointer' },
  button: { padding: '12px', backgroundColor: '#0B6DAE', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
  errorBox: { backgroundColor: '#fde8e8', color: '#e53e3e', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', border: '1px solid #f8b4b4' }
};

export default Login;