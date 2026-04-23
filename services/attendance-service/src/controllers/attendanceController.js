'use strict';

const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const axios = require('axios');
const Attendance = require('../models/Attendance');
const logger = require('../config/logger');

// ── Helpers: cross-service lookups ─────────────────────────────────────────────
const getTrainingInfo = async (trainingId) => {
  const url = process.env.TRAINING_SERVICE_URL;
  if (!url) return { trainingId, title: 'Training', status: 'published' };
  const res = await axios.get(`${url}/api/trainings/internal/validate/${trainingId}`, { timeout: 3000 });
  return res.data.data;
};

const getUserInfo = async (userId) => {
  const url = process.env.USER_SERVICE_URL;
  if (!url) return { userId, fullName: 'User', email: '' };
  const res = await axios.get(`${url}/api/users/internal/validate/${userId}`, { timeout: 3000 });
  return res.data.data;
};

// ── Mark Attendance ────────────────────────────────────────────────────────────
const markAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { trainingId, userId, date, status, remarks, sessionLog } = req.body;

    // Validate training
    let trainingInfo;
    try {
      trainingInfo = await getTrainingInfo(trainingId);
    } catch {
      return res.status(404).json({ success: false, message: 'Training not found or unavailable' });
    }

    // Validate user
    let userInfo;
    try {
      userInfo = await getUserInfo(userId);
    } catch {
      return res.status(404).json({ success: false, message: 'User not found or inactive' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const record = await Attendance.create({
      attendanceId: uuidv4(),
      trainingId,
      trainingTitle: trainingInfo.title,
      userId,
      userName: userInfo.fullName,
      userEmail: userInfo.email,
      date: attendanceDate,
      status: status || 'present',
      sessionLog: sessionLog || {},
      markedBy: req.user.userId,
      remarks: remarks || '',
    });

    logger.info(`Attendance marked: user=${userId} training=${trainingId} status=${status}`);
    return res.status(201).json({ success: true, message: 'Attendance marked successfully', data: record });
  } catch (error) {
    next(error);
  }
};

// ── Bulk mark attendance (trainer marks entire session) ───────────────────────
const bulkMarkAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { trainingId, date, records } = req.body;
    // records: [{ userId, status, remarks }]

    let trainingInfo;
    try {
      trainingInfo = await getTrainingInfo(trainingId);
    } catch {
      return res.status(404).json({ success: false, message: 'Training not found or unavailable' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const markedBy = req.user.userId;

    const results = { created: [], updated: [], errors: [] };

    await Promise.allSettled(
      records.map(async ({ userId, status, remarks }) => {
        try {
          let userInfo;
          try {
            userInfo = await getUserInfo(userId);
          } catch {
            userInfo = { userId, fullName: 'Unknown User', email: '' };
          }

          const filter = { trainingId, userId, date: attendanceDate };
          const update = {
            $setOnInsert: {
              attendanceId: uuidv4(),
              trainingTitle: trainingInfo.title,
              userName: userInfo.fullName,
              userEmail: userInfo.email,
            },
            $set: { status, remarks: remarks || '', markedBy },
          };

          const record = await Attendance.findOneAndUpdate(filter, update, {
            upsert: true, new: true, setDefaultsOnInsert: true,
          });

          results.created.push(record.attendanceId);
        } catch (err) {
          results.errors.push({ userId, error: err.message });
        }
      })
    );

    logger.info(`Bulk attendance: training=${trainingId} total=${records.length} errors=${results.errors.length}`);
    return res.status(200).json({ success: true, message: 'Bulk attendance processed', data: results });
  } catch (error) {
    next(error);
  }
};

// ── Get attendance by training ─────────────────────────────────────────────────
const getAttendanceByTraining = async (req, res, next) => {
  try {
    const { trainingId } = req.params;
    const { date, status, page = 1, limit = 50 } = req.query;

    const filter = { trainingId };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: d, $lte: dEnd };
    }
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Attendance.find(filter).skip(skip).limit(Number(limit)).sort({ date: -1 }),
      Attendance.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: records,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get attendance by user ─────────────────────────────────────────────────────
const getAttendanceByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Users can only see their own records; admin/trainer can see anyone
    if (req.user.role === 'trainee' && req.user.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { trainingId, status, page = 1, limit = 50 } = req.query;
    const filter = { userId };
    if (trainingId) filter.trainingId = trainingId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      Attendance.find(filter).skip(skip).limit(Number(limit)).sort({ date: -1 }),
      Attendance.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: records,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ── Update attendance record ───────────────────────────────────────────────────
const updateAttendance = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { attendanceId } = req.params;
    const { status, remarks, sessionLog } = req.body;

    const record = await Attendance.findOneAndUpdate(
      { attendanceId },
      { status, remarks, sessionLog, markedBy: req.user.userId },
      { new: true, runValidators: true }
    );

    if (!record) return res.status(404).json({ success: false, message: 'Attendance record not found' });

    logger.info(`Attendance updated: ${attendanceId}`);
    return res.status(200).json({ success: true, message: 'Attendance updated successfully', data: record });
  } catch (error) {
    next(error);
  }
};

// ── Get attendance summary stats per training ─────────────────────────────────
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { trainingId } = req.params;
    const summary = await Attendance.aggregate([
      { $match: { trainingId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    summary.forEach(({ _id, count }) => {
      if (stats[_id] !== undefined) stats[_id] = count;
      stats.total += count;
    });

    return res.status(200).json({ success: true, data: { trainingId, ...stats } });
  } catch (error) {
    next(error);
  }
};

module.exports = { markAttendance, bulkMarkAttendance, getAttendanceByTraining, getAttendanceByUser, updateAttendance, getAttendanceSummary };
