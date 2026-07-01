// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { loginService } from '../services/authService';

// const Login = () => {
//   const navigate = useNavigate();
//   const [credentials, setCredentials] = useState({
//     identifiant: '',
//     mot_de_passe: '',
//     code_etablissement: '',
//     isSuperAdmin: false
//   });

//   const [erreur, setErreur] = useState('');
//   const [chargement, setChargement] = useState(false);

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setCredentials({
//       ...credentials,
//       [name]: type === 'checkbox' ? checked : value
//     });
//     // Effacer l'erreur dès que l'utilisateur modifie un champ
//     if (erreur) setErreur('');
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setChargement(true);
//     setErreur('');

//     try {
//       const response = await loginService(credentials);

//       localStorage.setItem('token', response.token);
//       localStorage.setItem('user', JSON.stringify(response.user));

//       // REDIRECTION DYNAMIQUE SELON LE RÔLE
//       if (response.user.roles.includes('SUPERADMIN')) {
//         navigate('/superadmin/dashboard');
//       } else if (response.user.roles.includes('ADMIN')) {
//         navigate('/admin/dashboard');
//       } else {
//         setErreur("Votre rôle ne vous donne pas accès à l'application.");
//       }

//     } catch (err) {
//       setErreur(err.message);
//     } finally {
//       setChargement(false);
//     }
//   };

//   return (
//     <div style={styles.container}>
//       <div style={styles.card}>
//         <h2 style={styles.title}>App Yoka — Connexion</h2>
//         <p style={styles.subtitle}>Gestion de la Scolarité</p>

//         {/* Affichage de l'erreur si elle existe */}
//         {erreur && <div style={styles.errorBox}>{erreur}</div>}

//         <form onSubmit={handleSubmit} style={styles.form}>
          
//           <label style={styles.checkboxLabel}>
//             <input
//               type="checkbox"
//               name="isSuperAdmin"
//               checked={credentials.isSuperAdmin}
//               onChange={handleChange}
//               disabled={chargement}
//             />
//             Se connecter en tant que Superadmin
//           </label>

//           {!credentials.isSuperAdmin && (
//             <div style={styles.inputGroup}>
//               <label style={styles.label}>Code de l'établissement</label>
//               <input
//                 type="text"
//                 name="code_etablissement"
//                 placeholder="Ex: YOKA-CAMPUS"
//                 value={credentials.code_etablissement}
//                 onChange={handleChange}
//                 required
//                 disabled={chargement}
//                 style={styles.input}
//               />
//             </div>
//           )}

//           <div style={styles.inputGroup}>
//             <label style={styles.label}>Identifiant</label>
//             <input
//               type="text"
//               name="identifiant"
//               placeholder="Nom d'utilisateur"
//               value={credentials.identifiant}
//               onChange={handleChange}
//               required
//               disabled={chargement}
//               style={styles.input}
//             />
//           </div>

//           <div style={styles.inputGroup}>
//             <label style={styles.label}>Mot de passe</label>
//             <input
//               type="password"
//               name="mot_de_passe"
//               placeholder="••••••••"
//               value={credentials.mot_de_passe}
//               onChange={handleChange}
//               required
//               disabled={chargement}
//               style={styles.input}
//             />
//           </div>

//           <button type="submit" style={styles.button} disabled={chargement}>
//             {chargement ? 'Connexion en cours...' : 'Se connecter'}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// const styles = {
//   container: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif' },
//   card: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' },
//   title: { margin: '0 0 10px 0', textAlign: 'center', color: '#333', fontSize: '24px' },
//   subtitle: { margin: '0 0 30px 0', textAlign: 'center', color: '#777', fontSize: '14px' },
//   form: { display: 'flex', flexDirection: 'column' },
//   inputGroup: { marginBottom: '20px' },
//   label: { marginBottom: '5px', fontSize: '14px', color: '#555', fontWeight: 'bold', display: 'block' },
//   input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '16px' },
//   checkboxLabel: { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#555', cursor: 'pointer' },
//   button: { padding: '12px', backgroundColor: '#0B6DAE', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
//   errorBox: { backgroundColor: '#fde8e8', color: '#e53e3e', padding: '10px', borderRadius: '5px', marginBottom: '20px', fontSize: '14px', textAlign: 'center', border: '1px solid #f8b4b4' }
// };

// export default Login;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginService } from '../services/authService';

const loadGoogleIconsFont = () => {
  if (document.getElementById('material-symbols-font')) return;
  const link = document.createElement('link');
  link.id = 'material-symbols-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
};

const Icon = ({ name, style = {}, filled = false }) => (
  <span
    className="material-symbols-outlined"
    style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}`, ...style }}
  >
    {name}
  </span>
);

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
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    loadGoogleIconsFont();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCredentials({
      ...credentials,
      [name]: type === 'checkbox' ? checked : value
    });
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
    <div className="yk-login">
      <style>{CSS}</style>

      {/* PANNEAU DE PRÉSENTATION (visible à partir des écrans moyens) */}
      <div className="yk-login-aside">
        <div className="yk-login-aside-top">
          <div className="yk-brand-mark"><Icon name="auto_stories" /></div>
          <span className="yk-aside-brand">Yoka École</span>
        </div>

        <div className="yk-aside-content">
          <h1>Pilotez votre établissement en toute sérénité.</h1>
          <p>Élèves, classes, inscriptions et caisse scolaire réunis dans un seul espace de gestion clair et fiable.</p>

          <ul className="yk-aside-points">
            <li><Icon name="task_alt" filled /> Suivi des inscriptions en temps réel</li>
            <li><Icon name="task_alt" filled /> Caisse et recouvrement centralisés</li>
            <li><Icon name="task_alt" filled /> Accès sécurisé multi-établissements</li>
          </ul>
        </div>

        <span className="yk-aside-footer">© {new Date().getFullYear()} Yoka École — Tous droits réservés</span>
      </div>

      {/* CARTE DE CONNEXION */}
      <div className="yk-login-main">
        <div className="yk-login-card">
          <div className="yk-login-header">
            <div className="yk-brand-mark yk-brand-mark-mobile"><Icon name="auto_stories" /></div>
            <h2 className="yk-login-title">Connexion</h2>
            <p className="yk-login-subtitle">Accédez à votre espace de gestion de la scolarité</p>
          </div>

          {erreur && (
            <div className="yk-error-box">
              <Icon name="error" filled />
              <span>{erreur}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="yk-login-form">

            <label className="yk-toggle-row">
              <input
                type="checkbox"
                name="isSuperAdmin"
                checked={credentials.isSuperAdmin}
                onChange={handleChange}
                disabled={chargement}
              />
              <span className="yk-toggle-switch" aria-hidden="true">
                <span className="yk-toggle-dot" />
              </span>
              <span className="yk-toggle-text">
                <Icon name="shield_person" style={{ fontSize: '18px' }} />
                Se connecter en tant que Superadmin
              </span>
            </label>

            {!credentials.isSuperAdmin && (
              <div className="yk-field">
                <label className="yk-label">Code de l'établissement</label>
                <div className="yk-input-wrap">
                  <Icon name="apartment" style={{ fontSize: '19px' }} />
                  <input
                    type="text"
                    name="code_etablissement"
                    placeholder="Ex : YOKA-CAMPUS"
                    value={credentials.code_etablissement}
                    onChange={handleChange}
                    required
                    disabled={chargement}
                    className="yk-input"
                  />
                </div>
              </div>
            )}

            <div className="yk-field">
              <label className="yk-label">Identifiant</label>
              <div className="yk-input-wrap">
                <Icon name="person" style={{ fontSize: '19px' }} />
                <input
                  type="text"
                  name="identifiant"
                  placeholder="Nom d'utilisateur"
                  value={credentials.identifiant}
                  onChange={handleChange}
                  required
                  disabled={chargement}
                  className="yk-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="yk-field">
              <label className="yk-label">Mot de passe</label>
              <div className="yk-input-wrap">
                <Icon name="lock" style={{ fontSize: '19px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="mot_de_passe"
                  placeholder="••••••••"
                  value={credentials.mot_de_passe}
                  onChange={handleChange}
                  required
                  disabled={chargement}
                  className="yk-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="yk-eye-btn"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} style={{ fontSize: '19px' }} />
                </button>
              </div>
            </div>

            <button type="submit" className="yk-submit-btn" disabled={chargement}>
              {chargement ? (
                <>
                  <Icon name="progress_activity" className="yk-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  <Icon name="login" />
                  Se connecter
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const CSS = `
  :root {
    --yk-ink: #0f172a;
    --yk-slate: #475569;
    --yk-muted: #64748b;
    --yk-border: #e6e9ef;
    --yk-card: #ffffff;
    --yk-green: #0e9f6e;
    --yk-blue: #0369a1;
    --yk-red: #dc2626;
  }

  * { box-sizing: border-box; }

  .yk-login {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    min-height: 100vh;
    display: flex;
    background: #f4f6fa;
  }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal; font-style: normal; font-size: 20px; line-height: 1;
    letter-spacing: normal; text-transform: none; display: inline-flex;
    white-space: nowrap; word-wrap: normal; direction: ltr; -webkit-font-smoothing: antialiased;
    flex-shrink: 0;
  }

  .yk-spin { animation: yk-spin 1s linear infinite; }
  @keyframes yk-spin { to { transform: rotate(360deg); } }

  .yk-brand-mark {
    width: 42px; height: 42px; border-radius: 11px;
    background: rgba(16, 185, 129, 0.15); color: #34d399;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .yk-brand-mark-mobile { display: none; margin: 0 auto 14px; }

  /* ---------- PANNEAU GAUCHE ---------- */
  .yk-login-aside {
    flex: 1 1 44%;
    max-width: 560px;
    background: linear-gradient(160deg, #0f172a 0%, #111c34 60%, #0b2a3d 100%);
    color: #e2e8f0;
    padding: 40px 48px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  .yk-login-aside::before {
    content: '';
    position: absolute; width: 360px; height: 360px; border-radius: 50%;
    background: radial-gradient(circle, rgba(52, 211, 153, 0.16), transparent 70%);
    top: -120px; right: -120px;
  }
  .yk-login-aside::after {
    content: '';
    position: absolute; width: 320px; height: 320px; border-radius: 50%;
    background: radial-gradient(circle, rgba(56, 189, 248, 0.12), transparent 70%);
    bottom: -100px; left: -100px;
  }

  .yk-login-aside-top { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
  .yk-aside-brand { font-size: 17px; font-weight: 700; color: #fff; }

  .yk-aside-content { position: relative; z-index: 1; max-width: 420px; }
  .yk-aside-content h1 { font-size: 30px; line-height: 1.3; font-weight: 800; color: #fff; margin: 0 0 14px; }
  .yk-aside-content p { font-size: 14.5px; line-height: 1.6; color: #94a3b8; margin: 0 0 28px; }

  .yk-aside-points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 13px; }
  .yk-aside-points li {
    display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: #cbd5e1; font-weight: 500;
  }
  .yk-aside-points .material-symbols-outlined { color: #34d399; font-size: 19px; }

  .yk-aside-footer { font-size: 11.5px; color: #64748b; position: relative; z-index: 1; }

  /* ---------- PANNEAU DROIT ---------- */
  .yk-login-main {
    flex: 1 1 56%;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 24px;
  }

  .yk-login-card {
    background: var(--yk-card);
    width: 100%; max-width: 408px;
    padding: 36px 32px;
    border-radius: 16px;
    border: 1px solid var(--yk-border);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 40px -16px rgba(15, 23, 42, 0.16);
  }

  .yk-login-header { text-align: center; margin-bottom: 24px; }
  .yk-login-title { margin: 0 0 6px; font-size: 22px; font-weight: 800; color: var(--yk-ink); }
  .yk-login-subtitle { margin: 0; font-size: 13.5px; color: var(--yk-muted); line-height: 1.5; }

  .yk-error-box {
    display: flex; align-items: center; gap: 9px;
    background: #fef2f2; color: var(--yk-red); border: 1px solid #fecaca;
    padding: 11px 14px; border-radius: 9px; margin-bottom: 18px; font-size: 13px; font-weight: 600;
  }

  .yk-login-form { display: flex; flex-direction: column; gap: 16px; }

  .yk-field { display: flex; flex-direction: column; gap: 6px; }
  .yk-label { font-size: 12.5px; color: var(--yk-slate); font-weight: 600; }

  .yk-input-wrap {
    display: flex; align-items: center; gap: 9px;
    border: 1px solid #d6dbe3; border-radius: 9px; padding: 0 12px;
    background: #fbfcfe; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .yk-input-wrap:focus-within { border-color: #94a3b8; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.10); background: #fff; }
  .yk-input-wrap .material-symbols-outlined { color: var(--yk-muted); }

  .yk-input {
    border: none; outline: none; background: transparent;
    padding: 11px 0; font-size: 14.5px; width: 100%; font-family: inherit; color: var(--yk-ink);
  }
  .yk-input:disabled { color: var(--yk-muted); }
  .yk-input::placeholder { color: #a0a8b6; }

  .yk-eye-btn {
    border: none; background: transparent; cursor: pointer; color: var(--yk-muted);
    display: flex; align-items: center; padding: 4px;
  }
  .yk-eye-btn:hover { color: var(--yk-slate); }

  .yk-toggle-row {
    display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none;
    padding: 10px 12px; border-radius: 9px; background: #f8fafc; border: 1px solid var(--yk-border);
  }
  .yk-toggle-row input { position: absolute; opacity: 0; width: 0; height: 0; }
  .yk-toggle-switch {
    width: 34px; height: 19px; border-radius: 999px; background: #cbd5e1; position: relative;
    transition: background 0.15s ease; flex-shrink: 0;
  }
  .yk-toggle-dot {
    position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%;
    background: #fff; transition: transform 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.25);
  }
  .yk-toggle-row input:checked + .yk-toggle-switch { background: #4338ca; }
  .yk-toggle-row input:checked + .yk-toggle-switch .yk-toggle-dot { transform: translateX(15px); }
  .yk-toggle-text { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--yk-slate); font-weight: 600; }

  .yk-submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px; background: #0369a1; color: #fff; border: none; border-radius: 9px;
    font-size: 14.5px; font-weight: 700; cursor: pointer; font-family: inherit;
    margin-top: 4px; transition: filter 0.15s ease, transform 0.05s ease;
  }
  .yk-submit-btn:hover:not(:disabled) { filter: brightness(0.93); }
  .yk-submit-btn:active:not(:disabled) { transform: translateY(1px); }
  .yk-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 900px) {
    .yk-login-aside { display: none; }
    .yk-login-main { flex: 1 1 100%; }
    .yk-brand-mark-mobile { display: flex; }
  }

  @media (max-width: 420px) {
    .yk-login-card { padding: 28px 20px; border-radius: 12px; }
    .yk-login-main { padding: 18px 14px; }
  }
`;

export default Login;
