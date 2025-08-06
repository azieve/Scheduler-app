import React, { useState, useEffect } from 'react';
import TopNav from '../Navigation/TopNav';
import './MeetingTypes.css';

interface MeetingType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  location: string;
  meetingLink: string;
  color: string;
  isActive: boolean;
  publicSlug: string;
  bookingUrl: string;
  createdAt: string;
  updatedAt: string;
}

const MeetingTypes: React.FC = () => {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingType, setEditingType] = useState<MeetingType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    location: '',
    meetingLink: '',
    color: '#4285F4'
  });

  useEffect(() => {
    fetchMeetingTypes();
  }, []);

  const fetchMeetingTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/meeting-types', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setMeetingTypes(data.data.meetingTypes);
      } else {
        console.error('Failed to fetch meeting types');
      }
    } catch (error) {
      console.error('Error fetching meeting types:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      location: '',
      meetingLink: '',
      color: '#4285F4'
    });
    setEditingType(null);
    setShowCreateForm(false);
  };

  const handleEdit = (meetingType: MeetingType) => {
    setFormData({
      name: meetingType.name,
      description: meetingType.description,
      durationMinutes: meetingType.durationMinutes,
      bufferBeforeMinutes: meetingType.bufferBeforeMinutes,
      bufferAfterMinutes: meetingType.bufferAfterMinutes,
      location: meetingType.location,
      meetingLink: meetingType.meetingLink,
      color: meetingType.color
    });
    setEditingType(meetingType);
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingType 
        ? `http://localhost:3001/api/meeting-types/${editingType.id}`
        : 'http://localhost:3001/api/meeting-types';
      
      const method = editingType ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchMeetingTypes();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save meeting type');
      }
    } catch (error) {
      console.error('Error saving meeting type:', error);
      alert('Failed to save meeting type');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this meeting type?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/meeting-types/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchMeetingTypes();
      } else {
        alert('Failed to delete meeting type');
      }
    } catch (error) {
      console.error('Error deleting meeting type:', error);
      alert('Failed to delete meeting type');
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}min`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}min`;
    }
  };

  const copyBookingLink = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Booking link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="meeting-types-container">
        <div className="loading">Loading meeting types...</div>
      </div>
    );
  }

  return (
    <div className="meeting-types-container">
      <TopNav />
      
      <div className="meeting-types-content">
        <div className="meeting-types-header">
          <h1>Meeting Types</h1>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="create-btn"
          >
            + Create Meeting Type
          </button>
        </div>

      {showCreateForm && (
        <div className="form-overlay">
          <div className="form-modal">
            <div className="form-header">
              <h2>{editingType ? 'Edit Meeting Type' : 'Create New Meeting Type'}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>

            <form onSubmit={handleSubmit} className="meeting-form">
              <div className="form-row">
                <label>
                  Meeting Name *
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    placeholder="e.g., 30-minute consultation"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Description
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of this meeting type"
                    rows={3}
                  />
                </label>
              </div>

              <div className="form-row-group">
                <label>
                  Duration (minutes) *
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({...formData, durationMinutes: parseInt(e.target.value)})}
                    min="5"
                    max="480"
                    required
                  />
                </label>

                <label>
                  Buffer Before (minutes)
                  <input
                    type="number"
                    value={formData.bufferBeforeMinutes}
                    onChange={(e) => setFormData({...formData, bufferBeforeMinutes: parseInt(e.target.value)})}
                    min="0"
                    max="60"
                  />
                </label>

                <label>
                  Buffer After (minutes)
                  <input
                    type="number"
                    value={formData.bufferAfterMinutes}
                    onChange={(e) => setFormData({...formData, bufferAfterMinutes: parseInt(e.target.value)})}
                    min="0"
                    max="60"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Location
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Office, Zoom, Google Meet"
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Meeting Link
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({...formData, meetingLink: e.target.value})}
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                  />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Color
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={resetForm} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingType ? 'Update' : 'Create'} Meeting Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="meeting-types-grid">
        {meetingTypes.map((meetingType) => (
          <div key={meetingType.id} className="meeting-type-card">
            <div className="card-header" style={{ borderTopColor: meetingType.color }}>
              <h3>{meetingType.name}</h3>
              <div className="card-actions">
                <button onClick={() => handleEdit(meetingType)} className="edit-btn">
                  Edit
                </button>
                <button onClick={() => handleDelete(meetingType.id)} className="delete-btn">
                  Delete
                </button>
              </div>
            </div>

            <div className="card-content">
              {meetingType.description && (
                <p className="description">{meetingType.description}</p>
              )}

              <div className="meeting-details">
                <div className="detail">
                  <strong>Duration:</strong> {formatDuration(meetingType.durationMinutes)}
                </div>
                {meetingType.bufferBeforeMinutes > 0 && (
                  <div className="detail">
                    <strong>Buffer Before:</strong> {meetingType.bufferBeforeMinutes}min
                  </div>
                )}
                {meetingType.bufferAfterMinutes > 0 && (
                  <div className="detail">
                    <strong>Buffer After:</strong> {meetingType.bufferAfterMinutes}min
                  </div>
                )}
                {meetingType.location && (
                  <div className="detail">
                    <strong>Location:</strong> {meetingType.location}
                  </div>
                )}
              </div>

              <div className="booking-link">
                <label>Booking Link:</label>
                <div className="link-container">
                  <input 
                    type="text" 
                    value={meetingType.bookingUrl} 
                    readOnly 
                    className="link-input"
                  />
                  <button 
                    onClick={() => copyBookingLink(meetingType.bookingUrl)}
                    className="copy-btn"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {meetingTypes.length === 0 && (
          <div className="empty-state">
            <h3>No meeting types yet</h3>
            <p>Create your first meeting type to start accepting bookings!</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="create-btn"
            >
              Create Meeting Type
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default MeetingTypes;