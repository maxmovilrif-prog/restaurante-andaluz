const express = require('express');
const controller = require('../controllers/inventory.controller');

const router = express.Router();

router.get('/', controller.list);
router.get('/movements', controller.movements);
router.get('/:id', controller.getOne);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.post('/:id/adjust', controller.adjust);

module.exports = router;
