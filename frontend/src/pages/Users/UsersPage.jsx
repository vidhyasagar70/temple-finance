import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { userApi } from '../../api/userApi';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Plus, Edit3, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userApi.getUsers();
      if (res.success) {
        setUsers(res.data || []);
      } else {
        setError(res.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAddModal = () => {
    setEditingUser(null);
    setModalError('');
    reset({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: 'COMMITTEE_MEMBER',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setModalError('');
    reset({
      name: u.name || '',
      phone: u.phone || '',
      email: u.email || '',
      password: '',
      role: u.role || 'COMMITTEE_MEMBER',
      isActive: u.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleSaveUser = async (data) => {
    setModalError('');
    setModalSubmitting(true);
    try {
      if (editingUser) {
        const payload = {
          name: data.name,
          email: data.email,
          role: data.role,
          isActive: data.isActive,
        };
        if (data.password) payload.password = data.password;
        await userApi.updateUser(editingUser._id || editingUser.id, payload);
      } else {
        await userApi.createUser({
          name: data.name,
          phone: data.phone,
          email: data.email,
          password: data.password,
          role: data.role,
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setModalError(err.message || 'Failed to save user details');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-serif text-stone-900">System User Management</h1>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full border border-purple-200">
              Admin Access Only
            </span>
          </div>
          <p className="text-sm text-stone-600">
            Control access roles for committee members, administrators, and viewers.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-temple-600 hover:bg-temple-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add System User</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden">
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-600 uppercase tracking-wider">
                  <th className="p-4">User Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Email</th>
                  <th className="p-4 text-center">Assigned Role</th>
                  <th className="p-4 text-center">Account Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm text-stone-800">
                {users.map((u) => (
                  <tr key={u.id || u._id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-4 font-semibold text-stone-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-forest-600" />
                      <span>{u.name}</span>
                    </td>
                    <td className="p-4 font-mono text-stone-600">{u.phone}</td>
                    <td className="p-4 text-stone-600">{u.email || '—'}</td>
                    <td className="p-4 text-center">
                      <StatusBadge status={u.role} type="role" />
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={u.isActive} type="active" />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit User</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit User (${editingUser.name})` : 'Create New System User'}
        maxWidth="max-w-md"
      >
        {modalError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {modalError}
          </div>
        )}

        <form onSubmit={handleSubmit(handleSaveUser)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none"
              placeholder="e.g. Arumugam Pillai"
            />
            {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Phone Number {!editingUser && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="text"
              maxLength={10}
              disabled={Boolean(editingUser)} // Phone is primary key identifier
              {...register('phone', {
                required: !editingUser ? 'Phone is required' : false,
                pattern: { value: /^[0-9]{10}$/, message: 'Must be 10 digits' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
              placeholder="9876543210"
            />
            {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Role
            </label>
            <select
              {...register('role')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-temple-500 focus:outline-none font-medium"
            >
              <option value="ADMIN">ADMIN — Full access</option>
              <option value="COMMITTEE_MEMBER">COMMITTEE MEMBER — Financial entry</option>
              <option value="VIEWER">VIEWER — Read only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              {editingUser ? 'Reset Password (optional)' : 'Password'} {!editingUser && <span className="text-rose-500">*</span>}
            </label>
            <input
              type="password"
              {...register('password', {
                required: !editingUser ? 'Password is required' : false,
                minLength: { value: 6, message: 'Minimum 6 characters' },
              })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-temple-500 focus:outline-none"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-xs text-rose-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {editingUser && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="w-4 h-4 text-temple-600 border-stone-300 rounded focus:ring-temple-500"
              />
              <label htmlFor="isActive" className="text-xs font-bold text-stone-700">
                User Account is Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-stone-200 pt-4 mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={modalSubmitting}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalSubmitting}
              className="px-5 py-2 text-sm font-bold text-white bg-temple-600 rounded-lg hover:bg-temple-700 disabled:opacity-50"
            >
              {modalSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
