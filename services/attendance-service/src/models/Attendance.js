'use strict';

const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema({
  checkInTime: { type: Date, default: null },
  checkOutTime: { type: Date, default: null },
  durationMinutes: { type: Number, default: 0 },
  notes: { type: String, trim: true, default: '' },
}, { _id: false });

const attendanceSchema = new mongoose.Schema(
  {
    attendanceId: { type: String, required: true, unique: true, index: true },
    trainingId: { type: String, required: true, index: true },
    trainingTitle: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'absent',
    },
    sessionLog: { type: sessionLogSchema, default: () => ({}) },
    markedBy: { type: String, required: true },
    remarks: { type: String, trim: true, default: '' },
  },
  { timestamps: true, versionKey: false }
);

// Compound unique index: one attendance record per user per training per day
attendanceSchema.index({ trainingId: 1, userId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
