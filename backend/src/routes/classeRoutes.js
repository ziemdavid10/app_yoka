const express = require('express');
const router = express.Router();
const classeController = require('../controllers/classeController');

router.post('/', classeController.creerClasse);
router.get('/', classeController.getClasses);

module.exports = router;