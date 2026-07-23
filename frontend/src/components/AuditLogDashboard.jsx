import React, { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Classification visuelle des actions : chaque action est rattachée à une
// famille (encaissement, suppression, connexion, modification, création…)
// pour lui donner une couleur et une icône cohérentes dans le badge.
// ---------------------------------------------------------------------------
const classifierAction = (action = '') => {
  const a = action.toUpperCase();
  if (/(ENCAISSEMENT|PAIEMENT|TRANCHE)/.test(a)) return { bg: '#e6f4ea', text: '#137333', dot: '#137333' };
  if (/(SUPPRESSION|SORTIE|DELETE)/.test(a)) return { bg: '#fce8e6', text: '#c5221f', dot: '#c5221f' };
  if (/(CONNEXION|LOGIN|AUTH)/.test(a)) return { bg: '#e8f0fe', text: '#1a73e8', dot: '#1a73e8' };
  if (/(DECONNEXION|LOGOUT)/.test(a)) return { bg: '#f1f3f4', text: '#3c4043', dot: '#5f6368' };
  if (/(CREATION|AJOUT|NOUVEL|NOUVEAU)/.test(a)) return { bg: '#e6f4ea', text: '#137333', dot: '#137333' };
  if (/(MODIF|UPDATE|MISE_A_JOUR|EDIT)/.test(a)) return { bg: '#fef7e0', text: '#b06000', dot: '#b06000' };
  if (/(DESACTIV|ACTIVAT|STATUT|MDP|PASSWORD|REINITIALIS)/.test(a)) return { bg: '#f3e8fd', text: '#8430ce', dot: '#8430ce' };
  return { bg: '#f1f3f4', text: '#3c4043', dot: '#5f6368' };
};

const formaterActionLabel = (action = '') =>
  action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());

const formaterDetails = (details) => {
  if (details === null || details === undefined || details === '') return null;
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return String(details);
  }
};

const initiales = (nom = '', prenom = '') =>
  `${(prenom || '?').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase();

const PERIODES = [
  { key: 'tout', label: 'Toute la période' },
  { key: '24h', label: 'Dernières 24 heures' },
  { key: '7j', label: '7 derniers jours' },
  { key: '30j', label: '30 derniers jours' }
];
const SEUILS_MS = { '24h': 864e5, '7j': 6048e5, '30j': 2592e6 };
const LIGNES_PAR_PAGE = 12;

export const AuditLogDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [etablissements, setEtablissements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');

  // États pour les filtres de recherche
  const [selectedEtab, setSelectedEtab] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [periode, setPeriode] = useState('tout');

  const [ligneOuverte, setLigneOuverte] = useState(null);
  const [page, setPage] = useState(1);

  // Chargement initial des pistes d'audit et de la liste des écoles pour le filtre
  useEffect(() => {
    chargerDonneesInitiales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEtab]); // Recharge les logs si le filtre d'établissement change au niveau API

  const chargerDonneesInitiales = async () => {
    setLoading(true);
    setErreur('');
    try {
      // 1. Récupération des logs filtrés par établissement si spécifié
      const urlLogs = selectedEtab
        ? `/api/audits/global-logs?etablissement_id=${selectedEtab}`
        : '/api/audits/global-logs';

      const resLogs = await fetch(urlLogs, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!resLogs.ok) throw new Error(`Erreur API logs: ${resLogs.status}`);
      const dataLogs = await resLogs.json();
      setLogs(Array.isArray(dataLogs) ? dataLogs : []);

      if (etablissements.length === 0) {
        const resEtab = await fetch('/api/etablissements', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!resEtab.ok) throw new Error(`Erreur API établissements: ${resEtab.status}`);
        const dataEtab = await resEtab.json();
        setEtablissements(Array.isArray(dataEtab) ? dataEtab : []);
      }
    } catch (error) {
      console.error("Échec du chargement du registre d'audit:", error);
      setErreur("Impossible de charger le journal d'audit. Vérifiez votre connexion et réessayez.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrage combiné côté client : action, période et recherche textuelle
  const logsFiltres = useMemo(() => {
    const maintenant = Date.now();
    const q = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      if (selectedAction && log.action !== selectedAction) return false;

      if (periode !== 'tout') {
        const t = new Date(log.cree_le).getTime();
        if (!Number.isFinite(t) || maintenant - t > SEUILS_MS[periode]) return false;
      }

      if (q) {
        const hay = [
          log.action, log.details, log.ip_address, log.admin_nom, log.admin_prenom, log.ecole_nom
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [logs, selectedAction, periode, searchTerm]);

  // Revenir à la page 1 dès qu'un filtre change
  useEffect(() => { setPage(1); }, [selectedAction, searchTerm, periode, selectedEtab]);

  const totalPages = Math.max(1, Math.ceil(logsFiltres.length / LIGNES_PAR_PAGE));
  const logsPage = logsFiltres.slice((page - 1) * LIGNES_PAR_PAGE, page * LIGNES_PAR_PAGE);

  // Liste des types d'actions uniques présents pour alimenter dynamiquement le filtre
  const typesActionsUniques = useMemo(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs]
  );

  const distinctAdmins = useMemo(
    () => new Set(logsFiltres.map((l) => `${l.admin_nom || ''}${l.admin_prenom || ''}`).filter((s) => s.trim())).size,
    [logsFiltres]
  );

  const filtresActifs = Boolean(searchTerm || selectedAction || selectedEtab || periode !== 'tout');

  const reinitialiserFiltres = () => {
    setSearchTerm(''); setSelectedAction(''); setSelectedEtab(''); setPeriode('tout');
  };

  const exporterCSV = () => {
    const entetes = ['Date', 'Heure', 'Établissement', 'Administrateur', 'Action', 'Description', 'Adresse IP'];
    const lignes = logsFiltres.map((l) => {
      const d = new Date(l.cree_le);
      const admin = l.admin_nom ? `${l.admin_nom} ${l.admin_prenom || ''}`.trim() : 'Automatique';
      const description = (l.details || '').toString().replace(/\r?\n/g, ' ');
      return [
        d.toLocaleDateString('fr-FR'), d.toLocaleTimeString('fr-FR'),
        l.ecole_nom || 'Système Global', admin, l.action || '', description, l.ip_address || ''
      ].map((champ) => `"${String(champ).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [entetes.join(','), ...lignes].join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: '#0f172a' }}>
      <style>{`
        @keyframes ykaShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
        .yka-skeleton { height: 14px; border-radius: 4px; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%); background-size: 400% 100%; animation: ykaShimmer 1.4s ease infinite; }
        @keyframes ykaFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .yka-row:hover { background-color: #f8fafc; }
        .yka-detail-row { animation: ykaFadeIn 0.15s ease-out; }
        .yka-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .yka-page-btn:not(:disabled):hover { background: #f1f5f9; }
      `}</style>

      {/* En-tête */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Registre d'Audit Global</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Suivi et traçabilité des actions critiques effectuées par les administrateurs d'établissements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={chargerDonneesInitiales}
            disabled={loading}
            style={{ padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            ⟳ Actualiser
          </button>
          <button
            onClick={exporterCSV}
            disabled={!logsFiltres.length}
            style={{ padding: '9px 14px', borderRadius: '6px', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: logsFiltres.length ? 'pointer' : 'not-allowed', opacity: logsFiltres.length ? 1 : 0.5 }}
          >
            ⭳ Exporter CSV
          </button>
        </div>
      </div>

      {erreur && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#fce8e6', color: '#c5221f', fontSize: '13.5px', fontWeight: 500, marginBottom: '16px' }}>
          {erreur}
        </div>
      )}

      {/* Statistiques rapides */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Entrées affichées', val: logsFiltres.length },
          { label: 'Administrateurs distincts', val: distinctAdmins },
          { label: 'Établissements référencés', val: etablissements.length }
        ].map((s) => (
          <div key={s.label} style={{ flex: '1 1 180px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
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
            {etablissements.map((etab) => (
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
            {typesActionsUniques.map((act) => (
              <option key={act} value={act}>{formaterActionLabel(act)}</option>
            ))}
          </select>
        </div>

        {/* Filtre par Période */}
        <div style={{ flex: '1', minWidth: '160px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Période</label>
          <select
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
          >
            {PERIODES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>

        {/* Recherche par mot-clé */}
        <div style={{ flex: '2', minWidth: '280px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Recherche contextuelle</label>
          <input
            type="text"
            placeholder="Rechercher un administrateur, un mot clé, une IP…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {filtresActifs && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={reinitialiserFiltres}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '13px', cursor: 'pointer' }}
            >
              ✕ Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Zone d'affichage du Tableau */}
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Date &amp; Heure</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Établissement</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Opérateur (Admin)</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Type d'événement</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Description des faits</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Adresse IP</th>
                <th style={{ padding: '12px 16px', width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}><div className="yka-skeleton" /></td>
                  ))}
                </tr>
              ))}

              {!loading && logsPage.map((log) => {
                const colors = classifierAction(log.action);
                const details = formaterDetails(log.details);
                const estOuverte = ligneOuverte === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      className="yka-row"
                      onClick={() => setLigneOuverte(estOuverte ? null : log.id)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', color: '#334155' }}>
                        {new Date(log.cree_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: '#0f172a' }}>
                        {log.ecole_nom || 'Système Global'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {log.admin_nom && (
                            <span style={{
                              width: '26px', height: '26px', borderRadius: '50%', background: '#eef2ff', color: '#4f46e5',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 700, flexShrink: 0
                            }}>
                              {initiales(log.admin_nom, log.admin_prenom)}
                            </span>
                          )}
                          {log.admin_nom
                            ? `${log.admin_nom} ${log.admin_prenom || ''}`
                            : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Automatique</span>}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          backgroundColor: colors.bg, color: colors.text,
                          padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.dot, display: 'inline-block' }} />
                          {formaterActionLabel(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#475569', lineHeight: '1.4', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {log.ip_address || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8' }}>
                        {estOuverte ? '▲' : '▼'}
                      </td>
                    </tr>
                    {estOuverte && (
                      <tr className="yka-detail-row">
                        <td colSpan={7} style={{ background: '#f8fafc', padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                          {details ? (
                            <pre style={{
                              margin: 0, background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace',
                              fontSize: '12px', padding: '12px 14px', borderRadius: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5
                            }}>
                              {details}
                            </pre>
                          ) : (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12.5px' }}>
                              Aucun détail supplémentaire enregistré pour cette action.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && logsFiltres.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>🕘</div>
            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>Aucune piste d'audit ne correspond à vos critères</div>
            <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
              {filtresActifs ? "Essayez d'élargir vos filtres ou votre recherche." : "Aucune action n'a encore été journalisée."}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && logsFiltres.length > LIGNES_PAR_PAGE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', fontSize: '12.5px', color: '#64748b' }}>
          <span>Page {page} sur {totalPages} · {logsFiltres.length} entrées</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="yka-page-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
            >‹</button>
            <button
              className="yka-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
            >›</button>
          </div>
        </div>
      )}
    </div>
  );
};
