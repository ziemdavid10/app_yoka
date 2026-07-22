const express = require('express');
const router = express.Router();
const classeController = require('../controllers/classeController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// Routes principales des classes
router.post('/', verifierAuth, classeController.creerClasse);
router.get('/', verifierAuth, classeController.getClasses);

// Nouvelles routes pour la gestion des tranches d'une classe spécifique
router.post('/:classe_id/tranches', verifierAuth, classeController.saveTranches);
router.get('/:classe_id/tranches', verifierAuth, classeController.getTranches);

module.exports = router;