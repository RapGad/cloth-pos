import React, { useEffect, useState } from 'react';
import { Save, Store, Percent, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '../api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { UserManagement } from '../components/UserManagement.tsx';
import { permissions } from '../utils/permissions.ts';

export const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    storeName: 'My Hardware Store',
    currency: 'GH₵',
    taxRate: '0',
    storeAddress: '',
    storePhone: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

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
        if (s.key === 'storeAddress') newSettings.storeAddress = s.value;
        if (s.key === 'storePhone') newSettings.storePhone = s.value;
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
      await api.updateSetting('storeAddress', settings.storeAddress);
      await api.updateSetting('storePhone', settings.storePhone);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('WARNING: This will permanently delete ALL products, sales, and non-admin users. This action cannot be undone. Are you sure you want to proceed?')) {
      return;
    }

    if (!window.confirm('LAST CHANCE: Are you absolutely certain? All your data will be cleared.')) {
      return;
    }

    setResetting(true);
    try {
      await api.resetDatabase();
      alert('Database has been reset successfully. The application will now reload.');
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset database:', err);
      alert('Failed to reset database');
    } finally {
      setResetting(false);
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Address</label>
            <input 
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.storeAddress}
              onChange={e => setSettings({ ...settings, storeAddress: e.target.value })}
              placeholder="e.g., 123 Hardware Ave, Accra"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store Phone</label>
            <input 
              type="text" 
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              value={settings.storePhone}
              onChange={e => setSettings({ ...settings, storePhone: e.target.value })}
              placeholder="e.g., +233 24 000 0000"
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

        {/* Danger Zone */}
        {permissions.canManageUsers(currentUser?.role) && (
          <div className="bg-red-50 p-6 rounded-xl border border-red-100 space-y-4 md:col-span-2">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-red-700">
              <AlertTriangle size={20} />
              Danger Zone
            </h2>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-red-800">Reset Database</p>
                <p className="text-sm text-red-600">
                  Permanently delete all products, sales, variants, and non-admin users. 
                  This action is irreversible.
                </p>
              </div>
              <button
                onClick={handleResetDatabase}
                disabled={resetting}
                className="bg-red-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={20} />
                {resetting ? 'Resetting...' : 'Reset Database'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
