import React, { useState, useEffect } from 'react';

export const AuditLogDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour les filtres de recherche
  const [selectedEtab, setSelectedEtab] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Chargement initial des pistes d'audit et de la liste des écoles pour le filtre
  useEffect(() => {
    chargerDonneesInitiales();
  }, [selectedEtab]); // Recharge les logs si le filtre d'établissement change au niveau API

  const chargerDonneesInitiales = async () => {
    setLoading(true);
    try {
      // 1. Récupération des logs filtrés par établissement si spécifié
      const urlLogs = selectedEtab 
        ? `/api/audits/global-logs?etablissement_id=${selectedEtab}`
        : '/api/audits/global-logs';
        
      const resLogs = await fetch(urlLogs, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const dataLogs = await resLogs.json();
      setLogs(Array.isArray(dataLogs) ? dataLogs : []);

      // 2. Récupération des établissements pour le sélecteur (exécuté une seule fois)
      if (etablissements.length === 0) {
        const resEtab = await fetch('/api/etablissements', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const dataEtab = await resEtab.json();
        setEtablissements(Array.isArray(dataEtab) ? dataEtab : []);
      }
    } catch (error) {
      console.error("Échec du chargement du registre d'audit:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage combiné côté client pour la recherche textuelle et le type d'action
  const logsFiltres = logs.filter(log => {
    const correspondAction = selectedAction ? log.action === selectedAction : true;
    
    const texteRecherche = searchTerm.toLowerCase();
    const correspondTexte = 
      log.action.toLowerCase().includes(texteRecherche) ||
      (log.details && log.details.toLowerCase().includes(texteRecherche)) ||
      (log.admin_nom && log.admin_nom.toLowerCase().includes(texteRecherche)) ||
      (log.admin_prenom && log.admin_prenom.toLowerCase().includes(texteRecherche));

    return correspondAction && correspondTexte;
  });

  // Liste des types d'actions uniques présents pour alimenter dynamiquement le filtre
  const typesActionsUniques = [...new Set(logs.map(l => l.action))];

  // Helper pour styliser dynamiquement les badges d'action
  const getBadgeStyle = (action) => {
    if (action.includes('ENCAISSEMENT')) return { bg: '#e6f4ea', text: '#137333' }; // Vert
    if (action.includes('SORTIE') || action.includes('SUPPRESSION')) return { bg: '#fce8e6', text: '#c5221f' }; // Rouge
    if (action.includes('CONNEXION')) return { bg: '#e8f0fe', text: '#1a73e8' }; // Bleu
    return { bg: '#f1f3f4', text: '#3c4043' }; // Gris par défaut
  };

  return (
    <div style={{ padding: '24px', fontFamily: "'Inter', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* En-tête */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Registre d'Audit Global</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
          Suivi et traçabilité immuable des actions critiques effectuées par les administrateurs d'établissements.
        </p>
      </div>

      {/* Barre de Filtres */}
      <div style={{ 
        display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px', 
        backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' 
      }}>
        
        {/* Filtre par Établissement (Appel API) */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Filtrer par Établissement</label>
          <select 
            value={selectedEtab} 
            onChange={(e) => setSelectedEtab(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          >
            <option value="">Tous les établissements</option>
            {etablissements.map(etab => (
              <option key={etab.id} value={etab.id}>{etab.nom}</option>
            ))}
          </select>
        </div>

        {/* Filtre par Type d'action */}
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Nature de l'Action</label>
          <select 
            value={selectedAction} 
            onChange={(e) => setSelectedAction(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          >
            <option value="">Toutes les catégories</option>
            {typesActionsUniques.map(act => (
              <option key={act} value={act}>{act.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Recherche par mot-clé */}
        <div style={{ flex: '2', minWidth: '280px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Recherche contextuelle</label>
          <input 
            type="text"
            placeholder="Rechercher un administrateur, un mot clé, un reçu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      {/* Zone d'affichage du Tableau */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Chargement du journal des opérations...
          </div>
        ) : logsFiltres.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Aucune piste d'audit ne correspond à vos critères de recherche.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Date & Heure</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Établissement</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Opérateur (Admin)</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Type d'événement</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Description des faits</th>
                  <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Adresse IP</th>
                </tr>
              </thead>
              <tbody>
                {logsFiltres.map((log) => {
                  const colors = getBadgeStyle(log.action);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: '#334155' }}>
                        {new Date(log.cree_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: '#0f172a' }}>
                        {log.ecole_nom || 'Système Global'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>
                        {log.admin_nom ? `${log.admin_nom} ${log.admin_prenom || ''}` : <span style={{ color: '#94a3b8', italic: 'true' }}>Automatique</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          backgroundColor: colors.bg, color: colors.text, 
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, display: 'inline-block' 
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4', maxWidth: '400px' }}>
                        {log.details}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {log.ip_address}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};