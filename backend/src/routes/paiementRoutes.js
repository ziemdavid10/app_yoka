const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiementController');

router.get('/stats', paiementController.getStatsFinancieres);
router.get('/debiteurs', paiementController.getDebiteurs);
router.post('/', paiementController.enregistrerPaiement);
router.get('/', paiementController.getPaiements);

module.exports = router;