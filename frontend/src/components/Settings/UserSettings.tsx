import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../Navigation/TopNav';
import WorkingHoursSettings from './WorkingHoursSettings';
import GeneralSettings from './GeneralSettings';
import BlockedTimesSettings from './BlockedTimesSettings';
import './UserSettings.css';

interface UserSettingsData {
  id?: number;
  userId?: number;
  workingHours: {
    [key: string]: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  timezone: string;
  defaultBufferBefore: number;
  defaultBufferAfter: number;
  minimumNoticeMinutes: number;
  maxAdvanceDays: number;
  allowBackToBackBookings: boolean;
  autoConfirmBookings: boolean;
}

const UserSettings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('working-hours');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/user-settings', {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('Failed to fetch user settings');
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettingsData>) => {
    try {
      setError(null);
      const response = await fetch('http://localhost:3001/api/user-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      setSettings(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    }
  };

  if (loading) {
    return (
      <div className="user-settings">
        <TopNav />
        <div className="settings-container">
          <div className="loading-spinner">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-settings">
        <TopNav />
        <div className="settings-container">
          <div className="error-message">
            Error: {error}
            <button onClick={fetchUserSettings} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="user-settings">
        <TopNav />
        <div className="settings-container">
          <div className="no-settings">No settings found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-settings">
      <TopNav />
      <div className="settings-container">
        <div className="settings-header">
          <h1>User Settings</h1>
          <p>Manage your availability and booking preferences</p>
        </div>

        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'working-hours' ? 'active' : ''}`}
            onClick={() => setActiveTab('working-hours')}
          >
            Working Hours
          </button>
          <button 
            className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'blocked-times' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked-times')}
          >
            Blocked Times
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'working-hours' && (
            <WorkingHoursSettings
              workingHours={settings.workingHours}
              timezone={settings.timezone}
              onUpdate={updateSettings}
            />
          )}
          {activeTab === 'general' && (
            <GeneralSettings
              settings={settings}
              onUpdate={updateSettings}
            />
          )}
          {activeTab === 'blocked-times' && (
            <BlockedTimesSettings />
          )}
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettings;