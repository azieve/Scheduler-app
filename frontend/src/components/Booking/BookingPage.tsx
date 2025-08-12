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

interface TimeSlot {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  isPreferred?: boolean;
  preferredLabel?: string;
}

interface AvailabilityData {
  date: string;
  formattedDate: string;
  availableSlots: TimeSlot[];
  meetingType: {
    name: string;
    durationMinutes: number;
    formattedDuration: string;
  };
  user: {
    username: string;
    fullName: string;
  };
}

const BookingPage: React.FC = () => {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    attendeeName: '',
    attendeeEmail: '',
    attendeePhone: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (username && slug) {
      fetchBookingData();
    }
  }, [username, slug]);

  useEffect(() => {
    // Set default selected date to today
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    setSelectedDate(dateStr);
  }, []);

  useEffect(() => {
    if (selectedDate && username && slug) {
      fetchAvailability();
    }
  }, [selectedDate, username, slug]);

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

  const fetchAvailability = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/availability/${username}/${slug}/${selectedDate}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Availability data:', data.data);
        console.log('Available slots with preferred info:', data.data.availableSlots.filter((slot: TimeSlot) => slot.isPreferred));
        setAvailabilityData(data.data);
      } else {
        console.error('Failed to fetch availability');
        setAvailabilityData(null);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
      setAvailabilityData(null);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      setSubmitting(true);
      const response = await fetch(`http://localhost:3001/api/book/${username}/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...bookingForm,
          startTime: selectedSlot.start,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Booking confirmed! You should receive a calendar invitation shortly.');
        // Reset form
        setShowBookingForm(false);
        setSelectedSlot(null);
        setBookingForm({
          attendeeName: '',
          attendeeEmail: '',
          attendeePhone: '',
          notes: ''
        });
        // Refresh availability
        fetchAvailability();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const getNextSevenDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : 
               date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    
    return days;
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
          
          {/* Date Selection */}
          <div className="date-selection">
            <h4>Choose a date:</h4>
            <div className="date-buttons">
              {getNextSevenDays().map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  className={`date-btn ${selectedDate === day.date ? 'selected' : ''}`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div className="time-slots">
              <div className="time-slots-header">
                <h4>Available times for {availabilityData?.formattedDate}:</h4>
                <div className="preferred-times-legend">
                  <span className="legend-item">
                    <span className="legend-star">⭐</span>
                    <span className="legend-text">Preferred times</span>
                  </span>
                </div>
              </div>
              {availabilityData ? (
                availabilityData.availableSlots.length > 0 ? (
                  <div className="slots-grid">
                    {availabilityData.availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => handleSlotSelect(slot)}
                        className={`slot-btn ${slot.isPreferred ? 'preferred-slot' : ''}`}
                        title={slot.isPreferred ? `Preferred time${slot.preferredLabel ? ': ' + slot.preferredLabel : ''}` : undefined}
                      >
                        <span className="slot-time">{slot.startTime}</span>
                        {slot.isPreferred && (
                          <span className="preferred-indicator" aria-label="Preferred time">
                            ⭐
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="no-slots">No available time slots for this date.</p>
                )
              ) : (
                <p>Loading available times...</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedSlot && (
        <div className="form-overlay">
          <div className="form-modal">
            <div className="form-header">
              <h2>Book your {meetingType.name}</h2>
              <button onClick={() => setShowBookingForm(false)} className="close-btn">×</button>
            </div>

            <div className="booking-summary">
              <p><strong>Date & Time:</strong> {availabilityData?.formattedDate} at {selectedSlot.startTime}</p>
              <p><strong>Duration:</strong> {meetingType.formattedDuration}</p>
              {meetingType.location && <p><strong>Location:</strong> {meetingType.location}</p>}
            </div>

            <form onSubmit={handleBookingSubmit} className="booking-form">
              <div className="form-row">
                <label>
                  Your Name *
                  <input
                    type="text"
                    value={bookingForm.attendeeName}
                    onChange={(e) => setBookingForm({...bookingForm, attendeeName: e.target.value})}
                    required
                    placeholder="Enter your full name"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Email Address *
                  <input
                    type="email"
                    value={bookingForm.attendeeEmail}
                    onChange={(e) => setBookingForm({...bookingForm, attendeeEmail: e.target.value})}
                    required
                    placeholder="your@email.com"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Phone Number (Optional)
                  <input
                    type="tel"
                    value={bookingForm.attendeePhone}
                    onChange={(e) => setBookingForm({...bookingForm, attendeePhone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Additional Notes (Optional)
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                    placeholder="Any additional information or questions..."
                    rows={3}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowBookingForm(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="book-btn">
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingPage;