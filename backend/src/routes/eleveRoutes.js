const express = require('express');
const router = express.Router();
const eleveController = require('../controllers/eleveController');

// Route : POST http://localhost:5000/api/eleves
router.post('/', eleveController.creerEleve);
// Route : GET http://localhost:5000/api/eleves
router.get('/', eleveController.getEleves);

module.exports = router;