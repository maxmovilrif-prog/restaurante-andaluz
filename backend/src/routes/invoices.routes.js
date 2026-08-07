const express = require('express');
const multer = require('multer');
const controller = require('../controllers/invoices.controller');
const parseController = require('../controllers/invoiceParse.controller');
const asyncHandler = require('../utils/asyncHandler');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function handleUpload(req, res, next) {
  upload.single('invoice')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'El PDF supera el tamaño máximo permitido (10 MB).' : 'No se ha podido procesar el archivo subido.';
      return res.status(400).json({ error: message });
    }
    if (err) return next(err);
    next();
  });
}

const router = express.Router();

router.get('/', controller.list);
router.get('/by-supplier', controller.bySupplier);
router.post('/parse-pdf', handleUpload, asyncHandler(parseController.parsePdf));
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);
router.delete('/:id', controller.remove);

module.exports = router;
