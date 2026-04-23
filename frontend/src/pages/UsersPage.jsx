import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import { PlusIcon, MagnifyingGlassIcon, UsersIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ROLES = ['', 'admin', 'trainer', 'trainee'];

const roleColor = {
  admin:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  trainer: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
  trainee: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers]       = useState([]);
  const [pagination, setPag]    = useState({});
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [page, setPage]         = useState(1);
  const [showModal, setModal]   = useState(false);
  const [editTarget, setEdit]   = useState(null);
  const [form, setForm]         = useState({ role: 'trainee', isActive: true });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const { data } = await userService.getAll(params);
      setUsers(data.data);
      setPag(data.pagination);
    } catch { toast.error('Failed to load users'); }
    setLoading(false);
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEdit(null); setForm({ role: 'trainee', isActive: true }); setModal(true); };
  const openEdit   = (u) => { setEdit(u); setForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, department: u.department, designation: u.designation, phone: u.phone, isActive: u.isActive }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget) {
        await userService.update(editTarget.userId, form);
        toast.success('User updated');
      } else {
        await userService.create(form);
        toast.success('User created');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Deactivate this user?')) return;
    try {
      await userService.deactivate(userId);
      toast.success('User deactivated');
      load();
    } catch { toast.error('Failed to deactivate'); }
  };

  const isAdmin = authUser?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-brand-400" /> Users
          </h1>
          <p className="text-slate-400 text-sm mt-1">{pagination.total ?? 0} total users</p>
        </div>
        {isAdmin && (
          <button id="create-user-btn" onClick={openCreate} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="user-search"
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        <select
          id="user-role-filter"
          value={roleFilter}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="input w-40"
        >
          {ROLES.map((r) => <option key={r} value={r}>{r || 'All Roles'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-surface-border bg-surface">
              <tr>
                <th className="table-header">User</th>
                <th className="table-header">Role</th>
                <th className="table-header">Department</th>
                <th className="table-header">Status</th>
                <th className="table-header">Joined</th>
                {isAdmin && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {loading
                ? [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={isAdmin ? 6 : 5} className="px-4 py-3">
                    <div className="h-5 bg-surface-border rounded animate-pulse" />
                  </td></tr>
                ))
                : users.length === 0
                  ? <tr><td colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-slate-500">No users found</td></tr>
                  : users.map((u) => (
                    <tr key={u.userId} className="hover:bg-surface-hover transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {u.firstName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-100">{u.firstName} {u.lastName}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge border ${roleColor[u.role] || ''}`}>{u.role}</span>
                      </td>
                      <td className="table-cell text-slate-400">{u.department || '—'}</td>
                      <td className="table-cell">
                        <span className={`badge border ${u.isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell text-slate-400">{new Date(u.joinDate || u.createdAt).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="table-cell">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(u)} className="p-1.5 rounded text-slate-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors">
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeactivate(u.userId)} className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
            <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModal(false)}>
          <div className="w-full max-w-md card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h2 className="section-title mb-5">{editTarget ? 'Edit User' : 'Add User'}</h2>
            <form id="user-form" onSubmit={handleSave} className="space-y-4">
              {!editTarget && (
                <>
                  <div><label className="label">User ID</label><input name="userId" className="input" required onChange={(e) => setForm({...form, userId: e.target.value})} /></div>
                  <div><label className="label">Email</label><input name="email" type="email" className="input" required onChange={(e) => setForm({...form, email: e.target.value})} /></div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">First Name</label><input className="input" value={form.firstName || ''} onChange={(e) => setForm({...form, firstName: e.target.value})} required /></div>
                <div><label className="label">Last Name</label><input className="input" value={form.lastName || ''} onChange={(e) => setForm({...form, lastName: e.target.value})} required /></div>
              </div>
              <div><label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({...form, role: e.target.value})}>
                  {['admin','trainer','trainee'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><label className="label">Department</label><input className="input" value={form.department || ''} onChange={(e) => setForm({...form, department: e.target.value})} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
                <button id="user-save-btn" type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
