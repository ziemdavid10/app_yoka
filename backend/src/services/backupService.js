const path = require('path');
const fs = require('fs');
const db = require('../config/db');

/**
 * Détermine le dossier d'exécution racine :
 * - En développement : dossier du projet (process.cwd())
 * - En production (.exe PKG) : dossier où se trouve l'exécutable
 */
const getExeDir = () => {
  return typeof process.pkg !== 'undefined'
    ? path.dirname(process.execPath)
    : process.cwd();
};

/**
 * Exécute une sauvegarde à chaud de la base SQLite
 */
const effectuerSauvegarde = async (type = 'AUTOMATIQUE') => {
  try {
    const exeDir = getExeDir();
    const backupDir = path.join(exeDir, 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Génération du nom horodaté (ex: backup_MANUELLE_2026-07-25_23-45-00.sqlite3)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const fileName = `backup_${type}_${dateStr}_${timeStr}.sqlite3`;
    const targetPath = path.join(backupDir, fileName);

    // Copie à chaud SQLite
    await db.execute(`VACUUM INTO '${targetPath.replace(/\\/g, '/')}'`);
    console.log(` [BACKUP] Sauvegarde (${type}) réussie : ${fileName}`);

    // Nettoyage automatique basé sur retention_logs_jours
    await nettoyerAnciennesSauvegardes(backupDir);

    return { success: true, filePath: targetPath, fileName };
  } catch (error) {
    console.error(" [BACKUP] Échec de la sauvegarde :", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Lit "retention_logs_jours" dans parametres_systeme et purge les fichiers expirés
 */
const nettoyerAnciennesSauvegardes = async (backupDir) => {
  try {
    const [rows] = await db.execute('SELECT retention_logs_jours FROM parametres_systeme WHERE id = 1 LIMIT 1');
    const retentionJours = rows && rows.length > 0 ? rows[0].retention_logs_jours : 365;

    const limiteMs = Date.now() - (retentionJours * 24 * 60 * 60 * 1000);
    const fichiers = fs.readdirSync(backupDir);

    fichiers.forEach((fichier) => {
      const filePath = path.join(backupDir, fichier);
      const stats = fs.statSync(filePath);

      if (fichier.endsWith('.sqlite3') && stats.mtimeMs < limiteMs) {
        fs.unlinkSync(filePath);
        console.log(` [BACKUP] Fichier expiré supprimé (${retentionJours} jours max) : ${fichier}`);
      }
    });
  } catch (err) {
    console.error(" [BACKUP] Erreur lors du nettoyage :", err.message);
  }
};

/**
 * Planificateur d'arrière-plan lisant "frequence_sauvegarde" dans parametres_systeme
 */
const initialiserPlanificateurSauvegarde = () => {
  // Intervalle de vérification : toutes les 6 heures
  const INTERVAL_VERIF_MS = 6 * 60 * 60 * 1000;

  const verifierEtLancer = async () => {
    try {
      const [rows] = await db.execute('SELECT frequence_sauvegarde FROM parametres_systeme WHERE id = 1 LIMIT 1');
      if (!rows || rows.length === 0) return;

      const frequence = rows[0].frequence_sauvegarde; // 'quotidienne' ou 'hebdomadaire'
      const exeDir = getExeDir();
      const backupDir = path.join(exeDir, 'backups');

      // Si le dossier n'existe pas ou est vide, on lance la première sauvegarde
      if (!fs.existsSync(backupDir)) {
        await effectuerSauvegarde('AUTO');
        return;
      }

      const fichiers = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite3'));
      if (fichiers.length === 0) {
        await effectuerSauvegarde('AUTO');
        return;
      }

      // Identifier le backup le plus récent
      fichiers.sort((a, b) => fs.statSync(path.join(backupDir, a)).mtimeMs - fs.statSync(path.join(backupDir, b)).mtimeMs);
      const dernierBackup = fichiers[fichiers.length - 1];
      const mtimeDernier = fs.statSync(path.join(backupDir, dernierBackup)).mtimeMs;

      // Définir le délai nécessaire avant le prochain backup
      const delaiRequisMs = frequence === 'hebdomadaire'
        ? 7 * 24 * 60 * 60 * 1000  // 7 jours
        : 24 * 60 * 60 * 1000;     // 24 heures ('quotidienne')

      if (Date.now() - mtimeDernier >= delaiRequisMs) {
        await effectuerSauvegarde('AUTO');
      }
    } catch (err) {
      console.error(" [BACKUP] Erreur lors de la vérification planifiée :", err.message);
    }
  };

  // Première vérification 10 secondes après le démarrage du serveur
  setTimeout(verifierEtLancer, 10000);

  // Vérifications régulières
  setInterval(verifierEtLancer, INTERVAL_VERIF_MS);
};

module.exports = {
  effectuerSauvegarde,
  initialiserPlanificateurSauvegarde
};