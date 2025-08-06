import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/Auth/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import MeetingTypes from './components/MeetingTypes/MeetingTypes';
import BookingPage from './components/Booking/BookingPage';
import UserSettings from './components/Settings/UserSettings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/meeting-types" element={<MeetingTypes />} />
          <Route path="/settings" element={<UserSettings />} />
          <Route path="/:username/:slug" element={<BookingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
