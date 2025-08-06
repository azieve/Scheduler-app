import React, { useState, useEffect } from 'react';

interface BlockedTime {
  id: number;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  isRecurring: boolean;
  recurrencePattern?: {
    type: string;
    days?: string[];
  };
  recurrenceEndDate?: string;
}

const BlockedTimesSettings: React.FC = () => {
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    title: '',
    description: '',
    isRecurring: false,
    recurrenceType: 'weekly',
    recurringDays: [] as string[],
    recurrenceEndDate: '',
  });

  useEffect(() => {
    fetchBlockedTimes();
  }, []);

  const fetchBlockedTimes = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/user-settings/blocked-times', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch blocked times');
      }

      const data = await response.json();
      setBlockedTimes(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load blocked times');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        startTime: formData.startTime,
        endTime: formData.endTime,
        title: formData.title,
        description: formData.description,
        isRecurring: formData.isRecurring,
        recurrencePattern: formData.isRecurring ? {
          type: formData.recurrenceType,
          days: formData.recurringDays,
        } : null,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
      };

      const url = editingId 
        ? `http://localhost:3001/api/user-settings/blocked-times/${editingId}`
        : 'http://localhost:3001/api/user-settings/blocked-times';
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingId ? 'update' : 'create'} blocked time`);
      }

      await fetchBlockedTimes();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save blocked time');
    }
  };

  const handleEdit = (blockedTime: BlockedTime) => {
    setFormData({
      startTime: blockedTime.startTime,
      endTime: blockedTime.endTime,
      title: blockedTime.title,
      description: blockedTime.description,
      isRecurring: blockedTime.isRecurring,
      recurrenceType: blockedTime.recurrencePattern?.type || 'weekly',
      recurringDays: blockedTime.recurrencePattern?.days || [],
      recurrenceEndDate: blockedTime.recurrenceEndDate || '',
    });
    setEditingId(blockedTime.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this blocked time?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/user-settings/blocked-times/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete blocked time');
      }

      await fetchBlockedTimes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete blocked time');
    }
  };

  const resetForm = () => {
    setFormData({
      startTime: '',
      endTime: '',
      title: '',
      description: '',
      isRecurring: false,
      recurrenceType: 'weekly',
      recurringDays: [],
      recurrenceEndDate: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleRecurringDay = (day: string) => {
    setFormData({
      ...formData,
      recurringDays: formData.recurringDays.includes(day)
        ? formData.recurringDays.filter(d => d !== day)
        : [...formData.recurringDays, day],
    });
  };

  if (loading) {
    return <div className="loading-spinner">Loading blocked times...</div>;
  }

  return (
    <div className="blocked-times-settings">
      <div className="settings-section">
        <h2>Blocked Times</h2>
        <p>Block out times when you're unavailable for meetings</p>

        <button
          onClick={() => setShowForm(!showForm)}
          className="add-blocked-time-btn"
        >
          {showForm ? 'Cancel' : 'Add Blocked Time'}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="blocked-time-form">
            <div className="form-row">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Lunch Break"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                />
                <span>Recurring</span>
              </label>
            </div>

            {formData.isRecurring && (
              <div className="recurring-settings">
                <div className="form-group">
                  <label>Repeat on days:</label>
                  <div className="days-checkboxes">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <label key={day} className="day-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.recurringDays.includes(day)}
                          onChange={() => toggleRecurringDay(day)}
                        />
                        <span>{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>End Recurrence (optional)</label>
                  <input
                    type="date"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="save-btn">
                {editingId ? 'Update' : 'Create'} Blocked Time
              </button>
              <button type="button" onClick={resetForm} className="cancel-btn">
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="blocked-times-list">
          {blockedTimes.length === 0 ? (
            <div className="empty-state">
              No blocked times configured. Add one to get started.
            </div>
          ) : (
            blockedTimes.map((blockedTime) => (
              <div key={blockedTime.id} className="blocked-time-item">
                <div className="blocked-time-info">
                  <h4>{blockedTime.title}</h4>
                  {blockedTime.description && <p>{blockedTime.description}</p>}
                  <div className="time-info">
                    {new Date(blockedTime.startTime).toLocaleString()} - {new Date(blockedTime.endTime).toLocaleString()}
                  </div>
                  {blockedTime.isRecurring && (
                    <div className="recurring-info">
                      Recurring weekly on {blockedTime.recurrencePattern?.days?.join(', ')}
                    </div>
                  )}
                </div>
                <div className="blocked-time-actions">
                  <button onClick={() => handleEdit(blockedTime)} className="edit-btn">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(blockedTime.id)} className="delete-btn">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockedTimesSettings;