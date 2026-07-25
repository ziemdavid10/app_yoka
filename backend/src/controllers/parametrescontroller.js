const db = require('../config/db');

const RETENTIONS_VALIDES = [90, 180, 365, 730];
const FREQUENCES_VALIDES = ['quotidienne', 'hebdomadaire'];

const mapVersFrontend = (row) => ({
  exigerChangementMdp: Boolean(row.exiger_changement_mdp),
  dureeSessionHeures: row.duree_session_heures,
  retentionLogsJours: row.retention_logs_jours,
  notifActionsSensibles: Boolean(row.notif_actions_sensibles),
  frequenceSauvegarde: row.frequence_sauvegarde,
  alerteEchecConnexion: Boolean(row.alerte_echec_connexion),
  modifieLe: row.modifie_le
});

const validerParametres = (payload = {}) => {
  const erreurs = [];
  const {
    exigerChangementMdp, dureeSessionHeures, retentionLogsJours,
    notifActionsSensibles, frequenceSauvegarde, alerteEchecConnexion
  } = payload;

  if (typeof exigerChangementMdp !== 'boolean') {
    erreurs.push("« exigerChangementMdp » doit être un booléen.");
  }

  const duree = Number(dureeSessionHeures);
  if (!Number.isInteger(duree) || duree < 1 || duree > 72) {
    erreurs.push("« dureeSessionHeures » doit être un entier compris entre 1 et 72.");
  }

  const retention = Number(retentionLogsJours);
  if (!RETENTIONS_VALIDES.includes(retention)) {
    erreurs.push(`« retentionLogsJours » doit être l'une des valeurs suivantes : ${RETENTIONS_VALIDES.join(', ')}.`);
  }

  if (typeof notifActionsSensibles !== 'boolean') {
    erreurs.push("« notifActionsSensibles » doit être un booléen.");
  }

  if (!FREQUENCES_VALIDES.includes(frequenceSauvegarde)) {
    erreurs.push(`« frequenceSauvegarde » doit être l'une des valeurs suivantes : ${FREQUENCES_VALIDES.join(', ')}.`);
  }

  if (typeof alerteEchecConnexion !== 'boolean') {
    erreurs.push("« alerteEchecConnexion » doit être un booléen.");
  }

  return erreurs;
};

// GET /api/parametres
exports.getParametres = async (req, res) => {
  try {
    let [rows] = await db.execute('SELECT * FROM parametres_systeme WHERE id = 1 LIMIT 1');

    if (!rows.length) {
      await db.execute('INSERT INTO parametres_systeme (id) VALUES (1)');
      [rows] = await db.execute('SELECT * FROM parametres_systeme WHERE id = 1 LIMIT 1');
    }

    return res.status(200).json(mapVersFrontend(rows[0]));
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres système :', error);
    return res.status(500).json({ error: 'Une erreur interne est survenue sur le serveur.' });
  }
};

// PUT /api/parametres (Adapté pour CURRENT_TIMESTAMP au lieu de NOW())
exports.updateParametres = async (req, res) => {
  const erreurs = validerParametres(req.body);
  if (erreurs.length) {
    return res.status(400).json({ error: erreurs.join(' ') });
  }

  const {
    exigerChangementMdp, dureeSessionHeures, retentionLogsJours,
    notifActionsSensibles, frequenceSauvegarde, alerteEchecConnexion
  } = req.body;

  const utilisateurId = req.user?.id || null;

  try {
    await db.execute(
      `UPDATE parametres_systeme SET
         exiger_changement_mdp   = ?,
         duree_session_heures    = ?,
         retention_logs_jours    = ?,
         notif_actions_sensibles = ?,
         frequence_sauvegarde    = ?,
         alerte_echec_connexion  = ?,
         modifie_par             = ?,
         modifie_le              = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        exigerChangementMdp ? 1 : 0,
        dureeSessionHeures,
        retentionLogsJours,
        notifActionsSensibles ? 1 : 0,
        frequenceSauvegarde,
        alerteEchecConnexion ? 1 : 0,
        utilisateurId
      ]
    );

    if (utilisateurId) {
      await db.execute(
        `INSERT INTO audit_logs (utilisateur_id, etablissement_id, action, details, ip_address)
         VALUES (?, NULL, 'MODIFICATION_PARAMETRES_SYSTEME', ?, ?)`,
        [utilisateurId, JSON.stringify(req.body), req.ip]
      ).catch((err) => {
        console.error("Impossible d'enregistrer la piste d'audit pour cette modification :", err);
      });
    }

    const [rows] = await db.execute('SELECT * FROM parametres_systeme WHERE id = 1 LIMIT 1');
    return res.status(200).json(mapVersFrontend(rows[0]));
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres système :', error);
    return res.status(500).json({ error: 'Une erreur interne est survenue sur le serveur.' });
  }
};