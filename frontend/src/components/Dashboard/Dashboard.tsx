import React, { useState, useEffect } from 'react';
import TopNav from '../Navigation/TopNav';
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
  const [calendars, setCalendars] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    // Check URL params for auth success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
      // Remove the parameter from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchUser();
  }, []);

  useEffect(() => {
    // Auto-load calendars when user is authenticated
    if (user) {
      fetchCalendars();
    }
  }, [user]);

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

  const fetchCalendars = async () => {
    try {
      setLoadingCalendars(true);
      const response = await fetch('http://localhost:3001/api/calendar/calendars', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCalendars(data.data.calendars);
        
        // Auto-load events from primary calendar
        const primaryCalendar = data.data.calendars.find((cal: any) => cal.primary);
        if (primaryCalendar) {
          fetchEvents(primaryCalendar.id);
        }
      } else {
        console.error('Failed to fetch calendars');
      }
    } catch (err) {
      console.error('Calendar fetch error:', err);
    } finally {
      setLoadingCalendars(false);
    }
  };

  const fetchEvents = async (calendarId = 'primary') => {
    try {
      setLoadingEvents(true);
      const response = await fetch(
        `http://localhost:3001/api/calendar/events?calendarId=${calendarId}&maxResults=10`,
        {
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.data.events);
      } else {
        console.error('Failed to fetch events');
      }
    } catch (err) {
      console.error('Events fetch error:', err);
    } finally {
      setLoadingEvents(false);
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
      <TopNav />
      
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Welcome back! 👋</h1>
          <p>Your scheduling platform is ready to go.</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>🔗 Google Account Connected</h2>
            <p>Your Google account is successfully connected and synced.</p>
            
            <div className="user-details">
              <div className="detail-item">
                <span className="label">Email:</span>
                <span className="value">{user?.email}</span>
              </div>
              <div className="detail-item">
                <span className="label">Status:</span>
                <span className="value status-connected">✅ Connected</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>📅 Your Calendars</h2>
            <p>Connected Google calendars:</p>
            
            {loadingCalendars && <p className="loading-text">Loading calendars...</p>}
            
            {calendars.length > 0 ? (
              <div className="calendar-list">
                {calendars.map((cal: any) => (
                  <div key={cal.id} className="calendar-item">
                    <div className="calendar-info">
                      <span className="calendar-name">{cal.summary}</span>
                      {cal.primary && <span className="primary-badge">Primary</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : !loadingCalendars ? (
              <p className="empty-state">No calendars found.</p>
            ) : null}
          </div>

          <div className="dashboard-card">
            <h2>📋 Upcoming Events</h2>
            <p>Your next calendar events:</p>
            
            {loadingEvents && <p className="loading-text">Loading events...</p>}
            
            {events.length > 0 ? (
              <div className="events-list">
                {events.slice(0, 3).map((event: any) => (
                  <div key={event.id} className="event-item">
                    <div className="event-title">
                      {event.summary || 'No title'}
                    </div>
                    <div className="event-time">
                      {event.start?.dateTime 
                        ? new Date(event.start.dateTime).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                          })
                        : event.start?.date 
                          ? new Date(event.start.date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric'
                            })
                          : 'No time'
                      }
                    </div>
                  </div>
                ))}
                {events.length > 3 && (
                  <p className="more-events">...and {events.length - 3} more events</p>
                )}
              </div>
            ) : !loadingEvents ? (
              <p className="empty-state">No upcoming events.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;