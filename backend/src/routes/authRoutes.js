const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

router.post('/login', authController.login);

// Routes sécurisées SuperAdmin
router.post('/register', verifierAuth, exigerRoles(['SUPERADMIN']), authController.register);
router.get('/admins', verifierAuth, exigerRoles(['SUPERADMIN']), authController.listerTousLesAdmins);
router.put('/admins/:id', verifierAuth, exigerRoles(['SUPERADMIN']), authController.modifierAdmin);
router.patch('/admins/:id/statut', verifierAuth, exigerRoles(['SUPERADMIN']), authController.changerStatutAdmin);
router.patch('/admins/:id/reinitialiser-mot-de-passe', verifierAuth, exigerRoles(['SUPERADMIN']), authController.reinitialiserMotDePasseAdmin);
router.delete('/admins/:id', verifierAuth, exigerRoles(['SUPERADMIN']), authController.supprimerAdmin);

module.exports = router;