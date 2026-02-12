const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const asyncHandler = require('../middleware/asyncHandler');
const adminController = require('../controllers/adminController');

/*
|--------------------------------------------------------------------------
| GLOBAL ADMIN AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authenticateToken);
router.use(requireAdmin);

/*
|--------------------------------------------------------------------------
| GET PENDING DOCTORS
|--------------------------------------------------------------------------
*/

router.get('/doctors/pending', asyncHandler(adminController.getPendingDoctors));

/*
|--------------------------------------------------------------------------
| APPROVE / REJECT DOCTOR
|--------------------------------------------------------------------------
*/

router.patch('/doctors/:id/approval', asyncHandler(adminController.updateDoctorApproval));

module.exports = router;
