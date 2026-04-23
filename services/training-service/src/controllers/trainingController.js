'use strict';

const { v4: uuidv4 } = require('uuid');
const { validationResult } = require('express-validator');
const Training = require('../models/Training');
const logger = require('../config/logger');
const axios = require('axios');

// ── Helper: validate trainer exists in user-service ────────────────────────────
const validateTrainer = async (trainerId) => {
  const userServiceUrl = process.env.USER_SERVICE_URL;
  if (!userServiceUrl) return { userId: trainerId, fullName: 'Trainer' };
  const response = await axios.get(`${userServiceUrl}/api/users/internal/validate/${trainerId}`, { timeout: 3000 });
  return response.data.data;
};

// ── Create Training ────────────────────────────────────────────────────────────
const createTraining = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const { title, description, category, mode, startDate, endDate, duration, maxCapacity, location, prerequisites, tags, materials } = req.body;

    const trainerId = req.body.trainerId || req.user.userId;

    let trainerName = req.body.trainerName || req.user.email;
    try {
      const trainer = await validateTrainer(trainerId);
      trainerName = trainer.fullName || trainerName;
    } catch (err) {
      logger.warn(`Could not validate trainer ${trainerId}: ${err.message}`);
    }

    const training = await Training.create({
      trainingId: uuidv4(),
      title, description, category, mode, startDate, endDate,
      duration, maxCapacity, location, prerequisites, tags,
      materials: materials || [],
      trainerId,
      trainerName,
      status: 'published',
    });

    logger.info(`Training created: ${training.trainingId}`);
    return res.status(201).json({ success: true, message: 'Training created successfully', data: training });
  } catch (error) {
    next(error);
  }
};

// ── Get all trainings ─────────────────────────────────────────────────────────
const getAllTrainings = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, status, mode, search, trainerId } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (mode) filter.mode = mode;
    if (trainerId) filter.trainerId = trainerId;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];

    const skip = (Number(page) - 1) * Number(limit);
    const [trainings, total] = await Promise.all([
      Training.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Training.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: trainings,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ── Get training by trainingId ─────────────────────────────────────────────────
const getTrainingById = async (req, res, next) => {
  try {
    const training = await Training.findOne({ trainingId: req.params.trainingId });
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    return res.status(200).json({ success: true, data: training });
  } catch (error) {
    next(error);
  }
};

// ── Update training ────────────────────────────────────────────────────────────
const updateTraining = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });

    const allowed = ['title', 'description', 'category', 'mode', 'status', 'startDate', 'endDate', 'duration', 'maxCapacity', 'location', 'prerequisites', 'tags', 'materials'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const training = await Training.findOneAndUpdate(
      { trainingId: req.params.trainingId },
      updates,
      { new: true, runValidators: true }
    );
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });

    logger.info(`Training updated: ${training.trainingId}`);
    return res.status(200).json({ success: true, message: 'Training updated successfully', data: training });
  } catch (error) {
    next(error);
  }
};

// ── Delete training ────────────────────────────────────────────────────────────
const deleteTraining = async (req, res, next) => {
  try {
    const training = await Training.findOneAndUpdate(
      { trainingId: req.params.trainingId },
      { status: 'cancelled' },
      { new: true }
    );
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    logger.info(`Training cancelled: ${training.trainingId}`);
    return res.status(200).json({ success: true, message: 'Training cancelled successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Enroll user in training ───────────────────────────────────────────────────
const enrollUser = async (req, res, next) => {
  try {
    const { trainingId } = req.params;
    const userId = req.body.userId || req.user.userId;

    const training = await Training.findOne({ trainingId });
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    if (training.status !== 'published' && training.status !== 'ongoing') {
      return res.status(400).json({ success: false, message: 'Enrollment is only open for published or ongoing trainings' });
    }
    if (training.enrollments.length >= training.maxCapacity) {
      return res.status(409).json({ success: false, message: 'Training is at full capacity' });
    }
    const alreadyEnrolled = training.enrollments.some((e) => e.userId === userId);
    if (alreadyEnrolled) {
      return res.status(409).json({ success: false, message: 'User is already enrolled in this training' });
    }

    // Validate user exists
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL;
      if (userServiceUrl) {
        await axios.get(`${userServiceUrl}/api/users/internal/validate/${userId}`, { timeout: 3000 });
      }
    } catch (err) {
      return res.status(404).json({ success: false, message: 'User not found or inactive' });
    }

    training.enrollments.push({ userId, enrolledAt: new Date(), status: 'enrolled' });
    await training.save();

    logger.info(`User ${userId} enrolled in training ${trainingId}`);
    return res.status(200).json({ success: true, message: 'Enrolled successfully', data: { trainingId, userId } });
  } catch (error) {
    next(error);
  }
};

// ── Unenroll user ──────────────────────────────────────────────────────────────
const unenrollUser = async (req, res, next) => {
  try {
    const { trainingId } = req.params;
    const userId = req.body.userId || req.user.userId;

    const training = await Training.findOne({ trainingId });
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });

    const idx = training.enrollments.findIndex((e) => e.userId === userId);
    if (idx === -1) return res.status(404).json({ success: false, message: 'User not enrolled in this training' });

    training.enrollments[idx].status = 'dropped';
    await training.save();

    logger.info(`User ${userId} unenrolled from training ${trainingId}`);
    return res.status(200).json({ success: true, message: 'Unenrolled successfully' });
  } catch (error) {
    next(error);
  }
};

// ── Internal: validate training exists ────────────────────────────────────────
const validateTraining = async (req, res, next) => {
  try {
    const training = await Training.findOne({ trainingId: req.params.trainingId });
    if (!training) return res.status(404).json({ success: false, message: 'Training not found' });
    return res.status(200).json({
      success: true,
      data: {
        trainingId: training.trainingId,
        title: training.title,
        status: training.status,
        trainerId: training.trainerId,
        startDate: training.startDate,
        endDate: training.endDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTraining, getAllTrainings, getTrainingById, updateTraining, deleteTraining, enrollUser, unenrollUser, validateTraining };
