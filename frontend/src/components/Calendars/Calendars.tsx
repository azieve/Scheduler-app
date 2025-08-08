import React, { useState, useEffect } from 'react';
import TopNav from '../Navigation/TopNav';
import './Calendars.css';

interface Account {
  id: number;
  googleEmail: string;
  displayName: string;
  accountType: string;
  isPrimary: boolean;
  isActive: boolean;
  calendarCount: number;
  activeCalendarCount: number;
}

interface Calendar {
  id: number;
  accountId: number;
  googleCalendarId: string;
  calendarName: string;
  calendarDescription: string;
  backgroundColor: string;
  foregroundColor: string;
  accessRole: string;
  timezone: string;
  isPrimary: boolean;
  isActive: boolean;
  accountEmail: string;
  accountIsPrimary: boolean;
  displayName: string;
  accessRoleText: string;
  status: string;
}

const Calendars: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch accounts and calendars
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch accounts
      console.log('🔍 Fetching accounts...');
      const accountsResponse = await fetch('http://localhost:3001/api/accounts', {
        credentials: 'include'
      });
      
      console.log('📡 Accounts response status:', accountsResponse.status);
      
      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error('❌ Accounts API error:', errorText);
        showMessage('error', `Failed to load accounts: ${accountsResponse.status} ${accountsResponse.statusText}`);
        return;
      }
      
      const accountsData = await accountsResponse.json();
      console.log('📊 Accounts data:', accountsData);
      
      if (accountsData.success) {
        setAccounts(accountsData.data.accounts);
        console.log('✅ Accounts loaded:', accountsData.data.accounts.length);
      } else {
        console.error('❌ Accounts request unsuccessful:', accountsData.error);
        showMessage('error', `Failed to load accounts: ${accountsData.error}`);
      }
      
      // Fetch calendars
      console.log('🔍 Fetching calendars...');
      const calendarsResponse = await fetch('http://localhost:3001/api/calendars', {
        credentials: 'include'
      });
      
      console.log('📡 Calendars response status:', calendarsResponse.status);
      
      if (!calendarsResponse.ok) {
        const errorText = await calendarsResponse.text();
        console.error('❌ Calendars API error:', errorText);
        showMessage('error', `Failed to load calendars: ${calendarsResponse.status} ${calendarsResponse.statusText}`);
        return;
      }
      
      const calendarsData = await calendarsResponse.json();
      console.log('📊 Calendars data:', calendarsData);
      
      if (calendarsData.success) {
        setCalendars(calendarsData.data.calendars);
        console.log('✅ Calendars loaded:', calendarsData.data.calendars.length);
      } else {
        console.error('❌ Calendars request unsuccessful:', calendarsData.error);
        showMessage('error', `Failed to load calendars: ${calendarsData.error}`);
      }
      
    } catch (error) {
      console.error('💥 Error fetching data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showMessage('error', `Network error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Handle add new account
  const handleAddAccount = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/accounts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ accountType: 'personal' })
      });
      
      const data = await response.json();
      
      if (data.success && data.data.authorizationUrl) {
        // Redirect to Google OAuth
        window.location.href = data.data.authorizationUrl;
      } else {
        showMessage('error', 'Failed to initiate account addition');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      showMessage('error', 'Failed to add account');
    }
  };

  // Handle sync calendars
  const handleSyncCalendars = async (accountId?: number) => {
    try {
      setSyncing(true);
      
      const url = accountId 
        ? `http://localhost:3001/api/calendars/sync/${accountId}` 
        : 'http://localhost:3001/api/calendars/sync';
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message);
        await fetchData(); // Refresh data
      } else {
        showMessage('error', data.error || 'Failed to sync calendars');
      }
    } catch (error) {
      console.error('Error syncing calendars:', error);
      showMessage('error', 'Failed to sync calendars');
    } finally {
      setSyncing(false);
    }
  };

  // Handle delete account
  const handleDeleteAccount = async (accountId: number, accountEmail: string) => {
    if (!window.confirm(`Are you sure you want to delete the account "${accountEmail}" and all its calendars?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/accounts/${accountId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message);
        await fetchData(); // Refresh data
      } else {
        showMessage('error', data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      showMessage('error', 'Failed to delete account');
    }
  };

  // Handle toggle calendar active
  const handleToggleCalendar = async (calendarId: number, calendarName: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/calendars/${calendarId}/toggle-active`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message);
        await fetchData(); // Refresh data
      } else {
        showMessage('error', data.error || 'Failed to toggle calendar');
      }
    } catch (error) {
      console.error('Error toggling calendar:', error);
      showMessage('error', 'Failed to toggle calendar');
    }
  };

  // Handle set primary calendar
  const handleSetPrimary = async (calendarId: number, calendarName: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/calendars/${calendarId}/set-primary`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message);
        await fetchData(); // Refresh data
      } else {
        showMessage('error', data.error || 'Failed to set primary calendar');
      }
    } catch (error) {
      console.error('Error setting primary calendar:', error);
      showMessage('error', 'Failed to set primary calendar');
    }
  };

  // Handle delete calendar
  const handleDeleteCalendar = async (calendarId: number, calendarName: string) => {
    if (!window.confirm(`Are you sure you want to delete the calendar "${calendarName}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3001/api/calendars/${calendarId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message);
        await fetchData(); // Refresh data
      } else {
        showMessage('error', data.error || 'Failed to delete calendar');
      }
    } catch (error) {
      console.error('Error deleting calendar:', error);
      showMessage('error', 'Failed to delete calendar');
    }
  };

  // Check authentication and URL parameters
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      // First check if user is authenticated
      try {
        console.log('🔐 Checking authentication...');
        const authResponse = await fetch('http://localhost:3001/api/auth/me', {
          credentials: 'include'
        });
        
        if (!authResponse.ok) {
          console.error('❌ User not authenticated, redirecting to login');
          window.location.href = '/login';
          return;
        }
        
        const authData = await authResponse.json();
        console.log('✅ User authenticated:', authData.user.email);
        
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        window.location.href = '/login';
        return;
      }
      
      // Check URL parameters for success/error messages
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');
      const email = urlParams.get('email');
      
      if (success === 'account_added' && email) {
        showMessage('success', `Successfully added Google account: ${decodeURIComponent(email)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (success === 'account_updated' && email) {
        showMessage('success', `Successfully updated Google account: ${decodeURIComponent(email)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (error) {
        const errorMessages: { [key: string]: string } = {
          'oauth_failed': 'Google authentication failed. Please try again.',
          'no_auth_code': 'No authorization code received from Google.',
          'invalid_state': 'Invalid authentication state. Please try again.',
          'callback_failed': 'Authentication callback failed. Please try again.'
        };
        showMessage('error', errorMessages[error] || 'An error occurred during account setup');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // Now fetch data
      await fetchData();
    };
    
    checkAuthAndFetch();
  }, []);

  // Group calendars by account
  const calendarsByAccount = calendars.reduce((acc, calendar) => {
    if (!acc[calendar.accountId]) {
      acc[calendar.accountId] = [];
    }
    acc[calendar.accountId].push(calendar);
    return acc;
  }, {} as { [key: number]: Calendar[] });

  if (loading) {
    return (
      <div className="calendars-page">
        <TopNav />
        <div className="calendars-container">
          <div className="loading">Loading calendars...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendars-page">
      <TopNav />
      <div className="calendars-container">
        <div className="calendars-header">
          <h1>Calendar Management</h1>
          <div className="calendars-actions">
            <button 
              className="btn btn-primary"
              onClick={() => handleSyncCalendars()}
              disabled={syncing}
            >
              {syncing ? 'Syncing...' : 'Sync All Calendars'}
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleAddAccount}
            >
              Add Google Account
            </button>
          </div>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {accounts.length === 0 ? (
          <div className="no-accounts">
            <h3>No Google Accounts Connected</h3>
            <p>Connect your Google account to manage calendars and schedule meetings.</p>
            <button className="btn btn-primary" onClick={handleAddAccount}>
              Connect Google Account
            </button>
          </div>
        ) : (
          <div className="accounts-section">
            {accounts.map(account => (
              <div key={account.id} className="account-card">
                <div className="account-header">
                  <div className="account-info">
                    <h3>
                      {account.displayName || account.googleEmail}
                      {account.isPrimary && <span className="badge primary">Primary</span>}
                    </h3>
                    <p className="account-email">{account.googleEmail}</p>
                    <div className="account-stats">
                      <span className="stat">
                        {account.activeCalendarCount} / {account.calendarCount} active calendars
                      </span>
                      <span className={`account-type ${account.accountType}`}>
                        {account.accountType}
                      </span>
                    </div>
                  </div>
                  <div className="account-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleSyncCalendars(account.id)}
                      disabled={syncing}
                    >
                      {syncing ? 'Syncing...' : 'Sync'}
                    </button>
                    {!account.isPrimary && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteAccount(account.id, account.googleEmail)}
                      >
                        Delete Account
                      </button>
                    )}
                  </div>
                </div>

                {calendarsByAccount[account.id] && calendarsByAccount[account.id].length > 0 ? (
                  <div className="calendars-list">
                    {calendarsByAccount[account.id].map(calendar => (
                      <div key={calendar.id} className={`calendar-item ${calendar.status}`}>
                        <div 
                          className="calendar-color" 
                          style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                        />
                        <div className="calendar-info">
                          <h4>{calendar.calendarName}</h4>
                          {calendar.calendarDescription && (
                            <p className="calendar-description">{calendar.calendarDescription}</p>
                          )}
                          <div className="calendar-meta">
                            <span className={`status ${calendar.status}`}>
                              {calendar.isPrimary ? 'Primary' : calendar.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="access-role">{calendar.accessRoleText}</span>
                            {calendar.timezone && (
                              <span className="timezone">{calendar.timezone}</span>
                            )}
                          </div>
                        </div>
                        <div className="calendar-actions">
                          <button
                            className={`btn btn-sm ${calendar.isActive ? 'btn-warning' : 'btn-success'}`}
                            onClick={() => handleToggleCalendar(calendar.id, calendar.calendarName)}
                          >
                            {calendar.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          {!calendar.isPrimary && calendar.isActive && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSetPrimary(calendar.id, calendar.calendarName)}
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteCalendar(calendar.id, calendar.calendarName)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-calendars">
                    <p>No calendars found for this account.</p>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleSyncCalendars(account.id)}
                      disabled={syncing}
                    >
                      {syncing ? 'Syncing...' : 'Sync Calendars'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="calendars-help">
          <h3>How Calendar Management Works</h3>
          <ul>
            <li><strong>Primary Account:</strong> Your main Google account that cannot be deleted</li>
            <li><strong>Secondary Accounts:</strong> Additional Google accounts for work, personal, etc.</li>
            <li><strong>Primary Calendar:</strong> The calendar where new meetings will be created</li>
            <li><strong>Active Calendars:</strong> Calendars checked for conflicts when scheduling</li>
            <li><strong>Sync:</strong> Updates calendar list from your Google accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Calendars;