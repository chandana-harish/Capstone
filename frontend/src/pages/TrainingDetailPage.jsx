import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trainingService, attendanceService } from '../services/api';
import { ArrowLeftIcon, UsersIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusColor = {
  published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  ongoing:   'bg-brand-500/20 text-brand-300 border-brand-500/30',
  completed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  draft:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const enrollColor = {
  enrolled:  'bg-brand-500/20 text-brand-300',
  completed: 'bg-emerald-500/20 text-emerald-300',
  dropped:   'bg-red-500/20 text-red-300',
};

export default function TrainingDetailPage() {
  const { trainingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [training, setTraining] = useState(null);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(false);

  const canManage = ['admin', 'trainer'].includes(user?.role);

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, sRes] = await Promise.allSettled([
          trainingService.getById(trainingId),
          attendanceService.getSummary(trainingId),
        ]);
        if (tRes.status === 'fulfilled') setTraining(tRes.value.data.data);
        if (sRes.status === 'fulfilled') setSummary(sRes.value.data.data);
      } catch { toast.error('Failed to load training'); }
      setLoading(false);
    };
    load();
  }, [trainingId]);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const { data } = await trainingService.update(trainingId, { status: newStatus });
      setTraining(data.data);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
    setUpdating(false);
  };

  const handleUnenroll = async (userId) => {
    try {
      await trainingService.unenroll(trainingId, { userId });
      const { data } = await trainingService.getById(trainingId);
      setTraining(data.data);
      toast.success('User unenrolled');
    } catch (err) { toast.error(err.response?.data?.message || 'Unenroll failed'); }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-48 bg-surface-card rounded" />
      <div className="card h-64" />
    </div>
  );

  if (!training) return (
    <div className="card text-center py-16">
      <p className="text-slate-400">Training not found.</p>
      <button onClick={() => navigate('/trainings')} className="btn-secondary mt-4 inline-flex">← Back</button>
    </div>
  );

  const seats = training.maxCapacity - (training.enrollments?.length || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/trainings')} className="btn-secondary p-2">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <h1 className="page-title flex-1 truncate">{training.title}</h1>
        <span className={`badge border ${statusColor[training.status] || ''}`}>{training.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="section-title mb-4">Overview</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">{training.description || 'No description provided.'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Category',  value: training.category },
                { label: 'Mode',      value: training.mode },
                { label: 'Duration',  value: `${training.duration}h` },
                { label: 'Location',  value: training.location || 'N/A' },
                { label: 'Trainer',   value: training.trainerName },
                { label: 'Start Date',value: new Date(training.startDate).toLocaleDateString() },
                { label: 'End Date',  value: new Date(training.endDate).toLocaleDateString() },
                { label: 'Capacity',  value: `${seats} seats left / ${training.maxCapacity}` },
                { label: 'Enrolled',  value: training.enrollments?.length || 0 },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-slate-200 capitalize font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Enrollments */}
          {canManage && (
            <div className="card">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-brand-400" />
                Enrollments ({training.enrollments?.length || 0})
              </h2>
              {!training.enrollments?.length ? (
                <p className="text-slate-500 text-sm">No enrollments yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-surface-border">
                      <th className="table-header">User ID</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Enrolled At</th>
                      <th className="table-header">Action</th>
                    </tr></thead>
                    <tbody className="divide-y divide-surface-border">
                      {training.enrollments.map((e) => (
                        <tr key={e.userId} className="hover:bg-surface-hover">
                          <td className="table-cell font-mono text-xs">{e.userId}</td>
                          <td className="table-cell"><span className={`badge ${enrollColor[e.status] || ''}`}>{e.status}</span></td>
                          <td className="table-cell text-slate-400">{new Date(e.enrolledAt).toLocaleDateString()}</td>
                          <td className="table-cell">
                            {e.status === 'enrolled' && (
                              <button onClick={() => handleUnenroll(e.userId)} className="text-xs text-red-400 hover:text-red-300">Unenroll</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: actions + attendance summary */}
        <div className="space-y-4">
          {canManage && (
            <div className="card">
              <h2 className="section-title mb-4">Manage Status</h2>
              <div className="space-y-2">
                {['draft','published','ongoing','completed','cancelled'].map((s) => (
                  <button
                    key={s}
                    disabled={updating || training.status === s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full btn-secondary justify-center capitalize text-sm ${training.status === s ? 'border-brand-500/60 text-brand-300' : ''}`}
                  >
                    {training.status === s ? `✓ ${s}` : s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {summary && (
            <div className="card">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-brand-400" /> Attendance Summary
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Present', value: summary.present, color: 'text-emerald-400' },
                  { label: 'Absent',  value: summary.absent,  color: 'text-red-400' },
                  { label: 'Late',    value: summary.late,    color: 'text-yellow-400' },
                  { label: 'Excused', value: summary.excused, color: 'text-blue-400' },
                  { label: 'Total',   value: summary.total,   color: 'text-white font-semibold' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className={color}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
