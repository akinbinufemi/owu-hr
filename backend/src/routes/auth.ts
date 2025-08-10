import { Router } from 'express';
import { login, logout, verifyToken, refreshToken, register, changePassword } from '../controllers/authController';
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
router.post('/change-password', authenticateToken, changePassword);

export default router;