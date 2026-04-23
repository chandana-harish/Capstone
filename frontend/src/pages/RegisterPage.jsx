import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { userService } from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: '', email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', role: 'trainee', department: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // 1. Register in auth-service
      await register({ userId: form.userId, email: form.email, password: form.password, role: form.role });
      // 2. Create profile in user-service (best-effort)
      try {
        await userService.create({
          userId: form.userId, email: form.email,
          firstName: form.firstName, lastName: form.lastName,
          role: form.role, department: form.department,
        });
      } catch { /* profile creation failure is non-blocking */ }
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'userId',      label: 'User ID',        type: 'text',     placeholder: 'e.g. USR001', col: 1 },
    { name: 'email',       label: 'Email',           type: 'email',    placeholder: 'you@company.com', col: 1 },
    { name: 'firstName',   label: 'First Name',      type: 'text',     placeholder: 'John', col: 2 },
    { name: 'lastName',    label: 'Last Name',       type: 'text',     placeholder: 'Doe',  col: 2 },
    { name: 'department',  label: 'Department',      type: 'text',     placeholder: 'Engineering', col: 2 },
    { name: 'password',    label: 'Password',        type: 'password', placeholder: '••••••••', col: 1 },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••', col: 1 },
  ];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-800/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-2xl shadow-brand-900/50 mb-4">
            <AcademicCapIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join the Training Management System</p>
        </div>

        <div className="card">
          <form id="register-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ name, label, type, placeholder, col }) => (
                <div key={name} className={col === 1 ? 'col-span-2' : 'col-span-1'}>
                  <label htmlFor={`reg-${name}`} className="label">{label}</label>
                  <input
                    id={`reg-${name}`}
                    name={name}
                    type={type}
                    placeholder={placeholder}
                    value={form[name]}
                    onChange={handleChange}
                    className="input"
                    required={!['department'].includes(name)}
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label htmlFor="reg-role" className="label">Role</label>
                <select
                  id="reg-role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="trainee">Trainee</option>
                  <option value="trainer">Trainer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
