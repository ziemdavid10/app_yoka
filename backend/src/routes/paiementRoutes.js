const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiementController');

// Routes pour les statistiques et les débiteurs
router.get('/stats', paiementController.getStatsFinancieres);
router.get('/debiteurs', paiementController.getDebiteurs);

// CORRECTION : Utilisation de savePaiement au lieu d'enregistrerPaiement
router.post('/', paiementController.savePaiement);
router.get('/', paiementController.getPaiements);

// Nouvelles routes pour les charges / dépenses
router.post('/depenses', paiementController.enregistrerDepense);
router.get('/depenses', paiementController.getDepenses);

module.exports = router;