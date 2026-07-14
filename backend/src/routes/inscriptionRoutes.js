const express = require('express');
const router = express.Router();
const inscriptionController = require('../controllers/inscriptionController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// Sécurisation de toutes les routes Inscriptions
router.post('/', verifierAuth, inscriptionController.inscrireEleve);
router.get('/', verifierAuth, inscriptionController.getInscriptions);

module.exports = router;