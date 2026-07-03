const express = require('express');
const router = express.Router();
const inscriptionController = require('../controllers/inscriptionController');
const { verifierAuth } = require('../middlewares/authMiddleware'); // <-- AJOUT

router.post('/', verifierAuth, inscriptionController.inscrireEleve);
router.get('/', verifierAuth, inscriptionController.getInscriptions);

module.exports = router;