const express = require('express');
const router = express.Router();
const classeController = require('../controllers/classeController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// CRUD classes
router.post('/', verifierAuth, classeController.creerClasse);
router.get('/', verifierAuth, classeController.getClasses);
router.put('/:id', verifierAuth, classeController.updateClasse);
router.delete('/:id', verifierAuth, classeController.deleteClasse);

// Tranches d'une classe
router.get('/:classe_id/tranches', verifierAuth, classeController.getTranches);
router.post('/:classe_id/tranches', verifierAuth, classeController.saveTranches);

module.exports = router;
