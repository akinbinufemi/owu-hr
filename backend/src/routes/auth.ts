import { Router } from 'express';
import { login, logout, verifyToken, refreshToken, register, changePassword, getPasswordInfo, updateProfile, getPasswordExpiry } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { loginRateLimit, loginSpeedLimit, strictRateLimit } from '../middleware/rateLimiting';

const router = Router();

// Public routes with rate limiting
router.post('/login', loginRateLimit, loginSpeedLimit, login);
router.post('/register', strictRateLimit, register);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/verify', authenticateToken, verifyToken);
router.post('/refresh', authenticateToken, refreshToken);
router.put('/profile', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.get('/password-info', authenticateToken, getPasswordInfo);
router.get('/password-expiry', authenticateToken, getPasswordExpiry);

export default router;