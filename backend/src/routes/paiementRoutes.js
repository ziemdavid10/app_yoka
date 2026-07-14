const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiementController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// Sécurisation analytique et flux de paiement
router.get('/stats', verifierAuth, paiementController.getStatsFinancieres);
router.get('/debiteurs', verifierAuth, paiementController.getDebiteurs);
router.post('/', verifierAuth, paiementController.savePaiement);
router.get('/', verifierAuth, paiementController.getPaiements);

// Routes d'administration des dépenses
router.post('/depenses', verifierAuth, paiementController.enregistrerDepense);
router.get('/depenses', verifierAuth, paiementController.getDepenses);

module.exports = router;