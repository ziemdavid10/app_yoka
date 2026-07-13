import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AuditLogDashboard } from '../components/AuditLogDashboard';

// Importation de vos services connectés
import { fetchEtablissements, saveEtablissement, fetchAdminsSysteme } from '../services/etablissementService';

// 1. UTILITAIRE : Chargement dynamique de la police d'icônes Google
const loadGoogleIconsFont = () => {
  if (document.getElementById('material-symbols-font')) return;
  const link = document.createElement('link');
  link.id = 'material-symbols-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
};

// 2. COMPOSANT : Rendu des icônes Google Material
const Icon = ({ name, style = {}, filled = false }) => (
  <span
    className="material-symbols-outlined"
    style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}`, ...style }}
  >
    {name}
  </span>
);

// 3. CONFIGURATION : Structure de la barre de navigation latérale
const NAV_ITEMS = [
  { key: 'vue_d_ensemble', label: "Vue d'ensemble", icon: 'dashboard' },
  { key: 'etablissements', label: 'Établissements', icon: 'apartment' },
  { key: 'admins', label: 'Gestion des admins', icon: 'manage_accounts' },
  { key: 'audit', label: "Pistes d'audit", icon: 'shield_heart' },
  { key: 'parametres', label: 'Configuration', icon: 'settings' }
];

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('vue_d_ensemble');
  const [message, setMessage] = useState({ texte: '', estErreur: false });
  
  const [etablissements, setEtablissements] = useState([]);
  const [admins, setAdmins] = useState([]);
  
  // États de chargement synchronisés avec le JSX
  const [loadingEtab, setLoadingEtab] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const [formEtab, setFormEtab] = useState({ nom: '', code_unique: '', adresse: '', telephone: '' });
  const [formAdmin, setFormAdmin] = useState({ identifiant: '', mot_de_passe: '', nom: '', prenom: '', code_etablissement: '' });

  const [statsGlobales, setStatsGlobales] = useState({ totalEtablissements: 0, chartData: [] });

  // Réception globale des données du backend
  const chargerDonneesSysteme = async () => {
    setLoadingEtab(true);
    try {
      const [listeEtab, listeAdmins] = await Promise.all([
        fetchEtablissements(),
        fetchAdminsSysteme()
      ]);
      
      setEtablissements(listeEtab);
      setAdmins(listeAdmins);
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setLoadingEtab(false);
    }
  };

  useEffect(() => {
    loadGoogleIconsFont(); // Initialisation de la police d'icônes
    chargerDonneesSysteme();
  }, []);

  // Synchronisation des statistiques financières réelles
  useEffect(() => {
    if (etablissements.length > 0) {
      const dataDynamique = etablissements.map(etab => ({
        name: etab.nom,
        Recettes: parseFloat(etab.total_recettes) || 0, 
        Dépenses: parseFloat(etab.total_depenses) || 0
      }));
      setStatsGlobales({
        totalEtablissements: etablissements.length,
        chartData: dataDynamique
      });
    }
  }, [etablissements]);

  const afficherMessage = (texte, estErreur = false) => {
    setMessage({ texte, estErreur });
    setTimeout(() => setMessage({ texte: '', estErreur: false }), 5000);
  };

  // ACTION : Création d'un établissement
  const handleEtabSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveEtablissement(formEtab);
      afficherMessage("Établissement déployé et isolé en base de données avec succès !");
      setFormEtab({ nom: '', code_unique: '', adresse: '', telephone: '' });
      chargerDonneesSysteme();
    } catch (err) {
      afficherMessage(err.message, true);
    }
  };

  // ACTION : Provisionnement d'un compte administrateur local
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoadingAdmin(true);
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formAdmin, nom_role: 'ADMIN' })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de créer le compte.");

      afficherMessage(`Accès administrateur générés pour l'établissement [${formAdmin.code_etablissement}]`);
      setFormAdmin({ identifiant: '', mot_de_passe: '', nom: '', prenom: '', code_etablissement: '' });
      chargerDonneesSysteme();
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setLoadingAdmin(false);
    }
  };

  return (
    <div className="yk-app-container">
      {/* ---------- SYSTEM ARCHITECTURE CSS ---------- */}
      <style>{`
        :root {
          --yk-brand: #4f46e5; --yk-brand-hover: #4338ca; --yk-bg: #f8fafc;
          --yk-card: #ffffff; --yk-border: #e2e8f0; --yk-ink: #0f172a;
          --yk-muted: #64748b; --yk-green: #10b981; --yk-red: #ef4444;
          --yk-radius: 12px; --yk-shadow: 0 1px 3px 0 rgba(0,0,0,0.1);
        }
        .yk-app-container { display: flex; min-height: 100vh; background: var(--yk-bg); font-family: 'Inter', sans-serif; color: var(--yk-ink); }
        .yk-sidebar { width: 260px; background: #0f172a; color: #fff; padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; }
        .yk-brand-title { font-size: 18px; font-weight: 800; padding: 0 12px 20px; border-bottom: 1px solid #1e293b; color: #fff; display: flex; align-items: center; gap: 8px; }
        .yk-nav-btn { display: flex; align-items: center; gap: 12px; padding: 12px; border: none; background: transparent; color: #94a3b8; border-radius: 8px; cursor: pointer; text-align: left; font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .yk-nav-btn:hover { background: #1e293b; color: #fff; }
        .yk-nav-btn.active { background: var(--yk-brand); color: #fff; }
        .yk-main-content { flex: 1; padding: 32px; overflow-y: auto; }
        .yk-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .yk-alert { padding: 14px 18px; border-radius: var(--yk-radius); margin-bottom: 20px; font-size: 13.5px; font-weight: 500; }
        .yk-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 28px; }
        .yk-kpi-card { background: #fff; border-radius: var(--yk-radius); padding: 20px; border: 1px solid var(--yk-border); box-shadow: var(--yk-shadow); }
        .yk-kpi-val { font-size: 24px; font-weight: 700; margin-top: 8px; }
        .yk-card { background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow); border: 1px solid var(--yk-border); padding: 20px; }
        .yk-grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .yk-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .yk-label { font-size: 12.5px; font-weight: 600; color: var(--yk-muted); }
        .yk-input, .yk-select { padding: 10px 14px; border: 1px solid var(--yk-border); border-radius: 8px; font-size: 13.5px; background: #fff; color: var(--yk-ink); transition: border 0.2s; }
        .yk-input:focus, .yk-select:focus { border-color: var(--yk-brand); outline: none; }
        .yk-btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13.5px; border: none; transition: background 0.2s; }
        .yk-btn-primary { background: var(--yk-brand); color: #fff; }
        .yk-btn-primary:hover { background: var(--yk-brand-hover); }
        .yk-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
        .yk-table th { padding: 12px; border-bottom: 2px solid var(--yk-border); color: var(--yk-muted); font-weight: 600; }
        .yk-table td { padding: 12px; border-bottom: 1px solid var(--yk-border); }
      `}</style>

      {/* ---------- SIDEBAR NAVIGATION ---------- */}
      <aside className="yk-sidebar">
        <div className="yk-brand-title">
          <Icon name="shield_person" style={{ color: '#818cf8' }} />
          <span>CORE SUPERADMIN</span>
        </div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`yk-nav-btn ${activeTab === item.key ? 'active' : ''}`}
            onClick={() => setActiveTab(item.key)}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </aside>

      {/* ---------- MAIN ROUTER VIEW ---------- */}
      <main className="yk-main-content">
        <header className="yk-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Console de Contrôle Globale</h1>
            <p style={{ color: 'var(--yk-muted)', margin: '4px 0 0' }}>Supervision multi-locataire et traçabilité d'infrastructure</p>
          </div>
          <button className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => { localStorage.clear(); window.location.reload(); }}>
            Déconnexion
          </button>
        </header>

        {message.texte && (
          <div className="yk-alert" style={{ 
            background: message.estErreur ? '#fef2f2' : '#ecfdf5', 
            color: message.estErreur ? 'var(--yk-red)' : 'var(--yk-green)', 
            border: `1px solid ${message.estErreur ? '#fca5a5' : '#6ee7b7'}` 
          }}>
            {message.texte}
          </div>
        )}

        {/* ---------- ONGLET 1 : VUE D'ENSEMBLE ---------- */}
        {activeTab === 'vue_d_ensemble' && (
          <div className="yk-fade-in">
            <div className="yk-stats-grid">
              <div className="yk-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--yk-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Établissements Monitorés</span>
                  <Icon name="apartment" />
                </div>
                <div className="yk-kpi-val">{statsGlobales.totalEtablissements}</div>
              </div>
              <div className="yk-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--yk-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Administrateurs Systèmes</span>
                  <Icon name="manage_accounts" />
                </div>
                <div className="yk-kpi-val">{admins.length}</div>
              </div>
              <div className="yk-kpi-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--yk-muted)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Disponibilité API</span>
                  <Icon name="cloud_done" style={{ color: 'var(--yk-green)' }} />
                </div>
                <div className="yk-kpi-val" style={{ color: 'var(--yk-green)', fontSize: '16px', marginTop: '14px' }}>Opérationnel (100%)</div>
              </div>
            </div>

            <div className="yk-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Comparatif d'Encaisses Globales (F CFA)</h3>
              <div style={{ width: '100%', height: 350 }}>
                {statsGlobales.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsGlobales.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} F CFA`} />
                      <Legend />
                      <Bar dataKey="Recettes" fill="#10b981" radius={[4, 4, 0, 0]} name="Flux Entrants" />
                      <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Flux Sortants" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--yk-muted)' }}>Aucune donnée financière agrégée.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---------- ONGLET 2 : ENREGISTREMENT ÉTABLISSEMENTS ---------- */}
        {activeTab === 'etablissements' && (
          <div className="yk-grid-two yk-fade-in">
            <div className="yk-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Déployer une nouvelle instance structurelle</h3>
              <form onSubmit={handleEtabSubmit}>
                <div className="yk-form-group">
                  <label className="yk-label">Nom de l'Établissement *</label>
                  <input type="text" className="yk-input" required value={formEtab.nom} onChange={e => setFormEtab({...formEtab, nom: e.target.value})} />
                </div>
                <div className="yk-form-group">
                  <label className="yk-label">Code Identifiant Unique (Clé d'isolement) *</label>
                  <input type="text" className="yk-input" required placeholder="Ex: LYCEE-BILINGUE" value={formEtab.code_unique} onChange={e => setFormEtab({...formEtab, code_unique: e.target.value.toUpperCase()})} />
                </div>
                <div className="yk-form-group">
                  <label className="yk-label">Localisation / Adresse</label>
                  <input type="text" className="yk-input" value={formEtab.adresse} onChange={e => setFormEtab({...formEtab, adresse: e.target.value})} />
                </div>
                <div className="yk-form-group">
                  <label className="yk-label">Ligne Téléphonique</label>
                  <input type="text" className="yk-input" value={formEtab.telephone} onChange={e => setFormEtab({...formEtab, telephone: e.target.value})} />
                </div>
                <button type="submit" className="yk-btn yk-btn-primary" style={{ width: '100%', marginTop: '10px' }}>Enregistrer l'établissement</button>
              </form>
            </div>

            <div className="yk-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Registre des structures actives</h3>
              {loadingEtab ? <p>Interrogation du registre en cours...</p> : (
                <table className="yk-table">
                  <thead>
                    <tr><th>Nom de l'école</th><th>Code unique</th><th>Ville</th></tr>
                  </thead>
                  <tbody>
                    {etablissements.length === 0 ? (
                      <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--yk-muted)' }}>Aucun enregistrement trouvé.</td></tr>
                    ) : etablissements.map(etab => (
                      <tr key={etab.id}>
                        <td style={{ fontWeight: 600 }}>{etab.nom}</td>
                        <td><span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700 }}>{etab.code_unique}</span></td>
                        <td>{etab.adresse || 'Non spécifiée'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ---------- ONGLET 3 : DROITS ET ACCÈS (ADMINS D'ÉCOLES) ---------- */}
        {activeTab === 'admins' && (
          <div className="yk-grid-two yk-fade-in">
            <div className="yk-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Déléguer un Administrateur local</h3>
              <form onSubmit={handleAdminSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="yk-form-group">
                    <label className="yk-label">Nom *</label>
                    <input type="text" className="yk-input" required value={formAdmin.nom} onChange={e => setFormAdmin({...formAdmin, nom: e.target.value})} />
                  </div>
                  <div className="yk-form-group">
                    <label className="yk-label">Prénom</label>
                    <input type="text" className="yk-input" value={formAdmin.prenom} onChange={e => setFormAdmin({...formAdmin, prenom: e.target.value})} />
                  </div>
                </div>
                <div className="yk-form-group">
                  <label className="yk-label">Identifiant unique d'accès *</label>
                  <input type="text" className="yk-input" required placeholder="Ex: admin.nomEcole" value={formAdmin.identifiant} onChange={e => setFormAdmin({...formAdmin, identifiant: e.target.value})} />
                </div>
                <div className="yk-form-group">
                  <label className="yk-label">Mot de passe d'initialisation *</label>
                  <input type="password" className="yk-input" required value={formAdmin.mot_de_passe} onChange={e => setFormAdmin({...formAdmin, mot_de_passe: e.target.value})} />
                </div>
                <div className="yk-form-group">
                  <label className="yk-label">Périmètre d'affectation (Établissement) *</label>
                  <select className="yk-select" required value={formAdmin.code_etablissement} onChange={e => setFormAdmin({...formAdmin, code_etablissement: e.target.value})}>
                    <option value="">-- Sélectionner la structure cible --</option>
                    {etablissements.map(etab => (
                      <option key={etab.id} value={etab.code_unique}>{etab.nom} ({etab.code_unique})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="yk-btn yk-btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loadingAdmin}>
                  {loadingAdmin ? "Provisionnement en cours..." : "Créer les accès administrateur"}
                </button>
              </form>
            </div>

            <div className="yk-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Comptes délégués (Session courante)</h3>
              <table className="yk-table">
                <thead>
                  <tr><th>Gestionnaire</th><th>Identifiant</th><th>Périmètre</th></tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--yk-muted)', padding: '24px' }}>Aucune délégation effectuée depuis l'ouverture de la session.</td></tr>
                  ) : admins.map(adm => (
                    <tr key={adm.id}>
                      <td style={{ fontWeight: 600 }}>{adm.nom} {adm.prenom}</td>
                      <td>{adm.identifiant}</td>
                      <td><span style={{ background: '#e0e7ff', color: '#4338ca', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{adm.code_etablissement}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---------- ONGLET 4 : PISTES D'AUDIT COMPLÈTES ---------- */}
        {activeTab === 'audit' && (
          <div className="yk-fade-in">
            <AuditLogDashboard />
          </div>
        )}

        {/* ---------- ONGLET 5 : SECURITÉ ET CONFIGURATION ---------- */}
        {activeTab === 'parametres' && (
          <div className="yk-card yk-fade-in" style={{ maxWidth: '600px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Paramètres globaux du noyau</h3>
            <p style={{ fontSize: '14px', color: 'var(--yk-muted)', lineHeight: '1.5' }}>
              Contrôle des politiques de rétention des logs d'audit SQL, gestion des secrets applicatifs JWT et monitoring d'intégrité des données multi-locataires.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}