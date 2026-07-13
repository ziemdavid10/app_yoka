const express = require('express');
const router = express.Router();
const etablissementController = require('../controllers/etablissementController');

// Importez vos middlewares de sécurité existants
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

// Verrouillage global de l'accès au niveau SuperAdmin
router.use(verifierAuth);
router.use(exigerRoles(['SUPERADMIN']));

router.get('/', etablissementController.listerEtablissements);
router.post('/', etablissementController.creerEtablissement);

module.exports = router;