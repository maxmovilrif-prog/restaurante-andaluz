const express = require('express');
const controller = require('../controllers/staffConsumption.controller');

const router = express.Router();

router.get('/items', controller.listConsumableItems);
router.post('/consume', controller.consume);

module.exports = router;
