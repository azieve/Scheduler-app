import React, { useState, useEffect } from 'react';
import TopNav from '../Navigation/TopNav';
import './Calendars.css';

interface Calendar {
  id: number;
  userId: string;
  googleCalendarId: string;
  calendarName: string;
  calendarDescription?: string;
  isPrimary: boolean;
  isActive: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  accessRole: string;
  timezone?: string;
  googleAccountId?: number;
  createdAt: string;
  updatedAt: string;
}

interface GoogleAccount {
  id: number;
  userId: string;
  googleId: string;
  googleEmail: string;
  displayName?: string;
  accountType: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const Calendars: React.FC = () => {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showGoogleCalendars, setShowGoogleCalendars] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  useEffect(() => {
    fetchCalendars(true); // Auto-sync on first load
    fetchGoogleAccounts();
    
    // Check for OAuth callback results
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    
    if (success === 'account_added') {
      alert('Successfully added Google account and synced calendars!');
      // Refresh data
      fetchGoogleAccounts();
      fetchCalendars();
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'account_updated') {
      alert('Google account updated and calendars re-synced successfully!');
      fetchGoogleAccounts();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'account_already_exists') {
      alert('This Google account is already connected to your account.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'auth_failed') {
      alert('Failed to authenticate with Google. Please try again.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchGoogleAccounts = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/google-accounts', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setGoogleAccounts(data.data.googleAccounts);
      } else {
        console.error('Failed to fetch Google accounts');
      }
    } catch (error) {
      console.error('Error fetching Google accounts:', error);
    }
  };

  const fetchCalendars = async (syncFirst = false) => {
    try {
      setLoading(true);
      const syncParam = syncFirst ? '?sync=true' : '';
      const response = await fetch(`http://localhost:3001/api/calendars${syncParam}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCalendars(data.data.calendars);
      } else {
        console.error('Failed to fetch calendars');
      }
    } catch (error) {
      console.error('Error fetching calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGoogleCalendars = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/calendars/google', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setGoogleCalendars(data.data.calendars);
        setShowGoogleCalendars(true);
      } else {
        console.error('Failed to fetch Google calendars');
      }
    } catch (error) {
      console.error('Error fetching Google calendars:', error);
    }
  };

  const syncCalendars = async () => {
    try {
      setSyncing(true);
      const response = await fetch('http://localhost:3001/api/calendars/sync', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCalendars(data.data.calendars);
        // Close the Google calendars modal if it's open
        setShowGoogleCalendars(false);
        
        if (data.data.syncedCount > 0) {
          alert(`Successfully synced ${data.data.syncedCount} calendars!`);
        } else {
          alert('Calendar sync completed - all calendars are up to date!');
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to sync calendars');
      }
    } catch (error) {
      console.error('Error syncing calendars:', error);
      alert('Failed to sync calendars');
    } finally {
      setSyncing(false);
    }
  };

  const addGoogleAccount = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/google-accounts/add', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Open the authorization URL in the current window
        window.location.href = data.data.authorizationUrl;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to initiate Google account linking');
      }
    } catch (error) {
      console.error('Error adding Google account:', error);
      alert('Failed to add Google account');
    }
  };

  const setPrimaryCalendar = async (calendarId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/calendars/${calendarId}/set-primary`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh calendars to show updated primary status
        await fetchCalendars();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to set primary calendar');
      }
    } catch (error) {
      console.error('Error setting primary calendar:', error);
      alert('Failed to set primary calendar');
    }
  };

  const toggleCalendarActive = async (calendarId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/calendars/${calendarId}/toggle-active`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh calendars to show updated active status
        await fetchCalendars();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to toggle calendar status');
      }
    } catch (error) {
      console.error('Error toggling calendar status:', error);
      alert('Failed to toggle calendar status');
    }
  };

  const removeCalendar = async (calendarId: number) => {
    if (!window.confirm('Are you sure you want to remove this calendar from your account? This will not delete the calendar from Google, but it will no longer be checked for availability.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/calendars/${calendarId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh calendars to show updated list
        await fetchCalendars();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove calendar');
      }
    } catch (error) {
      console.error('Error removing calendar:', error);
      alert('Failed to remove calendar');
    }
  };

  const setPrimaryGoogleAccount = async (accountId: number) => {
    try {
      const response = await fetch(`http://localhost:3001/api/google-accounts/${accountId}/set-primary`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh Google accounts to show updated primary status
        await fetchGoogleAccounts();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to set primary Google account');
      }
    } catch (error) {
      console.error('Error setting primary Google account:', error);
      alert('Failed to set primary Google account');
    }
  };

  const removeGoogleAccount = async (accountId: number) => {
    if (!window.confirm('Are you sure you want to remove this Google account? This will also remove all associated calendars.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/google-accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh both Google accounts and calendars
        await fetchGoogleAccounts();
        await fetchCalendars();
        alert('Google account removed successfully');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove Google account');
      }
    } catch (error) {
      console.error('Error removing Google account:', error);
      alert('Failed to remove Google account');
    }
  };

  const getCalendarIcon = (calendar: Calendar) => {
    if (calendar.isPrimary) {
      return '⭐'; // Star for primary
    }
    if (!calendar.isActive) {
      return '⏸️'; // Pause for inactive
    }
    return '📅'; // Default calendar
  };

  const getAccessRoleText = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'writer': return 'Can Edit';
      case 'reader': return 'Read Only';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="calendars-container">
        <div className="loading">Loading calendars...</div>
      </div>
    );
  }

  return (
    <div className="calendars-container">
      <TopNav />
      
      <div className="calendars-content">
        <div className="calendars-header">
          <h1>Calendar Management</h1>
          <div className="header-actions">
            <button 
              onClick={addGoogleAccount}
              className="add-account-btn"
            >
              + Add Google Account
            </button>
            <button 
              onClick={fetchGoogleCalendars}
              className="secondary-btn"
            >
              Browse Google Calendars
            </button>
            <button 
              onClick={syncCalendars}
              className="sync-btn"
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : '🔄 Sync Calendars'}
            </button>
          </div>
        </div>

        <div className="calendars-info">
          <div className="info-card">
            <h3>How it works:</h3>
            <ul>
              <li><strong>Primary Calendar:</strong> New bookings will be created in this calendar</li>
              <li><strong>Active Calendars:</strong> All active calendars are checked for conflicts when showing availability</li>
              <li><strong>Inactive Calendars:</strong> Not checked for availability but remain connected</li>
              <li><strong>Multiple Accounts:</strong> Connect work and personal Google accounts to access all calendars</li>
            </ul>
          </div>
        </div>

        {/* Google Accounts Section */}
        {googleAccounts.length > 0 && (
          <div className="google-accounts-section">
            <h2>Connected Google Accounts</h2>
            <div className="google-accounts-grid">
              {googleAccounts.map((account) => (
                <div key={account.id} className="google-account-card">
                  <div className="account-header">
                    <div className="account-info">
                      <h4>{account.displayName || account.googleEmail}</h4>
                      <p className="account-email">{account.googleEmail}</p>
                    </div>
                    <div className="account-badges">
                      {account.isPrimary && <span className="badge primary">Primary</span>}
                      <span className={`badge ${account.accountType}`}>{account.accountType}</span>
                    </div>
                  </div>
                  <div className="account-actions">
                    {!account.isPrimary && (
                      <button
                        onClick={() => setPrimaryGoogleAccount(account.id)}
                        className="action-btn primary-btn"
                        title="Set as primary Google account"
                      >
                        Set Primary
                      </button>
                    )}
                    <button
                      onClick={() => removeGoogleAccount(account.id)}
                      className="action-btn remove-btn"
                      title="Remove Google account"
                    >
                      Remove Account
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="calendars-section">
          {calendars.length > 0 && (
            <div className="calendars-grid">
              {calendars.map((calendar) => (
                <div key={calendar.id} className="calendar-card">
                  <div className="card-header" style={{ 
                    backgroundColor: calendar.backgroundColor || '#4285f4',
                    color: calendar.foregroundColor || '#ffffff'
                  }}>
                    <div className="calendar-icon">
                      {getCalendarIcon(calendar)}
                    </div>
                    <div className="calendar-info">
                      <h3>{calendar.calendarName}</h3>
                      {calendar.calendarDescription && (
                        <p className="calendar-description">{calendar.calendarDescription}</p>
                      )}
                    </div>
                  </div>

                <div className="card-content">
                  <div className="calendar-details">
                    <div className="detail">
                      <strong>Status:</strong> 
                      <span className={`status-badge ${calendar.isPrimary ? 'primary' : ''} ${calendar.isActive ? 'active' : 'inactive'}`}>
                        {calendar.isPrimary ? 'Primary' : calendar.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="detail">
                      <strong>Access:</strong> {getAccessRoleText(calendar.accessRole)}
                    </div>
                    {calendar.timezone && (
                      <div className="detail">
                        <strong>Timezone:</strong> {calendar.timezone}
                      </div>
                    )}
                  </div>

                  <div className="card-actions">
                    {!calendar.isPrimary && (
                      <button
                        onClick={() => setPrimaryCalendar(calendar.id)}
                        className="action-btn primary-btn"
                        title="Set as primary calendar"
                      >
                        Set Primary
                      </button>
                    )}
                    
                    <button
                      onClick={() => toggleCalendarActive(calendar.id)}
                      className={`action-btn ${calendar.isActive ? 'deactivate-btn' : 'activate-btn'}`}
                      title={calendar.isActive ? 'Deactivate calendar' : 'Activate calendar'}
                    >
                      {calendar.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      onClick={() => removeCalendar(calendar.id)}
                      className="action-btn remove-btn"
                      title="Remove calendar from account"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}

          {calendars.length === 0 && (
            <div className="empty-state">
              <h3>No calendars connected</h3>
              <p>Connect your Google calendars to start managing your availability across multiple calendars.</p>
              <button 
                onClick={syncCalendars}
                className="sync-btn"
                disabled={syncing}
              >
                {syncing ? 'Syncing...' : 'Connect Google Calendars'}
              </button>
            </div>
          )}
        </div>

        {/* Google Calendars Modal */}
        {showGoogleCalendars && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Available Google Calendars</h2>
                <button 
                  onClick={() => setShowGoogleCalendars(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>
              
              <div className="modal-body">
                <p>These are all the calendars available in your Google account:</p>
                <div className="google-calendars-list">
                  {googleCalendars.map((gcal) => (
                    <div key={gcal.id} className="google-calendar-item">
                      <div className="google-calendar-info">
                        <h4>{gcal.summary}</h4>
                        {gcal.description && <p>{gcal.description}</p>}
                        <span className="access-role">{getAccessRoleText(gcal.accessRole)}</span>
                        {gcal.primary && <span className="primary-badge">Primary</span>}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="modal-actions">
                  <button 
                    onClick={() => {
                      setShowGoogleCalendars(false);
                      syncCalendars();
                    }}
                    className="sync-btn"
                  >
                    Add All Calendars
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendars;