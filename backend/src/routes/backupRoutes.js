const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');

// GET /api/backups -> Lister toutes les sauvegardes existantes
router.get('/', backupController.listerSauvegardes);

// POST /api/backups -> Déclencher une sauvegarde manuelle immédiatement
router.post('/', backupController.creerSauvegarde);

// GET /api/backups/download/:filename -> Télécharger un fichier de sauvegarde
router.get('/download/:filename', backupController.telechargerSauvegarde);

// DELETE /api/backups/:filename -> Supprimer un fichier de sauvegarde
router.delete('/:filename', backupController.supprimerSauvegarde);

module.exports = router;