const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { verifierAuth, exigerRoles } = require('../middlewares/authMiddleware');

// Route sécurisée : Seul le SUPERADMIN global peut consulter l'historique d'audit
router.get('/global-logs', verifierAuth, exigerRoles(['SUPERADMIN']), auditController.getJournalGlobal);

module.exports = router;