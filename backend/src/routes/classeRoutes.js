const express = require('express');
const router = express.Router();
const classeController = require('../controllers/classeController');
const { verifierAuth } = require('../middlewares/authMiddleware'); // <-- AJOUT

router.post('/', verifierAuth, classeController.creerClasse);
router.get('/', verifierAuth, classeController.getClasses);

module.exports = router;