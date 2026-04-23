'use strict';

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'trainer', 'trainee'], default: 'trainee' },
    department: { type: String, trim: true, default: null },
    designation: { type: String, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    profilePicture: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    managerId: { type: String, default: null },
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
