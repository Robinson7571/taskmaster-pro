const express = require('express');
const Team = require('../models/Team');
const Task = require('../models/Task');
const User = require('../models/User');
const protect = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET /api/teams — teams where current user is a member
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email');
    res.json({ success: true, teams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/teams — create team; creator becomes admin
router.post('/', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
    const team = await Team.create({
      name: name.trim(),
      description: description || '',
      color: color || '#6366f1',
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    const populated = await team.populate('members.user', 'name email');
    res.status(201).json({ success: true, team: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/teams/:id — admin only; nullify team tasks first
router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    if (!member || member.role !== 'admin') return res.status(403).json({ success: false, message: 'Solo un administrador puede eliminar el equipo' });
    await Task.updateMany({ team: team._id }, { $set: { team: null } });
    await team.deleteOne();
    res.json({ success: true, message: 'Equipo eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/teams/:id/members — admin only; invite by email
router.post('/:id/members', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    const member = team.members.find(m => String(m.user) === String(req.user._id));
    if (!member || member.role !== 'admin') return res.status(403).json({ success: false, message: 'Solo un administrador puede agregar miembros' });
    const userToAdd = await User.findOne({ email: req.body.email });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'No existe un usuario con ese email' });
    const alreadyMember = team.members.some(m => String(m.user) === String(userToAdd._id));
    if (alreadyMember) return res.status(400).json({ success: false, message: 'El usuario ya es miembro del equipo' });
    team.members.push({ user: userToAdd._id, role: 'member' });
    await team.save();
    const populated = await team.populate('members.user', 'name email');
    res.json({ success: true, team: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/teams/:id/members/:userId — admin only; blocks if last admin
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    const requester = team.members.find(m => String(m.user) === String(req.user._id));
    if (!requester || requester.role !== 'admin') return res.status(403).json({ success: false, message: 'Solo un administrador puede eliminar miembros' });
    const targetMember = team.members.find(m => String(m.user) === String(req.params.userId));
    if (!targetMember) return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    if (targetMember.role === 'admin') {
      const adminCount = team.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ success: false, message: 'No se puede eliminar al único administrador' });
    }
    team.members = team.members.filter(m => String(m.user) !== String(req.params.userId));
    await team.save();
    const populated = await team.populate('members.user', 'name email');
    res.json({ success: true, team: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/teams/:id/members/:userId — admin only; change role
router.put('/:id/members/:userId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Equipo no encontrado' });
    const requester = team.members.find(m => String(m.user) === String(req.user._id));
    if (!requester || requester.role !== 'admin') return res.status(403).json({ success: false, message: 'Solo un administrador puede cambiar roles' });
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ success: false, message: 'Rol inválido' });
    const targetMember = team.members.find(m => String(m.user) === String(req.params.userId));
    if (!targetMember) return res.status(404).json({ success: false, message: 'Miembro no encontrado' });
    if (targetMember.role === 'admin' && role === 'member') {
      const adminCount = team.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) return res.status(400).json({ success: false, message: 'No se puede degradar al único administrador' });
    }
    targetMember.role = role;
    await team.save();
    const populated = await team.populate('members.user', 'name email');
    res.json({ success: true, team: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
