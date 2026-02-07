/**
 * Freedom Protocol - Authentication Service
 * Business logic for user authentication and token management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const BaseError = require('../errors/baseError');
const userRepository = require('../repositories/user.repository');
const refreshTokenRepository = require('../repositories/refreshToken.repository');

/**
 * Login user with email and password
 */
const login = async (email, password) => {
  try {
    if (!email || !password) {
      throw new BaseError(
        'Email and password are required',
        400,
        'MISSING_CREDENTIALS'
      );
    }

    const user = await userRepository.getUserByEmail(email);

    if (!user) {
      throw new BaseError(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    if (!user.is_active) {
      throw new BaseError(
        'Account is inactive',
        403,
        'ACCOUNT_INACTIVE'
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new BaseError(
        'Invalid credentials',
        401,
        'INVALID_CREDENTIALS'
      );
    }

    const tokenPayload = {
      user_id: user.id,
      role: user.role,
      facility_id: user.facility_id || null,
      doctor_id: user.doctor_id || null
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: authConfig.accessTokenTTL }
    );

    const refreshToken = jwt.sign(
      { user_id: user.id, type: 'refresh' },
      process.env.JWT_SECRET,
      { expiresIn: authConfig.refreshTokenTTL }
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await refreshTokenRepository.createRefreshToken({
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        facilityId: user.facility_id,
        doctorId: user.doctor_id
      }
    };
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }

    console.error('Login service error:', error);
    throw new BaseError(
      'Authentication failed',
      500,
      'AUTH_ERROR'
    );
  }
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    if (!refreshToken) {
      throw new BaseError(
        'Refresh token is required',
        400,
        'MISSING_REFRESH_TOKEN'
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new BaseError(
        'Invalid refresh token',
        401,
        'INVALID_REFRESH_TOKEN'
      );
    }

    const storedToken = await refreshTokenRepository.getRefreshToken(refreshToken);

    if (!storedToken) {
      throw new BaseError(
        'Refresh token not found',
        401,
        'REFRESH_TOKEN_NOT_FOUND'
      );
    }

    const user = await userRepository.getUserById(decoded.user_id);

    if (!user || !user.is_active) {
      throw new BaseError(
        'User not found or inactive',
        401,
        'USER_INVALID'
      );
    }

    const tokenPayload = {
      user_id: user.id,
      role: user.role,
      facility_id: user.facility_id || null,
      doctor_id: user.doctor_id || null
    };

    const newAccessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { expiresIn: authConfig.accessTokenTTL }
    );

    return { accessToken: newAccessToken };
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }

    console.error('Refresh token error:', error);
    throw new BaseError(
      'Token refresh failed',
      500,
      'REFRESH_ERROR'
    );
  }
};

/**
 * Logout
 */
const logout = async (refreshToken) => {
  try {
    if (!refreshToken) {
      throw new BaseError(
        'Refresh token is required',
        400,
        'MISSING_REFRESH_TOKEN'
      );
    }

    await refreshTokenRepository.revokeRefreshToken(refreshToken);

    return { success: true };
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }

    console.error('Logout error:', error);
    throw new BaseError(
      'Logout failed',
      500,
      'LOGOUT_ERROR'
    );
  }
};

module.exports = {
  login,
  refreshAccessToken,
  logout
};
