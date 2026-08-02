import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Icon from '../components/icons';

import { fetchEleves, saveEleve, updateEleve, deleteEleve, importElevesExcel } from '../services/eleveService';
import { fetchClasses, saveClasse, updateClasse, deleteClasse, fetchTranches, saveTranches } from '../services/classeService';
import { fetchInscriptions, saveInscription, updateInscription, deleteInscription } from '../services/inscriptionService';
import {
  fetchPaiements,
  savePaiement,
  updatePaiement,
  deletePaiement,
  fetchStatsFinancieres,
  fetchDebiteurs,
  fetchAnnees,
  fetchEtatParClasse,
  fetchEtatParEleve,
  fetchDepenses,
  saveDepense,
  updateDepense,
  deleteDepense
} from '../services/paiementService';
// Note : updatePaiement, deletePaiement, updateDepense, deleteDepense sont définis dans paiementService.js
import { imprimerRecu } from '../utils/imprimerRecu';

/**
 * IMPORTANT — Fonctions de service attendues :
 * Ce composant suppose que les services exposent désormais, en plus des fonctions
 * déjà existantes (fetchX / saveX), les fonctions CRUD suivantes :
 *   updateEleve(id, data)        deleteEleve(id)
 *   updateClasse(id, data)       deleteClasse(id)
 *   updateInscription(id, data)  deleteInscription(id)
 *   updatePaiement(id, data)     deletePaiement(id)
 *   updateDepense(id, data)      deleteDepense(id)
 * Si elles n'existent pas encore côté services/*.js, il faut les ajouter
 * (généralement des appels PUT/PATCH et DELETE vers l'API REST correspondante).
 */

const PAGE_SIZE = 8;

// Helper centralisé : formate un montant en F CFA de façon cohérente
const formatMontant = (valeur) => {
  const n = parseFloat(valeur);
  if (isNaN(n)) return '0 F CFA';
  const formatted = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} F CFA`;
};

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
        <Icon name="analytics" style={{ color: '#0369a1' }} />
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

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: 'monitoring' },
  { key: 'eleves', label: 'Élèves', icon: 'school' },
  { key: 'classes', label: 'Classes & Tarifs', icon: 'corporate_fare' },
  { key: 'inscriptions', label: 'Inscriptions', icon: 'assignment_ind' },
  { key: 'comptabilite', label: 'Caisse & Versements', icon: 'payments' },
];

// -------------------- COMPOSANTS RÉUTILISABLES --------------------

// Fenêtre modale générique (formulaires de création / édition)
const Modal = ({ title, icon, onClose, children, accent = '#0369a1' }) => (
  <div className="yk-modal-backdrop" onMouseDown={onClose}>
    <div className="yk-modal" onMouseDown={e => e.stopPropagation()}>
      <div className="yk-modal-header" style={{ borderTopColor: accent }}>
        <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
          <Icon name={icon} /> {title}
        </h3>
        <button className="yk-modal-close" onClick={onClose} aria-label="Fermer">
          <Icon name="close" />
        </button>
      </div>
      <div className="yk-modal-body">{children}</div>
    </div>
  </div>
);

// Boîte de dialogue de confirmation (suppression)
const ConfirmDialog = ({ label, onConfirm, onCancel }) => (
  <div className="yk-modal-backdrop" onMouseDown={onCancel}>
    <div className="yk-modal yk-modal-sm" onMouseDown={e => e.stopPropagation()}>
      <div className="yk-modal-header" style={{ borderTopColor: '#dc2626' }}>
        <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0, color: '#dc2626' }}>
          <Icon name="warning" filled /> Confirmer la suppression
        </h3>
      </div>
      <div className="yk-modal-body">
        <p style={{ fontSize: '14px', color: 'var(--yk-slate)', lineHeight: 1.5 }}>
          Êtes-vous sûr de vouloir supprimer <strong>{label}</strong> ? Cette action est irréversible.
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
          <button className="yk-btn yk-btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Annuler</button>
          <button className="yk-btn" style={{ flex: 1, background: '#dc2626', color: '#fff' }} onClick={onConfirm}>
            <Icon name="delete" /> Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Pagination réutilisable pour toutes les listes
const Pagination = ({ page, totalPages, onChange, totalItems }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="yk-pagination">
      <span className="yk-muted" style={{ fontSize: '12.5px' }}>
        Page {page} / {totalPages} — {totalItems} élément{totalItems > 1 ? 's' : ''}
      </span>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button className="yk-btn yk-btn-ghost yk-btn-sm" disabled={page <= 1} onClick={() => onChange(1)}>
          <Icon name="first_page" style={{ fontSize: '16px' }} />
        </button>
        <button className="yk-btn yk-btn-ghost yk-btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <Icon name="chevron_left" style={{ fontSize: '16px' }} />
        </button>
        <button className="yk-btn yk-btn-ghost yk-btn-sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <Icon name="chevron_right" style={{ fontSize: '16px' }} />
        </button>
        <button className="yk-btn yk-btn-ghost yk-btn-sm" disabled={page >= totalPages} onClick={() => onChange(totalPages)}>
          <Icon name="last_page" style={{ fontSize: '16px' }} />
        </button>
      </div>
    </div>
  );
};

// Barre d'outils commune à chaque liste : recherche, filtre classe, export PDF, bouton "Nouveau"
const ListToolbar = ({ searchValue, onSearchChange, searchPlaceholder, classes, classeFilter, onClasseFilterChange, onExportPdf, onCreate, createLabel }) => (
  <div className="yk-toolbar">
    <div className="yk-toolbar-filters">
      {onSearchChange && (
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          className="yk-input"
          style={{ maxWidth: '240px', height: '36px', fontSize: '13px' }}
        />
      )}
      {classes && (
        <select
          value={classeFilter}
          onChange={e => onClasseFilterChange(e.target.value)}
          className="yk-input"
          style={{ maxWidth: '190px', height: '36px', fontSize: '13px' }}
        >
          <option value="">Toutes les classes</option>
          {classes.map(cl => <option key={cl.id} value={cl.nom}>{cl.nom}</option>)}
        </select>
      )}
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      {onExportPdf && (
        <button onClick={onExportPdf} className="yk-btn yk-btn-ghost yk-btn-sm">
          <Icon name="picture_as_pdf" style={{ fontSize: '16px' }} /> Export PDF
        </button>
      )}
      {onCreate && (
        <button onClick={onCreate} className="yk-btn yk-btn-blue yk-btn-sm">
          <Icon name="add" style={{ fontSize: '16px' }} /> {createLabel}
        </button>
      )}
    </div>
  </div>
);

// -------------------- COMPOSANT PRINCIPAL --------------------

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem('user'));

  // 1. LES ÉTATS (STATES)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [message, setMessage] = useState({ text: '', isError: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classeFilter, setClasseFilter] = useState('');

  // Pagination indépendante par liste
  const [pages, setPages] = useState({ eleves: 1, classes: 1, inscriptions: 1, paiements: 1, depenses: 1, debiteurs: 1 });
  const setPage = (key, value) => setPages(prev => ({ ...prev, [key]: value }));

  // Modale de création/édition et boîte de confirmation de suppression
  const [modal, setModal] = useState({ type: null, mode: null, id: null });
  const [confirmState, setConfirmState] = useState({ type: null, id: null, label: '' });

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

  // États financiers par année scolaire
  const [annees, setAnnees] = useState([]);
  const [anneeSel, setAnneeSel] = useState('');
  const [etatClasses, setEtatClasses] = useState([]);
  const [etatEleves, setEtatEleves] = useState([]);

  // Formulaires (réutilisés pour la création ET l'édition)
  const ELEVE_VIDE = { matricule: '', nom: '', prenom: '', date_naissance: '', genre: 'M' };
  const CLASSE_VIDE = { nom: '', frais_scolarite: '', est_classe_examen: false, frais_examen: '', frais_ape: '' };
  const INSCRIPTION_VIDE = { eleve_id: '', classe_id: '' };
  const PAIEMENT_VIDE = { inscription_id: '', categorie: 'SCOLARITE', montant: '', type_versement: '', mode_paiement: 'CASH', reference_banque: '' };
  const DEPENSE_VIDE = { titre: '', categorie: 'Fournitures', montant: '', description: '', mode_paiement: 'CASH' };

  const [eleveForm, setEleveForm] = useState(ELEVE_VIDE);
  const [classeForm, setClasseForm] = useState(CLASSE_VIDE);
  const [inscriptionForm, setInscriptionForm] = useState(INSCRIPTION_VIDE);
  const [paiementForm, setPaiementForm] = useState(PAIEMENT_VIDE);
  const [depenseForm, setDepenseForm] = useState(DEPENSE_VIDE);

  // Tranches par classe
  const [tranchesConfig, setTranchesConfig] = useState({}); // { classeId: [{ label, montant, ordre }] }
  const [trancheEditId, setTrancheEditId] = useState(null); // classeId en cours d'édition
  const [tranchesDraft, setTranchesDraft] = useState([]); // brouillon en cours d'édition

  // Tranches disponibles pour le formulaire de paiement (selon l'élève sélectionné)
  const [tranchesPaiement, setTranchesPaiement] = useState([]);
  const [classeSelectionnee, setClasseSelectionnee] = useState(null); // classe de l'inscription sélectionnée (pour frais examen)
  const [paiementsEleve, setPaiementsEleve] = useState([]); // paiements déjà effectués pour l'inscription sélectionnée

  // Import Excel
  const [importModal, setImportModal] = useState(false);
  const [importFichier, setImportFichier] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResultat, setImportResultat] = useState(null);

  // 2. LES FONCTIONS DE RECHARGEMENT ASYNCHRONES
  const afficherMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage({ text: '', isError: false }), 4000);
  };

  const handleImportExcel = async () => {
    if (!importFichier) return;
    setImportLoading(true);
    setImportResultat(null);
    try {
      const res = await importElevesExcel(importFichier);
      setImportResultat(res);
      chargerDonnees();
    } catch (err) {
      setImportResultat({ erreur: err.message });
    } finally {
      setImportLoading(false);
    }
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
        dataDepenses,
        dataAnnees,
        dataEtatClasses,
        dataEtatEleves
      ] = await Promise.all([
        fetchEleves(),
        fetchClasses(),
        fetchInscriptions(),
        fetchPaiements(),
        fetchStatsFinancieres(),
        fetchDebiteurs(),
        fetchDepenses(),
        fetchAnnees(),
        fetchEtatParClasse(),
        fetchEtatParEleve()
      ]);

      setEleves(dataEleves);
      setClasses(dataClasses);
      setInscriptions(dataInsc);
      setPaiements(dataPaie);
      setStats(dataStats);
      setDebiteurs(dataDebi);
      setDepenses(dataDepenses);
      setAnnees(dataAnnees);
      setEtatClasses(dataEtatClasses);
      setEtatEleves(dataEtatEleves);
      const act = dataAnnees.find(a => Number(a.statut) === 1) || dataAnnees[0];
      if (act) setAnneeSel(String(act.id));

      // Charger les tranches pour toutes les classes
      const tranchesMap = {};
      await Promise.all(dataClasses.map(async (cl) => {
        try {
          const t = await fetchTranches(cl.id);
          if (t.length > 0) tranchesMap[cl.id] = t;
        } catch (_) {}
      }));
      setTranchesConfig(tranchesMap);
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  // 3. HOOKS D'EFFET
  useEffect(() => {
    chargerDonnees();
  }, []);

  // Réinitialise recherche, filtre classe et pagination quand on change d'onglet
  useEffect(() => {
    setSearchTerm('');
    setClasseFilter('');
  }, [activeTab]);

  // Recharge stats + débiteurs + état par classe quand l'année scolaire change
  useEffect(() => {
    if (!anneeSel) return;
    (async () => {
      try {
        const [st, deb, ec, ee] = await Promise.all([
          fetchStatsFinancieres(anneeSel),
          fetchDebiteurs(1, 1000, anneeSel),
          fetchEtatParClasse(anneeSel),
          fetchEtatParEleve(anneeSel)
        ]);
        setStats(st); setDebiteurs(Array.isArray(deb) ? deb : (deb.data || [])); setEtatClasses(ec); setEtatEleves(ee);
      } catch (e) { afficherMessage(e.message, true); }
    })();
  }, [anneeSel]);

  // Totaux ventilés (scolarité / APE / examen) calculés depuis l'état par classe
  const totauxCategories = useMemo(() => {
    return etatClasses.reduce((a, r) => ({
      du_scol:  a.du_scol  + (parseFloat(r.du_scolarite)  || 0),
      paye_scol:a.paye_scol+ (parseFloat(r.paye_scolarite)|| 0),
      du_ape:   a.du_ape   + (parseFloat(r.du_ape)        || 0),
      paye_ape: a.paye_ape + (parseFloat(r.paye_ape)      || 0),
      du_exam:  a.du_exam  + (parseFloat(r.du_examen)     || 0),
      paye_exam:a.paye_exam+ (parseFloat(r.paye_examen)   || 0),
    }), { du_scol:0, paye_scol:0, du_ape:0, paye_ape:0, du_exam:0, paye_exam:0 });
  }, [etatClasses]);

  // Série mensuelle réelle (12 derniers mois) : recettes = paiements, dépenses = charges
  const donneesGraphe = useMemo(() => {
    const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const buckets = []; const idx = {};
    for (let k = 11; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      idx[`${d.getFullYear()}-${d.getMonth()}`] = buckets.length;
      buckets.push({ mois: MOIS[d.getMonth()], Recettes: 0, Dépenses: 0 });
    }
    const bump = (dateStr, champ, montant) => {
      if (!dateStr) return;
      const d = new Date(dateStr); if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in idx) buckets[idx[key]][champ] += parseFloat(montant) || 0;
    };
    (paiements || []).forEach(p => bump(p.date_paiement, 'Recettes', p.montant));
    (depenses || []).forEach(x => bump(x.date_depense || x.created_at || x.date || x.date_creation, 'Dépenses', x.montant));
    return buckets;
  }, [paiements, depenses]);

  // 4. CORRESPONDANCE ÉLÈVE <-> CLASSE (via le matricule, présent sur les deux entités)
  const classeParMatricule = useMemo(() => {
    const map = {};
    inscriptions.forEach(ins => { map[ins.matricule] = ins.classe_nom; });
    return map;
  }, [inscriptions]);

  // 5. HANDLERS DE FORMULAIRE (CRÉATION + ÉDITION UNIFIÉES)
  const handleEleveSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'edit') {
        await updateEleve(modal.id, eleveForm);
        afficherMessage('Fiche élève mise à jour !');
      } else {
        await saveEleve(eleveForm);
        afficherMessage('Fiche élève créée !');
      }
      closeModal();
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleClasseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'edit') {
        await updateClasse(modal.id, classeForm);
        afficherMessage('Classe mise à jour !');
      } else {
        await saveClasse(classeForm);
        afficherMessage('Classe configurée !');
      }
      closeModal();
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  // Gestion des tranches
  const ouvrirConfigTranches = (cl) => {
    setTrancheEditId(cl.id);
    const existantes = tranchesConfig[cl.id] || [];
    setTranchesDraft(existantes.length > 0 ? [...existantes] : [
      { label: 'Tranche 1', montant: '', ordre: 1 },
      { label: 'Tranche 2', montant: '', ordre: 2 },
      { label: 'Tranche 3', montant: '', ordre: 3 },
    ]);
  };

  const sauvegarderTranches = async () => {
    try {
      await saveTranches(trancheEditId, tranchesDraft);
      afficherMessage('Tranches enregistrées !');
      setTrancheEditId(null);
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  // Quand on sélectionne un élève dans le formulaire de paiement
  const handleInscriptionSelectPaiement = (inscriptionId) => {
    setPaiementForm(prev => ({ ...prev, inscription_id: inscriptionId, type_versement: '', montant: '' }));
    if (!inscriptionId) { setTranchesPaiement([]); setPaiementsEleve([]); setClasseSelectionnee(null); return; }

    const ins = inscriptions.find(i => String(i.id) === String(inscriptionId));
    if (!ins) return;

    // Trouver la classe de l'élève
    const classe = classes.find(cl => String(cl.id) === String(ins.classe_id)) ||
                   classes.find(cl => cl.nom === ins.classe_nom);
    setClasseSelectionnee(classe || null);
    const tranches = classe ? (tranchesConfig[classe.id] || []) : [];

    // Paiements déjà effectués pour cette inscription
    const paiesEleve = paiements.filter(p => String(p.inscription_id ?? '') === String(inscriptionId) ||
      (p.nom === ins.nom && p.prenom === ins.prenom && p.classe_nom === ins.classe_nom));
    setPaiementsEleve(paiesEleve);

    // Le séquencement de tranches ne concerne QUE la scolarité
    const paiesScolarite = paiesEleve.filter(p => (p.categorie || 'SCOLARITE') === 'SCOLARITE');
    if (tranches.length > 0) {
      const payeParLabel = {};
      paiesScolarite.forEach(p => {
        payeParLabel[p.type_versement] = (payeParLabel[p.type_versement] || 0) + parseFloat(p.montant || 0);
      });
      // Une tranche est « payée » quand son solde atteint son montant (paiements partiels cumulés)
      const tranchesAvecStatut = tranches.map(t => ({
        ...t,
        paye: payeParLabel[t.label] || 0,
        payee: (payeParLabel[t.label] || 0) >= parseFloat(t.montant)
      }));
      setTranchesPaiement(tranchesAvecStatut);
      // Pré-sélectionner la première tranche non entièrement soldée + son reste
      const prochaine = tranchesAvecStatut.find(t => !t.payee);
      if (prochaine) {
        const reste = parseFloat(prochaine.montant) - (prochaine.paye || 0);
        setPaiementForm(prev => ({ ...prev, categorie: 'SCOLARITE', type_versement: prochaine.label, montant: String(reste || '') }));
      }
    } else {
      setTranchesPaiement([]);
    }
  };

  const handleInscriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'edit') {
        await updateInscription(modal.id, inscriptionForm);
        afficherMessage('Inscription mise à jour !');
      } else {
        await saveInscription(inscriptionForm);
        afficherMessage('Élève inscrit !');
      }
      closeModal();
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handlePaiementSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'edit') {
        await updatePaiement(modal.id, paiementForm);
        afficherMessage('Versement mis à jour !');
      } else {
        await savePaiement(paiementForm);
        afficherMessage('Versement encaissé avec succès !');
      }
      closeModal();
      chargerDonnees();
    } catch (err) { afficherMessage(err.message, true); }
  };

  const handleDepenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modal.mode === 'edit') {
        await updateDepense(modal.id, depenseForm);
        afficherMessage('Dépense mise à jour !');
      } else {
        await saveDepense(depenseForm);
        afficherMessage('Dépense enregistrée au journal des charges !');
      }
      closeModal();
      chargerDonnees();
    } catch (err) {
      afficherMessage(err.message, true);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  // 6. OUVERTURE / FERMETURE DES MODALES
  const openCreateModal = (type) => {
    if (type === 'eleve') setEleveForm(ELEVE_VIDE);
    if (type === 'classe') setClasseForm(CLASSE_VIDE);
    if (type === 'inscription') setInscriptionForm(INSCRIPTION_VIDE);
    if (type === 'paiement') { setPaiementForm(PAIEMENT_VIDE); setTranchesPaiement([]); setPaiementsEleve([]); }
    if (type === 'depense') setDepenseForm(DEPENSE_VIDE);
    setModal({ type, mode: 'create', id: null });
  };

  const openEditModal = (type, item) => {
    if (type === 'eleve') setEleveForm({ matricule: item.matricule, nom: item.nom, prenom: item.prenom, date_naissance: item.date_naissance || '', genre: item.genre || 'M' });
    if (type === 'classe') setClasseForm({ nom: item.nom, frais_scolarite: item.frais_scolarite, est_classe_examen: !!item.est_classe_examen, frais_examen: item.frais_examen ?? '', frais_ape: item.frais_ape ?? '' });
    if (type === 'inscription') setInscriptionForm({ eleve_id: item.eleve_id ?? '', classe_id: item.classe_id ?? '' });
    if (type === 'paiement') { setPaiementForm({ inscription_id: item.inscription_id ?? '', categorie: item.categorie || 'SCOLARITE', montant: item.montant, type_versement: item.type_versement || '', mode_paiement: item.mode_paiement || 'CASH', reference_banque: item.reference_banque || '' }); setTranchesPaiement([]); setPaiementsEleve([]); }
    if (type === 'depense') setDepenseForm({ titre: item.titre, categorie: item.categorie || 'Fournitures', montant: item.montant, description: item.description || '', mode_paiement: item.mode_paiement || 'CASH' });
    setModal({ type, mode: 'edit', id: item.id });
  };

  const closeModal = () => setModal({ type: null, mode: null, id: null });

  // 7. SUPPRESSION (avec confirmation)
  const requestDelete = (type, id, label) => setConfirmState({ type, id, label });
  const cancelDelete = () => setConfirmState({ type: null, id: null, label: '' });

  const confirmDelete = async () => {
    const { type, id } = confirmState;
    try {
      if (type === 'eleve') await deleteEleve(id);
      if (type === 'classe') await deleteClasse(id);
      if (type === 'inscription') await deleteInscription(id);
      if (type === 'paiement') await deletePaiement(id);
      if (type === 'depense') await deleteDepense(id);
      afficherMessage('Élément supprimé avec succès.');
      chargerDonnees();
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      cancelDelete();
    }
  };

  // 8. EXPORTS
  const exporterDebiteursCSV = () => {
    if (filteredDebiteurs.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Matricule;Nom Complet;Classe;Scolarite Totale;Montant Verse;Dette Restante\n';
    filteredDebiteurs.forEach(d => {
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

  // Génération PDF générique, utilisée par toutes les listes
  const exporterPDF = (titre, colonnes, lignes, nomFichier) => {
    if (lignes.length === 0) {
      afficherMessage('Aucune donnée à exporter pour ce filtre.', true);
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(titre, 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`École : Yoka École — Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [colonnes],
      body: lignes,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });
    doc.save(`${nomFichier}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const copierRelanceMessage = (d) => {
    const messageRelance = `RAPPEL COMPTABILITÉ YOKA ÉCOLE :\nCher Parent, le compte de l'élève ${d.nom.toUpperCase()} ${d.prenom} (${d.classe_nom}) presents un reste à payer de ${parseFloat(d.reste_a_payer).toLocaleString()} F CFA sur les frais de scolarité. Merci de passer à la caisse de l'établissement dès que possible pour régulariser sa situation. Cordialement.`;
    navigator.clipboard.writeText(messageRelance);
    afficherMessage(`Message de relance pour ${d.prenom} copié dans le presse-papiers !`);
  };

  const currentNav = NAV_ITEMS.find(n => n.key === activeTab);

  // 9. FILTRAGE (recherche + classe) — calculé avant pagination
  const filteredEleves = useMemo(() => eleves.filter(el => {
    const matchTerm = el.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      el.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      el.matricule.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClasse = !classeFilter || classeParMatricule[el.matricule] === classeFilter;
    return matchTerm && matchClasse;
  }), [eleves, searchTerm, classeFilter, classeParMatricule]);

  const filteredDebiteurs = useMemo(() => debiteurs.filter(d => {
    const matchTerm = d.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.matricule.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClasse = !classeFilter || d.classe_nom === classeFilter;
    return matchTerm && matchClasse;
  }), [debiteurs, searchTerm, classeFilter]);

  const filteredClasses = useMemo(() => classes.filter(cl =>
    cl.nom.toLowerCase().includes(searchTerm.toLowerCase())
  ), [classes, searchTerm]);

  const filteredInscriptions = useMemo(() => inscriptions.filter(ins => {
    const matchTerm = ins.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ins.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ins.matricule.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClasse = !classeFilter || ins.classe_nom === classeFilter;
    return matchTerm && matchClasse;
  }), [inscriptions, searchTerm, classeFilter]);

  const filteredPaiements = useMemo(() => paiements.filter(p => {
    const matchTerm = p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prenom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClasse = !classeFilter || p.classe_nom === classeFilter;
    return matchTerm && matchClasse;
  }), [paiements, searchTerm, classeFilter]);

  const filteredDepenses = useMemo(() => depenses.filter(d =>
    d.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.categorie || '').toLowerCase().includes(searchTerm.toLowerCase())
  ), [depenses, searchTerm]);

  // 10. PAGINATION — appliquée après filtrage
  const paginer = (liste, page) => liste.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = (liste) => Math.max(1, Math.ceil(liste.length / PAGE_SIZE));

  const pageEleves = paginer(filteredEleves, pages.eleves);
  const pageClasses = paginer(filteredClasses, pages.classes);
  const pageInscriptions = paginer(filteredInscriptions, pages.inscriptions);
  const pagePaiements = paginer(filteredPaiements, pages.paiements);
  const pageDepenses = paginer(filteredDepenses, pages.depenses);
  const pageDebiteurs = paginer(filteredDebiteurs, pages.debiteurs);

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
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <Icon name="event" style={{ fontSize: '18px', color: 'var(--yk-muted)' }} />
                    <span style={{ fontSize: '13px', color: 'var(--yk-muted)', fontWeight: 600 }}>Année scolaire</span>
                    <select value={anneeSel} onChange={e => setAnneeSel(e.target.value)} className="yk-input" style={{ maxWidth: '220px' }}>
                      <option value="">Toutes les années</option>
                      {annees.map(a => (
                        <option key={a.id} value={a.id}>{a.libelle}{Number(a.statut) === 1 ? ' (active)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="yk-kpi-grid">
                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="account_balance_wallet" /></div>
                      <div>
                        <span className="yk-kpi-label">Total attendu</span>
                        <span className="yk-kpi-value">{formatMontant(stats.total_attendu)}</span>
                      </div>
                    </div>
                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="savings" /></div>
                      <div>
                        <span className="yk-kpi-label">Total encaissé</span>
                        <span className="yk-kpi-value">{formatMontant(stats.total_encaisse)}</span>
                      </div>
                    </div>
                    <div className="yk-kpi-card yk-kpi-red">
                      <div className="yk-kpi-icon"><Icon name="trending_down" /></div>
                      <div>
                        <span className="yk-kpi-label">Reste à recouvrer</span>
                        <span className="yk-kpi-value">{formatMontant(stats.total_restant)}</span>
                      </div>
                    </div>

                    <div className="yk-kpi-card yk-kpi-red" style={{ borderTopColor: '#e11d48' }}>
                      <div className="yk-kpi-icon" style={{ background: '#fff1f2', color: '#e11d48' }}><Icon name="money_off" /></div>
                      <div>
                        <span className="yk-kpi-label">Total Dépenses</span>
                        <span className="yk-kpi-value" style={{ color: '#e11d48' }}>{formatMontant(stats.total_depenses)}</span>
                      </div>
                    </div>

                    <div className="yk-kpi-card yk-kpi-green" style={{ borderTopColor: stats.solde_caisse >= 0 ? 'var(--yk-green)' : 'var(--yk-red)' }}>
                      <div className="yk-kpi-icon" style={{ background: stats.solde_caisse >= 0 ? '#ecfdf5' : '#fef2f2', color: stats.solde_caisse >= 0 ? 'var(--yk-green)' : 'var(--yk-red)' }}><Icon name="account_balance" /></div>
                      <div>
                        <span className="yk-kpi-label">Solde Réel Caisse</span>
                        <span className="yk-kpi-value" style={{ color: stats.solde_caisse >= 0 ? 'var(--yk-green)' : 'var(--yk-red)' }}>{formatMontant(stats.solde_caisse)}</span>
                      </div>
                    </div>

                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="menu_book" /></div>
                      <div>
                        <span className="yk-kpi-label">Scolarité (payé / attendu)</span>
                        <span className="yk-kpi-value">{formatMontant(totauxCategories.paye_scol)} / {formatMontant(totauxCategories.du_scol)}</span>
                      </div>
                    </div>
                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="groups" /></div>
                      <div>
                        <span className="yk-kpi-label">APE (payé / attendu)</span>
                        <span className="yk-kpi-value">{formatMontant(totauxCategories.paye_ape)} / {formatMontant(totauxCategories.du_ape)}</span>
                      </div>
                    </div>
                    <div className="yk-kpi-card yk-kpi-blue">
                      <div className="yk-kpi-icon"><Icon name="school" /></div>
                      <div>
                        <span className="yk-kpi-label">Examen (payé / attendu)</span>
                        <span className="yk-kpi-value">{formatMontant(totauxCategories.paye_exam)} / {formatMontant(totauxCategories.du_exam)}</span>
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
                  <AdminLocalChart data={donneesGraphe} />

                  <div className="yk-card" style={{ marginTop: '24px' }}>
                    <div className="yk-card-header">
                      <h3 className="yk-card-title">
                        <Icon name="account_tree" /> État financier par classe
                        {anneeSel && annees.find(a => String(a.id) === String(anneeSel)) ? ` — ${annees.find(a => String(a.id) === String(anneeSel)).libelle}` : ' — toutes années'}
                      </h3>
                      <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => exporterPDF(
                        'État financier par classe',
                        ['Classe', 'Élèves', 'Scolarité (payé/dû)', 'APE (payé/dû)', 'Examen (payé/dû)', 'Reste'],
                        etatClasses.map(r => {
                          const du = (parseFloat(r.du_scolarite)||0)+(parseFloat(r.du_ape)||0)+(parseFloat(r.du_examen)||0);
                          const pa = (parseFloat(r.paye_scolarite)||0)+(parseFloat(r.paye_ape)||0)+(parseFloat(r.paye_examen)||0);
                          return [r.classe_nom, r.nb_eleves,
                            `${formatMontant(r.paye_scolarite)} / ${formatMontant(r.du_scolarite)}`,
                            `${formatMontant(r.paye_ape)} / ${formatMontant(r.du_ape)}`,
                            `${formatMontant(r.paye_examen)} / ${formatMontant(r.du_examen)}`,
                            formatMontant(du - pa)];
                        }),
                        'etat_par_classe'
                      )}>
                        <Icon name="picture_as_pdf" style={{ fontSize: '16px' }} /> Export PDF
                      </button>
                    </div>
                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead>
                          <tr>
                            <th>Classe</th><th>Élèves</th>
                            <th>Scolarité (payé / dû)</th><th>APE (payé / dû)</th><th>Examen (payé / dû)</th><th>Reste</th>
                          </tr>
                        </thead>
                        <tbody>
                          {etatClasses.length === 0 ? (
                            <tr><td colSpan={6} className="yk-empty-row"><Icon name="inbox" /> Aucune donnée pour cette année.</td></tr>
                          ) : etatClasses.map(r => {
                            const du = (parseFloat(r.du_scolarite)||0)+(parseFloat(r.du_ape)||0)+(parseFloat(r.du_examen)||0);
                            const pa = (parseFloat(r.paye_scolarite)||0)+(parseFloat(r.paye_ape)||0)+(parseFloat(r.paye_examen)||0);
                            const reste = du - pa;
                            return (
                              <tr key={`${r.classe_id}-${r.annee_id}`}>
                                <td className="yk-strong">{r.classe_nom}</td>
                                <td>{r.nb_eleves}</td>
                                <td><span className="yk-text-green">{formatMontant(r.paye_scolarite)}</span> / {formatMontant(r.du_scolarite)}</td>
                                <td><span className="yk-text-green">{formatMontant(r.paye_ape)}</span> / {formatMontant(r.du_ape)}</td>
                                <td><span className="yk-text-green">{formatMontant(r.paye_examen)}</span> / {formatMontant(r.du_examen)}</td>
                                <td style={{ fontWeight: 700, color: reste > 0 ? 'var(--yk-red)' : 'var(--yk-green)' }}>{formatMontant(reste)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="yk-card" style={{ marginTop: '24px' }}>
                    <div className="yk-card-header">
                      <h3 className="yk-card-title">
                        <Icon name="groups" /> État financier par élève
                        {anneeSel && annees.find(a => String(a.id) === String(anneeSel)) ? ` — ${annees.find(a => String(a.id) === String(anneeSel)).libelle}` : ' — toutes années'}
                      </h3>
                      <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => exporterPDF(
                        'État financier par élève',
                        ['Matricule', 'Élève', 'Classe', 'Scolarité (payé/dû)', 'APE (payé/dû)', 'Examen (payé/dû)', 'Reste'],
                        etatEleves.map(r => {
                          const du = (parseFloat(r.du_scolarite)||0)+(parseFloat(r.du_ape)||0)+(parseFloat(r.du_examen)||0);
                          const pa = (parseFloat(r.paye_scolarite)||0)+(parseFloat(r.paye_ape)||0)+(parseFloat(r.paye_examen)||0);
                          return [r.matricule, `${r.nom} ${r.prenom}`, r.classe_nom,
                            `${formatMontant(r.paye_scolarite)} / ${formatMontant(r.du_scolarite)}`,
                            `${formatMontant(r.paye_ape)} / ${formatMontant(r.du_ape)}`,
                            `${formatMontant(r.paye_examen)} / ${formatMontant(r.du_examen)}`,
                            formatMontant(du - pa)];
                        }),
                        'etat_par_eleve'
                      )}>
                        <Icon name="picture_as_pdf" style={{ fontSize: '16px' }} /> Export PDF
                      </button>
                    </div>
                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead>
                          <tr>
                            <th>Matricule</th><th>Élève</th><th>Classe</th>
                            <th>Scolarité (payé / dû)</th><th>APE (payé / dû)</th><th>Examen (payé / dû)</th><th>Reste</th>
                          </tr>
                        </thead>
                        <tbody>
                          {etatEleves.length === 0 ? (
                            <tr><td colSpan={7} className="yk-empty-row"><Icon name="inbox" /> Aucune donnée pour cette année.</td></tr>
                          ) : etatEleves.map(r => {
                            const du = (parseFloat(r.du_scolarite)||0)+(parseFloat(r.du_ape)||0)+(parseFloat(r.du_examen)||0);
                            const pa = (parseFloat(r.paye_scolarite)||0)+(parseFloat(r.paye_ape)||0)+(parseFloat(r.paye_examen)||0);
                            const reste = du - pa;
                            return (
                              <tr key={r.inscription_id}>
                                <td>{r.matricule}</td>
                                <td className="yk-strong">{r.nom} {r.prenom}</td>
                                <td>{r.classe_nom}</td>
                                <td><span className="yk-text-green">{formatMontant(r.paye_scolarite)}</span> / {formatMontant(r.du_scolarite)}</td>
                                <td><span className="yk-text-green">{formatMontant(r.paye_ape)}</span> / {formatMontant(r.du_ape)}</td>
                                <td><span className="yk-text-green">{formatMontant(r.paye_examen)}</span> / {formatMontant(r.du_examen)}</td>
                                <td style={{ fontWeight: 700, color: reste > 0 ? 'var(--yk-red)' : 'var(--yk-green)' }}>{formatMontant(reste)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="yk-card" style={{ marginTop: '24px' }}>
                    <div className="yk-card-header">
                      <h3 className="yk-card-title yk-title-danger">
                        <Icon name="warning" filled /> Liste rouge des élèves insolvables
                      </h3>
                    </div>

                    <ListToolbar
                      searchValue={searchTerm}
                      onSearchChange={setSearchTerm}
                      searchPlaceholder="Rechercher un débiteur…"
                      classes={classes}
                      classeFilter={classeFilter}
                      onClasseFilterChange={setClasseFilter}
                      onExportPdf={() => exporterPDF(
                        'Liste rouge des élèves insolvables',
                        ['Matricule', 'Nom complet', 'Classe', 'Scolarité', 'Payé', 'Dette'],
                        filteredDebiteurs.map(d => [d.matricule, `${d.nom} ${d.prenom}`, d.classe_nom, formatMontant(d.total_scolarite), formatMontant(d.total_paye), formatMontant(d.reste_a_payer)]),
                        'liste_debiteurs'
                      )}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                      <button onClick={exporterDebiteursCSV} disabled={filteredDebiteurs.length === 0} className="yk-btn yk-btn-green yk-btn-sm">
                        <Icon name="file_download" style={{ fontSize: '16px' }} /> Export CSV / Excel
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
                          {pageDebiteurs.length === 0 ? (
                            <tr><td colSpan={7} className="yk-empty-row">
                              <Icon name="celebration" filled style={{ color: '#10b981' }} /> Aucun débiteur ne correspond !
                            </td></tr>
                          ) : (
                            pageDebiteurs.map(d => (
                              <tr key={d.inscription_id}>
                                <td>{d.matricule}</td>
                                <td className="yk-strong">{d.nom} {d.prenom}</td>
                                <td>{d.classe_nom}</td>
                                <td>{formatMontant(d.total_scolarite)}</td>
                                <td className="yk-text-green">{formatMontant(d.total_paye)}</td>
                                <td className="yk-debt-cell">{formatMontant(d.reste_a_payer)}</td>
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
                    <Pagination page={pages.debiteurs} totalPages={totalPages(filteredDebiteurs)} totalItems={filteredDebiteurs.length} onChange={p => setPage('debiteurs', p)} />
                  </div>
                </div>
              )}

              {/* ---------------- ÉLÈVES ---------------- */}
              {activeTab === 'eleves' && (
                <div className="yk-card yk-fade-in">
                  <div className="yk-card-header">
                    <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                      <Icon name="groups" /> Élèves globaux ({filteredEleves.length})
                    </h3>
                  </div>

                  <ListToolbar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="Rechercher (nom, matricule…)"
                    classes={classes}
                    classeFilter={classeFilter}
                    onClasseFilterChange={setClasseFilter}
                    onExportPdf={() => exporterPDF(
                      'Registre des élèves',
                      ['Matricule', 'Nom complet', 'Genre', 'Classe'],
                      filteredEleves.map(el => [el.matricule, `${el.nom} ${el.prenom}`, el.genre, classeParMatricule[el.matricule] || '—']),
                      'liste_eleves'
                    )}
                    onCreate={() => openCreateModal('eleve')}
                    createLabel="Nouvel élève"
                  />
                  <div style={{ marginBottom: '10px' }}>
                    <button onClick={() => { setImportModal(true); setImportFichier(null); setImportResultat(null); }} className="yk-btn yk-btn-ghost yk-btn-sm">
                      <Icon name="upload_file" style={{ fontSize: '16px' }} /> Importer Excel
                    </button>
                  </div>

                  <div className="yk-table-scroll">
                    <table className="yk-table">
                      <thead><tr><th>Matricule</th><th>Nom complet</th><th>Genre</th><th>Classe</th><th>Actions</th></tr></thead>
                      <tbody>
                        {pageEleves.length === 0 ? (
                          <tr><td colSpan={5} className="yk-empty-row">Aucun élève ne correspond à la recherche.</td></tr>
                        ) : pageEleves.map(el => (
                          <tr key={el.id}>
                            <td>{el.matricule}</td>
                            <td className="yk-strong">{el.nom} {el.prenom}</td>
                            <td>{el.genre}</td>
                            <td>{classeParMatricule[el.matricule] || <span className="yk-muted">Non inscrit</span>}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => openEditModal('eleve', el)}>
                                  <Icon name="edit" style={{ fontSize: '16px' }} />
                                </button>
                                <button className="yk-btn yk-btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => requestDelete('eleve', el.id, `${el.nom} ${el.prenom}`)}>
                                  <Icon name="delete" style={{ fontSize: '16px' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={pages.eleves} totalPages={totalPages(filteredEleves)} totalItems={filteredEleves.length} onChange={p => setPage('eleves', p)} />
                </div>
              )}

              {/* ---------------- CLASSES ---------------- */}
              {activeTab === 'classes' && (
                <div className="yk-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div className="yk-card">
                    <div className="yk-card-header">
                      <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                        <Icon name="domain" /> Niveaux actifs ({filteredClasses.length})
                      </h3>
                    </div>

                    <ListToolbar
                      searchValue={searchTerm}
                      onSearchChange={setSearchTerm}
                      searchPlaceholder="Rechercher une classe…"
                      onExportPdf={() => exporterPDF(
                        'Liste des classes et tarifs',
                        ['Intitulé de classe', 'Frais de scolarité', 'Classe examen'],
                        filteredClasses.map(cl => [cl.nom, formatMontant(cl.frais_scolarite), cl.est_classe_examen ? 'Oui' : 'Non']),
                        'liste_classes'
                      )}
                      onCreate={() => openCreateModal('classe')}
                      createLabel="Nouvelle classe"
                    />

                    <div className="yk-table-scroll">
                      <table className="yk-table">
                        <thead><tr><th>Intitulé de classe</th><th>Montant scolarité</th><th>Classe examen</th><th>Tranches</th><th>Actions</th></tr></thead>
                        <tbody>
                          {pageClasses.length === 0 ? (
                            <tr><td colSpan={5} className="yk-empty-row">Aucune classe configurée pour le moment.</td></tr>
                          ) : pageClasses.map(cl => (
                            <tr key={cl.id}>
                              <td className="yk-strong">{cl.nom}</td>
                              <td>{formatMontant(cl.frais_scolarite)}</td>
                              <td>
                                {cl.est_classe_examen
                                  ? <span className="yk-badge" style={{ background: '#fef3c7', color: '#92400e' }}><Icon name="school" style={{ fontSize: '13px' }} /> Examen</span>
                                  : <span className="yk-muted" style={{ fontSize: '12px' }}>Non</span>}
                              </td>
                              <td>
                                <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => ouvrirConfigTranches(cl)}>
                                  <Icon name="tune" style={{ fontSize: '15px' }} />
                                  {tranchesConfig[cl.id]?.length > 0 ? `${tranchesConfig[cl.id].length} tranches` : 'Config'}
                                </button>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => openEditModal('classe', cl)}>
                                    <Icon name="edit" style={{ fontSize: '16px' }} />
                                  </button>
                                  <button className="yk-btn yk-btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => requestDelete('classe', cl.id, cl.nom)}>
                                    <Icon name="delete" style={{ fontSize: '16px' }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination page={pages.classes} totalPages={totalPages(filteredClasses)} totalItems={filteredClasses.length} onChange={p => setPage('classes', p)} />
                  </div>

                  {/* Panel de configuration des tranches */}
                  {trancheEditId && (() => {
                    const cl = classes.find(c => c.id === trancheEditId);
                    const totalTranches = tranchesDraft.reduce((s, t) => s + (parseFloat(t.montant) || 0), 0);
                    const totalAttendu = parseFloat(cl?.frais_scolarite) || 0;
                    const sommeOK = tranchesDraft.length > 0 && Math.abs(totalTranches - totalAttendu) <= 0.01;
                    const ecart = totalTranches - totalAttendu;
                    return (
                      <div className="yk-card yk-fade-in" style={{ border: '2px solid #0369a1' }}>
                        <div className="yk-card-header">
                          <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0, color: '#0369a1' }}>
                            <Icon name="tune" /> Configuration des tranches — {cl?.nom}
                          </h3>
                          <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => setTrancheEditId(null)}>
                            <Icon name="close" style={{ fontSize: '16px' }} /> Fermer
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {tranchesDraft.map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <input
                                type="text"
                                placeholder="Label (ex: Tranche 1)"
                                value={t.label}
                                onChange={e => setTranchesDraft(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                                className="yk-input"
                                style={{ flex: 2 }}
                              />
                              <input type="number" onWheel={e => e.target.blur()}
                                placeholder="Montant (F CFA)"
                                value={t.montant}
                                onChange={e => setTranchesDraft(prev => prev.map((x, j) => j === i ? { ...x, montant: e.target.value } : x))}
                                className="yk-input"
                                style={{ flex: 1 }}
                              />
                              <button
                                className="yk-btn yk-btn-sm"
                                style={{ background: '#fef2f2', color: '#dc2626', flexShrink: 0 }}
                                onClick={() => setTranchesDraft(prev => prev.filter((_, j) => j !== i))}
                              >
                                <Icon name="remove" style={{ fontSize: '16px' }} />
                              </button>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                            <button
                              className="yk-btn yk-btn-ghost yk-btn-sm"
                              onClick={() => setTranchesDraft(prev => [...prev, { label: `Tranche ${prev.length + 1}`, montant: '', ordre: prev.length + 1 }])}
                            >
                              <Icon name="add" style={{ fontSize: '16px' }} /> Ajouter une tranche
                            </button>
                            <button
                              className="yk-btn yk-btn-blue yk-btn-sm"
                              onClick={sauvegarderTranches}
                              disabled={!sommeOK}
                              title={sommeOK ? '' : 'La somme des tranches doit égaler les frais de scolarité'}
                              style={!sommeOK ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                            >
                              <Icon name="save" style={{ fontSize: '16px' }} /> Enregistrer les tranches
                            </button>
                          </div>
                          {tranchesDraft.length > 0 && (
                            <div style={{ fontSize: '12.5px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: sommeOK ? '#16a34a' : '#dc2626' }}>
                              <Icon name={sommeOK ? 'check_circle' : 'error'} style={{ fontSize: '16px' }} />
                              <span>
                                Total configuré : <strong>{formatMontant(totalTranches)}</strong> / {formatMontant(totalAttendu)} attendus
                                {!sommeOK && <> — {ecart > 0 ? `exc\u00e8s de ${formatMontant(ecart)}` : `manque ${formatMontant(-ecart)}`}</>}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ---------------- INSCRIPTIONS ---------------- */}
              {activeTab === 'inscriptions' && (
                <div className="yk-card yk-fade-in">
                  <div className="yk-card-header">
                    <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                      <Icon name="fact_check" /> Registre des inscriptions ({filteredInscriptions.length})
                    </h3>
                  </div>

                  <ListToolbar
                    searchValue={searchTerm}
                    onSearchChange={setSearchTerm}
                    searchPlaceholder="Rechercher (nom, matricule…)"
                    classes={classes}
                    classeFilter={classeFilter}
                    onClasseFilterChange={setClasseFilter}
                    onExportPdf={() => exporterPDF(
                      "Registre des inscriptions",
                      ['Élève', 'Classe assignée', 'Année'],
                      filteredInscriptions.map(ins => [`${ins.nom} ${ins.prenom} (${ins.matricule})`, ins.classe_nom, ins.annee_libelle]),
                      'liste_inscriptions'
                    )}
                    onCreate={() => openCreateModal('inscription')}
                    createLabel="Nouvelle inscription"
                  />

                  <div className="yk-table-scroll">
                    <table className="yk-table">
                      <thead><tr><th>Élève</th><th>Classe assignée</th><th>Année</th><th>Actions</th></tr></thead>
                      <tbody>
                        {pageInscriptions.length === 0 ? (
                          <tr><td colSpan={4} className="yk-empty-row">Aucune inscription enregistrée pour le moment.</td></tr>
                        ) : pageInscriptions.map(ins => (
                          <tr key={ins.id}>
                            <td className="yk-strong">{ins.nom} {ins.prenom} ({ins.matricule})</td>
                            <td>{ins.classe_nom}</td>
                            <td>{ins.annee_libelle}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => openEditModal('inscription', ins)}>
                                  <Icon name="edit" style={{ fontSize: '16px' }} />
                                </button>
                                <button className="yk-btn yk-btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => requestDelete('inscription', ins.id, `${ins.nom} ${ins.prenom}`)}>
                                  <Icon name="delete" style={{ fontSize: '16px' }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={pages.inscriptions} totalPages={totalPages(filteredInscriptions)} totalItems={filteredInscriptions.length} onChange={p => setPage('inscriptions', p)} />
                </div>
              )}

              {/* ---------------- COMPTABILITÉ ---------------- */}
              {activeTab === 'comptabilite' && (
                <div className="yk-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--yk-blue)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="arrow_circle_up" style={{ color: 'var(--yk-green)' }} /> Section 1 : Flux Entrants (Recettes)
                    </h2>
                    <div className="yk-card">
                      <div className="yk-card-header">
                        <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                          <Icon name="receipt_long" /> Journal de caisse ({filteredPaiements.length} entrées)
                        </h3>
                      </div>
                      <ListToolbar
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Rechercher un versement…"
                        classes={classes}
                        classeFilter={classeFilter}
                        onClasseFilterChange={setClasseFilter}
                        onExportPdf={() => exporterPDF(
                          'Journal de caisse — versements',
                          ['Élève', 'N° reçu', 'Montant', 'Tranche'],
                          filteredPaiements.map(p => [`${p.nom} ${p.prenom}`, p.numero_recu || 'REC-N/A', formatMontant(p.montant), p.type_versement || 'Tranche 1']),
                          'journal_caisse'
                        )}
                        onCreate={() => openCreateModal('paiement')}
                        createLabel="Nouveau versement"
                      />
                      <div className="yk-table-scroll">
                        <table className="yk-table">
                          <thead>
                            <tr>
                              <th>Élève</th>
                              <th>Versement</th>
                              <th>Tranche</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagePaiements.length === 0 ? (
                              <tr><td colSpan={4} className="yk-empty-row">Aucun encaissement enregistré.</td></tr>
                            ) : (
                              pagePaiements.map(p => (
                                <tr key={p.id}>
                                  <td>
                                    <span className="yk-strong">{p.nom} {p.prenom}</span>
                                    <br /><small className="yk-muted">{p.numero_recu || 'REC-N/A'}</small>
                                  </td>
                                  <td className="yk-text-blue yk-strong">{formatMontant(p.montant)}</td>
                                  <td><span className="yk-badge">{p.type_versement || 'Tranche 1'}</span></td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button onClick={() => imprimerRecu(p)} className="yk-btn yk-btn-ghost yk-btn-sm">
                                        <Icon name="print" style={{ fontSize: '16px' }} />
                                      </button>
                                      <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => openEditModal('paiement', p)}>
                                        <Icon name="edit" style={{ fontSize: '16px' }} />
                                      </button>
                                      <button className="yk-btn yk-btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => requestDelete('paiement', p.id, `le versement de ${p.nom} ${p.prenom}`)}>
                                        <Icon name="delete" style={{ fontSize: '16px' }} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={pages.paiements} totalPages={totalPages(filteredPaiements)} totalItems={filteredPaiements.length} onChange={p => setPage('paiements', p)} />
                    </div>
                  </div>

                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', color: '#e11d48', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="arrow_circle_down" style={{ color: 'var(--yk-red)' }} /> Section 2 : Flux Sortants (Charges & Dépenses)
                    </h2>
                    <div className="yk-card">
                      <div className="yk-card-header">
                        <h3 className="yk-card-title" style={{ margin: 0, border: 'none', padding: 0, color: '#e11d48' }}>
                          <Icon name="menu_book" /> Journal d'historique des dépenses ({filteredDepenses.length} lignes)
                        </h3>
                      </div>
                      <ListToolbar
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Rechercher une dépense…"
                        onExportPdf={() => exporterPDF(
                          "Journal des dépenses",
                          ['Libellé', 'Catégorie', 'Montant', 'Mode'],
                          filteredDepenses.map(d => [d.titre, d.categorie, formatMontant(d.montant), d.mode_paiement]),
                          'journal_depenses'
                        )}
                        onCreate={() => openCreateModal('depense')}
                        createLabel="Nouvelle dépense"
                      />
                      <div className="yk-table-scroll">
                        <table className="yk-table">
                          <thead>
                            <tr>
                              <th>Libellé / Motif</th>
                              <th>Catégorie</th>
                              <th>Montant</th>
                              <th>Mode</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageDepenses.length === 0 ? (
                              <tr><td colSpan={5} className="yk-empty-row">Aucune dépense enregistrée sur cette période.</td></tr>
                            ) : (
                              pageDepenses.map(d => (
                                <tr key={d.id}>
                                  <td>
                                    <span className="yk-strong" style={{ color: 'var(--yk-ink)' }}>{d.titre}</span>
                                    {d.description && <br />}<small className="yk-muted">{d.description}</small>
                                  </td>
                                  <td><span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--yk-slate)' }}>{d.categorie}</span></td>
                                  <td style={{ color: '#dc2626', fontWeight: 700 }}>-{formatMontant(d.montant)}</td>
                                  <td><span className="yk-badge" style={{ background: '#f1f5f9', color: 'var(--yk-slate)' }}>{d.mode_paiement}</span></td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                      <button className="yk-btn yk-btn-ghost yk-btn-sm" onClick={() => openEditModal('depense', d)}>
                                        <Icon name="edit" style={{ fontSize: '16px' }} />
                                      </button>
                                      <button className="yk-btn yk-btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }} onClick={() => requestDelete('depense', d.id, d.titre)}>
                                        <Icon name="delete" style={{ fontSize: '16px' }} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <Pagination page={pages.depenses} totalPages={totalPages(filteredDepenses)} totalItems={filteredDepenses.length} onChange={p => setPage('depenses', p)} />
                    </div>
                  </div>

                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ---------------- MODALES DE CRÉATION / ÉDITION ---------------- */}
      {modal.type === 'eleve' && (
        <Modal title={modal.mode === 'edit' ? "Modifier l'élève" : 'Enregistrer un élève'} icon="person_add" onClose={closeModal} accent="#0e9f6e">
          <form onSubmit={handleEleveSubmit} className="yk-form">
            <label className="yk-field">
              <span className="yk-label">Matricule</span>
              <input type="text" placeholder="Généré automatiquement" value={eleveForm.matricule} disabled className="yk-input" />
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
            <button type="submit" className="yk-btn yk-btn-green yk-btn-block"><Icon name="save" /> {modal.mode === 'edit' ? 'Enregistrer les modifications' : 'Créer la fiche'}</button>
          </form>
        </Modal>
      )}

      {modal.type === 'classe' && (
        <Modal title={modal.mode === 'edit' ? 'Modifier la classe' : 'Nouvelle classe'} icon="add_business" onClose={closeModal} accent="#0369a1">
          <form onSubmit={handleClasseSubmit} className="yk-form">
            <label className="yk-field">
              <span className="yk-label">Nom de la classe</span>
              <input type="text" placeholder="Ex : SIL 1" value={classeForm.nom} onChange={e => setClasseForm({ ...classeForm, nom: e.target.value })} required className="yk-input" />
            </label>
            <label className="yk-field">
              <span className="yk-label">Frais de scolarité (F CFA)</span>
              <input type="number" onWheel={e => e.target.blur()} placeholder="Ex : 150000" value={classeForm.frais_scolarite} onChange={e => setClasseForm({ ...classeForm, frais_scolarite: e.target.value })} required className="yk-input" />
            </label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: classeForm.est_classe_examen ? '#fef3c7' : '#f8fafc', borderRadius: '8px', border: `1px solid ${classeForm.est_classe_examen ? '#fcd34d' : '#d6dbe3'}` }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--yk-ink)' }}>
                  <Icon name="school" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px', color: classeForm.est_classe_examen ? '#92400e' : 'var(--yk-muted)' }} />
                  Classe d'examen
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--yk-muted)', marginTop: '2px' }}>Frais d'examen supplémentaires applicables</div>
              </div>
              <button
                type="button"
                onClick={() => setClasseForm(prev => ({ ...prev, est_classe_examen: !prev.est_classe_examen }))}
                style={{
                  width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                  background: classeForm.est_classe_examen ? '#f59e0b' : '#cbd5e1',
                  position: 'relative', transition: 'background 0.2s ease', flexShrink: 0
                }}
                aria-label="Basculer classe d'examen"
              >
                <span style={{
                  position: 'absolute', top: '3px',
                  left: classeForm.est_classe_examen ? '23px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </button>
            </div>
            {classeForm.est_classe_examen && (
              <label className="yk-field">
                <span className="yk-label">Frais d'examen (F CFA)</span>
                <input type="number" onWheel={e => e.target.blur()} placeholder="Ex : 20000" value={classeForm.frais_examen} onChange={e => setClasseForm({ ...classeForm, frais_examen: e.target.value })} required className="yk-input" />
              </label>
            )}
            <label className="yk-field">
              <span className="yk-label">Cotisation APE (F CFA) — optionnel</span>
              <input type="number" onWheel={e => e.target.blur()} placeholder="Ex : 10000" value={classeForm.frais_ape} onChange={e => setClasseForm({ ...classeForm, frais_ape: e.target.value })} className="yk-input" />
            </label>
            <button type="submit" className="yk-btn yk-btn-blue yk-btn-block"><Icon name="save" /> {modal.mode === 'edit' ? 'Enregistrer les modifications' : 'Créer la classe'}</button>
          </form>
        </Modal>
      )}

      {modal.type === 'inscription' && (
        <Modal title={modal.mode === 'edit' ? "Modifier l'inscription" : 'Associer un élève à une classe'} icon="how_to_reg" onClose={closeModal} accent="#c2790a">
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
            <button type="submit" className="yk-btn yk-btn-amber yk-btn-block"><Icon name="task_alt" /> {modal.mode === 'edit' ? 'Enregistrer les modifications' : "Valider l'inscription"}</button>
          </form>
        </Modal>
      )}

      {modal.type === 'paiement' && (
        <Modal title={modal.mode === 'edit' ? 'Modifier le versement' : 'Enregistrer un versement'} icon="point_of_sale" onClose={closeModal} accent="#0369a1">
          <form onSubmit={handlePaiementSubmit} className="yk-form">
            <label className="yk-field">
              <span className="yk-label">Élève inscrit</span>
              
              {/* <select
                value={paiementForm.inscription_id}
                onChange={e => handleInscriptionSelectPaiement(e.target.value)}
                required
                className="yk-input"
                disabled={modal.mode === 'edit'}
              >
                <option value="">-- Choisir un élève inscrit --</option>
                {inscriptions.map(ins => (
                  <option key={ins.id} value={ins.id}>{ins.matricule} - {ins.nom} {ins.prenom} ({ins.classe_nom})</option>
                ))}
              </select> */}


              {/* <div className="yk-form-group">
                <label className="yk-label">Élève Inscrit *</label>
                <select
                  className="yk-select"
                  value={paiementForm.inscription_id}
                  onChange={(e) => setPaiementForm({ ...paiementForm, inscription_id: e.target.value })}
                  required
                  disabled={modal.mode === 'edit'}
                >
                  <option value="">-- Sélectionner un élève inscrit --</option>
                  {inscriptions.map(ins => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nom} {ins.prenom} ({ins.classe_nom} - {ins.matricule})
                    </option>
                  ))}
                </select>
              </div> */}

              <label className="yk-field">
                <span className="yk-label">Élève Inscrit *</span>
                <select
                  className="yk-input"
                  value={paiementForm.inscription_id}
                  onChange={(e) => handleInscriptionSelectPaiement(e.target.value)}
                  required
                  disabled={modal.mode === 'edit'}
                >
                  <option value="">-- Choisir un élève inscrit --</option>
                  {inscriptions.map(ins => (
                    <option key={ins.id} value={ins.id}>
                      {ins.matricule} - {ins.nom} {ins.prenom} ({ins.classe_nom})
                    </option>
                  ))}
                </select>
              </label>

              {/* <div className="yk-form-group">
                <label className="yk-label">Élève Inscrit *</label>
                <select
                  className="yk-select"
                  value={paiementForm.inscription_id}
                  onChange={(e) => handleInscriptionSelectPaiement(e.target.value)}
                  required
                  disabled={modal.mode === 'edit'}
                >
                  <option value="">-- Sélectionner un élève inscrit --</option>
                  {inscriptions.map(ins => (
                    <option key={ins.id} value={ins.id}>
                      {ins.matricule} - {ins.nom} {ins.prenom} ({ins.classe_nom})
                    </option>
                  ))}
                </select>
              </div> */}




              
            </label>

            <label className="yk-field">
              <span className="yk-label">Nature du versement</span>
              <select
                value={paiementForm.categorie}
                onChange={e => setPaiementForm(prev => ({ ...prev, categorie: e.target.value, type_versement: '', montant: '' }))}
                required
                className="yk-input"
              >
                <option value="SCOLARITE">Frais de scolarité</option>
                <option value="APE">Cotisation APE</option>
                {classeSelectionnee?.est_classe_examen && <option value="EXAMEN">Frais d'examen</option>}
              </select>
            </label>

            {/* Échéancier — scolarité échelonnée uniquement */}
            {paiementForm.categorie === 'SCOLARITE' && tranchesPaiement.length > 0 && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', marginBottom: '8px' }}>
                  <Icon name="receipt_long" style={{ fontSize: '14px', verticalAlign: 'middle' }} /> Échéancier de paiement
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tranchesPaiement.map((t, i) => {
                    const prochaine = tranchesPaiement.find(x => !x.payee);
                    const estProchaine = prochaine && t.label === prochaine.label;
                    const estBloquee = !t.payee && !estProchaine;
                    return (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 10px', borderRadius: '6px',
                        background: t.payee ? '#ecfdf5' : estProchaine ? '#eff6ff' : '#f8fafc',
                        border: `1px solid ${t.payee ? '#a7f3d0' : estProchaine ? '#bfdbfe' : '#e2e8f0'}`
                      }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: t.payee ? '#047857' : estProchaine ? '#1d4ed8' : '#94a3b8' }}>
                          {t.payee ? <Icon name="check_circle" style={{ fontSize: '14px', verticalAlign: 'middle' }} /> :
                           estProchaine ? <Icon name="radio_button_checked" style={{ fontSize: '14px', verticalAlign: 'middle' }} /> :
                           <Icon name="lock" style={{ fontSize: '14px', verticalAlign: 'middle' }} />}
                          {' '}{t.label}
                        </span>
                        <span style={{ fontSize: '12px', color: t.payee ? '#047857' : estProchaine ? '#1d4ed8' : '#94a3b8', fontWeight: 700 }}>
                          {t.payee ? '✓ Payée' : estProchaine ? formatMontant(t.montant) : '🔒 Bloquée'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {paiementForm.categorie === 'SCOLARITE' && tranchesPaiement.length > 0 && (
              <label className="yk-field">
                <span className="yk-label">Tranche à régler</span>
                <select
                  value={paiementForm.type_versement}
                  onChange={e => {
                    const t = tranchesPaiement.find(x => x.label === e.target.value);
                    const reste = t ? (parseFloat(t.montant) - (t.paye || 0)) : 0;
                    setPaiementForm(prev => ({ ...prev, type_versement: e.target.value, montant: t ? String(reste) : prev.montant }));
                  }}
                  required
                  className="yk-input"
                >
                  <option value="">-- Sélectionner la tranche --</option>
                  {tranchesPaiement.filter(t => !t.payee).map((t, i) => {
                    const prochaine = tranchesPaiement.find(x => !x.payee);
                    const estBloquee = prochaine && t.label !== prochaine.label;
                    const reste = parseFloat(t.montant) - (t.paye || 0);
                    return (
                      <option key={i} value={t.label} disabled={estBloquee}>
                        {t.label} — reste {formatMontant(reste)}{estBloquee ? ' 🔒' : ''}
                      </option>
                    );
                  })}
                </select>
              </label>
            )}

            <label className="yk-field">
              <span className="yk-label">Montant (F CFA)</span>
              <input type="number" onWheel={e => e.target.blur()} placeholder="Ex : 25000" value={paiementForm.montant} onChange={e => setPaiementForm({ ...paiementForm, montant: e.target.value })} required className="yk-input" />
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
              <input type="text" placeholder="Générée automatiquement" value={paiementForm.reference_banque} disabled className="yk-input" />
            </label>
            <button type="submit" className="yk-btn yk-btn-blue yk-btn-block"><Icon name="payments" /> {modal.mode === 'edit' ? 'Enregistrer les modifications' : 'Encaisser le versement'}</button>
          </form>
        </Modal>
      )}

      {modal.type === 'depense' && (
        <Modal title={modal.mode === 'edit' ? 'Modifier la dépense' : 'Déclarer une dépense'} icon="money_off" onClose={closeModal} accent="#e11d48">
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
              <input type="number" onWheel={e => e.target.blur()} placeholder="Ex: 45000" value={depenseForm.montant} onChange={e => setDepenseForm({ ...depenseForm, montant: e.target.value })} required className="yk-input" />
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
            <button type="submit" className="yk-btn yk-btn-block" style={{ background: '#e11d48', color: '#fff' }}><Icon name="output" /> {modal.mode === 'edit' ? 'Enregistrer les modifications' : 'Enregistrer la dépense'}</button>
          </form>
        </Modal>
      )}

      {/* ---------------- CONFIRMATION DE SUPPRESSION ---------------- */}
      {confirmState.type && (
        <ConfirmDialog label={confirmState.label} onConfirm={confirmDelete} onCancel={cancelDelete} />
      )}

      {/* ---------------- MODAL IMPORT EXCEL ---------------- */}
      {importModal && (
        <Modal title="Importer des élèves via Excel" icon="upload_file" onClose={() => setImportModal(false)} accent="#0e9f6e">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#166534', lineHeight: 1.6 }}>
              <strong>Format attendu du fichier Excel :</strong><br />
              Le fichier doit contenir les colonnes suivantes (ligne 1 = en-têtes) :<br />
              <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                nom | prenom | date_naissance | genre
              </code><br />
              <span style={{ fontSize: '12px', color: '#15803d' }}>La date doit être au format <strong>AAAA-MM-JJ</strong> (ex: 2010-05-14). Genre : <strong>M</strong> ou <strong>F</strong>. Limite : 500 élèves.</span>
            </div>

            <label className="yk-field">
              <span className="yk-label">Sélectionner le fichier (.xlsx ou .xls)</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="yk-input"
                onChange={e => { setImportFichier(e.target.files[0]); setImportResultat(null); }}
              />
            </label>

            {importFichier && !importResultat && (
              <div style={{ fontSize: '13px', color: 'var(--yk-slate)' }}>
                Fichier sélectionné : <strong>{importFichier.name}</strong> ({(importFichier.size / 1024).toFixed(1)} Ko)
              </div>
            )}

            {importResultat && !importResultat.erreur && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                <div style={{ color: '#166534', fontWeight: 700, marginBottom: '6px' }}>
                  <Icon name="check_circle" style={{ fontSize: '16px', verticalAlign: 'middle' }} /> {importResultat.message}
                </div>
                {importResultat.erreurs && importResultat.erreurs.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ color: '#dc2626', fontWeight: 600, marginBottom: '4px' }}>{importResultat.erreurs.length} ligne(s) ignorée(s) :</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', color: '#dc2626', fontSize: '12px' }}>
                      {importResultat.erreurs.map((e, i) => (
                        <li key={i}>Ligne {e.ligne} : {e.raison}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {importResultat?.erreur && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
                <Icon name="error" style={{ fontSize: '16px', verticalAlign: 'middle' }} /> {importResultat.erreur}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="yk-btn yk-btn-ghost" style={{ flex: 1 }} onClick={() => setImportModal(false)}>Fermer</button>
              <button
                className="yk-btn yk-btn-green"
                style={{ flex: 2 }}
                onClick={handleImportExcel}
                disabled={!importFichier || importLoading}
              >
                {importLoading
                  ? <><Icon name="progress_activity" style={{ fontSize: '16px' }} /> Import en cours…</>
                  : <><Icon name="upload" style={{ fontSize: '16px' }} /> Lancer l'import</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
    border: 1px solid rgba(220, 38, 38, 0.25); border-radius: 99px;
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
  .yk-loading svg { animation: yk-spin 1.1s linear infinite; }
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

  .yk-toolbar {
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
    gap: 10px; margin-bottom: 14px;
  }
  .yk-toolbar-filters { display: flex; gap: 8px; flex-wrap: wrap; }

  .yk-form { display: flex; flex-direction: column; gap: 14px; }
  .yk-field { display: flex; flex-direction: column; gap: 5px; }
  .yk-label { font-size: 12px; color: var(--yk-muted); font-weight: 600; }
  .yk-input {
    padding: 10px 12px; border-radius: 8px; border: 1px solid #d6dbe3;
    font-size: 14px; width: 100%; font-family: inherit; color: var(--yk-ink);
    background: #fbfcfe; transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .yk-input:focus { outline: none; border-color: #94a3b8; box-shadow: 0 0 0 3px rgba(67, 56, 202, 0.10); background: #fff; }
  .yk-input:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; border-color: #e2e8f0; }

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

  .yk-pagination {
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 10px; margin-top: 14px; padding-top: 14px;
    border-top: 1px solid var(--yk-border);
  }

  .yk-modal-backdrop {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 100; padding: 20px; backdrop-filter: blur(2px);
  }
  .yk-modal {
    background: #fff; border-radius: var(--yk-radius); width: 100%; max-width: 460px;
    max-height: 88vh; overflow-y: auto; box-shadow: 0 20px 50px -12px rgba(0,0,0,0.35);
    animation: yk-fade 0.18s ease;
  }
  .yk-modal-sm { max-width: 400px; }
  .yk-modal-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 20px; border-bottom: 1px solid var(--yk-border); border-top: 3px solid;
  }
  .yk-modal-close {
    border: none; background: #f1f5f9; border-radius: 8px; padding: 6px;
    display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--yk-slate);
  }
  .yk-modal-body { padding: 20px; }

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
