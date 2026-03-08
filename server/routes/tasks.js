const express = require('express');
const Task = require('../models/Task');
const Team = require('../models/Team');
const protect = require('../middleware/auth');
const router = express.Router();

router.use(protect);

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    let query;
    if (req.query.team) {
      // Verify user is a member of this team
      const team = await Team.findOne({ _id: req.query.team, 'members.user': req.user._id });
      if (!team) return res.status(403).json({ success: false, message: 'No eres miembro de este equipo' });
      query = { team: req.query.team };
    } else {
      query = {
        team: null,
        $or: [
          { createdBy: req.user._id },
          { assignee: req.user._id }
        ]
      };
    }
    const tasks = await Task.find(query)
      .populate('assignee', 'name email role')
      .populate('comments.user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    if (req.body.team) {
      const team = await Team.findOne({ _id: req.body.team, 'members.user': req.user._id });
      if (!team) return res.status(403).json({ success: false, message: 'No eres miembro de este equipo' });
    }
    req.body.createdBy = req.user._id;
    const task = await Task.create(req.body);
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('assignee', 'name email role');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }

    res.json({ success: true, message: 'Tarea eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }

    task.comments.push({
      user: req.user._id,
      text: req.body.text
    });

    await task.save();
    const populated = await task.populate('comments.user', 'name email');

    res.json({ success: true, comments: populated.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
