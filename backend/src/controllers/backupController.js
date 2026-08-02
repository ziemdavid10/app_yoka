const path = require('path');
const fs = require('fs');
const backupService = require('../services/backupService');

// Dossier de stockage des sauvegardes
const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * GET /api/backups
 * Liste toutes les sauvegardes existantes avec leur taille et date de création.
 */
exports.listerSauvegardes = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.status(200).json({ success: true, backups: [] });
    }

    const files = await fs.promises.readdir(BACKUP_DIR);
    
    // Filtrer les fichiers de base de données (.sqlite3 / .db)
    const backupFiles = files.filter(file => file.endsWith('.sqlite3') || file.endsWith('.db'));

    const backups = await Promise.all(
      backupFiles.map(async (filename) => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stats = await fs.promises.stat(filePath);

        return {
          filename,
          size: stats.size, // en octets
          createdAt: stats.birthtime || stats.mtime
        };
      })
    );

    // Trier du fichier le plus récent au plus ancien
    backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, backups });
  } catch (error) {
    console.error('Erreur lors de la récupération des sauvegardes :', error);
    return res.status(500).json({ success: false, error: 'Impossible de récupérer la liste des sauvegardes.' });
  }
};

/**
 * POST /api/backups
 * Déclenche immédiatement une sauvegarde manuelle.
 */
exports.creerSauvegarde = async (req, res) => {
  try {
    // Appel au service de sauvegarde avec le type 'manuelle'
    const backup = await backupService.executerSauvegarde('manuelle');

    return res.status(201).json({
      success: true,
      message: 'Sauvegarde effectuée avec succès.',
      backup
    });
  } catch (error) {
    console.error('Erreur lors de la création de la sauvegarde :', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement de la sauvegarde manuelle.'
    });
  }
};

/**
 * GET /api/backups/download/:filename
 * Permet le téléchargement sécurisé d'un fichier de sauvegarde spécifique.
 */
exports.telechargerSauvegarde = async (req, res) => {
  try {
    const { filename } = req.params;

    // Sécurité : Nettoyage du nom de fichier contre la traversée de dossier (ex: ../../)
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Fichier de sauvegarde introuvable.' });
    }

    return res.download(filePath, safeFilename);
  } catch (error) {
    console.error('Erreur lors du téléchargement de la sauvegarde :', error);
    return res.status(500).json({ success: false, error: 'Erreur lors du téléchargement du fichier.' });
  }
};

/**
 * DELETE /api/backups/:filename
 * Supprime un fichier de sauvegarde spécifique.
 */
exports.supprimerSauvegarde = async (req, res) => {
  try {
    const { filename } = req.params;

    // Sécurité : Nettoyage du nom de fichier
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Fichier introuvable.' });
    }

    await fs.promises.unlink(filePath);

    return res.status(200).json({
      success: true,
      message: `La sauvegarde ${safeFilename} a été supprimée.`
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la sauvegarde :', error);
    return res.status(500).json({ success: false, error: 'Impossible de supprimer le fichier de sauvegarde.' });
  }
};