const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const protect = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }]
    }).populate('members', 'name email role');
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    req.body.members = [req.user._id, ...(req.body.members || [])];
    const project = await Project.create(req.body);
    const populated = await project.populate('members', 'name email role');
    res.status(201).json({ success: true, project: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('members', 'name email role');
    if (!project) return res.status(404).json({ success: false, message: 'Proyecto no encontrado' });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Proyecto eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/projects/:id/members — add member by email
router.post('/:id/members', async (req, res) => {
  try {
    const member = await User.findOne({ email: req.body.email });
    if (!member) return res.status(404).json({ success: false, message: 'No existe un usuario con ese email' });
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: member._id } },
      { new: true }
    ).populate('members', 'name email role');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/projects/:id/members/:userId — remove member
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.params.userId } },
      { new: true }
    ).populate('members', 'name email role');
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
