const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User.model');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().max(50).optional(),
});

function signToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

async function register(req, res, next) {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const existing = await User.findOne({ email: value.email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create(value);
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, name: user.name, plan: user.plan },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, plan: user.plan },
    });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, email: user.email, name: user.name, plan: user.plan });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };
