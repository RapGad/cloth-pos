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
    printerName: '',
    printerType: 'system',
    printerPaperWidth: '80mm'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [printers, setPrinters] = useState<any[]>([]);
  const [testingPrint, setTestingPrint] = useState(false);

  useEffect(() => {
    loadSettings();
    loadPrinters();
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
        if (s.key === 'printerType') newSettings.printerType = s.value;
        if (s.key === 'printerPaperWidth') newSettings.printerPaperWidth = s.value;
      });
      setSettings(newSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPrinters = async () => {
    try {
      const availablePrinters = await api.getPrinters();
      setPrinters(availablePrinters);
    } catch (err) {
      console.error('Failed to load printers:', err);
    }
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      const receiptData = {
        storeName: settings.storeName,
        receiptNumber: 'TEST-' + Date.now(),
        timestamp: new Date().toISOString(),
        items: [
          { name: 'Test Item 1', size: 'M', color: 'Blue', qty: 1, price: 50.00 },
          { name: 'Test Item 2', size: 'L', color: 'Red', qty: 2, price: 75.00 }
        ],
        total: 200.00,
        paymentMethod: 'cash',
        printerName: settings.printerName
      };
      
      const success = await api.printReceipt(receiptData);
      if (success) {
        alert('Test receipt sent to printer!');
      } else {
        alert('Failed to print test receipt');
      }
    } catch (err) {
      console.error('Test print error:', err);
      alert('Failed to print test receipt');
    } finally {
      setTestingPrint(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSetting('storeName', settings.storeName);
      await api.updateSetting('currency', settings.currency);
      await api.updateSetting('taxRate', settings.taxRate);
      await api.updateSetting('printerName', settings.printerName);
      await api.updateSetting('printerType', settings.printerType);
      await api.updateSetting('printerPaperWidth', settings.printerPaperWidth);
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Printer Type</label>
              <select 
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={settings.printerType}
                onChange={e => setSettings({ ...settings, printerType: e.target.value })}
              >
                <option value="system">System Printer</option>
                <option value="usb">USB Thermal Printer</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.printerType === 'usb' ? 'Direct USB connection (ESC/POS)' : 'Use installed system printer'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paper Width</label>
              <select 
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={settings.printerPaperWidth}
                onChange={e => setSettings({ ...settings, printerPaperWidth: e.target.value })}
              >
                <option value="80mm">80mm (Standard)</option>
                <option value="58mm">58mm (Compact)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Printer</label>
              <select 
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                value={settings.printerName}
                onChange={e => setSettings({ ...settings, printerName: e.target.value })}
              >
                <option value="">Default Printer</option>
                {printers.map((printer) => (
                  <option key={printer.name} value={printer.name}>
                    {printer.displayName || printer.name}
                  </option>
                ))}
              </select>
              {printers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No printers detected</p>
              )}
            </div>
            <div className="flex items-end">
              <button 
                type="button"
                onClick={handleTestPrint}
                disabled={testingPrint}
                className="w-full bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingPrint ? 'Printing...' : 'Test Print Receipt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
