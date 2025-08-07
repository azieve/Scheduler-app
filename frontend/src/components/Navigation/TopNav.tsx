import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TopNav.css';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
}

const TopNav: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
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
        // Redirect to login if not authenticated
        navigate('/');
      }
    } catch (err) {
      console.error('Auth error:', err);
      navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Redirect to login
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!user) {
    return null; // Don't render anything if user is not loaded
  }

  return (
    <nav className="top-nav">
      <div className="nav-container">
        <div className="nav-left">
          <button 
            onClick={() => navigate('/dashboard')}
            className="logo-btn"
          >
            ReadyToMeet.me
          </button>
        </div>

        <div className="nav-center">
          <button 
            onClick={() => navigate('/meeting-types')}
            className="nav-btn manage-meetings-btn"
          >
            📅 Manage Meetings
          </button>
          <button 
            onClick={() => navigate('/calendars')}
            className="nav-btn manage-calendars-btn"
          >
            🗓️ Calendars
          </button>
        </div>

        <div className="nav-right">
          <div className="user-info">
            <span className="user-name">👋 {user.fullName || user.email}</span>
            <button 
              onClick={() => navigate('/settings')} 
              className="settings-btn"
            >
              ⚙️ Settings
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;