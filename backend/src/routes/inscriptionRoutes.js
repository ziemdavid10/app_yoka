const express = require('express');
const router = express.Router();
const inscriptionController = require('../controllers/inscriptionController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// Sécurisation de toutes les routes Inscriptions
router.post('/', verifierAuth, inscriptionController.inscrireEleve);
router.get('/', verifierAuth, inscriptionController.getInscriptions);
router.put('/:id', verifierAuth, inscriptionController.modifierInscription);
router.delete('/:id', verifierAuth, inscriptionController.supprimerInscription);

module.exports = router;