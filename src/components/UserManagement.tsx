import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Key } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'cashier' as 'admin' | 'cashier' });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.addUser(formData.username, formData.password, formData.role);
      setShowCreateModal(false);
      setFormData({ username: '', password: '', role: 'cashier' });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    try {
      await api.updateUser(selectedUser.id, formData.username, formData.role);
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({ username: '', password: '', role: 'cashier' });
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setError('');
    try {
      await api.changePassword(selectedUser.id, newPassword);
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      alert('Password changed successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setError('');
    try {
      await api.deleteUser(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setShowEditModal(true);
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading users...</div>;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users size={20} className="text-blue-600" />
          User Management
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Create User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Username</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Role</th>
              <th className="text-left p-3 text-sm font-semibold text-gray-700">Created</th>
              <th className="text-right p-3 text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{user.username}</span>
                    {user.id === currentUser?.id && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">You</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => openPasswordModal(user)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Change password"
                    >
                      <Key size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal title="Create New User" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'cashier' })}
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <Modal title="Edit User" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditUser} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'cashier' })}
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <Modal title={`Change Password for ${selectedUser.username}`} onClose={() => setShowPasswordModal(false)}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Change Password
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <Modal title="Delete User" onClose={() => setShowDeleteModal(false)}>
          <div className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
            <p className="text-gray-700">
              Are you sure you want to delete user <strong>{selectedUser.username}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Modal Component
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};
