const express = require('express');
const router = express.Router();

const { getParametres, updateParametres } = require('../controllers/parametresController');
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

// GET  /api/parametres  -> charge la configuration système courante
router.get('/', verifierAuth, exigerRoles(['SUPERADMIN']), getParametres);

// PUT  /api/parametres  -> met à jour la configuration système
router.put('/', verifierAuth, exigerRoles(['SUPERADMIN']), updateParametres);

module.exports = router;