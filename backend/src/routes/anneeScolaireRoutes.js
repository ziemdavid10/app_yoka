const express = require('express');
const router = express.Router();
const anneeController = require('../controllers/anneeScolaireController');
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

router.use(verifierAuth);
router.use(exigerRoles(['SUPERADMIN']));

router.get('/', anneeController.listerAnneesScolaires);
router.post('/', anneeController.creerAnneeScolaire);
router.patch('/:id/activer', anneeController.activerAnneeScolaire);
router.patch('/:id/desactiver', anneeController.desactiverAnneeScolaire);

module.exports = router;