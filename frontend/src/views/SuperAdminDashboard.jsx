import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AuditLogDashboard } from '../components/AuditLogDashboard';
// import StatusBadge from "../components/StatusBadge";

// Importation des services backend
import { fetchEtablissements, saveEtablissement, fetchAdminsSysteme } from '../services/etablissementService';
import { fetchAnneesScolaires, saveAnneeScolaire, activerAnneeScolaire } from '../services/anneeScolaireService';

// ---------------------------------------------------------------------------
// CONTRAT D'API BACKEND (Endpoints requis) :
//   PATCH  /api/etablissements/:id           (Modifier établissement)
//   PATCH  /api/etablissements/:id/statut    (Activer/Désactiver)
//   DELETE /api/etablissements/:id           (Supprimer)
//   POST   /api/auth/register                (Créer admin + mdp temporaire)
//   PATCH  /api/auth/admins/:id              (Modifier admin)
//   PATCH  /api/auth/admins/:id/statut       (Activer/Désactiver admin)
//   PATCH  /api/auth/admins/:id/reinitialiser-mot-de-passe
//   DELETE /api/auth/admins/:id
//   GET    /api/annees-scolaires             (Lister)
//   POST   /api/annees-scolaires             (Créer, inactive par défaut)
//   PATCH  /api/annees-scolaires/:id/activer (Activer — désactive les autres)
//   PUT    /api/parametres
// ---------------------------------------------------------------------------

// 1. UTILITAIRE : Chargement dynamique des icônes et polices Google
const loadGoogleIconsFont = () => {
  if (document.getElementById('material-symbols-font')) return;
  const link = document.createElement('link');
  link.id = 'material-symbols-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..700,0..1,-50..200&family=Inter:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(link);
};

// 2. COMPOSANT : Icône Material
const Icon = ({ name, style = {}, filled = false }) => (
  <span
    className="material-symbols-outlined"
    style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}`, ...style }}
  >
    {name}
  </span>
);

// 3. UTILITAIRES : Mots de passe, Presse-papiers & Dates
const genererMotDePasseTemporaire = () => {
  const majuscules = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minuscules = 'abcdefghijkmnpqrstuvwxyz';
  const chiffres = '23456789';
  const speciaux = '!@#$%&*';
  const tous = majuscules + minuscules + chiffres + speciaux;
  const piocher = (jeu) => jeu[Math.floor(Math.random() * jeu.length)];

  const caracteres = [piocher(majuscules), piocher(minuscules), piocher(chiffres), piocher(speciaux)];
  for (let i = 0; i < 8; i++) caracteres.push(piocher(tous));

  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
};

const copierTexte = async (texte) => {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return false;
  }
};

const formaterDate = (valeur) => {
  if (!valeur) return '—';
  try {
    return new Date(valeur).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return valeur;
  }
};

// 4. COMPOSANTS RÉUTILISABLES D'INTERFACE

const Modal = ({ isOpen, onClose, title, icon, tone = 'default', children, maxWidth = '520px' }) => {
  if (!isOpen) return null;
  return (
    <div className="yk-modal-overlay" onClick={onClose}>
      <div
        className={`yk-modal-panel ${tone === 'danger' ? 'yk-modal-danger' : ''}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="yk-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {icon && <Icon name={icon} style={{ fontSize: '20px' }} />}
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>{title}</h3>
          </div>
          <button className="yk-modal-close" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </div>
        <div className="yk-modal-body">{children}</div>
      </div>
    </div>
  );
};

const StatusBadge = ({ actif, labelActif = 'Actif', labelInactif = 'Désactivé' }) => (
  <span className={`yk-badge ${actif ? 'yk-badge-actif' : 'yk-badge-inactif'}`}>
    <span className="yk-badge-dot" />
    {actif ? labelActif : labelInactif}
  </span>
);

const ActionButton = ({ icon, label, tone = 'default', onClick, disabled = false }) => (
  <button
    type="button"
    className={`yk-action-btn yk-action-${tone}`}
    onClick={onClick}
    disabled={disabled}
    title={label}
    aria-label={label}
  >
    <Icon name={icon} style={{ fontSize: '17px' }} />
  </button>
);

const ToggleSwitch = ({ checked, onChange, label, description }) => (
  <label className="yk-toggle-row">
    <div>
      <div className="yk-toggle-label">{label}</div>
      {description && <div className="yk-toggle-desc">{description}</div>}
    </div>
    <span className="yk-toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="yk-toggle-slider" />
    </span>
  </label>
);

const LignesSquelette = ({ colonnes = 5, lignes = 3 }) => (
  <>
    {Array.from({ length: lignes }).map((_, i) => (
      <tr key={i}>
        {Array.from({ length: colonnes }).map((__, j) => (
          <td key={j}><div className="yk-skeleton" /></td>
        ))}
      </tr>
    ))}
  </>
);

// 5. NAVIGATION PRINCIPALE
const NAV_ITEMS = [
  { key: 'vue_d_ensemble', label: "Vue d'ensemble", icon: 'dashboard' },
  { key: 'etablissements', label: 'Établissements', icon: 'apartment' },
  { key: 'admins', label: 'Gestion des admins', icon: 'manage_accounts' },
  { key: 'annee_academique', label: 'Année académique', icon: 'calendar_month' },
  { key: 'audit', label: "Pistes d'audit", icon: 'shield' },
  { key: 'parametres', label: 'Configuration', icon: 'settings' }
];

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('vue_d_ensemble');
  const [message, setMessage] = useState({ texte: '', estErreur: false });

  // Données principales
  const [etablissements, setEtablissements] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [anneesAcademiques, setAnneesAcademiques] = useState([]);

  // États de chargement
  const [loadingEtab, setLoadingEtab] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [loadingAnnee, setLoadingAnnee] = useState(false);

  // Formulaires
  const [formEtab, setFormEtab] = useState({ nom: '', code_unique: '', adresse: '', telephone: '' });
  const [formAdmin, setFormAdmin] = useState({ identifiant: '', mot_de_passe: '', nom: '', prenom: '', code_etablissement: '' });
  const [afficherMdpAdmin, setAfficherMdpAdmin] = useState(false);
  const [formAnnee, setFormAnnee] = useState({ libelle: '', date_debut: '', date_fin: '' });

  // Statistiques financières
  const [statsGlobales, setStatsGlobales] = useState({ totalEtablissements: 0, chartData: [] });

  // Modales de Création / Édition
  const [modalNouveauEtab, setModalNouveauEtab] = useState(false);
  const [modalNouveauAdmin, setModalNouveauAdmin] = useState(false);
  const [editionEtab, setEditionEtab] = useState(null);
  const [editionAdmin, setEditionAdmin] = useState(null);
  const [modalNouvelleAnnee, setModalNouvelleAnnee] = useState(false);
  const [passwordModal, setPasswordModal] = useState(null);

  // Modale de confirmation (désactivation, suppression, etc.)
  const [confirmModal, setConfirmModal] = useState(null);
  const [saisieConfirmation, setSaisieConfirmation] = useState('');
  const [chargementConfirmation, setChargementConfirmation] = useState(false);

  // Configuration système
  const [parametres, setParametres] = useState({
    exigerChangementMdp: true,
    dureeSessionHeures: 8,
    retentionLogsJours: 365,
    notifActionsSensibles: true,
    frequenceSauvegarde: 'quotidienne',
    alerteEchecConnexion: true
  });
  const [savingParametres, setSavingParametres] = useState(false);
  const [loadingParametres, setLoadingParametres] = useState(true);

  const anneeActive = useMemo(
    () => anneesAcademiques.find((a) => Number(a.statut) === 1),
    [anneesAcademiques]
  );

  const appelApiProtegee = async (endpoint, method = 'GET', body) => {

    console.log("Endpoint :", endpoint);
    console.log("Method :", method);
    console.log("Body :", body);
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue lors de l'appel serveur.");
    return data;
  };

  const chargerDonneesSysteme = async () => {
    setLoadingEtab(true);
    setLoadingAdmin(true);
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
      setLoadingAdmin(false);
    }
  };

  const chargerAnnees = async () => {
    setLoadingAnnee(true);
    try {
      const data = await fetchAnneesScolaires();
      setAnneesAcademiques(Array.isArray(data) ? data : data.anneesAcademiques || []);
    } catch (err) {
      setAnneesAcademiques([]);
      afficherMessage(err.message, true);
    } finally {
      setLoadingAnnee(false);
    }
  };

  const chargerParametres = async () => {
    setLoadingParametres(true);
    try {
      const data = await appelApiProtegee('/api/parametres');
      setParametres({
        exigerChangementMdp: data.exigerChangementMdp,
        dureeSessionHeures: data.dureeSessionHeures,
        retentionLogsJours: data.retentionLogsJours,
        notifActionsSensibles: data.notifActionsSensibles,
        frequenceSauvegarde: data.frequenceSauvegarde,
        alerteEchecConnexion: data.alerteEchecConnexion
      });
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setLoadingParametres(false);
    }
  };

  useEffect(() => {
    loadGoogleIconsFont();
    chargerDonneesSysteme();
    chargerAnnees();
    chargerParametres();
  }, []);

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

  // ---- CONFIRMATION GENERIQUE ----------------------------------------
  const demanderConfirmation = (config) => {
    setSaisieConfirmation('');
    setConfirmModal(config);
  };
  const fermerConfirmation = () => {
    setConfirmModal(null);
    setSaisieConfirmation('');
  };
  const executerConfirmation = async () => {
    if (!confirmModal) return;
    setChargementConfirmation(true);
    try {
      await confirmModal.onConfirm();
      fermerConfirmation();
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setChargementConfirmation(false);
    }
  };

  // ---- ÉTABLISSEMENTS ------------------------------------------------
  const handleEtabSubmit = async (e) => {
    e.preventDefault();
    try {
      await saveEtablissement(formEtab);
      afficherMessage("Établissement déployé avec succès !");
      setFormEtab({ nom: '', code_unique: '', adresse: '', telephone: '' });
      setModalNouveauEtab(false);
      chargerDonneesSysteme();
    } catch (err) {
      afficherMessage(err.message, true);
    }
  };

  const handleEtabEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await appelApiProtegee(`/api/etablissements/${editionEtab.id}`, 'PUT', {
        nom: editionEtab.nom,
        adresse: editionEtab.adresse,
        telephone: editionEtab.telephone
      });
      afficherMessage("Établissement mis à jour avec succès.");
      setEditionEtab(null);
      chargerDonneesSysteme();
    } catch (err) {
      afficherMessage(err.message, true);
    }
  };

  // const handleToggleEtabStatut = (etab) => {
  //   const actif = etab.actif !== true;
  //   demanderConfirmation({
  //     titre: actif ? "Désactiver cet établissement ?" : "Réactiver cet établissement ?",
  //     message: actif
  //       ? `Les utilisateurs de « ${etab.nom} » n'auront plus accès à la plateforme. Cette action est journalisée.`
  //       : `« ${etab.nom} » retrouvera son accès complet.`,
  //     tonalite: actif ? 'danger' : 'default',
  //     libelleConfirmation: actif ? 'Désactiver' : 'Réactiver',
  //     icone: actif ? 'block' : 'check_circle',
  //     onConfirm: async () => {
  //       await appelApiProtegee(`/api/etablissements/${etab.id}/statut`, 'PATCH', { actif : !actif });
  //       afficherMessage(`Établissement ${actif ? 'désactivé' : 'réactivé'} avec succès.`);
  //       chargerDonneesSysteme();
  //     }
  //   });
  // };

  const handleToggleEtabStatut = (etab) => {
    // Le backend renvoie statut = 1 (actif) ou 0 (inactif)
    const actif = etab.statut === 1;

    demanderConfirmation({
      titre: actif
        ? "Désactiver cet établissement ?"
        : "Réactiver cet établissement ?",

      message: actif
        ? `Les utilisateurs de « ${etab.nom} » n'auront plus accès à la plateforme. Cette action est journalisée.`
        : `« ${etab.nom} » retrouvera son accès complet.`,

      tonalite: actif ? "danger" : "default",

      libelleConfirmation: actif
        ? "Désactiver"
        : "Réactiver",

      icone: actif
        ? "block"
        : "check_circle",

      onConfirm: async () => {
        try {
          // On inverse simplement l'état actuel
          await appelApiProtegee(
            `/api/etablissements/${etab.id}/statut`,
            "PATCH",
            {
              actif: !actif
            }
          );
          afficherMessage(
            `Établissement ${actif ? "désactivé" : "réactivé"} avec succès.`
          );
          await chargerDonneesSysteme();
        } catch (err) {
          afficherMessage(err.message || "Une erreur est survenue.");
        }
      }
    });
  };

  const handleSupprimerEtab = (etab) => {
    demanderConfirmation({
      titre: "Supprimer définitivement cet établissement ?",
      message: `Cette action supprimera « ${etab.nom} » et toutes ses données rattachées. Cette action est irréversible.`,
      tonalite: 'danger',
      libelleConfirmation: 'Supprimer définitivement',
      icone: 'delete_forever',
      saisieRequise: etab.code_unique,
      onConfirm: async () => {
        await appelApiProtegee(`/api/etablissements/${etab.id}`, 'DELETE');
        afficherMessage(`Établissement « ${etab.nom} » supprimé.`);
        chargerDonneesSysteme();
      }
    });
  };

  // ---- ADMINISTRATEURS -----------------------------------------------
  const handleGenererMdpAdmin = () => {
    setAfficherMdpAdmin(true);
    setFormAdmin((prev) => ({ ...prev, mot_de_passe: genererMotDePasseTemporaire() }));
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLoadingAdmin(true);
    const motDePasseUtilise = formAdmin.mot_de_passe || genererMotDePasseTemporaire();
    try {
      await appelApiProtegee('/api/auth/register', 'POST', {
        ...formAdmin,
        mot_de_passe: motDePasseUtilise,
        nom_role: 'ADMIN',
        doit_changer_mot_de_passe: true
      });

      afficherMessage(`Compte administrateur créé pour [${formAdmin.code_etablissement}]`);
      setModalNouveauAdmin(false);
      setPasswordModal({ identifiant: formAdmin.identifiant, motDePasse: motDePasseUtilise, contexte: 'creation' });
      setFormAdmin({ identifiant: '', mot_de_passe: '', nom: '', prenom: '', code_etablissement: '' });
      setAfficherMdpAdmin(false);
      chargerDonneesSysteme();
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setLoadingAdmin(false);
    }
  };

  const handleAdminEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await appelApiProtegee(`/api/auth/admins/${editionAdmin.id}`, 'PUT', {
        nom: editionAdmin.nom,
        prenom: editionAdmin.prenom
      });
      afficherMessage("Administrateur mis à jour.");
      setEditionAdmin(null);
      chargerDonneesSysteme();
    } catch (err) {
      afficherMessage(err.message, true);
    }
  };

  const handleToggleAdminStatut = (admin) => {
    const actif = admin.statut === 1;
    demanderConfirmation({
      titre: actif ? "Désactiver cet administrateur ?" : "Réactiver cet administrateur ?",
      message: actif
        ? `${admin.nom} ${admin.prenom || ''} perdra immédiatement l'accès à son établissement (${admin.code_etablissement}).`
        : `${admin.nom} ${admin.prenom || ''} retrouvera son accès.`,
      tonalite: actif ? 'danger' : 'default',
      libelleConfirmation: actif ? 'Désactiver' : 'Réactiver',
      icone: actif ? 'person_off' : 'how_to_reg',
      onConfirm: async () => {
        try {
          await appelApiProtegee(`/api/auth/admins/${admin.id}/statut`, 'PATCH', { actif: !actif });
          afficherMessage(`Administrateur ${actif ? 'désactivé' : 'réactivé'} avec succès.`);
          await chargerDonneesSysteme();
        } catch (err) {
          afficherMessage(err.message || "Une erreur est survenue.");
        }
      }
    });
  };

  const handleReinitialiserMdpAdmin = (admin) => {
    demanderConfirmation({
      titre: 'Réinitialiser le mot de passe ?',
      message: `Un nouveau mot de passe temporaire sera généré pour ${admin.identifiant}. Son mot de passe actuel sera immédiatement invalidé.`,
      tonalite: 'default',
      libelleConfirmation: 'Générer un mot de passe temporaire',
      icone: 'key',
      onConfirm: async () => {
        // const nouveauMdp = genererMotDePasseTemporaire();
        // await appelApiProtegee(`/api/auth/admins/${admin.id}/reinitialiser-mot-de-passe`, 'PATCH', {
        //   mot_de_passe: nouveauMdp,
        //   // doit_changer_mot_de_passe: true
        // });
        // afficherMessage(`Mot de passe réinitialisé pour ${admin.identifiant}.`);
        // setPasswordModal({ identifiant: admin.identifiant, motDePasse: nouveauMdp, contexte: 'reinitialisation' });
        // chargerDonneesSysteme();
        const nouveauMdp = genererMotDePasseTemporaire();

        await appelApiProtegee(
          `/api/auth/admins/${admin.id}/reinitialiser-mot-de-passe`,
          'PATCH',
          {
            nouveau_mot_de_passe: nouveauMdp
          }
        );
        afficherMessage(`Mot de passe réinitialisé pour ${admin.identifiant}.`);
        setPasswordModal({
          identifiant: admin.identifiant,
          motDePasse: nouveauMdp,
          contexte: 'reinitialisation'
        });
      }
    });
  };

  const handleSupprimerAdmin = (admin) => {
    demanderConfirmation({
      titre: 'Supprimer définitivement ce compte ?',
      message: `${admin.identifiant} perdra tout accès. L'historique d'audit reste conservé.`,
      tonalite: 'danger',
      libelleConfirmation: 'Supprimer définitivement',
      icone: 'person_remove',
      saisieRequise: admin.identifiant,
      onConfirm: async () => {
        await appelApiProtegee(`/api/auth/admins/${admin.id}`, 'DELETE');
        afficherMessage(`Compte ${admin.identifiant} supprimé.`);
        chargerDonneesSysteme();
      }
    });
  };

  // ---- ANNÉE ACADÉMIQUE ----------------------------------------------
  // Crée une nouvelle année (inactive), puis l'active immédiatement.
  // Deux appels distincts car le backend n'a pas d'endpoint combiné.
  const handleActiverAnnee = (e) => {
    e.preventDefault();
    const nouvelleAnnee = { ...formAnnee };
    setModalNouvelleAnnee(false);
    demanderConfirmation({
      titre: 'Activer une nouvelle année académique ?',
      message: anneeActive
        ? `L'année « ${anneeActive.libelle} » sera clôturée et « ${nouvelleAnnee.libelle} » deviendra l'année active pour tous les établissements.`
        : `« ${nouvelleAnnee.libelle} » deviendra l'année académique active globalement.`,
      tonalite: 'danger',
      libelleConfirmation: 'Activer cette année',
      icone: 'event_available',
      onConfirm: async () => {
        const { id } = await saveAnneeScolaire(nouvelleAnnee);
        await activerAnneeScolaire(id);
        afficherMessage(`Année académique « ${nouvelleAnnee.libelle} » activée.`);
        setFormAnnee({ libelle: '', date_debut: '', date_fin: '' });
        chargerAnnees();
      }
    });
  };

  // Réactive une année déjà présente dans l'historique (ex: revenir sur une
  // année passée), sans repasser par la création.
  const handleActiverAnneeExistante = (annee) => {
    demanderConfirmation({
      titre: 'Activer cette année académique ?',
      message: anneeActive
        ? `L'année « ${anneeActive.libelle} » sera clôturée et « ${annee.libelle} » redeviendra l'année active pour tous les établissements.`
        : `« ${annee.libelle} » deviendra l'année académique active globalement.`,
      tonalite: 'danger',
      libelleConfirmation: 'Activer cette année',
      icone: 'event_available',
      onConfirm: async () => {
        await activerAnneeScolaire(annee.id);
        afficherMessage(`Année académique « ${annee.libelle} » activée.`);
        chargerAnnees();
      }
    });
  };

  // ---- PARAMÈTRES ----------------------------------------------------
  const handleEnregistrerParametres = async () => {
    setSavingParametres(true);
    try {
      const data = await appelApiProtegee('/api/parametres', 'PUT', {
        exigerChangementMdp: parametres.exigerChangementMdp,
        dureeSessionHeures: Number(parametres.dureeSessionHeures),
        retentionLogsJours: Number(parametres.retentionLogsJours),
        notifActionsSensibles: parametres.notifActionsSensibles,
        frequenceSauvegarde: parametres.frequenceSauvegarde,
        alerteEchecConnexion: parametres.alerteEchecConnexion
      });
      setParametres({
        exigerChangementMdp: data.exigerChangementMdp,
        dureeSessionHeures: data.dureeSessionHeures,
        retentionLogsJours: data.retentionLogsJours,
        notifActionsSensibles: data.notifActionsSensibles,
        frequenceSauvegarde: data.frequenceSauvegarde,
        alerteEchecConnexion: data.alerteEchecConnexion
      });
      afficherMessage('Configuration système mise à jour.');
    } catch (err) {
      afficherMessage(err.message, true);
    } finally {
      setSavingParametres(false);
    }
  };

  const actualiserTout = () => {
    chargerDonneesSysteme();
    chargerAnnees();
    chargerParametres();
  };

  return (
    <div className="yk-app-container">
      <style>{`
        :root {
          --yk-brand: #4f46e5; --yk-brand-hover: #4338ca; --yk-bg: #f8fafc;
          --yk-card: #ffffff; --yk-border: #e2e8f0; --yk-ink: #0f172a;
          --yk-muted: #64748b; --yk-green: #10b981; --yk-red: #ef4444;
          --yk-amber: #f59e0b; --yk-radius: 12px; --yk-shadow: 0 1px 3px 0 rgba(0,0,0,0.1);
        }
        .yk-app-container { display: flex; min-height: 100vh; background: var(--yk-bg); font-family: 'Inter', sans-serif; color: var(--yk-ink); }
        .yk-sidebar { width: 260px; background: #0f172a; color: #fff; padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; }
        .yk-brand-title { font-size: 18px; font-weight: 800; padding: 0 12px 20px; border-bottom: 1px solid #1e293b; color: #fff; display: flex; align-items: center; gap: 8px; }
        .yk-nav-btn { display: flex; align-items: center; gap: 12px; padding: 12px; border: none; background: transparent; color: #94a3b8; border-radius: 8px; cursor: pointer; text-align: left; font-size: 14px; font-weight: 500; transition: all 0.2s; }
        .yk-nav-btn:hover { background: #1e293b; color: #fff; }
        .yk-nav-btn.active { background: var(--yk-brand); color: #fff; }
        .yk-sidebar-footer { margin-top: auto; padding-top: 16px; border-top: 1px solid #1e293b; display: flex; align-items: center; gap: 10px; }
        .yk-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--yk-brand); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
        .yk-sidebar-footer-name { font-size: 13px; font-weight: 600; color: #fff; }
        .yk-sidebar-footer-role { font-size: 11.5px; color: #94a3b8; }
        .yk-main-content { flex: 1; padding: 32px; overflow-y: auto; }
        .yk-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
        .yk-header-actions { display: flex; align-items: center; gap: 10px; }
        .yk-icon-btn { background: #fff; border: 1px solid var(--yk-border); width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #334155; transition: background 0.15s; }
        .yk-icon-btn:hover { background: #f1f5f9; }
        .yk-alert { padding: 14px 18px; border-radius: var(--yk-radius); margin-bottom: 20px; font-size: 13.5px; font-weight: 500; }
        .yk-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 28px; }
        .yk-kpi-card { background: #fff; border-radius: var(--yk-radius); padding: 20px; border: 1px solid var(--yk-border); box-shadow: var(--yk-shadow); }
        .yk-kpi-val { font-size: 24px; font-weight: 700; margin-top: 8px; }
        .yk-card { background: var(--yk-card); border-radius: var(--yk-radius); box-shadow: var(--yk-shadow); border: 1px solid var(--yk-border); padding: 20px; }
        .yk-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .yk-label { font-size: 12.5px; font-weight: 600; color: var(--yk-muted); }
        .yk-input, .yk-select { padding: 10px 14px; border: 1px solid var(--yk-border); border-radius: 8px; font-size: 13.5px; background: #fff; color: var(--yk-ink); transition: border 0.2s; width: 100%; box-sizing: border-box; }
        .yk-input:focus, .yk-select:focus { border-color: var(--yk-brand); outline: none; }
        .yk-input:disabled { background: #f8fafc; color: var(--yk-muted); cursor: not-allowed; }
        .yk-btn { padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13.5px; border: none; display: inline-flex; align-items: center; gap: 6px; justify-content: center; transition: background 0.2s; }
        .yk-btn-primary { background: var(--yk-brand); color: #fff; }
        .yk-btn-primary:hover { background: var(--yk-brand-hover); }
        .yk-btn-danger { background: var(--yk-red); color: #fff; }
        .yk-btn-danger:hover { background: #dc2626; }
        .yk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .yk-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
        .yk-table th { padding: 12px; border-bottom: 2px solid var(--yk-border); color: var(--yk-muted); font-weight: 600; }
        .yk-table td { padding: 12px; border-bottom: 1px solid var(--yk-border); }
        .yk-table tbody tr:hover { background: #f8fafc; }
        .yk-code-chip { background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: 700; font-size: 12.5px; }

        .yk-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .yk-badge-dot { width: 6px; height: 6px; border-radius: 50%; }
        .yk-badge-actif { background: #ecfdf5; color: #047857; }
        .yk-badge-actif .yk-badge-dot { background: var(--yk-green); }
        .yk-badge-inactif { background: #f1f5f9; color: #64748b; }
        .yk-badge-inactif .yk-badge-dot { background: #94a3b8; }

        .yk-actions-cell { display: flex; gap: 6px; justify-content: flex-end; }
        .yk-action-btn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 7px; border: 1px solid var(--yk-border); background: #fff; color: #475569; cursor: pointer; transition: all 0.15s; }
        .yk-action-btn:hover { background: #f1f5f9; color: #1e293b; }
        .yk-action-warn:hover { background: #fffbeb; border-color: #fde68a; color: #b45309; }
        .yk-action-danger:hover { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }

        .yk-skeleton { height: 14px; border-radius: 4px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size: 400% 100%; animation: ykShimmer 1.4s ease infinite; }
        @keyframes ykShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

        .yk-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: ykOverlayIn 0.15s ease-out; }
        @keyframes ykOverlayIn { from { opacity: 0; } to { opacity: 1; } }
        .yk-modal-panel { background: #fff; border-radius: var(--yk-radius); width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.25); animation: ykModalIn 0.18s ease-out; max-height: 88vh; overflow-y: auto; }
        @keyframes ykModalIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .yk-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--yk-border); position: sticky; top: 0; background: #fff; }
        .yk-modal-body { padding: 20px; }
        .yk-modal-close { background: transparent; border: none; cursor: pointer; color: var(--yk-muted); padding: 4px; border-radius: 6px; display: flex; }
        .yk-modal-close:hover { background: #f1f5f9; color: var(--yk-ink); }
        .yk-modal-danger .yk-modal-header { background: #fef2f2; border-bottom-color: #fecaca; }
        .yk-modal-danger .yk-modal-header h3 { color: #991b1b; }

        .yk-callout { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: 8px; font-size: 12.5px; line-height: 1.5; margin-top: 6px; }
        .yk-callout-warning { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .yk-callout-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }

        .yk-password-field { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #0f172a; color: #e2e8f0; font-family: monospace; font-size: 14px; padding: 12px 14px; border-radius: 8px; word-break: break-all; }
        .yk-copy-btn { background: rgba(255,255,255,0.12); border: none; color: #e2e8f0; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; flex-shrink: 0; }
        .yk-copy-btn:hover { background: rgba(255,255,255,0.22); }

        .yk-settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .yk-settings-section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; margin-bottom: 14px; color: var(--yk-ink); }
        .yk-toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 0; }
        .yk-toggle-label { font-size: 13.5px; font-weight: 600; }
        .yk-toggle-desc { font-size: 12px; color: var(--yk-muted); margin-top: 2px; }
        .yk-toggle-switch { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
        .yk-toggle-switch input { opacity: 0; width: 0; height: 0; }
        .yk-toggle-slider { position: absolute; inset: 0; background: #cbd5e1; border-radius: 999px; cursor: pointer; transition: 0.2s; }
        .yk-toggle-slider:before { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
        .yk-toggle-switch input:checked + .yk-toggle-slider { background: var(--yk-brand); }
        .yk-toggle-switch input:checked + .yk-toggle-slider:before { transform: translateX(18px); }

        @keyframes ykFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .yk-fade-in { animation: ykFadeIn 0.25s ease-out; }

        @media (max-width: 960px) {
          .yk-stats-grid { grid-template-columns: 1fr; }
          .yk-settings-grid { grid-template-columns: 1fr; }
          .yk-sidebar { width: 220px; }
        }
      `}</style>

      {/* BARRE DE NAVIGATION LATÉRALE */}
      <aside className="yk-sidebar">
        <div className="yk-brand-title">
          <Icon name="shield_person" style={{ color: '#818cf8' }} />
          <span>SUPERADMIN CONSOLE</span>
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
        <div className="yk-sidebar-footer">
          <div className="yk-avatar">SA</div>
          <div>
            <div className="yk-sidebar-footer-name">Super Administrateur</div>
            <div className="yk-sidebar-footer-role">Contrôle global · Multi-écoles</div>
          </div>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL */}
      <main className="yk-main-content">
        <header className="yk-header">
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Console de Supervision Globale</h1>
            <p style={{ color: 'var(--yk-muted)', margin: '4px 0 0' }}>Supervision multi-locataire et gestion des privilèges</p>
          </div>
          <div className="yk-header-actions">
            <button className="yk-icon-btn" title="Actualiser les données" onClick={actualiserTout}>
              <Icon name="refresh" />
            </button>
            <button className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => { localStorage.clear(); window.location.reload(); }}>
              Déconnexion
            </button>
          </div>
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

        {/* 1. VUE D'ENSEMBLE */}
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
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Année Académique Active</span>
                  <Icon name="calendar_month" />
                </div>
                <div className="yk-kpi-val" style={{ color: anneeActive ? 'var(--yk-brand)' : 'var(--yk-muted)', fontSize: anneeActive ? '24px' : '15px' }}>
                  {anneeActive ? anneeActive.libelle : 'Non définie'}
                </div>
              </div>
            </div>

            <div className="yk-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Suivi Financier Consolidé par Établissement (F CFA)</h3>
              <div style={{ width: '100%', height: 350 }}>
                {statsGlobales.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsGlobales.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip formatter={(value) => `${value.toLocaleString()} F CFA`} />
                      <Legend />
                      <Bar dataKey="Recettes" fill="#10b981" radius={[4, 4, 0, 0]} name="Recettes Globale" />
                      <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Dépenses Globale" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--yk-muted)' }}>Aucune donnée financière agrégée disponible.</div>
                )}
              </div>
            </div>
          </div>
        )}

                {/* 2. ÉTABLISSEMENTS */}
        {activeTab === 'etablissements' && (
          <div className="yk-fade-in">
            <style>{`
              .yk-row-inactif td { background: #fafafa; }
              .yk-row-inactif:hover td { background: #f4f4f5; }
              .yk-table tbody tr td:first-child { box-shadow: inset 3px 0 0 transparent; }
              .yk-table tbody tr.yk-row-actif td:first-child { box-shadow: inset 3px 0 0 #22c55e; }
              .yk-row-inactif td:first-child { box-shadow: inset 3px 0 0 #cbd5e1; }
              .yk-etab-nom-cell { display: flex; align-items: center; gap: 9px; }
              .yk-etab-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
              .yk-etab-dot.actif { background: #22c55e; box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
              .yk-etab-dot.inactif { background: #cbd5e1; }
              .yk-row-inactif .yk-etab-nom-texte { color: #94a3b8; }
              .yk-row-inactif .yk-code-chip { opacity: 0.6; }
              .yk-row-inactif .yk-cell-muted { color: #a3a9b4; }
            `}</style>
            <div className="yk-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Registre Global des Établissements</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--yk-muted)', fontSize: '13px' }}>Gestion des accès et de l'isolement multi-locataire</p>
                </div>
                <button className="yk-btn yk-btn-primary" onClick={() => setModalNouveauEtab(true)}>
                  <Icon name="add" style={{ fontSize: '18px' }} /> Nouveau Établissement
                </button>
              </div>
              <table className="yk-table">
                <thead>
                  <tr>
                    <th>Établissement</th>
                    <th>Code d'isolement</th>
                    <th>Localisation</th>
                    <th>Téléphone</th>
                    {/* <th>Statut</th> */}
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEtab ? (<LignesSquelette colonnes={6} lignes={4} />) : etablissements.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--yk-muted)', padding: '24px' }}>Aucun établissement enregistré.</td>
                    </tr>
                  ) : etablissements.map(etab => {
                    const actif = etab.statut === 1;
                    return (
                      <tr key={etab.id} className={actif ? 'yk-row-actif' : 'yk-row-inactif'}>
                        <td style={{ fontWeight: 600 }}>
                          <div className="yk-etab-nom-cell">
                            <span className={`yk-etab-dot ${actif ? 'actif' : 'inactif'}`} title={actif ? 'Actif' : 'Inactif'} />
                            <span className="yk-etab-nom-texte">{etab.nom}</span>
                          </div>
                        </td>
                        <td><span className="yk-code-chip">{etab.code_unique}</span></td>
                        <td className="yk-cell-muted">{etab.adresse || 'Non renseignée'}</td>
                        <td className="yk-cell-muted">{etab.telephone || '—'}</td>
                        {/* <td><StatusBadge actif={actif} /></td> */}
                        <td>
                          <div className="yk-actions-cell">
                            <ActionButton icon="edit" label="Modifier" onClick={() => setEditionEtab({ id: etab.id, nom: etab.nom, code_unique: etab.code_unique, adresse: etab.adresse || '', telephone: etab.telephone || '' })} />
                            {/* <ActionButton icon={actif ? 'block' : 'check_circle'} label={actif ? 'Désactiver' : 'Réactiver'} tone={actif ? 'warn' : 'default'} onClick={() => handleToggleEtabStatut(etab)} /> */}
                            <ActionButton icon="delete" label="Supprimer" tone="danger" onClick={() => handleSupprimerEtab(etab)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. GESTION DES ADMINS */}
        {activeTab === 'admins' && (
          <div className="yk-fade-in">
            <div className="yk-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Administrateurs d'Établissements</h3>
                  <p style={{ margin: '4px 0 0', color: 'var(--yk-muted)', fontSize: '13px' }}>Chaque admin dispose d'un accès strictement limité aux données de son établissement</p>
                </div>
                <button className="yk-btn yk-btn-primary" onClick={() => setModalNouveauAdmin(true)}>
                  <Icon name="person_add" style={{ fontSize: '18px' }} /> Créer un Administrateur
                </button>
              </div>

              <table className="yk-table">
                <thead>
                  <tr><th>Gestionnaire</th><th>Identifiant d'accès</th><th>Établissement affecté</th><th>Statut</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                </thead>
                <tbody>
                  {loadingAdmin ? (
                    <LignesSquelette colonnes={5} lignes={4} />
                  ) : admins.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--yk-muted)', padding: '24px' }}>Aucun administrateur enregistré.</td></tr>
                  ) : admins.map(adm => {
                    const actif = Number(adm.statut) === 1;

                    return (
                      <tr key={adm.id}>
                        <td style={{ fontWeight: 600 }}>
                          {adm.nom} {adm.prenom}
                        </td>

                        <td>{adm.identifiant}</td>

                        <td>
                          <span style={{
                            background: '#e0e7ff',
                            color: '#4338ca',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            {adm.code_etablissement}
                          </span>
                        </td>

                        <td>
                          <StatusBadge actif={actif} />
                        </td>

                        <td>
                          <div className="yk-actions-cell">

                            <ActionButton
                              icon="edit"
                              label="Modifier les infos"
                              onClick={() =>
                                setEditionAdmin({
                                  id: adm.id,
                                  nom: adm.nom,
                                  prenom: adm.prenom || ''
                                })
                              }
                            />

                            <ActionButton
                              icon="key"
                              label="Réinitialiser le mot de passe"
                              onClick={() => handleReinitialiserMdpAdmin(adm)}
                            />

                            <ActionButton
                              icon={actif ? 'person_off' : 'how_to_reg'}
                              label={actif ? 'Désactiver' : 'Réactiver'}
                              tone={actif ? 'warn' : 'default'}
                              onClick={() => handleToggleAdminStatut(adm)}
                            />

                            <ActionButton
                              icon="delete"
                              label="Supprimer"
                              tone="danger"
                              onClick={() => handleSupprimerAdmin(adm)}
                            />

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. ANNÉE ACADÉMIQUE */}
        {activeTab === 'annee_academique' && (
          <div className="yk-fade-in">
            <div className="yk-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700 }}>Année Académique Active Globale</h3>
                  {anneeActive ? (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--yk-brand)' }}>{anneeActive.libelle}</div>
                      <p style={{ color: 'var(--yk-muted)', fontSize: '13px', margin: '4px 0 0' }}>
                        Du {formaterDate(anneeActive.date_debut)} au {formaterDate(anneeActive.date_fin)} · Appliquée à toutes les structures
                      </p>
                    </>
                  ) : (
                    <p style={{ color: 'var(--yk-muted)', fontSize: '13px' }}>Aucune année académique actuellement active.</p>
                  )}
                </div>
                <button className="yk-btn yk-btn-primary" onClick={() => setModalNouvelleAnnee(true)}>
                  <Icon name="add" style={{ fontSize: '18px' }} /> Activer une Nouvelle Année
                </button>
              </div>
            </div>

            <div className="yk-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700 }}>Historique des Années Académiques</h3>
              <table className="yk-table">
                <thead>
                  <tr><th>Libellé / Session</th><th>Date de début</th><th>Date de clôture</th><th>Statut</th><th></th></tr>
                </thead>
                <tbody>
                  {loadingAnnee ? (
                    <LignesSquelette colonnes={5} lignes={3} />
                  ) : anneesAcademiques.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--yk-muted)', padding: '24px' }}>Aucune année académique enregistrée dans l'historique.</td></tr>
                  ) : anneesAcademiques.map(annee => {
                    const active = Number(annee.statut) === 1;
                    return (
                      <tr key={annee.id}>
                        <td style={{ fontWeight: 600 }}>{annee.libelle}</td>
                        <td>{formaterDate(annee.date_debut)}</td>
                        <td>{formaterDate(annee.date_fin)}</td>
                        <td><StatusBadge actif={active} labelActif="Active" labelInactif="Clôturée" /></td>
                        <td style={{ textAlign: 'right' }}>
                          {!active && (
                            <ActionButton
                              icon="event_available"
                              label="Activer cette année"
                              onClick={() => handleActiverAnneeExistante(annee)}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. PISTES D'AUDIT */}
        {activeTab === 'audit' && (
          <div className="yk-fade-in">
            <AuditLogDashboard />
          </div>
        )}

        {/* 6. CONFIGURATION */}
        {activeTab === 'parametres' && (
          <div className="yk-fade-in">
            {loadingParametres && (
              <div className="yk-alert" style={{ background: '#eff6ff', color: '#1e40af' }}>
                Chargement de la configuration système…
              </div>
            )}
            <fieldset disabled={loadingParametres} style={{ border: 'none', padding: 0, margin: 0 }}>
            <div className="yk-settings-grid">
              <div className="yk-card">
                <div className="yk-settings-section-title"><Icon name="security" /> Sécurité &amp; Sessions</div>
                <ToggleSwitch
                  label="Exiger le changement du mot de passe temporaire"
                  description="Forcer la modification dès la première connexion sur l'espace admin."
                  checked={parametres.exigerChangementMdp}
                  onChange={e => setParametres({ ...parametres, exigerChangementMdp: e.target.checked })}
                />
                <div className="yk-form-group" style={{ marginTop: '14px' }}>
                  <label className="yk-label">Durée d'expiration des sessions (Heures)</label>
                  <input
                    type="number" min="1" max="72" className="yk-input"
                    value={parametres.dureeSessionHeures}
                    onChange={e => setParametres({ ...parametres, dureeSessionHeures: e.target.value })}
                  />
                </div>
              </div>

              <div className="yk-card">
                <div className="yk-settings-section-title"><Icon name="shield" /> Journalisation &amp; Rétention</div>
                <div className="yk-form-group">
                  <label className="yk-label">Durée de rétention des logs d'audit</label>
                  <select
                    className="yk-select"
                    value={parametres.retentionLogsJours}
                    onChange={e => setParametres({ ...parametres, retentionLogsJours: e.target.value })}
                  >
                    <option value="90">3 mois</option>
                    <option value="180">6 mois</option>
                    <option value="365">12 mois</option>
                    <option value="730">24 mois</option>
                  </select>
                </div>
                <ToggleSwitch
                  label="Notifier le superadmin pour les actions critiques"
                  description="Alerte immédiate en cas de suppression ou désactivation."
                  checked={parametres.notifActionsSensibles}
                  onChange={e => setParametres({ ...parametres, notifActionsSensibles: e.target.checked })}
                />
              </div>

              <div className="yk-card">
                <div className="yk-settings-section-title"><Icon name="backup" /> Sauvegardes Automatisées</div>
                <div className="yk-form-group">
                  <label className="yk-label">Fréquence de sauvegarde par établissement</label>
                  <select
                    className="yk-select"
                    value={parametres.frequenceSauvegarde}
                    onChange={e => setParametres({ ...parametres, frequenceSauvegarde: e.target.value })}
                  >
                    <option value="quotidienne">Quotidienne (Chaque soir à minuit)</option>
                    <option value="hebdomadaire">Hebdomadaire</option>
                  </select>
                </div>
              </div>

              <div className="yk-card">
                <div className="yk-settings-section-title"><Icon name="notifications" /> Alertes de Sécurité</div>
                <ToggleSwitch
                  label="Détection de connexions suspectes"
                  description="Alerter en cas d'échecs de connexion répétés sur un compte administrateur."
                  checked={parametres.alerteEchecConnexion}
                  onChange={e => setParametres({ ...parametres, alerteEchecConnexion: e.target.checked })}
                />
              </div>
            </div>
            </fieldset>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="yk-btn yk-btn-primary" onClick={handleEnregistrerParametres} disabled={savingParametres || loadingParametres}>
                {savingParametres ? 'Enregistrement…' : 'Enregistrer la configuration globale'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ---------- MODALES D'ACTION (CRÉATION ET ÉDITION) ---------- */}

      {/* MODALE : CRÉATION D'UN ÉTABLISSEMENT */}
      <Modal isOpen={modalNouveauEtab} onClose={() => setModalNouveauEtab(false)} title="Déployer un nouvel établissement" icon="apartment">
        <form onSubmit={handleEtabSubmit}>
          <div className="yk-form-group">
            <label className="yk-label">Nom de l'Établissement *</label>
            <input type="text" className="yk-input" required placeholder="Ex: Collège Bilingue Saint-Joseph" value={formEtab.nom} onChange={e => setFormEtab({ ...formEtab, nom: e.target.value })} />
          </div>
          <div className="yk-form-group">
            <label className="yk-label">Code Identifiant Unique (Clé d'isolement) *</label>
            <input type="text" className="yk-input" required placeholder="Ex: CBSJ-DOUALA" value={formEtab.code_unique} onChange={e => setFormEtab({ ...formEtab, code_unique: e.target.value.toUpperCase() })} />
          </div>
          <div className="yk-form-group">
            <label className="yk-label">Localisation / Adresse</label>
            <input type="text" className="yk-input" placeholder="Ex: Akwa, Douala" value={formEtab.adresse} onChange={e => setFormEtab({ ...formEtab, adresse: e.target.value })} />
          </div>
          <div className="yk-form-group">
            <label className="yk-label">Téléphone de contact</label>
            <input type="text" className="yk-input" placeholder="Ex: +237 600 00 00 00" value={formEtab.telephone} onChange={e => setFormEtab({ ...formEtab, telephone: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button type="button" className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => setModalNouveauEtab(false)}>Annuler</button>
            <button type="submit" className="yk-btn yk-btn-primary">Créer l'établissement</button>
          </div>
        </form>
      </Modal>

      {/* MODALE : MODIFICATION D'UN ÉTABLISSEMENT */}
      <Modal isOpen={!!editionEtab} onClose={() => setEditionEtab(null)} title="Modifier l'établissement" icon="edit">
        {editionEtab && (
          <form onSubmit={handleEtabEditSubmit}>
            <div className="yk-form-group">
              <label className="yk-label">Nom de l'établissement *</label>
              <input type="text" className="yk-input" required value={editionEtab.nom} onChange={e => setEditionEtab({ ...editionEtab, nom: e.target.value })} />
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Code d'isolement unique</label>
              <input type="text" className="yk-input" value={editionEtab.code_unique} disabled />
              <span style={{ fontSize: '11.5px', color: 'var(--yk-muted)' }}>Le code d'isolement ne peut plus être altéré après création.</span>
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Adresse</label>
              <input type="text" className="yk-input" value={editionEtab.adresse} onChange={e => setEditionEtab({ ...editionEtab, adresse: e.target.value })} />
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Téléphone</label>
              <input type="text" className="yk-input" value={editionEtab.telephone} onChange={e => setEditionEtab({ ...editionEtab, telephone: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => setEditionEtab(null)}>Annuler</button>
              <button type="submit" className="yk-btn yk-btn-primary">Enregistrer les modifications</button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODALE : CRÉATION D'UN ADMINISTRATEUR */}
      <Modal isOpen={modalNouveauAdmin} onClose={() => setModalNouveauAdmin(false)} title="Créer un administrateur d'établissement" icon="manage_accounts">
        <form onSubmit={handleAdminSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="yk-form-group">
              <label className="yk-label">Nom *</label>
              <input type="text" className="yk-input" required value={formAdmin.nom} onChange={e => setFormAdmin({ ...formAdmin, nom: e.target.value })} />
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Prénom</label>
              <input type="text" className="yk-input" value={formAdmin.prenom} onChange={e => setFormAdmin({ ...formAdmin, prenom: e.target.value })} />
            </div>
          </div>
          <div className="yk-form-group">
            <label className="yk-label">Identifiant unique d'accès *</label>
            <input type="text" className="yk-input" required placeholder="Ex: admin.cbsj" value={formAdmin.identifiant} onChange={e => setFormAdmin({ ...formAdmin, identifiant: e.target.value })} />
          </div>
          <div className="yk-form-group">
            <label className="yk-label">Mot de passe temporaire</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={afficherMdpAdmin ? 'text' : 'password'}
                className="yk-input"
                placeholder="Laissez vide pour générer automatiquement"
                value={formAdmin.mot_de_passe}
                onChange={e => setFormAdmin({ ...formAdmin, mot_de_passe: e.target.value })}
              />
              <button type="button" className="yk-icon-btn" title={afficherMdpAdmin ? 'Masquer' : 'Afficher'} onClick={() => setAfficherMdpAdmin(!afficherMdpAdmin)}>
                <Icon name={afficherMdpAdmin ? 'visibility_off' : 'visibility'} />
              </button>
              <button type="button" className="yk-icon-btn" title="Générer automatiquement" onClick={handleGenererMdpAdmin}>
                <Icon name="autorenew" />
              </button>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--yk-muted)', marginTop: '4px' }}>
              Un mot de passe temporaire permettra à l'admin d'accéder à son espace avant de le personnaliser.
            </span>
          </div>
          <div className="yk-form-group">
            <label className="yk-label">Établissement affecté *</label>
            <select className="yk-select" required value={formAdmin.code_etablissement} onChange={e => setFormAdmin({ ...formAdmin, code_etablissement: e.target.value })}>
              <option value="">-- Choisir une structure --</option>
              {etablissements.map(etab => (
                <option key={etab.id} value={etab.code_unique}>{etab.nom} ({etab.code_unique})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button type="button" className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => setModalNouveauAdmin(false)}>Annuler</button>
            <button type="submit" className="yk-btn yk-btn-primary" disabled={loadingAdmin}>
              {loadingAdmin ? 'Création en cours...' : 'Créer les accès'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODALE : MODIFICATION D'UN ADMINISTRATEUR */}
      <Modal isOpen={!!editionAdmin} onClose={() => setEditionAdmin(null)} title="Modifier l'administrateur" icon="edit">
        {editionAdmin && (
          <form onSubmit={handleAdminEditSubmit}>
            <div className="yk-form-group">
              <label className="yk-label">Nom *</label>
              <input type="text" className="yk-input" required value={editionAdmin.nom} onChange={e => setEditionAdmin({ ...editionAdmin, nom: e.target.value })} />
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Prénom</label>
              <input type="text" className="yk-input" value={editionAdmin.prenom} onChange={e => setEditionAdmin({ ...editionAdmin, prenom: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => setEditionAdmin(null)}>Annuler</button>
              <button type="submit" className="yk-btn yk-btn-primary">Enregistrer</button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODALE : NOUVELLE ANNÉE ACADÉMIQUE */}
      <Modal isOpen={modalNouvelleAnnee} onClose={() => setModalNouvelleAnnee(false)} title="Activation d'une année académique" icon="calendar_month">
        <form onSubmit={handleActiverAnnee}>
          <div className="yk-form-group">
            <label className="yk-label">Libellé / Session *</label>
            <input type="text" className="yk-input" required placeholder="Ex : 2026-2027" value={formAnnee.libelle} onChange={e => setFormAnnee({ ...formAnnee, libelle: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="yk-form-group">
              <label className="yk-label">Date de début *</label>
              <input type="date" className="yk-input" required value={formAnnee.date_debut} onChange={e => setFormAnnee({ ...formAnnee, date_debut: e.target.value })} />
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Date de fin *</label>
              <input type="date" className="yk-input" required value={formAnnee.date_fin} onChange={e => setFormAnnee({ ...formAnnee, date_fin: e.target.value })} />
            </div>
          </div>
          <div className="yk-callout yk-callout-warning">
            <Icon name="warning" style={{ fontSize: '18px' }} />
            <span>Cette action clôturera automatiquement l'année en cours et basculera l'ensemble des établissements sur cette nouvelle session.</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button type="button" className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={() => setModalNouvelleAnnee(false)}>Annuler</button>
            <button type="submit" className="yk-btn yk-btn-primary">Activer globalement</button>
          </div>
        </form>
      </Modal>

      {/* MODALE : AFFICHAGE DU MOT DE PASSE TEMPORAIRE CRÉÉ / RÉINITIALISÉ */}
      <Modal isOpen={!!passwordModal} onClose={() => setPasswordModal(null)} title={passwordModal?.contexte === 'reinitialisation' ? 'Mot de passe réinitialisé' : 'Accès Administrateur Générés'} icon="key">
        {passwordModal && (
          <>
            <p style={{ fontSize: '13.5px', color: 'var(--yk-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Veuillez transmettre ces identifiants à l'administrateur. Un changement de mot de passe sera obligatoire à sa première connexion.
            </p>
            <div className="yk-form-group">
              <label className="yk-label">Identifiant d'accès</label>
              <div className="yk-password-field"><span>{passwordModal.identifiant}</span></div>
            </div>
            <div className="yk-form-group">
              <label className="yk-label">Mot de passe temporaire</label>
              <div className="yk-password-field">
                <span>{passwordModal.motDePasse}</span>
                <button
                  type="button"
                  className="yk-copy-btn"
                  onClick={() => copierTexte(passwordModal.motDePasse).then(ok => afficherMessage(ok ? 'Mot de passe copié dans le presse-papier !' : 'Erreur lors de la copie.', !ok))}
                  title="Copier le mot de passe"
                >
                  <Icon name="content_copy" style={{ fontSize: '16px' }} />
                </button>
              </div>
            </div>
            <div className="yk-callout yk-callout-info">
              <Icon name="info" style={{ fontSize: '18px' }} />
              <span>Par souci de sécurité, ce mot de passe ne sera plus affiché après la fermeture de cette modale.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" className="yk-btn yk-btn-primary" onClick={() => setPasswordModal(null)}>Compris</button>
            </div>
          </>
        )}
      </Modal>

      {/* MODALE : CONFIRMATION GÉNÉRIQUE (ACTIVER, DÉSACTIVER, SUPPRIMER) */}
      <Modal isOpen={!!confirmModal} onClose={fermerConfirmation} title={confirmModal?.titre} icon={confirmModal?.icone} tone={confirmModal?.tonalite}>
        {confirmModal && (
          <>
            <p style={{ fontSize: '13.5px', color: 'var(--yk-muted)', lineHeight: '1.6', margin: '0 0 16px' }}>{confirmModal.message}</p>
            {confirmModal.saisieRequise && (
              <div className="yk-form-group">
                <label className="yk-label">Tapez exactment « {confirmModal.saisieRequise} » pour confirmer</label>
                <input type="text" className="yk-input" value={saisieConfirmation} onChange={e => setSaisieConfirmation(e.target.value)} autoFocus />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button type="button" className="yk-btn" style={{ background: '#e2e8f0', color: '#334155' }} onClick={fermerConfirmation}>Annuler</button>
              <button
                type="button"
                className={`yk-btn ${confirmModal.tonalite === 'danger' ? 'yk-btn-danger' : 'yk-btn-primary'}`}
                disabled={chargementConfirmation || (confirmModal.saisieRequise && saisieConfirmation !== confirmModal.saisieRequise)}
                onClick={executerConfirmation}
              >
                {chargementConfirmation ? 'Traitement…' : confirmModal.libelleConfirmation}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}