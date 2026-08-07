const express = require('express');
const controller = require('../controllers/auth.controller');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.post('/admin/login', controller.adminLogin);
router.post('/admin/change-pin', requireAdmin, controller.changeAdminPin);
router.get('/admin/session', requireAdmin, controller.verifySession);

module.exports = router;
