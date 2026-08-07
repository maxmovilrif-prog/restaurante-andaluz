const express = require('express');
const controller = require('../controllers/reports.controller');

const router = express.Router();

router.get('/usage.csv', controller.usageCsv);
router.get('/invoices.csv', controller.invoicesCsv);
router.get('/invoices.pdf', controller.invoicesPdf);

module.exports = router;
