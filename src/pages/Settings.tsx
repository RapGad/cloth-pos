import React, { useEffect, useState } from 'react';
import { Save, Store, Percent, Printer, Key } from 'lucide-react';
import { api } from '../api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { UserManagement } from '../components/UserManagement.tsx';
import { permissions } from '../utils/permissions.ts';

export const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    storeName: 'My Clothing Store',
    currency: 'GH₵',
    taxRate: '0',
    printerName: 'Default Printer'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      const newSettings = { ...settings };
      data.forEach(s => {
        if (s.key === 'storeName') newSettings.storeName = s.value;
        if (s.key === 'currency') newSettings.currency = s.value;
        if (s.key === 'taxRate') newSettings.taxRate = s.value;
        if (s.key === 'printerName') newSettings.printerName = s.value;
      });
      setSettings(newSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSetting('storeName', settings.storeName);
      await api.updateSetting('currency', settings.currency);
      await api.updateSetting('taxRate', settings.taxRate);
      await api.updateSetting('printerName', settings.printerName);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    try {
      await api.changePassword(currentUser!.id, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password changed successfully!');
    } catch (err) {
      setPasswordError('Failed to change password');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* User Management - Admin Only */}
      {permissions.canManageUsers(currentUser?.role) && (
        <UserManagement />
      )}

      {/* Change Password for Current User */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <Key size={20} className="text-blue-600" />
          Change Your Password
        </h2>
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{passwordError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Change Password
          </button>
        </form>
      </div>

      {/* Store Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Store size={20} className="text-blue-600" />
            Store Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
            <input 
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.storeName}
              onChange={e => setSettings({ ...settings, storeName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency Symbol</label>
            <input 
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.currency}
              onChange={e => setSettings({ ...settings, currency: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Percent size={20} className="text-blue-600" />
            Tax & Finance
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
            <input 
              type="number" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.taxRate}
              onChange={e => setSettings({ ...settings, taxRate: e.target.value })}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm space-y-4 md:col-span-2">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Printer size={20} className="text-blue-600" />
            Printer Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Printer</label>
              <select 
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={settings.printerName}
                onChange={e => setSettings({ ...settings, printerName: e.target.value })}
              >
                <option value="Default Printer">Default Printer</option>
                <option value="PDF Printer">Save as PDF</option>
              </select>
            </div>
            <div className="flex items-end">
              <button className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-500 hover:bg-gray-50 transition-colors">
                Test Print Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
