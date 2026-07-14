const express = require('express');
const router = express.Router();
const multer = require('multer');
const eleveController = require('../controllers/eleveController');
const { verifierAuth } = require('../middlewares/authMiddleware');

// Multer en mémoire — accepte uniquement .xlsx / .xls
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Format non supporté. Utilisez .xlsx ou .xls'));
  }
});

router.get('/', verifierAuth, eleveController.getEleves);
router.post('/', verifierAuth, eleveController.creerEleve);
router.post('/import-excel', verifierAuth, upload.single('fichier'), eleveController.importerEleves);
router.put('/:id', verifierAuth, eleveController.modifierEleve);
router.delete('/:id', verifierAuth, eleveController.supprimerEleve);

module.exports = router;
