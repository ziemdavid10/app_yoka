const express = require('express');
const router = express.Router();
const etablissementController = require('../controllers/etablissementController');
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

router.use(verifierAuth);
router.use(exigerRoles(['SUPERADMIN']));

router.get('/', etablissementController.listerEtablissements);
router.post('/', etablissementController.creerEtablissement);
router.put('/:id', etablissementController.modifierEtablissement);
router.patch('/:id/statut', etablissementController.changerStatutEtablissement);
router.delete('/:id', etablissementController.supprimerEtablissement);

module.exports = router;