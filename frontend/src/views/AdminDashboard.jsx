import React, { useState, useEffect } from 'react';
// Ajout des imports requis pour les graphiques Recharts
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { fetchEleves, saveEleve } from '../services/eleveService';
import { fetchClasses, saveClasse } from '../services/classeService';
import { fetchInscriptions, saveInscription } from '../services/inscriptionService';
import { 
  fetchPaiements, 
  savePaiement, 
  fetchStatsFinancieres, 
  fetchDebiteurs,
  fetchDepenses,   
  saveDepense      
} from '../services/paiementService';
import { imprimerRecu } from '../utils/imprimerRecu';

// Structure de données locale pour l'analyse financière mensuelle
const localDataMock = [
  { mois: 'Jan', Recettes: 1200000, Dépenses: 400000 },
  { mois: 'Fév', Recettes: 1850000, Dépenses: 550000 },
  { mois: 'Mar', Recettes: 900000,  Dépenses: 300000 },
  { mois: 'Avr', Recettes: 2400000, Dépenses: 800000 },
  { mois: 'Mai', Recettes: 1600000, Dépenses: 950000 },
];

// Sous-composant pour l'affichage des flux financiers de la caisse
export const AdminLocalChart = ({ data = localDataMock }) => {
  return (
    <div style={{ width: '100%', height: 340, background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e6e9ef', marginTop: '24px' }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="material-symbols-outlined" style={{ color: '#0369a1' }}>analytics</span>
        Analyse Mensuelle : Flux de Trésorerie (F CFA)
      </h4>
      <ResponsiveContainer width="100%" height="85%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mois" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis stroke="#64748b" style={{ fontSize: '12px' }} tickFormatter={(v) => `${v / 1000}k`} />
          <Tooltip formatter={(value) => `${value.toLocaleString()} F CFA`} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="Recettes" fill="#0369a1" radius={[4, 4, 0, 0]} name="Recettes (Caisse)" />
          <Line type="monotone" dataKey="Dépenses" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} name="Charges Décaissées" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Icônes Material Symbols (Google Fonts)
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

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'monitoring' },
  { key: 'eleves', label: 'Élèves', icon: 'school' },
  { key: 'classes', label: 'Classes & Tarifs', icon: 'corporate_fare' },
  { key: 'inscriptions', label: 'Inscriptions', icon: 'assignment_ind' },
  { key: 'comptabilite', label: 'Caisse & Versements', icon: 'payments' },
];

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  // 1. LES ÉTATS (STATES)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(''); 

  // Listes de données
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [debiteurs, setDebiteurs] = useState([]);
  const [depenses, setDepenses] = useState([]); 
  const [stats, setStats] = useState({ 
    total_attendu: 0, 
    total_encaisse: 0, 
    total_restant: 0, 
    total_depenses: 0, 
    solde_caisse: 0,   
    taux_recouvrement: 0 
  });

  // Formulaires
  const [eleveForm, setEleveForm] = useState({ matricule: '', nom: '', prenom: '', date_naissance: '', genre: 'M' });
  const [classeForm, setClasseForm] = useState({ nom: '', frais_scolarite: '' });
  const [inscriptionForm, setInscriptionForm] = useState({ eleve_id: '', classe_id: '' });
  
  const [paiementForm, setPaiementForm] = useState({ 
    inscription_id: '', 
    montant: '', 
    type_versement: 'Tranche 1', 
    mode_paiement: 'CASH', 
    reference_banque: '' 
  });

  const [depenseForm, setDepenseForm] = useState({
    titre: '',
    categorie: 'Fournitures',
    montant: '',
    description: '',
    mode_paiement: 'CASH'
  });

  // 2. LES FONCTIONS DE RECHARGEMENT ASYNCHRONES
  const afficherMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 4000);
  };

  const chargerDonnees = async () => {
    try {
      const [
        dataEleves,
        dataClasses,
        dataInsc,
        dataPaie,
        dataStats,
        dataDebi,
        dataDepenses
      ] = await Promise.all([
        fetchEleves(),
        fetchClasses(),
        fetchInscriptions(),
        fetchPaiements(),
        fetchStatsFinancieres(),
        fetchDebiteurs(),
        fetchDepenses()
      ]);

      setEleves(dataEleves);
      setClasses(dataClasses);
      setInscriptions(dataInsc);
      setPaiements(dataPaie);
      setStats(dataStats);
      setDebiteurs(dataDebi);
      setDepenses(dataDepenses);
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // 3. HOOKS D'EFFET
  useEffect(() => {
    loadGoogleIconsFont();
    chargerDonnees();
  }, []);

  // 4. ACTION HANDLERS
  const handleEleveSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveEleve(eleveForm);
      afficherMessage('Fiche élève créée !');
      setEleveForm({ matricule: '', nom: '', prenom: '', date_naissance: '', genre: 'M' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleClasseSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveClasse(classeForm);
      afficherMessage('Classe configurée !');
      setClasseForm({ nom: '', frais_scolarite: '' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleInscriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveInscription(inscriptionForm);
      afficherMessage('Élève inscrit !');
      setInscriptionForm({ eleve_id: '', classe_id: '' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handlePaiementSubmit = async (e) => {
    e.preventDefault();
    try {
      await savePaiement(paiementForm);
      afficherMessage('Versement encaissé avec succès !');
      setPaiementForm({ inscription_id: '', montant: '', type_versement: 'Tranche 1', mode_paiement: 'CASH', reference_banque: '' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleDepenseSubmit = async (e) => {
  e.preventDefault();
  try {
    // Envoie directement 'depenseForm' qui contient { titre, montant, categorie, description, mode_paiement }
    await saveDepense(depenseForm);
    
    afficherMessage('Dépense enregistrée au journal des charges !');
    
    // Réinitialisation de l'état avec des valeurs vides/par défaut cohérentes
    setDepenseForm({ 
      titre: '', 
      categorie: 'Fournitures', 
      montant: '', 
      description: '', 
      mode_paiement: 'CASH' 
    });
    
    chargerDonnees();
  } catch (err) { 
    afficherMessage(err.message, true); 
  }
};

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const exporterDebiteursCSV = () => {
    if (debiteurs.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Matricule;Nom Complet;Classe;Scolarite Totale;Montant Verse;Dette Restante\n';
    debiteurs.forEach(d => {
      csvContent += `${d.matricule};${d.nom} ${d.prenom};${d.classe_nom};${d.total_scolarite};${d.total_paye};${d.reste_a_payer}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LISTE_ROUGE_DEBITEURS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copierRelanceMessage = (d) => {
    const messageRelance = `RAPPEL COMPTABILITÉ YOKA ÉCOLE :\nCher Parent, le compte de l'élève ${d.nom.toUpperCase()} ${d.prenom} (${d.classe_nom}) presents un reste à payer de ${parseFloat(d.reste_a_payer).toLocaleString()} F CFA sur les frais de scolarité. Merci de passer à la caisse de l'établissement dès que possible pour régulariser sa situation. Cordialement.`;
    navigator.clipboard.writeText(messageRelance);
    afficherMessage(`Message de relance pour ${d.prenom} copié dans le presse-papiers !`);
  };

  const currentNav = NAV_ITEMS.find(n => n.key === activeTab);

  const filteredEleves = eleves.filter(el => 
    el.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    el.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    el.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDebiteurs = debiteurs.filter(d => 
    d.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="yk-app">
      <style>{CSS}</style>

      {sidebarOpen && <div className="yk-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`yk-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="yk-brand">
          <div className="yk-brand-mark"><Icon name="auto_stories" /></div>
          <div>
            <h2>Yoka École</h2>
            <span className="yk-brand-sub">Espace administration</span>
          </div>
        </div>

        <div className="yk-profile">
          <div className="yk-avatar">{(user?.prenom?.[0] || 'A')}{(user?.nom?.[0] || '')}</div>
          <div>
            <p className="yk-profile-name">{user?.prenom} {user?.nom}</p>
            <p className="yk-profile-role">Administrateur</p>
          </div>
        </div>

        <nav className="yk-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSearchTerm(''); setSidebarOpen(false); }}
              className={`yk-nav-link ${activeTab === item.key ? 'is-active' : ''}`}
              data-tab={item.key}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="yk-logout">
          <Icon name="logout" />
          <span>Déconnexion</span>
        </button>
      </aside>

      <div className="yk-content-wrap">
        <header className="yk-topbar">
          <button className="yk-burger" onClick={() => setSidebarOpen(true)} aria-label="Ouvrir le menu">
            <Icon name="menu" />
          </button>
          <div className="yk-topbar-title">
            <Icon name={currentNav?.icon} style={{ fontSize: '22px' }} />
            <h1>{currentNav?.label}</h1>
          </div>
        </header>

        <main className="yk-main">
          {message.text && (
            <div className={`yk-alert ${message.isError ? 'is-error' : 'is-success'}`}>
              <Icon name={message.isError ? 'error' : 'check_circle'} />
              <span>{message.text}</span>
            </div>
          )}

          {loading ? (
            <div className="yk-loading"><Icon name="progress_activity" style={{ fontSize: '32px' }} /><span>Chargement des données…</span></div>
          ) : (
            <>
              {/* ---------------- TABLEAU DE BORD ---------------- */}
              {activeTab === 'dashboard' && (
                <div className="yk-fade-in">
                  <div className="yk-kpi-grid">
                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="account_balance_wallet" /></div>
                      <div>
                        <span className="yk-kpi-label">Scolarités attendues</span>
                        <span className="yk-kpi-value">{stats.total_attendu?.toLocaleString()} F CFA</span>
                      </div>
                    </div>
                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="savings" /></div>
                      <div>
                        <span className="yk-kpi-label">Total encaissé</span>
                        <span className="yk-kpi-value">{stats.total_encaisse?.toLocaleString()} F CFA</span>
                      </div>
                    </div>
                    <div className="yk-kpi-card yk-kpi-red">
                      <div className="yk-kpi-icon"><Icon name="trending_down" /></div>
                      <div>
                        <span className="yk-kpi-label">Reste à recouvrer</span>
                        <span className="yk-kpi-value">{stats.total_restant?.toLocaleString()} F CFA</span>
                      </div>
                    </div>
                    
                    <div className="yk-kpi-card yk-kpi-red" style={{ borderTopColor: '#e11d48' }}>
                      <div className="yk-kpi-icon" style={{ background: '#fff1f2', color: '#e11d48' }}><Icon name="money_off" /></div>
                      <div>
                        <span className="yk-kpi-label">Total Dépenses</span>
                        <span className="yk-kpi-value" style={{ color: '#e11d48' }}>{stats.total_depenses?.toLocaleString()} F CFA</span>
                      </div>
                    </div>

                    <div className="yk-kpi-card yk-kpi-green" style={{ borderTopColor: stats.solde_caisse >= 0 ? 'var(--yk-green)' : 'var(--yk-red)' }}>
                      <div className="yk-kpi-icon" style={{ background: stats.solde_caisse >= 0 ? '#ecfdf5' : '#fef2f2', color: stats.solde_caisse >= 0 ? 'var(--yk-green)' : 'var(--yk-red)' }}><Icon name="account_balance" /></div>
                      <div>
                        <span className="yk-kpi-label">Solde Réel Caisse</span>
                        <span className="yk-kpi-value" style={{ color: stats.solde_caisse >= 0 ? 'var(--yk-green)' : 'var(--yk-red)' }}>{stats.solde_caisse?.toLocaleString()} F CFA</span>
                      </div>
                    </div>

                    <div className="yk-kpi-card yk-kpi-amber yk-kpi-rate">
                      <span className="yk-kpi-label">Taux de recouvrement</span>
                      <span className="yk-kpi-rate-value">{stats.taux_recouvrement}%</span>
                      <div className="yk-progress-track">
                        <div className="yk-progress-fill" style={{ width: `${Math.min(stats.taux_recouvrement || 0, 100)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* INTEGRATION DU COMPOSANT GRAPHIQUE CI-DESSOUS */}
                  <AdminLocalChart data={localDataMock} />

                  <div className="yk-card" style={{ marginTop: '24px' }}>
                    <div className="yk-card-header">
                      <h3 className="yk-card-title yk-title-danger">
                        <Icon name="warning" filled /> Liste rouge des élèves insolvables
                      </h3>
                      <button onClick={exporterDebiteursCSV} disabled={filteredDebiteurs.length === 0} className="yk-btn yk-btn-green">
                        <Icon name="file_download" /> Exporter pour Excel
                      </button>
                    </div>

                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead>
                          <tr>
                            <th>Matricule</th>
                            <th>Nom complet</th>
                            <th>Classe</th>
                            <th>Scolarité</th>
                            <th>Payé</th>
                            <th>Dette</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDebiteurs.length === 0 ? (
                            <tr><td colSpan="7" className="yk-empty-row">
                              <Icon name="celebration" filled style={{ color: '#10b981' }} /> Aucun débiteur ne correspond !
                            </td></tr>
                          ) : (
                            filteredDebiteurs.map(d => (
                              <tr key={d.inscription_id}>
                                <td>{d.matricule}</td>
                                <td className="yk-strong">{d.nom} {d.prenom}</td>
                                <td>{d.classe_nom}</td>
                                <td>{parseFloat(d.total_scolarite).toLocaleString()} F</td>
                                <td className="yk-text-green">{parseFloat(d.total_paye).toLocaleString()} F</td>
                                <td className="yk-debt-cell">{parseFloat(d.reste_a_payer).toLocaleString()} F</td>
                                <td>
                                  <button onClick={() => copierRelanceMessage(d)} className="yk-btn yk-btn-amber yk-btn-sm">
                                    <Icon name="forum" style={{ fontSize: '16px' }} /> Relancer
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- ÉLÈVES ---------------- */}
              {activeTab === 'eleves' && (
                <div className="yk-grid-layout yk-fade-in">
                  <div className="yk-card yk-card-form">
                    <h3 className="yk-card-title"><Icon name="person_add" /> Enregistrer un élève</h3>
                    <form onSubmit={handleEleveSubmit} className="yk-form">
                      <label className="yk-field">
                        <span className="yk-label">Matricule</span>
                        <input type="text" placeholder="Ex : YK-2026-001" value={eleveForm.matricule} onChange={e => setEleveForm({ ...eleveForm, matricule: e.target.value })} required className="yk-input" />
                      </label>
                      <label className="yk-field">
                        <span className="yk-label">Nom</span>
                        <input type="text" placeholder="Nom de famille" value={eleveForm.nom} onChange={e => setEleveForm({ ...eleveForm, nom: e.target.value })} required className="yk-input" />
                      </label>
                      <label className="yk-field">
                        <span className="yk-label">Prénom</span>
                        <input type="text" placeholder="Prénom" value={eleveForm.prenom} onChange={e => setEleveForm({ ...eleveForm, prenom: e.target.value })} required className="yk-input" />
                      </label>
                      <label className="yk-field">
                        <span className="yk-label">Date de naissance</span>
                        <input type="date" value={eleveForm.date_naissance} onChange={e => setEleveForm({ ...eleveForm, date_naissance: e.target.value })} required className="yk-input" />
                      </label>
                      <label className="yk-field">
                        <span className="yk-label">Genre</span>
                        <select value={eleveForm.genre} onChange={e => setEleveForm({ ...eleveForm, genre: e.target.value })} className="yk-input">
                          <option value="M">Masculin</option>
                          <option value="F">Féminin</option>
                        </select>
                      </label>
                      <button type="submit" className="yk-btn yk-btn-green yk-btn-block"><Icon name="save" /> Créer la fiche</button>
                    </form>
                  </div>

                  <div className="yk-card yk-card-table">
                    <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                        <Icon name="groups" /> Élèves globaux ({filteredEleves.length})
                      </h3>
                      <input 
                        type="text" 
                        placeholder="Rechercher un élève (Nom, matricule...)" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="yk-input"
                        style={{ maxWidth: '280px', height: '36px', fontSize: '13px' }}
                      />
                    </div>
  
                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead><tr><th>Matricule</th><th>Nom complet</th><th>Genre</th></tr></thead>
                        <tbody>
                          {filteredEleves.length === 0 ? (
                            <tr><td colSpan="3" className="yk-empty-row">Aucun élève ne correspond à la recherche.</td></tr>
                          ) : filteredEleves.map(el => (
                            <tr key={el.id}><td>{el.matricule}</td><td className="yk-strong">{el.nom} {el.prenom}</td><td>{el.genre}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- CLASSES ---------------- */}
              {activeTab === 'classes' && (
                <div className="yk-grid-layout yk-fade-in">
                  <div className="yk-card yk-card-form">
                    <h3 className="yk-card-title"><Icon name="add_business" /> Nouvelle classe</h3>
                    <form onSubmit={handleClasseSubmit} className="yk-form">
                      <label className="yk-field">
                        <span className="yk-label">Nom de la classe</span>
                        <input type="text" placeholder="Ex : SIL 1" value={classeForm.nom} onChange={e => setClasseForm({ ...classeForm, nom: e.target.value })} required className="yk-input" />
                      </label>
                      <label className="yk-field">
                        <span className="yk-label">Frais de scolarité (F CFA)</span>
                        <input type="number" placeholder="Ex : 150000" value={classeForm.frais_scolarite} onChange={e => setClasseForm({ ...classeForm, frais_scolarite: e.target.value })} required className="yk-input" />
                      </label>
                      <button type="submit" className="yk-btn yk-btn-blue yk-btn-block"><Icon name="save" /> Créer la classe</button>
                    </form>
                  </div>

                  <div className="yk-card yk-card-table">
                    <h3 className="yk-card-title"><Icon name="domain" /> Niveaux actifs ({classes.length})</h3>
                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead><tr><th>Intitulé de classe</th><th>Montant scolarité</th></tr></thead>
                        <tbody>
                          {classes.length === 0 ? (
                            <tr><td colSpan="2" className="yk-empty-row">Aucune classe configurée pour le moment.</td></tr>
                          ) : classes.map(cl => (
                            <tr key={cl.id}><td className="yk-strong">{cl.nom}</td><td>{parseFloat(cl.frais_scolarite).toLocaleString()} F CFA</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- INSCRIPTIONS ---------------- */}
              {activeTab === 'inscriptions' && (
                <div className="yk-grid-layout yk-fade-in">
                  <div className="yk-card yk-card-form">
                    <h3 className="yk-card-title"><Icon name="how_to_reg" /> Associer un élève à une classe</h3>
                    <form onSubmit={handleInscriptionSubmit} className="yk-form">
                      <label className="yk-field">
                        <span className="yk-label">Élève</span>
                        <select value={inscriptionForm.eleve_id} onChange={e => setInscriptionForm({ ...inscriptionForm, eleve_id: e.target.value })} required className="yk-input">
                          <option value="">-- Choisir l'élève --</option>
                          {eleves.map(el => <option key={el.id} value={el.id}>{el.matricule} - {el.nom} {el.prenom}</option>)}
                        </select>
                      </label>
                      <label className="yk-field">
                        <span className="yk-label">Classe</span>
                        <select value={inscriptionForm.classe_id} onChange={e => setInscriptionForm({ ...inscriptionForm, classe_id: e.target.value })} required className="yk-input">
                          <option value="">-- Choisir la classe --</option>
                          {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.nom}</option>)}
                        </select>
                      </label>
                      <button type="submit" className="yk-btn yk-btn-amber yk-btn-block"><Icon name="task_alt" /> Valider l'inscription</button>
                    </form>
                  </div>

                  <div className="yk-card yk-card-table">
                    <h3 className="yk-card-title"><Icon name="fact_check" /> Registre des inscriptions ({inscriptions.length})</h3>
                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead><tr><th>Élève</th><th>Classe assignée</th><th>Année</th></tr></thead>
                        <tbody>
                          {inscriptions.length === 0 ? (
                            <tr><td colSpan="3" className="yk-empty-row">Aucune inscription enregistrée pour le moment.</td></tr>
                          ) : inscriptions.map(ins => (
                            <tr key={ins.id}><td className="yk-strong">{ins.nom} {ins.prenom} ({ins.matricule})</td><td>{ins.classe_nom}</td><td>{ins.annee_libelle}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- COMPTABILITÉ ---------------- */}
              {activeTab === 'comptabilite' && (
                <div className="yk-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--yk-blue)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="arrow_circle_up" style={{ color: 'var(--yk-green)' }} /> Section 1 : Flux Entrants (Recettes)
                    </h2>
                    <div className="yk-grid-layout">
                      <div className="yk-card yk-card-form">
                        <h3 className="yk-card-title"><Icon name="point_of_sale" /> Enregistrer un versement</h3>
                        <form onSubmit={handlePaiementSubmit} className="yk-form">
                          <label className="yk-field">
                            <span className="yk-label">Élève inscrit</span>
                            <select value={paiementForm.inscription_id} onChange={e => setPaiementForm({ ...paiementForm, inscription_id: e.target.value })} required className="yk-input">
                              <option value="">-- Choisir un élève inscrit --</option>
                              {inscriptions.map(ins => (
                                <option key={ins.id} value={ins.id}>{ins.matricule} - {ins.nom} {ins.prenom} ({ins.classe_nom})</option>
                              ))}
                            </select>
                          </label>
                          <label className="yk-field">
                            <span className="yk-label">Montant (F CFA)</span>
                            <input type="number" placeholder="Ex : 25000" value={paiementForm.montant} onChange={e => setPaiementForm({ ...paiementForm, montant: e.target.value })} required className="yk-input" />
                          </label>

                          <label className="yk-field">
                            <span className="yk-label">Tranche / Type de versement</span>
                            <select value={paiementForm.type_versement} onChange={e => setPaiementForm({ ...paiementForm, type_versement: e.target.value })} required className="yk-input">
                              <option value="Tranche 1">Tranche 1</option>
                              <option value="Tranche 2">Tranche 2</option>
                              <option value="Tranche 3">Tranche 3</option>
                              <option value="Frais Inscription">Frais d'Inscription</option>
                              <option value="Totalité Scolarité">Totalité Scolarité</option>
                            </select>
                          </label>

                          <label className="yk-field">
                            <span className="yk-label">Mode de paiement</span>
                            <select value={paiementForm.mode_paiement} onChange={e => setPaiementForm({ ...paiementForm, mode_paiement: e.target.value })} className="yk-input">
                              <option value="CASH">Espèces (Caisse)</option>
                              <option value="MOMO">MTN Mobile Money</option>
                              <option value="OM">Orange Money</option>
                              <option value="VIREMENT">Virement bancaire</option>
                            </select>
                          </label>
                          <label className="yk-field">
                            <span className="yk-label">Référence transaction (optionnel)</span>
                            <input type="text" placeholder="Ex : TXN-00123" value={paiementForm.reference_banque} onChange={e => setPaiementForm({ ...paiementForm, reference_banque: e.target.value })} className="yk-input" />
                          </label>
                          <button type="submit" className="yk-btn yk-btn-blue yk-btn-block"><Icon name="payments" /> Encaisser le versement</button>
                        </form>
                      </div>

                      <div className="yk-card yk-card-table">
                        <h3 className="yk-card-title"><Icon name="receipt_long" /> Journal de caisse ({paiements.length} entrées)</h3>
                        <div className="yk-table-scroll">
                          <table className="yk-table">
                            <thead>
                              <tr>
                                <th>Élève</th>
                                <th>Versement</th>
                                <th>Tranche</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paiements.length === 0 ? (
                                <tr><td colSpan="4" className="yk-empty-row">Aucun encaissement enregistré.</td></tr>
                              ) : (
                                paiements.map(p => (
                                  <tr key={p.id}>
                                    <td>
                                      <span className="yk-strong">{p.nom} {p.prenom}</span>
                                      <br /><small className="yk-muted">{p.numero_recu || 'REC-N/A'}</small>
                                    </td>
                                    <td className="yk-text-blue yk-strong">{parseFloat(p.montant).toLocaleString()} F</td>
                                    <td><span className="yk-badge">{p.type_versement || 'Tranche 1'}</span></td>
                                    <td>
                                      <button onClick={() => imprimerRecu(p)} className="yk-btn yk-btn-ghost yk-btn-sm">
                                        <Icon name="print" style={{ fontSize: '16px' }} />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: '#e11d48', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="arrow_circle_down" style={{ color: 'var(--yk-red)' }} /> Section 2 : Flux Sortants (Charges & Dépenses)
                    </h2>
                    <div className="yk-grid-layout">
                      
                      <div className="yk-card yk-card-form" style={{ borderTop: '3px solid #e11d48' }}>
                        <h3 className="yk-card-title" style={{ color: '#e11d48' }}><Icon name="money_off" /> Déclarer une dépense</h3>
                        <form onSubmit={handleDepenseSubmit} className="yk-form">
                          <label className="yk-field">
                            <span className="yk-label">Intitulé de la dépense</span>
                            <input type="text" placeholder="Ex: Facture Eneo Mai" value={depenseForm.titre} onChange={e => setDepenseForm({ ...depenseForm, titre: e.target.value })} required className="yk-input" />
                          </label>
                          <label className="yk-field">
                            <span className="yk-label">Catégorie de charge</span>
                            <select value={depenseForm.categorie} onChange={e => setDepenseForm({ ...depenseForm, categorie: e.target.value })} className="yk-input">
                              <option value="Fournitures">Fournitures & Matériels</option>
                              <option value="Salaires">Salaires & Vacations</option>
                              <option value="Maintenance">Maintenance Locaux</option>
                              <option value="Factures">Factures (Eau/Élec/Net)</option>
                              <option value="Impôts">Impôts et Taxes</option>
                              <option value="Autre">Autre charge d'exploitation</option>
                            </select>
                          </label>
                          <label className="yk-field">
                            <span className="yk-label">Montant décaissé (F CFA)</span>
                            <input type="number" placeholder="Ex: 45000" value={depenseForm.montant} onChange={e => setDepenseForm({ ...depenseForm, montant: e.target.value })} required className="yk-input" />
                          </label>
                          <label className="yk-field">
                            <span className="yk-label">Mode de décaissement</span>
                            <select value={depenseForm.mode_paiement} onChange={e => setDepenseForm({ ...depenseForm, mode_paiement: e.target.value })} className="yk-input">
                              <option value="CASH">Espèces (Fond de caisse)</option>
                              <option value="MOMO">Mobile Money</option>
                              <option value="VIREMENT">Chèque / Virement</option>
                            </select>
                          </label>
                          <label className="yk-field">
                            <span className="yk-label">Description / Notes</span>
                            <input type="text" placeholder="Détails supplémentaires" value={depenseForm.description} onChange={e => setDepenseForm({ ...depenseForm, description: e.target.value })} className="yk-input" />
                          </label>
                          <button type="submit" className="yk-btn yk-btn-block" style={{ background: '#e11d48', color: '#fff' }}><Icon name="output" /> Enregistrer la dépense</button>
                        </form>
                      </div>

                      <div className="yk-card yk-card-table">
                        <h3 className="yk-card-title"><Icon name="menu_book" /> Journal d'historique des dépenses ({depenses.length} lignes)</h3>
                        <div className="yk-table-scroll">
                          <table className="yk-table">
                            <thead>
                              <tr>
                                <th>Libellé / Motif</th>
                                <th>Catégorie</th>
                                <th>Montant</th>
                                <th>Mode</th>
                              </tr>
                            </thead>
                            <tbody>
                              {depenses.length === 0 ? (
                                <tr><td colSpan="4" className="yk-empty-row">Aucune dépense enregistrée sur cette période.</td></tr>
                              ) : (
                                depenses.map(d => (
                                  <tr key={d.id}>
                                    <td>
                                      <span className="yk-strong" style={{ color: 'var(--yk-ink)' }}>{d.titre}</span>
                                      {d.description && <br />}<small className="yk-muted">{d.description}</small>
                                    </td>
                                    <td><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--yk-slate)' }}>{d.categorie}</span></td>
                                    <td style={{ color: '#dc2626', fontWeight: 700 }}>-{parseFloat(d.montant).toLocaleString()} F</td>
                                    <td><span className="yk-badge" style={{ background: '#f1f5f9', color: 'var(--yk-slate)' }}>{d.mode_paiement}</span></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </main>
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
    --yk-bg: #f4f6fa;
    --yk-card: #ffffff;
    --yk-green: #0e9f6e;
    --yk-blue: #0369a1;
    --yk-amber: #c2790a;
    --yk-red: #dc2626;
    --yk-indigo: #4338ca;
    --yk-radius: 12px;
    --yk-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.10);
  }

  * { box-sizing: border-box; }

  .yk-app {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    display: flex;
    min-height: 100vh;
    background: var(--yk-bg);
    color: var(--yk-ink);
  }

  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    font-size: 20px;
    line-height: 1;
    letter-spacing: normal;
    text-transform: none;
    display: inline-flex;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
  }

  .yk-sidebar {
    width: 264px;
    flex-shrink: 0;
    background: linear-gradient(180deg, #0f172a 0%, #111c34 100%);
    color: #e2e8f0;
    padding: 22px 18px;
    display: flex;
    flex-direction: column;
    gap: 22px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .yk-brand { display: flex; align-items: center; gap: 12px; }
  .yk-brand-mark {
    width: 42px; height: 42px; border-radius: 11px;
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .yk-brand h2 { margin: 0; font-size: 17px; font-weight: 700; color: #fff; }
  .yk-brand-sub { font-size: 11.5px; color: #94a3b8; }

  .yk-profile {
    display: flex; align-items: center; gap: 10px;
    padding: 12px; border-radius: var(--yk-radius);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .yk-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: #4338ca; color: #fff; font-weight: 700; font-size: 13px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .yk-profile-name { margin: 0; font-size: 13px; font-weight: 600; color: #f1f5f9; }
  .yk-profile-role { margin: 0; font-size: 11px; color: #94a3b8; }

  .yk-nav { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
  .yk-nav-link {
    display: flex; align-items: center; gap: 12px;
    color: #cbd5e1; background: transparent; border: none;
    text-align: left; padding: 11px 12px; border-radius: 9px;
    cursor: pointer; font-size: 13.5px; font-weight: 500;
    width: 100%; transition: background 0.15s ease, color 0.15s ease;
    font-family: inherit;
  }
  .yk-nav-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .yk-nav-link.is-active { background: #1e293b; color: #fff; font-weight: 600; box-shadow: inset 3px 0 0 #34d399; }
  .yk-nav-link[data-tab="comptabilite"].is-active { box-shadow: inset 3px 0 0 #38bdf8; }
  .yk-nav-link[data-tab="dashboard"].is-active { box-shadow: inset 3px 0 0 #818cf8; }

  .yk-logout {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px; background: rgba(220, 38, 38, 0.12); color: #fca5a5;
    border: 1px solid rgba(220, 38, 38, 0.25); border-radius: 9px;
    cursor: pointer; font-weight: 600; font-size: 13px; font-family: inherit;
    transition: background 0.15s ease;
  }
  .yk-logout:hover { background: rgba(220, 38, 38, 0.22); }

  .yk-overlay { display: none; }

  .yk-content-wrap { flex-grow: 1; display: flex; flex-direction: column; min-width: 0; }

  .yk-topbar {
    display: none;
    align-items: center; gap: 12px;
    padding: 14px 18px;
    background: #fff; border-bottom: 1px solid var(--yk-border);
    position: sticky; top: 0; z-index: 5;
  }
  .yk-burger {
    border: none; background: #f1f5f9; border-radius: 8px; padding: 8px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--yk-ink);
  }
  .yk-topbar-title { display: flex; align-items: center; gap: 8px; color: var(--yk-ink); }
  .yk-topbar-title h1 { font-size: 16px; margin: 0; font-weight: 700; }

  .yk-main { flex-grow: 1; padding: 28px 32px 40px; max-width: 1320px; width: 100%; margin: 0 auto; }

  .yk-fade-in { animation: yk-fade 0.25s ease; }
  @keyframes yk-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

  .yk-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 80px 0; color: var(--yk-muted); font-size: 14px;
  }
  .yk-loading .material-symbols-outlined { animation: yk-spin 1.1s linear infinite; }
  @keyframes yk-spin { to { transform: rotate(360deg); } }

  .yk-alert {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 10px; margin-bottom: 22px;
    font-size: 13.5px; font-weight: 600; border: 1px solid transparent;
  }
  .yk-alert.is-success { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .yk-alert.is-error { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

  .yk-kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 18px;
  }
  .yk-kpi-card {
    background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow);
    padding: 18px; display: flex; align-items: center; gap: 14px;
    border: 1px solid var(--yk-border); border-top: 3px solid transparent;
  }
  .yk-kpi-green { border-top-color: var(--yk-green); }
  .yk-kpi-blue { border-top-color: var(--yk-blue); }
  .yk-kpi-red { border-top-color: var(--yk-red); }
  .yk-kpi-amber { border-top-color: var(--yk-amber); flex-direction: column; align-items: flex-start; gap: 8px; }

  .yk-kpi-icon {
    width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .yk-kpi-green .yk-kpi-icon { background: #ecfdf5; color: var(--yk-green); }
  .yk-kpi-blue .yk-kpi-icon { background: #eff6ff; color: var(--yk-blue); }
  .yk-kpi-red .yk-kpi-icon { background: #fef2f2; color: var(--yk-red); }

  .yk-kpi-label { display: block; font-size: 12px; color: var(--yk-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
  .yk-kpi-value { display: block; font-size: 19px; font-weight: 700; color: var(--yk-ink); margin-top: 3px; }
  .yk-kpi-rate-value { font-size: 30px; font-weight: 800; color: var(--yk-amber); line-height: 1; }
  .yk-progress-track { width: 100%; height: 6px; border-radius: 4px; background: #fef3c7; overflow: hidden; }
  .yk-progress-fill { height: 100%; background: var(--yk-amber); border-radius: 4px; transition: width 0.4s ease; }

  .yk-grid-layout { display: grid; grid-template-columns: 360px 1fr; gap: 22px; align-items: flex-start; }

  .yk-card {
    background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow);
    border: 1px solid var(--yk-border); padding: 20px;
  }
  .yk-card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid var(--yk-border); padding-bottom: 14px; }

  .yk-card-title {
    margin: 0 0 16px; padding-bottom: 14px; border-bottom: 1px solid var(--yk-border);
    color: var(--yk-ink); font-size: 14.5px; font-weight: 700;
    display: flex; align-items: center; gap: 8px;
  }
  .yk-title-danger { color: var(--yk-red); border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
  .yk-card-header .yk-card-title { margin: 0; padding: 0; border: none; }

  .yk-form { display: flex; flex-direction: column; gap: 14px; }
  .yk-field { display: flex; flex-direction: column; gap: 5px; }
  .yk-label { font-size: 12px; color: var(--yk-muted); font-weight: 600; }
  .yk-input {
    padding: 10px 12px; border-radius: 8px; border: 1px solid #d6dbe3;
    font-size: 14px; width: 100%; font-family: inherit; color: var(--yk-ink);
    background: #fbfcfe; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .yk-input:focus { outline: none; border-color: #94a3b8; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.10); background: #fff; }

  .yk-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 10px 16px; border: none; border-radius: 8px;
    font-weight: 600; font-size: 13.5px; cursor: pointer; font-family: inherit;
    transition: filter 0.15s ease, transform 0.05s ease;
  }
  .yk-btn:active { transform: translateY(1px); }
  .yk-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .yk-btn-block { width: 100%; margin-top: 4px; padding: 11px; }
  .yk-btn-sm { padding: 6px 11px; font-size: 12.5px; }
  .yk-btn:not(:disabled):hover { filter: brightness(0.94); }

  .yk-btn-green { background: var(--yk-green); color: #fff; }
  .yk-btn-blue { background: var(--yk-blue); color: #fff; }
  .yk-btn-amber { background: #f59e0b; color: #fff; }
  .yk-btn-ghost { background: #f1f5f9; color: var(--yk-slate); border: 1px solid #d6dbe3; }

  .yk-table-scroll { overflow-x: auto; }
  .yk-table { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 460px; }
  .yk-table thead th {
    text-align: left; padding: 10px 12px; color: var(--yk-muted); font-size: 11.5px;
    text-transform: uppercase; letter-spacing: 0.03em; font-weight: 700;
    border-bottom: 2px solid var(--yk-border); white-space: nowrap;
  }
  .yk-table tbody td { padding: 12px; color: var(--yk-slate); border-bottom: 1px solid #f1f3f7; }
  .yk-table tbody tr:hover { background: #f8fafc; }
  .yk-strong { color: var(--yk-ink); font-weight: 600; }
  .yk-text-green { color: var(--yk-green); font-weight: 600; }
  .yk-text-blue { color: var(--yk-blue); }
  .yk-muted { color: var(--yk-muted); }
  .yk-debt-cell { color: var(--yk-red); font-weight: 700; background: #fff5f5; }
  .yk-empty-row { text-align: center; padding: 26px 12px !important; color: var(--yk-muted); font-weight: 600; }
  .yk-badge {
    display: inline-block; padding: 3px 9px; border-radius: 999px; background: #eef2ff;
    color: var(--yk-indigo); font-size: 11.5px; font-weight: 700;
  }

  @media (max-width: 1080px) {
    .yk-grid-layout { grid-template-columns: 1fr; }
    .yk-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 860px) {
    .yk-sidebar {
      position: fixed; left: 0; top: 0; z-index: 50;
      transform: translateX(-100%); transition: transform 0.22s ease;
      box-shadow: 12px 0 30px rgba(0,0,0,0.25);
    }
    .yk-sidebar.is-open { transform: translateX(0); }
    .yk-overlay {
      display: block; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 40;
    }
    .yk-topbar { display: flex; }
    .yk-main { padding: 18px 16px 32px; }
    .yk-kpi-grid { grid-template-columns: 1fr; }
    .yk-card-header { flex-direction: column; align-items: flex-start; }
  }

  @media (max-width: 480px) {
    .yk-btn-block { font-size: 13px; }
  }
`;

export default AdminDashboard;