const express = require('express');
const controller = require('../controllers/staffAdmin.controller');

const router = express.Router();

router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/consumptions/log', controller.log);

module.exports = router;
