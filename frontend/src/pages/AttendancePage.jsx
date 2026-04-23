import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceService, trainingService } from '../services/api';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const statusColor = {
  present: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  absent:  'bg-red-500/20 text-red-300 border-red-500/30',
  late:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  excused: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords]     = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [trainingId, setTid]      = useState('');
  const [showModal, setModal]     = useState(false);
  const [form, setForm]           = useState({ trainingId: '', userId: '', date: '', status: 'present', remarks: '' });
  const [saving, setSaving]       = useState(false);

  const canManage = ['admin', 'trainer'].includes(user?.role);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      if (canManage && trainingId) {
        const { data } = await attendanceService.getByTraining(trainingId, { limit: 100 });
        setRecords(data.data);
      } else if (!canManage) {
        const { data } = await attendanceService.getByUser(user.userId, { limit: 100 });
        setRecords(data.data);
      } else {
        setRecords([]);
      }
    } catch { toast.error('Failed to load attendance'); }
    setLoading(false);
  }, [trainingId, canManage, user.userId]);

  useEffect(() => {
    const loadTrainings = async () => {
      try {
        const { data } = await trainingService.getAll({ limit: 100 });
        setTrainings(data.data);
        if (data.data.length > 0 && canManage) setTid(data.data[0].trainingId);
      } catch {}
    };
    loadTrainings();
  }, [canManage]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleMark = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await attendanceService.mark(form);
      toast.success('Attendance marked!');
      setModal(false);
      setForm({ trainingId: '', userId: '', date: '', status: 'present', remarks: '' });
      loadRecords();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-7 h-7 text-brand-400" />
            Attendance
          </h1>
          <p className="text-slate-400 text-sm mt-1">{records.length} records</p>
        </div>
        {canManage && (
          <button id="mark-attendance-btn" onClick={() => setModal(true)} className="btn-primary">
            + Mark Attendance
          </button>
        )}
      </div>

      {/* Training selector (admin/trainer) */}
      {canManage && (
        <div className="flex gap-3">
          <select
            id="attendance-training-filter"
            value={trainingId}
            onChange={(e) => setTid(e.target.value)}
            className="input max-w-sm"
          >
            <option value="">— Select Training —</option>
            {trainings.map((t) => (
              <option key={t.trainingId} value={t.trainingId}>{t.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-surface-border bg-surface">
              <tr>
                <th className="table-header">User</th>
                {canManage && <th className="table-header">Training</th>}
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Marked By</th>
                <th className="table-header">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={canManage ? 6 : 5} className="px-4 py-3">
                      <div className="h-5 bg-surface-border rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="text-center py-12 text-slate-500">
                    {canManage && !trainingId ? 'Select a training to view attendance.' : 'No attendance records found.'}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.attendanceId} className="hover:bg-surface-hover transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-slate-200">{r.userName}</p>
                        <p className="text-xs text-slate-500">{r.userEmail}</p>
                      </div>
                    </td>
                    {canManage && <td className="table-cell text-slate-300 text-xs">{r.trainingTitle}</td>}
                    <td className="table-cell text-slate-400">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <span className={`badge border ${statusColor[r.status] || ''}`}>{r.status}</span>
                    </td>
                    <td className="table-cell text-slate-500 font-mono text-xs">{r.markedBy}</td>
                    <td className="table-cell text-slate-400 text-xs">{r.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-md card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title mb-5">Mark Attendance</h2>
            <form id="attendance-form" onSubmit={handleMark} className="space-y-4">
              <div>
                <label className="label">Training *</label>
                <select className="input" required value={form.trainingId} onChange={(e) => setForm({...form, trainingId: e.target.value})}>
                  <option value="">Select Training</option>
                  {trainings.map((t) => <option key={t.trainingId} value={t.trainingId}>{t.title}</option>)}
                </select>
              </div>
              <div>
                <label className="label">User ID *</label>
                <input className="input" required placeholder="e.g. USR001" value={form.userId}
                  onChange={(e) => setForm({...form, userId: e.target.value})} />
              </div>
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                  {['present','absent','late','excused'].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Remarks</label>
                <input className="input" placeholder="Optional notes" value={form.remarks}
                  onChange={(e) => setForm({...form, remarks: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button id="attendance-save-btn" type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving...' : 'Mark Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
