const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiementController');
const { verifierAuth } = require('../middlewares/authMiddleware');

router.get('/stats', verifierAuth, paiementController.getStatsFinancieres);
router.get('/debiteurs', verifierAuth, paiementController.getDebiteurs);
router.get('/annees', verifierAuth, paiementController.getAnneesScolaires);
router.get('/etats/classes', verifierAuth, paiementController.getEtatParClasse);
router.get('/etats/eleves', verifierAuth, paiementController.getEtatParEleve);
router.post('/', verifierAuth, paiementController.savePaiement);
router.get('/', verifierAuth, paiementController.getPaiements);
router.put('/:id', verifierAuth, paiementController.updatePaiement);
router.delete('/:id', verifierAuth, paiementController.deletePaiement);

router.post('/depenses', verifierAuth, paiementController.enregistrerDepense);
router.get('/depenses', verifierAuth, paiementController.getDepenses);
router.put('/depenses/:id', verifierAuth, paiementController.updateDepense);
router.delete('/depenses/:id', verifierAuth, paiementController.deleteDepense);

module.exports = router;