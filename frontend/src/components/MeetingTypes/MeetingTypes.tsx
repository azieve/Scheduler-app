import React, { useState, useEffect } from 'react';
import TopNav from '../Navigation/TopNav';
import './MeetingTypes.css';

interface GmailNotifications {
  enabled: boolean;
  reminder_minutes: number[];
  custom_title: string;
  custom_description: string;
  include_meeting_link: boolean;
  include_agenda: boolean;
  include_preparation_notes: boolean;
}

interface AttendeeQuestion {
  id: string;
  question: string;
  required: boolean;
  type: 'text' | 'textarea' | 'select' | 'multiple_choice';
  options?: string[];
}

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
  
  // Advanced meeting type settings
  meetingType: 'video_call' | 'phone_call' | 'in_person';
  videoProvider: 'google_meet' | 'zoom' | 'teams' | 'custom';
  customMeetingLink: string;
  autoGenerateLink: boolean;
  
  // Phone call settings
  phoneNumber: string;
  dialInNumber: string;
  phoneInstructions: string;
  
  // In-person meeting settings
  meetingAddress: string;
  meetingRoom: string;
  parkingInstructions: string;
  
  // Meeting instructions
  preMeetingInstructions: string;
  postMeetingInstructions: string;
  attendeeQuestions: AttendeeQuestion[];
  requireConfirmation: boolean;
  
  // Gmail notifications
  gmailNotifications: GmailNotifications;
  
  // Additional settings
  maxAttendees: number;
  allowGuests: boolean;
  calendarVisibility: 'busy' | 'free' | 'private';
  bookingCancellationPolicy: string;
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
    color: '#4285F4',
    
    // Advanced meeting type settings
    meetingType: 'video_call' as 'video_call' | 'phone_call' | 'in_person',
    videoProvider: 'google_meet' as 'google_meet' | 'zoom' | 'teams' | 'custom',
    customMeetingLink: '',
    autoGenerateLink: true,
    
    // Phone call settings
    phoneNumber: '',
    dialInNumber: '',
    phoneInstructions: '',
    
    // In-person meeting settings
    meetingAddress: '',
    meetingRoom: '',
    parkingInstructions: '',
    
    // Meeting instructions
    preMeetingInstructions: '',
    postMeetingInstructions: '',
    attendeeQuestions: [] as AttendeeQuestion[],
    requireConfirmation: false,
    
    // Gmail notifications
    gmailNotifications: {
      enabled: true,
      reminder_minutes: [60, 15],
      custom_title: '',
      custom_description: '',
      include_meeting_link: true,
      include_agenda: true,
      include_preparation_notes: true
    } as GmailNotifications,
    
    // Additional settings
    maxAttendees: 1,
    allowGuests: false,
    calendarVisibility: 'busy' as 'busy' | 'free' | 'private',
    bookingCancellationPolicy: ''
  });

  const [activeTab, setActiveTab] = useState('basic');

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
      color: '#4285F4',
      
      // Advanced meeting type settings
      meetingType: 'video_call',
      videoProvider: 'google_meet',
      customMeetingLink: '',
      autoGenerateLink: true,
      
      // Phone call settings
      phoneNumber: '',
      dialInNumber: '',
      phoneInstructions: '',
      
      // In-person meeting settings
      meetingAddress: '',
      meetingRoom: '',
      parkingInstructions: '',
      
      // Meeting instructions
      preMeetingInstructions: '',
      postMeetingInstructions: '',
      attendeeQuestions: [],
      requireConfirmation: false,
      
      // Gmail notifications
      gmailNotifications: {
        enabled: true,
        reminder_minutes: [60, 15],
        custom_title: '',
        custom_description: '',
        include_meeting_link: true,
        include_agenda: true,
        include_preparation_notes: true
      },
      
      // Additional settings
      maxAttendees: 1,
      allowGuests: false,
      calendarVisibility: 'busy',
      bookingCancellationPolicy: ''
    });
    setEditingType(null);
    setShowCreateForm(false);
    setActiveTab('basic');
  };

  const handleEdit = (meetingType: MeetingType) => {
    setFormData({
      name: meetingType.name || '',
      description: meetingType.description || '',
      durationMinutes: meetingType.durationMinutes || 30,
      bufferBeforeMinutes: meetingType.bufferBeforeMinutes || 0,
      bufferAfterMinutes: meetingType.bufferAfterMinutes || 0,
      location: meetingType.location || '',
      meetingLink: meetingType.meetingLink || '',
      color: meetingType.color || '#4285F4',
      
      // Advanced meeting type settings
      meetingType: meetingType.meetingType || 'video_call',
      videoProvider: meetingType.videoProvider || 'google_meet',
      customMeetingLink: meetingType.customMeetingLink || '',
      autoGenerateLink: meetingType.autoGenerateLink !== false,
      
      // Phone call settings
      phoneNumber: meetingType.phoneNumber || '',
      dialInNumber: meetingType.dialInNumber || '',
      phoneInstructions: meetingType.phoneInstructions || '',
      
      // In-person meeting settings
      meetingAddress: meetingType.meetingAddress || '',
      meetingRoom: meetingType.meetingRoom || '',
      parkingInstructions: meetingType.parkingInstructions || '',
      
      // Meeting instructions
      preMeetingInstructions: meetingType.preMeetingInstructions || '',
      postMeetingInstructions: meetingType.postMeetingInstructions || '',
      attendeeQuestions: meetingType.attendeeQuestions || [],
      requireConfirmation: meetingType.requireConfirmation || false,
      
      // Gmail notifications
      gmailNotifications: meetingType.gmailNotifications || {
        enabled: true,
        reminder_minutes: [60, 15],
        custom_title: '',
        custom_description: '',
        include_meeting_link: true,
        include_agenda: true,
        include_preparation_notes: true
      },
      
      // Additional settings
      maxAttendees: meetingType.maxAttendees || 1,
      allowGuests: meetingType.allowGuests || false,
      calendarVisibility: meetingType.calendarVisibility || 'busy',
      bookingCancellationPolicy: meetingType.bookingCancellationPolicy || ''
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
          <div className="form-modal enhanced-modal">
            <div className="form-header">
              <h2>{editingType ? 'Edit Meeting Type' : 'Create New Meeting Type'}</h2>
              <button onClick={resetForm} className="close-btn">×</button>
            </div>

            <div className="form-tabs">
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveTab('basic')}
              >
                Basic Details
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'meeting-type' ? 'active' : ''}`}
                onClick={() => setActiveTab('meeting-type')}
              >
                Meeting Type
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'instructions' ? 'active' : ''}`}
                onClick={() => setActiveTab('instructions')}
              >
                Instructions
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
                onClick={() => setActiveTab('notifications')}
              >
                Notifications
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
                onClick={() => setActiveTab('advanced')}
              >
                Advanced
              </button>
            </div>

            <form onSubmit={handleSubmit} className="meeting-form enhanced-form">
              {/* Basic Details Tab */}
              {activeTab === 'basic' && (
                <div className="tab-content">
                  <h3>Basic Meeting Information</h3>
                  
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
                      Color
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Meeting Type Tab */}
              {activeTab === 'meeting-type' && (
                <div className="tab-content">
                  <h3>Meeting Type Configuration</h3>
                  
                  <div className="form-row">
                    <label>
                      Meeting Type *
                      <select 
                        value={formData.meetingType}
                        onChange={(e) => setFormData({...formData, meetingType: e.target.value as any})}
                      >
                        <option value="video_call">Video Call</option>
                        <option value="phone_call">Phone Call</option>
                        <option value="in_person">In-Person Meeting</option>
                      </select>
                    </label>
                  </div>

                  {/* Video Call Settings */}
                  {formData.meetingType === 'video_call' && (
                    <div className="meeting-type-section">
                      <h4>Video Call Settings</h4>
                      
                      <div className="form-row">
                        <label>
                          Video Provider
                          <select 
                            value={formData.videoProvider}
                            onChange={(e) => setFormData({...formData, videoProvider: e.target.value as any})}
                          >
                            <option value="google_meet">Google Meet (Auto-generated)</option>
                            <option value="zoom">Zoom</option>
                            <option value="teams">Microsoft Teams</option>
                            <option value="custom">Custom Link</option>
                          </select>
                        </label>
                      </div>

                      <div className="form-row">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.autoGenerateLink}
                            onChange={(e) => setFormData({...formData, autoGenerateLink: e.target.checked})}
                          />
                          Auto-generate meeting links
                        </label>
                        <small>When enabled, Google Meet links are automatically created for each booking</small>
                      </div>

                      {!formData.autoGenerateLink && (
                        <div className="form-row">
                          <label>
                            Custom Meeting Link
                            <input
                              type="url"
                              value={formData.customMeetingLink}
                              onChange={(e) => setFormData({...formData, customMeetingLink: e.target.value})}
                              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Phone Call Settings */}
                  {formData.meetingType === 'phone_call' && (
                    <div className="meeting-type-section">
                      <h4>Phone Call Settings</h4>
                      
                      <div className="form-row-group">
                        <label>
                          Phone Number *
                          <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                            placeholder="+1 (555) 123-4567"
                            required
                          />
                        </label>

                        <label>
                          Dial-in Number (Optional)
                          <input
                            type="tel"
                            value={formData.dialInNumber}
                            onChange={(e) => setFormData({...formData, dialInNumber: e.target.value})}
                            placeholder="Conference dial-in number"
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Phone Instructions
                          <textarea
                            value={formData.phoneInstructions}
                            onChange={(e) => setFormData({...formData, phoneInstructions: e.target.value})}
                            placeholder="Special instructions for phone calls (e.g., call from a quiet location)"
                            rows={3}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* In-Person Meeting Settings */}
                  {formData.meetingType === 'in_person' && (
                    <div className="meeting-type-section">
                      <h4>In-Person Meeting Settings</h4>
                      
                      <div className="form-row">
                        <label>
                          Meeting Address *
                          <textarea
                            value={formData.meetingAddress}
                            onChange={(e) => setFormData({...formData, meetingAddress: e.target.value})}
                            placeholder="123 Main St, Suite 100, City, State 12345"
                            rows={3}
                            required
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Room/Office (Optional)
                          <input
                            type="text"
                            value={formData.meetingRoom}
                            onChange={(e) => setFormData({...formData, meetingRoom: e.target.value})}
                            placeholder="e.g., Conference Room A, Office 205"
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Parking Instructions
                          <textarea
                            value={formData.parkingInstructions}
                            onChange={(e) => setFormData({...formData, parkingInstructions: e.target.value})}
                            placeholder="Parking information and directions"
                            rows={3}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions Tab */}
              {activeTab === 'instructions' && (
                <div className="tab-content">
                  <h3>Meeting Instructions</h3>
                  
                  <div className="form-row">
                    <label>
                      Pre-Meeting Instructions
                      <textarea
                        value={formData.preMeetingInstructions}
                        onChange={(e) => setFormData({...formData, preMeetingInstructions: e.target.value})}
                        placeholder="Instructions for attendees before the meeting (e.g., prepare documents, test technology)"
                        rows={4}
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Post-Meeting Instructions
                      <textarea
                        value={formData.postMeetingInstructions}
                        onChange={(e) => setFormData({...formData, postMeetingInstructions: e.target.value})}
                        placeholder="Follow-up instructions after the meeting"
                        rows={4}
                      />
                    </label>
                  </div>

                  <div className="form-row">
                    <label>
                      Booking Cancellation Policy
                      <textarea
                        value={formData.bookingCancellationPolicy}
                        onChange={(e) => setFormData({...formData, bookingCancellationPolicy: e.target.value})}
                        placeholder="Cancellation policy and requirements"
                        rows={3}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="tab-content">
                  <h3>Gmail Notification Settings</h3>
                  
                  <div className="form-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.gmailNotifications.enabled}
                        onChange={(e) => setFormData({
                          ...formData, 
                          gmailNotifications: {
                            ...formData.gmailNotifications,
                            enabled: e.target.checked
                          }
                        })}
                      />
                      Enable Gmail Notifications
                    </label>
                  </div>

                  {formData.gmailNotifications.enabled && (
                    <>
                      <div className="form-row">
                        <label>
                          Custom Email Title (Optional)
                          <input
                            type="text"
                            value={formData.gmailNotifications.custom_title}
                            onChange={(e) => setFormData({
                              ...formData,
                              gmailNotifications: {
                                ...formData.gmailNotifications,
                                custom_title: e.target.value
                              }
                            })}
                            placeholder="Leave empty to use default title"
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Custom Email Description (Optional)
                          <textarea
                            value={formData.gmailNotifications.custom_description}
                            onChange={(e) => setFormData({
                              ...formData,
                              gmailNotifications: {
                                ...formData.gmailNotifications,
                                custom_description: e.target.value
                              }
                            })}
                            placeholder="Leave empty to use auto-generated description"
                            rows={4}
                          />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Email Reminder Times (minutes before meeting)
                          <input
                            type="text"
                            value={formData.gmailNotifications.reminder_minutes.join(', ')}
                            onChange={(e) => {
                              const minutes = e.target.value.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
                              setFormData({
                                ...formData,
                                gmailNotifications: {
                                  ...formData.gmailNotifications,
                                  reminder_minutes: minutes
                                }
                              });
                            }}
                            placeholder="60, 15 (separate with commas)"
                          />
                        </label>
                        <small>Common values: 1440 (24 hours), 60 (1 hour), 15 (15 minutes)</small>
                      </div>

                      <div className="notification-options">
                        <h4>Include in Email:</h4>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.gmailNotifications.include_meeting_link}
                            onChange={(e) => setFormData({
                              ...formData,
                              gmailNotifications: {
                                ...formData.gmailNotifications,
                                include_meeting_link: e.target.checked
                              }
                            })}
                          />
                          Meeting link
                        </label>
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={formData.gmailNotifications.include_preparation_notes}
                            onChange={(e) => setFormData({
                              ...formData,
                              gmailNotifications: {
                                ...formData.gmailNotifications,
                                include_preparation_notes: e.target.checked
                              }
                            })}
                          />
                          Preparation instructions
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Advanced Tab */}
              {activeTab === 'advanced' && (
                <div className="tab-content">
                  <h3>Advanced Settings</h3>
                  
                  <div className="form-row-group">
                    <label>
                      Maximum Attendees
                      <input
                        type="number"
                        value={formData.maxAttendees}
                        onChange={(e) => setFormData({...formData, maxAttendees: parseInt(e.target.value)})}
                        min="1"
                        max="100"
                      />
                    </label>

                    <label>
                      Calendar Visibility
                      <select 
                        value={formData.calendarVisibility}
                        onChange={(e) => setFormData({...formData, calendarVisibility: e.target.value as any})}
                      >
                        <option value="busy">Busy (default)</option>
                        <option value="free">Free</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.allowGuests}
                        onChange={(e) => setFormData({...formData, allowGuests: e.target.checked})}
                      />
                      Allow guests to invite others
                    </label>
                  </div>

                  <div className="form-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.requireConfirmation}
                        onChange={(e) => setFormData({...formData, requireConfirmation: e.target.checked})}
                      />
                      Require manual confirmation for bookings
                    </label>
                  </div>
                </div>
              )}

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