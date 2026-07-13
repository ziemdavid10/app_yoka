const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 🟢 Correction ici : on importe "verifierAuth" qui est le vrai nom exporté
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

// const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);

// 🟢 Correction ici : utilisation de verifierAuth
router.get('/admins', verifierAuth, exigerRoles(['SUPERADMIN']), authController.listerTousLesAdmins);

module.exports = router;