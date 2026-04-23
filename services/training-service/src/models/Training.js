'use strict';

const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  enrolledAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['enrolled', 'completed', 'dropped'], default: 'enrolled' },
  completedAt: { type: Date, default: null },
}, { _id: false });

const trainingSchema = new mongoose.Schema(
  {
    trainingId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: {
      type: String,
      enum: ['technical', 'soft-skills', 'compliance', 'leadership', 'onboarding', 'other'],
      default: 'other',
    },
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },
    status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'cancelled'], default: 'draft' },
    trainerId: { type: String, required: true, index: true },
    trainerName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    duration: { type: Number, required: true, min: 1, comment: 'Duration in hours' },
    maxCapacity: { type: Number, required: true, min: 1 },
    location: { type: String, trim: true, default: 'Online' },
    prerequisites: [{ type: String }],
    tags: [{ type: String }],
    enrollments: [enrollmentSchema],
    materials: [
      {
        title: { type: String },
        url: { type: String },
        type: { type: String, enum: ['pdf', 'video', 'link', 'doc'] },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

trainingSchema.virtual('enrollmentCount').get(function () {
  return this.enrollments.length;
});

trainingSchema.virtual('availableSeats').get(function () {
  return this.maxCapacity - this.enrollments.length;
});

trainingSchema.set('toJSON', { virtuals: true });

const Training = mongoose.model('Training', trainingSchema);
module.exports = Training;
