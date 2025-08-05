import React, { useState, useEffect } from 'react';
import './Dashboard.css';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarTest, setCalendarTest] = useState<any>(null);

  useEffect(() => {
    // Check URL params for auth success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setError('Not authenticated');
      }
    } catch (err) {
      setError('Failed to fetch user data');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testCalendarAccess = async () => {
    try {
      setCalendarTest({ loading: true });
      const response = await fetch('http://localhost:3001/api/auth/calendar/test', {
        credentials: 'include'
      });

      const data = await response.json();
      setCalendarTest(data);
    } catch (err) {
      setCalendarTest({ error: 'Failed to test calendar access' });
      console.error('Calendar test error:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Redirect to login
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-card">
          <h2>Authentication Required</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'} className="login-btn">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome to ReadyToMeet.me</h1>
          <div className="user-info">
            <span>👋 {user?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-card">
          <h2>🔗 Google Account Connected</h2>
          <p>Your Google account has been successfully connected!</p>
          
          <div className="user-details">
            <h3>Account Details:</h3>
            <ul>
              <li><strong>Email:</strong> {user?.email}</li>
              <li><strong>User ID:</strong> {user?.id}</li>
            </ul>
          </div>
        </div>

        <div className="dashboard-card">
          <h2>📅 Calendar Integration Test</h2>
          <p>Test your Google Calendar access:</p>
          
          <button 
            onClick={testCalendarAccess} 
            className="test-btn"
            disabled={calendarTest?.loading}
          >
            {calendarTest?.loading ? 'Testing...' : 'Test Calendar Access'}
          </button>

          {calendarTest && (
            <div className="test-results">
              {calendarTest.error ? (
                <div className="error-result">
                  <h4>❌ Calendar Test Failed</h4>
                  <p>{calendarTest.error}</p>
                  <small>This is expected until we set up real Google credentials</small>
                </div>
              ) : calendarTest.calendars ? (
                <div className="success-result">
                  <h4>✅ Calendar Access Successful!</h4>
                  <p>Found {calendarTest.calendars.length} calendars:</p>
                  <ul>
                    {calendarTest.calendars.map((cal: any) => (
                      <li key={cal.id}>
                        {cal.summary} {cal.primary && '(Primary)'}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="dashboard-card">
          <h2>🚀 Next Steps</h2>
          <div className="next-steps">
            <div className="step">
              <h4>1. Set up Google Cloud Console</h4>
              <p>Create OAuth credentials for production</p>
            </div>
            <div className="step">
              <h4>2. Create Meeting Types</h4>
              <p>Configure your scheduling preferences</p>
            </div>
            <div className="step">
              <h4>3. Generate Booking Links</h4>
              <p>Share your scheduling links with others</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;