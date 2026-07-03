const express = require('express');
const router = express.Router();
const eleveController = require('../controllers/eleveController');
const { verifierAuth } = require('../middlewares/authMiddleware'); // <-- AJOUT

// Ajout de verifierAuth avant chaque méthode de contrôleur
router.post('/', verifierAuth, eleveController.creerEleve);
router.get('/', verifierAuth, eleveController.getEleves);

module.exports = router;