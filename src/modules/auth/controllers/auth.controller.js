const authService = require('../services/auth.service');

/**
 * POST /auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await authService.login(email, password);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/apply-doctor
 */
exports.applyDoctor = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await authService.applyDoctor(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};
