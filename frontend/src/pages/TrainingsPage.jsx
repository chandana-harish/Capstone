import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { trainingService } from '../services/api';
import { PlusIcon, MagnifyingGlassIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusColor = {
  published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  ongoing:   'bg-brand-500/20 text-brand-300 border-brand-500/30',
  completed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  draft:     'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const modeColor = {
  online:  'bg-cyan-500/20 text-cyan-300',
  offline: 'bg-orange-500/20 text-orange-300',
  hybrid:  'bg-violet-500/20 text-violet-300',
};

const CATEGORIES = ['', 'technical', 'soft-skills', 'compliance', 'leadership', 'onboarding', 'other'];

export default function TrainingsPage() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState([]);
  const [pagination, setPag]      = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [page, setPage]           = useState(1);
  const [showModal, setModal]     = useState(false);
  const [form, setForm]           = useState({ category: 'technical', mode: 'online', maxCapacity: 30, duration: 8 });
  const [saving, setSaving]       = useState(false);

  const canManage = ['admin', 'trainer'].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search)   params.search   = search;
      if (category) params.category = category;
      const { data } = await trainingService.getAll(params);
      setTrainings(data.data);
      setPag(data.pagination);
    } catch { toast.error('Failed to load trainings'); }
    setLoading(false);
  }, [page, search, category]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await trainingService.create({ ...form, trainerId: user.userId, trainerName: user.email });
      toast.success('Training created!');
      setModal(false);
      setForm({ category: 'technical', mode: 'online', maxCapacity: 30, duration: 8 });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create training');
    }
    setSaving(false);
  };

  const handleEnroll = async (trainingId) => {
    try {
      await trainingService.enroll(trainingId, { userId: user.userId });
      toast.success('Enrolled successfully!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Enrollment failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <AcademicCapIcon className="w-7 h-7 text-brand-400" /> Trainings
          </h1>
          <p className="text-slate-400 text-sm mt-1">{pagination.total ?? 0} total sessions</p>
        </div>
        {canManage && (
          <button id="create-training-btn" onClick={() => setModal(true)} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> New Training
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input id="training-search" type="text" placeholder="Search trainings..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input pl-10" />
        </div>
        <select id="category-filter" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="input w-44">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-52 animate-pulse" />)}
        </div>
      ) : trainings.length === 0 ? (
        <div className="card text-center py-16">
          <AcademicCapIcon className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-lg font-medium">No trainings found</p>
          {canManage && <button onClick={() => setModal(true)} className="btn-primary mt-5 inline-flex">Create First Training</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {trainings.map((t) => {
            const seats = t.maxCapacity - (t.enrollments?.length || 0);
            return (
              <div key={t.trainingId} className="card hover:border-brand-500/40 transition-colors flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-slate-100 leading-snug flex-1">{t.title}</h3>
                  <span className={`badge border flex-shrink-0 ${statusColor[t.status] || ''}`}>{t.status}</span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 flex-1 mb-4">{t.description || 'No description.'}</p>
                <div className="space-y-1.5 text-xs text-slate-400 mb-4">
                  <div className="flex justify-between"><span>Category</span><span className="capitalize text-slate-300">{t.category}</span></div>
                  <div className="flex justify-between"><span>Mode</span><span className={`badge ${modeColor[t.mode] || ''}`}>{t.mode}</span></div>
                  <div className="flex justify-between"><span>Duration</span><span className="text-slate-300">{t.duration}h</span></div>
                  <div className="flex justify-between"><span>Trainer</span><span className="text-slate-300 truncate max-w-[120px]">{t.trainerName}</span></div>
                  <div className="flex justify-between"><span>Seats left</span>
                    <span className={seats <= 5 ? 'text-red-400 font-semibold' : 'text-slate-300'}>{seats} / {t.maxCapacity}</span>
                  </div>
                  <div className="flex justify-between"><span>Start</span><span className="text-slate-300">{new Date(t.startDate).toLocaleDateString()}</span></div>
                </div>
                <div className="flex gap-2 mt-auto pt-3 border-t border-surface-border">
                  <Link to={`/trainings/${t.trainingId}`} className="btn-secondary text-xs flex-1 justify-center">Details</Link>
                  {user?.role === 'trainee' && t.status === 'published' && seats > 0 && (
                    <button onClick={() => handleEnroll(t.trainingId)} className="btn-primary text-xs flex-1 justify-center">Enroll</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary disabled:opacity-40">← Prev</button>
          <span className="btn-secondary cursor-default">Page {page} of {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary disabled:opacity-40">Next →</button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-lg card animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title mb-5">New Training Session</h2>
            <form id="training-form" onSubmit={handleCreate} className="space-y-4">
              <div><label className="label">Title *</label><input className="input" required value={form.title || ''} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description || ''} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label>
                  <select className="input" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                    {['technical','soft-skills','compliance','leadership','onboarding','other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Mode</label>
                  <select className="input" value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value})}>
                    {['online','offline','hybrid'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="label">Start Date *</label><input type="date" className="input" required value={form.startDate || ''} onChange={(e) => setForm({...form, startDate: e.target.value})} /></div>
                <div><label className="label">End Date *</label><input type="date" className="input" required value={form.endDate || ''} onChange={(e) => setForm({...form, endDate: e.target.value})} /></div>
                <div><label className="label">Duration (hrs) *</label><input type="number" min="1" className="input" required value={form.duration} onChange={(e) => setForm({...form, duration: Number(e.target.value)})} /></div>
                <div><label className="label">Max Capacity *</label><input type="number" min="1" className="input" required value={form.maxCapacity} onChange={(e) => setForm({...form, maxCapacity: Number(e.target.value)})} /></div>
              </div>
              <div><label className="label">Location</label><input className="input" placeholder="Room / URL" value={form.location || ''} onChange={(e) => setForm({...form, location: e.target.value})} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button id="training-save-btn" type="submit" disabled={saving} className="btn-primary">{saving ? 'Creating...' : 'Create Training'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
