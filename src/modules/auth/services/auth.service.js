const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');

async function login(email, password) {
  const user = await authRepository.getUserByEmail(email);

  if (!user) {
    return {
      success: false,
      message: 'Invalid credentials',
    };
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    return {
      success: false,
      message: 'Invalid credentials',
    };
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      approval_status: user.approval_status,
    },
  };
}

async function applyDoctor(userId) {
  const updated = await authRepository.updateDoctorApprovalStatus(
    userId,
    'pending'
  );

  if (!updated) {
    return {
      success: false,
      message: 'Doctor application failed or invalid role',
    };
  }

  return {
    success: true,
    message: 'Doctor application submitted for approval',
    data: updated,
  };
}

module.exports = {
  login,
  applyDoctor,
};
