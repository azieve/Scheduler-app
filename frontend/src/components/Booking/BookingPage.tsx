import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './BookingPage.css';

interface MeetingType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  formattedDuration: string;
  location: string;
  color: string;
  publicSlug: string;
}

interface User {
  username: string;
  fullName: string;
  email: string;
}

interface BookingData {
  meetingType: MeetingType;
  user: User;
}

const BookingPage: React.FC = () => {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username && slug) {
      fetchBookingData();
    }
  }, [username, slug]);

  const fetchBookingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/book/${username}/${slug}`);

      if (response.ok) {
        const data = await response.json();
        setBookingData(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Meeting type not found');
      }
    } catch (error) {
      console.error('Error fetching booking data:', error);
      setError('Failed to load booking page');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="booking-page">
        <div className="error-state">
          <h2>Meeting Not Found</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="booking-page">
        <div className="error-state">
          <h2>Meeting Not Found</h2>
          <p>The requested meeting type could not be found.</p>
        </div>
      </div>
    );
  }

  const { meetingType, user } = bookingData;

  return (
    <div className="booking-page">
      <div className="booking-header">
        <div className="user-info">
          <h1>{user.fullName}</h1>
          <p>@{user.username}</p>
        </div>
      </div>

      <div className="booking-content">
        <div className="meeting-info">
          <div className="meeting-header" style={{ borderLeftColor: meetingType.color }}>
            <h2>{meetingType.name}</h2>
            <div className="meeting-duration">{meetingType.formattedDuration}</div>
          </div>

          {meetingType.description && (
            <div className="meeting-description">
              <p>{meetingType.description}</p>
            </div>
          )}

          {meetingType.location && (
            <div className="meeting-location">
              <strong>Location:</strong> {meetingType.location}
            </div>
          )}
        </div>

        <div className="booking-form-section">
          <h3>Select a time</h3>
          <div className="time-slots-placeholder">
            <p>Time slot selection will be implemented next.</p>
            <p>This will show available times based on the user's calendar and availability settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;