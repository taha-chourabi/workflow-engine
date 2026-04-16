const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { sendPendingActivation, sendAccountActivated } = require('../services/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const register = async (req, res) => {
  const { email, password, fullName, department } = req.body;
  const existing = await User.findOne({ where: { email } });
  if (existing) return res.status(400).json({ message: 'Email déjà utilisé' });

  const user = await User.create({
    email,
    password,
    fullName,
    department,
    role: 'EMPLOYEE',
    hierarchyLevel: 1,
    managerId: null,
    isActive: false,
    registrationStatus: 'pending',
  });

  const admin = await User.findOne({ where: { role: 'ADMIN' } });
  if (admin) await sendPendingActivation(email, admin.email);

  res.status(201).json({ message: 'Inscription en attente d activation' });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
  }
  if (!user.isActive) {
    return res.status(401).json({ message: 'Compte non activé' });
  }
  const token = generateToken(user.id);
  res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    token,
  });
};

const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, getMe };