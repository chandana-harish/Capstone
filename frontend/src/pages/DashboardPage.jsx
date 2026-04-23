import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trainingService, userService, attendanceService } from '../services/api';
import {
  AcademicCapIcon, UsersIcon, ClipboardDocumentCheckIcon,
  CalendarDaysIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ label, value, Icon, color, loading }) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
      {loading ? (
        <div className="h-7 w-16 bg-surface-border rounded animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold text-white mt-0.5">{value ?? '—'}</p>
      )}
    </div>
  </div>
);

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [stats, setStats]         = useState({});
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, uRes] = await Promise.allSettled([
          trainingService.getAll({ limit: 5, status: 'published' }),
          userService.getAll({ limit: 1 }),
        ]);

        const tData = tRes.status === 'fulfilled' ? tRes.value.data : { data: [], pagination: {} };
        const uData = uRes.status === 'fulfilled' ? uRes.value.data : { pagination: {} };

        setTrainings(tData.data || []);
        setStats({
          trainings: tData.pagination?.total ?? tData.data?.length ?? 0,
          users: uData.pagination?.total ?? 0,
        });
      } catch { /* non-critical */ }
      setLoading(false);
    };
    load();
  }, []);

  const statusColor = {
    published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    ongoing:   'bg-brand-500/20 text-brand-300 border-brand-500/30',
    completed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    draft:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 p-6 shadow-2xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative">
          <p className="text-brand-200 text-sm font-medium">Good day 👋</p>
          <h1 className="text-2xl font-bold text-white mt-1">
            {profile ? `${profile.firstName} ${profile.lastName}` : user?.email}
          </h1>
          <p className="text-brand-200 text-sm mt-1 capitalize">
            {profile?.designation || user?.role} · {profile?.department || 'Training Management System'}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Trainings" value={stats.trainings} Icon={AcademicCapIcon}  color="bg-brand-600"         loading={loading} />
        <StatCard label="Total Users"     value={stats.users}     Icon={UsersIcon}         color="bg-purple-600"        loading={loading} />
        <StatCard label="Active Sessions" value={trainings.filter(t => t.status === 'ongoing').length} Icon={CalendarDaysIcon} color="bg-emerald-600" loading={loading} />
        <StatCard label="Your Role"       value={user?.role}      Icon={ArrowTrendingUpIcon} color="bg-amber-600"       loading={false} />
      </div>

      {/* Recent Trainings */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="section-title flex items-center gap-2">
            <AcademicCapIcon className="w-5 h-5 text-brand-400" />
            Recent Published Trainings
          </h2>
          <Link to="/trainings" className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
            ))}
          </div>
        ) : trainings.length === 0 ? (
          <div className="text-center py-12">
            <AcademicCapIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No published trainings yet.</p>
            {['admin', 'trainer'].includes(user?.role) && (
              <Link to="/trainings" className="btn-primary mt-4 inline-flex">Create Training</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="table-header">Title</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Trainer</th>
                  <th className="table-header">Start Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Seats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {trainings.map((t) => (
                  <tr key={t.trainingId} className="hover:bg-surface-hover transition-colors">
                    <td className="table-cell">
                      <Link to={`/trainings/${t.trainingId}`} className="text-brand-300 hover:text-brand-200 font-medium">
                        {t.title}
                      </Link>
                    </td>
                    <td className="table-cell capitalize">{t.category}</td>
                    <td className="table-cell">{t.trainerName}</td>
                    <td className="table-cell">{new Date(t.startDate).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <span className={`badge border ${statusColor[t.status] || ''}`}>{t.status}</span>
                    </td>
                    <td className="table-cell">{t.availableSeats ?? (t.maxCapacity - (t.enrollments?.length || 0))} left</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
