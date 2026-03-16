// ── auth.routes.js ────────────────────────────────────────────────
const authRouter = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { register, login, getMe } = require('../controllers/auth.controller');

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, getMe);

module.exports = authRouter;
