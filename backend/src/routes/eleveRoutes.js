const express = require('express');
const router = express.Router();
const eleveController = require('../controllers/eleveController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// Sécurisation de toutes les routes Élèves
router.post('/', verifierAuth, eleveController.creerEleve);
router.get('/', verifierAuth, eleveController.getEleves);

module.exports = router;