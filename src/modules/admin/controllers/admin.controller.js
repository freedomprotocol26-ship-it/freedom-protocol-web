const adminService = require('../services/admin.service');

/**
 * PATCH /admin/doctors/:id/approve
 */
exports.approveDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await adminService.approveDoctor(id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};
