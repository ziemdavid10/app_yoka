import React, { useState, useEffect } from 'react';
import { fetchEleves, saveEleve } from '../services/eleveService';
import { fetchClasses, saveClasse } from '../services/classeService';
import { fetchInscriptions, saveInscription } from '../services/inscriptionService';
import { fetchPaiements, savePaiement, fetchStatsFinancieres, fetchDebiteurs } from '../services/paiementService';
import { imprimerRecu } from '../utils/imprimerRecu';

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  // 1. LES ÉTATS (STATES)
  const [activeTab, setActiveTab] = useState('dashboard'); // Onglet par défaut modifié
  const [message, setMessage] = useState({ text: '', isError: false });

  // Listes de données
  const [eleves, setEleves] = useState([]);
  const [classes, setClasses] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [debiteurs, setDebiteurs] = useState([]);
  const [stats, setStats] = useState({ total_attendu: 0, total_encaisse: 0, total_restant: 0, taux_recouvrement: 0 });

  // Formulaires
  const [eleveForm, setEleveForm] = useState({ matricule: '', nom: '', prenom: '', date_naissance: '', genre: 'M' });
  const [classeForm, setClasseForm] = useState({ nom: '', frais_scolarite: '' });
  const [inscriptionForm, setInscriptionForm] = useState({ eleve_id: '', classe_id: '' });
  const [paiementForm, setPaiementForm] = useState({ inscription_id: '', montant: '', mode_paiement: 'CASH', reference_banque: '' });

  // 2. LES FONCTIONS DE RECHARGEMENT ASYNCHRONES
  const afficherMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 4000);
  };

  const chargerDonnees = async () => {
    try {
      const dataEleves = await fetchEleves();
      const dataClasses = await fetchClasses();
      const dataInsc = await fetchInscriptions();
      const dataPaie = await fetchPaiements();
      const dataStats = await fetchStatsFinancieres();
      const dataDebi = await fetchDebiteurs();

      setEleves(dataEleves);
      setClasses(dataClasses);
      setInscriptions(dataInsc);
      setPaiements(dataPaie);
      setStats(dataStats);
      setDebiteurs(dataDebi);
    } catch (err) {
      afficherMessage(err.message, true);
    }
  };

  // 3. HOOKS D'EFFET
  useEffect(() => {
    chargerDonnees();
  }, []);

  // 4. ACTION HANDLERS
  const handleEleveSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveEleve(eleveForm);
      afficherMessage("Fiche élève créée !");
      setEleveForm({ matricule: '', nom: '', prenom: '', date_naissance: '', genre: 'M' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleClasseSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveClasse(classeForm);
      afficherMessage("Classe configurée !");
      setClasseForm({ nom: '', frais_scolarite: '' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleInscriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveInscription(inscriptionForm);
      afficherMessage("Élève inscrit !");
      setInscriptionForm({ eleve_id: '', classe_id: '' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handlePaiementSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await savePaiement(paiementForm);
      afficherMessage("Versement encaissé avec succès !");
      setPaiementForm({ inscription_id: '', montant: '', mode_paiement: 'CASH', reference_banque: '' });
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // Fonction pour exporter la liste rouge des débiteurs en fichier CSV (compatible Excel)
const exporterDebiteursCSV = () => {
  if (debiteurs.length === 0) return;
  
  // En-têtes du fichier
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF pour gérer les accents sous Excel Windows
  csvContent += "Matricule;Nom Complet;Classe;Scolarite Totale;Montant Verse;Dette Restante\n";
  
  // Construction des lignes
  debiteurs.forEach(d => {
    csvContent += `${d.matricule};${d.nom} ${d.prenom};${d.classe_nom};${d.total_scolarite};${d.total_paye};${d.reste_a_payer}\n`;
  });
  
  // Déclenchement du téléchargement
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `LISTE_ROUGE_DEBITEURS_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Fonction pour copier un message de relance personnalisé
const copierRelanceMessage = (d) => {
  const messageRelance = `RAPPEL COMPTABILITÉ YOKA ÉCOLE :\nCher Parent, le compte de l'élève ${d.nom.toUpperCase()} ${d.prenom} (${d.classe_nom}) présente un reste à payer de ${parseFloat(d.reste_a_payer).toLocaleString()} F CFA sur les frais de scolarité. Merci de passer à la caisse de l'établissement dès que possible pour régulariser sa situation. Cordialement.`;
  
  navigator.clipboard.writeText(messageRelance);
  afficherMessage(`Message de relance pour ${d.prenom} copié dans le presse-papiers !`);
};



  return (
    <div style={styles.container}>
      {/* BARRE LATÉRALE */}
      <aside style={styles.sidebar}>
        <h2>Yoka École</h2>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>Admin : {user?.prenom} {user?.nom}</p>
        <nav style={styles.nav}>
          <button onClick={() => setActiveTab('dashboard')} style={activeTab === 'dashboard' ? styles.activeNavLinkDash : styles.navLink}>📊 Tableau de bord</button>
          <button onClick={() => setActiveTab('eleves')} style={activeTab === 'eleves' ? styles.activeNavLink : styles.navLink}>🎓 Élèves Base</button>
          <button onClick={() => setActiveTab('classes')} style={activeTab === 'classes' ? styles.activeNavLink : styles.navLink}>🏫 Classes & Tarifs</button>
          <button onClick={() => setActiveTab('inscriptions')} style={activeTab === 'inscriptions' ? styles.activeNavLink : styles.navLink}>📝 Inscriptions</button>
          <button onClick={() => setActiveTab('comptabilite')} style={activeTab === 'comptabilite' ? styles.activeNavLinkCompta : styles.navLink}>💵 Caisse & Versements</button>
        </nav>
        <button onClick={handleLogout} style={styles.logoutBtn}>Déconnexion</button>
      </aside>

      {/* ZONE CENTRALE */}
      <main style={styles.main}>
        {message.text && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.isError ? '#fde8e8' : '#e6fffa',
            color: message.isError ? '#e53e3e' : '#059669',
            border: `1px solid ${message.isError ? '#f8b4b4' : '#a7f3d0'}`
          }}>{message.text}</div>
        )}

        {/* ---------------- ONGLET : TABLEAU DE BORD FINANCIER & DÉBITEURS ---------------- */}
        {activeTab === 'dashboard' && (
          <div>
            <header style={styles.header}><h1>Pilotage Financier & Suivi des Débiteurs</h1></header>
            
            {/* GRILLE DES KPIS */}
            <div style={styles.kpiGrid}>
              <div style={{ ...styles.kpiCard, borderLeft: '5px solid #10b981' }}>
                <span style={styles.kpiLabel}>Scolarités Attendues</span>
                <span style={styles.kpiValue}>{stats.total_attendu?.toLocaleString()} F CFA</span>
              </div>
              <div style={{ ...styles.kpiCard, borderLeft: '5px solid #0284c7' }}>
                <span style={styles.kpiLabel}>Total Encaissé (Caisse)</span>
                <span style={styles.kpiValue} style={{ ...styles.kpiValue, color: '#0284c7' }}>{stats.total_encaisse?.toLocaleString()} F CFA</span>
              </div>
              <div style={{ ...styles.kpiCard, borderLeft: '5px solid #ef4444' }}>
                <span style={styles.kpiLabel}>Reste à Recouvrer</span>
                <span style={styles.kpiValue} style={{ ...styles.kpiValue, color: '#ef4444' }}>{stats.total_restant?.toLocaleString()} F CFA</span>
              </div>
              <div style={{ ...styles.kpiCard, borderLeft: '5px solid #f59e0b', textAlign: 'center' }}>
                <span style={styles.kpiLabel}>Taux de Recouvrement</span>
                <span style={{ ...styles.kpiValue, color: '#f59e0b', fontSize: '32px' }}>{stats.taux_recouvrement}%</span>
              </div>
            </div>

            {/* LISTE DES INVOLVABLES / DÉBITEURS */}
            <div style={{ ...styles.card, marginTop: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#ef4444' }}>⚠️ Liste Rouge des Élèves Insolvables</h3>
                    {/* 🔥 NOUVEAU BOUTON EXPORT */}
                    <button onClick={exporterDebiteursCSV} disabled={debiteurs.length === 0} style={{ padding: '8px 15px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                    📥 Exporter pour Excel
                    </button>
                </div>
                
                <table style={styles.table}>
                    <thead>
                    <tr style={styles.thRow}>
                        <th style={styles.th}>Matricule</th>
                        <th style={styles.th}>Nom Complet</th>
                        <th style={styles.th}>Classe</th>
                        <th style={styles.th}>Scolarité</th>
                        <th style={styles.th}>Payé</th>
                        <th style={styles.th}>Dette</th>
                        <th style={styles.th}>Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    {debiteurs.length === 0 ? (
                        <tr><td colSpan="7" style={{ ...styles.td, textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>🎉 Aucun débiteur ! Recouvrement à 100%.</td></tr>
                    ) : (
                        debiteurs.map(d => (
                        <tr key={d.inscription_id} style={styles.tr}>
                            <td style={styles.td}>{d.matricule}</td>
                            <td style={{ ...styles.td, fontWeight: 'bold' }}>{d.nom} {d.prenom}</td>
                            <td style={styles.td}>{d.classe_nom}</td>
                            <td style={styles.td}>{parseFloat(d.total_scolarite).toLocaleString()} F</td>
                            <td style={{ ...styles.td, color: '#10b981' }}>{parseFloat(d.total_paye).toLocaleString()} F</td>
                            <td style={{ ...styles.td, color: '#ef4444', fontWeight: 'bold', backgroundColor: '#fff5f5' }}>{parseFloat(d.reste_a_payer).toLocaleString()} F</td>
                            <td style={styles.td}>
                            {/* 🔥 NOUVEAU BOUTON DE RELANCE SMS/WHATSAPP */}
                            <button onClick={() => copierRelanceMessage(d)} style={{ padding: '5px 10px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                💬 Relancer
                            </button>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
                </div>
          </div>
        )}

        {/* ---------------- ONGLET ÉLÈVES ---------------- */}
        {activeTab === 'eleves' && (
          <div>
            <header style={styles.header}><h1>Base des Élèves</h1></header>
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Enregistrer un élève</h3>
                <form onSubmit={handleEleveSubmit} style={styles.form}>
                  <input type="text" placeholder="Matricule" value={eleveForm.matricule} onChange={e => setEleveForm({...eleveForm, matricule: e.target.value})} required style={styles.input} />
                  <input type="text" placeholder="Nom" value={eleveForm.nom} onChange={e => setEleveForm({...eleveForm, nom: e.target.value})} required style={styles.input} />
                  <input type="text" placeholder="Prénom" value={eleveForm.prenom} onChange={e => setEleveForm({...eleveForm, prenom: e.target.value})} required style={styles.input} />
                  <input type="date" value={eleveForm.date_naissance} onChange={e => setEleveForm({...eleveForm, date_naissance: e.target.value})} required style={styles.input} />
                  <select value={eleveForm.genre} onChange={e => setEleveForm({...eleveForm, genre: e.target.value})} style={styles.input}>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                  <button type="submit" style={styles.submitBtn}>Créer la fiche</button>
                </form>
              </div>
              <div style={{ ...styles.card, flexGrow: 2 }}>
                <h3 style={styles.cardTitle}>Élèves Globaux ({eleves.length})</h3>
                <table style={styles.table}>
                  <thead><tr style={styles.thRow}><th style={styles.th}>Matricule</th><th style={styles.th}>Nom complet</th><th style={styles.th}>Genre</th></tr></thead>
                  <tbody>
                    {eleves.map(el => (<tr key={el.id} style={styles.tr}><td style={styles.td}>{el.matricule}</td><td style={styles.td}>{el.nom} {el.prenom}</td><td style={styles.td}>{el.genre}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- ONGLET CLASSES ---------------- */}
        {activeTab === 'classes' && (
          <div>
            <header style={styles.header}><h1>Configuration Scolarité</h1></header>
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Nouvelle Classe</h3>
                <form onSubmit={handleClasseSubmit} style={styles.form}>
                  <input type="text" placeholder="Nom (Ex: SIL 1)" value={classeForm.nom} onChange={e => setClasseForm({...classeForm, nom: e.target.value})} required style={styles.input} />
                  <input type="number" placeholder="Frais de scolarité (F CFA)" value={classeForm.frais_scolarite} onChange={e => setClasseForm({...classeForm, frais_scolarite: e.target.value})} required style={styles.input} />
                  <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#3b82f6' }}>Créer la classe</button>
                </form>
              </div>
              <div style={{ ...styles.card, flexGrow: 2 }}>
                <h3 style={styles.cardTitle}>Niveaux actifs ({classes.length})</h3>
                <table style={styles.table}>
                  <thead><tr style={styles.thRow}><th style={styles.th}>Intitulé de classe</th><th style={styles.th}>Montant Scolarité</th></tr></thead>
                  <tbody>
                    {classes.map(cl => (<tr key={cl.id} style={styles.tr}><td style={styles.td}>{cl.nom}</td><td style={{ ...styles.td, fontWeight: 'bold' }}>{parseFloat(cl.frais_scolarite).toLocaleString()} F CFA</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- ONGLET INSCRIPTIONS ---------------- */}
        {activeTab === 'inscriptions' && (
          <div>
            <header style={styles.header}><h1>Inscriptions Annuelles</h1></header>
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Associer un élève à une classe</h3>
                <form onSubmit={handleInscriptionSubmit} style={styles.form}>
                  <select value={inscriptionForm.eleve_id} onChange={e => setInscriptionForm({...inscriptionForm, eleve_id: e.target.value})} required style={styles.input}>
                    <option value="">-- Choisir l'élève --</option>
                    {eleves.map(el => <option key={el.id} value={el.id}>{el.matricule} - {el.nom} {el.prenom}</option>)}
                  </select>
                  <select value={inscriptionForm.classe_id} onChange={e => setInscriptionForm({...inscriptionForm, classe_id: e.target.value})} required style={styles.input}>
                    <option value="">-- Choisir la classe --</option>
                    {classes.map(cl => <option key={cl.id} value={cl.id}>{cl.nom}</option>)}
                  </select>
                  <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#f59e0b' }}>Valider l'inscription</button>
                </form>
              </div>
              <div style={{ ...styles.card, flexGrow: 2 }}>
                <h3 style={styles.cardTitle}>Registre des Inscriptions ({inscriptions.length})</h3>
                <table style={styles.table}>
                  <thead><tr style={styles.thRow}><th style={styles.th}>Élève</th><th style={styles.th}>Classe Assignée</th><th style={styles.th}>Année</th></tr></thead>
                  <tbody>
                    {inscriptions.map(ins => (<tr key={ins.id} style={styles.tr}><td style={styles.td}>{ins.nom} {ins.prenom} ({ins.matricule})</td><td style={styles.td}>{ins.classe_nom}</td><td style={styles.td}>{ins.annee_libelle}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- ONGLET COMPTABILITÉ (AVEC BOUTON IMPRIMER) ---------------- */}
        {activeTab === 'comptabilite' && (
          <div>
            <header style={styles.header}><h1>Caisse Scolaire</h1></header>
            <div style={styles.contentGrid}>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Enregistrer un versement</h3>
                <form onSubmit={handlePaiementSubmit} style={styles.form}>
                  <select value={paiementForm.inscription_id} onChange={e => setPaiementForm({...paiementForm, inscription_id: e.target.value})} required style={styles.input}>
                    <option value="">-- Choisir un élève inscrit --</option>
                    {inscriptions.map(ins => (
                      <option key={ins.id} value={ins.id}>{ins.matricule} - {ins.nom} {ins.prenom} ({ins.classe_nom})</option>
                    ))}
                  </select>
                  <input type="number" placeholder="Montant en FCFA" value={paiementForm.montant} onChange={e => setPaiementForm({...paiementForm, montant: e.target.value})} required style={styles.input} />
                  <select value={paiementForm.mode_paiement} onChange={e => setPaiementForm({...paiementForm, mode_paiement: e.target.value})} style={styles.input}>
                    <option value="CASH">Espèces (Caisse)</option>
                    <option value="MOMO">MTN Mobile Money</option>
                    <option value="OM">Orange Money</option>
                    <option value="VIREMENT">Virement Bancaire</option>
                  </select>
                  <input type="text" placeholder="Référence transaction (Optionnel)" value={paiementForm.reference_banque} onChange={e => setPaiementForm({...paiementForm, reference_banque: e.target.value})} style={styles.input} />
                  <button type="submit" style={{ ...styles.submitBtn, backgroundColor: '#0284c7' }}>Encaisser le versement</button>
                </form>
              </div>

              <div style={{ ...styles.card, flexGrow: 2 }}>
                <h3 style={styles.cardTitle}>Journal de caisse ({paiements.length} entrées)</h3>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Élève</th>
                      <th style={styles.th}>Versement</th>
                      <th style={styles.th}>Mode</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.length === 0 ? (
                      <tr><td colSpan="4" style={{ ...styles.td, textAlign: 'center' }}>Aucun encaissement.</td></tr>
                    ) : (
                      paiements.map(p => (
                        <tr key={p.id} style={styles.tr}>
                          <td style={styles.td}>{p.nom} {p.prenom}<br/><small style={{ color: '#64748b' }}>{p.numero_recu}</small></td>
                          <td style={{ ...styles.td, fontWeight: 'bold', color: '#0284c7' }}>{parseFloat(p.montant).toLocaleString()} F</td>
                          <td style={styles.td}>{p.mode_paiement}</td>
                          <td style={styles.td}>
                            {/* 🔥 ACTION D'IMPRESSION DIRECTE */}
                            <button onClick={() => imprimerRecu(p)} style={styles.printBtn}>🖨️ Imprimer</button>
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
      </main>
    </div>
  );
};

// Styles consolidés incluant les nouveaux composants graphiques
const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'Arial, sans-serif' },
  sidebar: { width: '260px', backgroundColor: '#0f172a', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column' },
  nav: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '30px', flexGrow: 1 },
  navLink: { color: '#cbd5e1', backgroundColor: 'transparent', border: 'none', textAlign: 'left', padding: '12px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', width: '100%' },
  activeNavLink: { color: '#fff', backgroundColor: '#10b981', border: 'none', textAlign: 'left', padding: '12px', borderRadius: '5px', fontWeight: 'bold', fontSize: '14px', width: '100%' },
  activeNavLinkCompta: { color: '#fff', backgroundColor: '#0284c7', border: 'none', textAlign: 'left', padding: '12px', borderRadius: '5px', fontWeight: 'bold', fontSize: '14px', width: '100%' },
  activeNavLinkDash: { color: '#fff', backgroundColor: '#6366f1', border: 'none', textAlign: 'left', padding: '12px', borderRadius: '5px', fontWeight: 'bold', fontSize: '14px', width: '100%' },
  logoutBtn: { padding: '10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  main: { flexGrow: 1, padding: '30px', overflowY: 'auto' },
  header: { borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '20px' },
  kpiGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
  kpiCard: { flex: '1', minWidth: '200px', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '5px' },
  kpiLabel: { fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  kpiValue: { fontSize: '22px', font_weight: 'bold', color: '#1e293b' },
  contentGrid: { display: 'flex', gap: '25px', flexWrap: 'wrap', alignItems: 'flex-start' },
  card: { backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', minWidth: '300px', flex: '1' },
  cardTitle: { marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#334155' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  label: { fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '-10px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '15px', width: '100%', boxSizing: 'border-box' },
  submitBtn: { padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' },
  printBtn: { padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  alert: { padding: '12px', borderRadius: '5px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  thRow: { backgroundColor: '#f8fafc' },
  th: { padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '14px' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px', fontSize: '14px', color: '#334155' }
};

export default AdminDashboard;