import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: '',
    maintenanceStartDate: '',
    maintenanceEndDate: ''
  });
  
  const [initialSettings, setInitialSettings] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setError('');
    
    const docRef = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          maintenanceMode: data.maintenanceMode || false,
          maintenanceMessage: data.maintenanceMessage || '',
          maintenanceStartDate: data.maintenanceStartDate || '',
          maintenanceEndDate: data.maintenanceEndDate || ''
        });
        setInitialSettings({
          maintenanceMode: data.maintenanceMode || false,
          maintenanceMessage: data.maintenanceMessage || '',
          maintenanceStartDate: data.maintenanceStartDate || '',
          maintenanceEndDate: data.maintenanceEndDate || ''
        });
      } else {
        // Fallback or empty if not exists
        setInitialSettings({
          maintenanceMode: false,
          maintenanceMessage: '',
          maintenanceStartDate: '',
          maintenanceEndDate: ''
        });
      }
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to fetch settings.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const docRef = doc(db, 'settings', 'general');
      await setDoc(docRef, settings, { merge: true });
      
      // If maintenance mode toggled, send notification
      if (initialSettings && initialSettings.maintenanceMode !== settings.maintenanceMode) {
        const usersSnap = await getDocs(collection(db, 'users'));
        const tokens = [];
        usersSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.fcmToken) tokens.push(data.fcmToken);
        });

        if (tokens.length > 0) {
          const title = settings.maintenanceMode ? 'Maintenance Mode Active' : 'Maintenance Mode Disabled';
          const body = settings.maintenanceMode 
              ? (settings.maintenanceMessage || 'Turf bookings are temporarily paused. Open the app for details.') 
              : 'Turf bookings are now open again!';
              
          // Send in chunks of 500
          for (let i = 0; i < tokens.length; i += 500) {
             const chunk = tokens.slice(i, i + 500);
             fetch('/.netlify/functions/notify', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ tokens: chunk, title, body })
             }).catch(console.error);
          }
        }
      }
      
      setInitialSettings({ ...settings });
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-4 border-primaryGreen border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary flex items-center">
          <Settings className="mr-3 text-primaryGreen" /> Global Settings
        </h1>
        <p className="text-textSecondary mt-1">Configure global application settings and maintenance mode.</p>
      </div>

      {error && (
        <div className="p-4 bg-dangerRed/10 border border-dangerRed/20 rounded-lg flex items-start space-x-3 text-dangerRed">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 bg-primaryGreen/10 border border-primaryGreen/20 rounded-lg text-primaryGreen">
          {success}
        </div>
      )}

      <div className="bg-darkNavySurface border border-cardBorder rounded-xl overflow-hidden">
        <div className="p-6 border-b border-cardBorder">
          <h2 className="text-xl font-bold text-textPrimary mb-4">Maintenance Mode</h2>
          
          <div className="space-y-6">
            {/* Toggle */}
            <label className="flex items-center space-x-4 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  name="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onChange={handleChange}
                  className="sr-only" 
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-dangerRed' : 'bg-darkNavy border border-cardBorder'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${settings.maintenanceMode ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <div>
                <div className="text-textPrimary font-medium">Enable Maintenance Mode</div>
                <div className="text-textSecondary text-sm">When active, users cannot book slots. The app will display the maintenance message.</div>
              </div>
            </label>

            {/* Config Fields */}
            {settings.maintenanceMode && (
              <div className="pl-18 space-y-4 pt-2 border-t border-cardBorder mt-4">
                <div>
                  <label className="block text-sm font-medium text-textSecondary mb-1">Maintenance Message</label>
                  <textarea
                    name="maintenanceMessage"
                    value={settings.maintenanceMessage}
                    onChange={handleChange}
                    rows="3"
                    className="w-full bg-darkNavy border border-cardBorder rounded-lg p-3 text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
                    placeholder="e.g., Turf is currently closed for a tournament. We will resume bookings on Monday."
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">Start Date (Optional)</label>
                    <input
                      type="date"
                      name="maintenanceStartDate"
                      value={settings.maintenanceStartDate}
                      onChange={handleChange}
                      className="w-full bg-darkNavy border border-cardBorder rounded-lg p-3 text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textSecondary mb-1">End Date (Optional)</label>
                    <input
                      type="date"
                      name="maintenanceEndDate"
                      value={settings.maintenanceEndDate}
                      onChange={handleChange}
                      className="w-full bg-darkNavy border border-cardBorder rounded-lg p-3 text-textPrimary focus:outline-none focus:border-primaryGreen transition-colors"
                    />
                  </div>
                </div>
                <p className="text-xs text-textSecondary">
                  If dates are provided, maintenance mode will only apply between these dates. If left blank, it applies immediately and indefinitely.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-darkNavy/30 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center bg-primaryGreen text-darkNavy font-bold py-2 px-6 rounded-lg hover:bg-[#00d07e] transition-colors disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
