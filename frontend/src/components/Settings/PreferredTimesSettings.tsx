import React, { useState } from 'react';

interface PreferredTimeSlot {
  start: string;
  end: string;
  label?: string;
}

interface PreferredTimesSettingsProps {
  preferredMeetingTimes?: {
    [key: string]: PreferredTimeSlot[];
  };
  onUpdate: (updates: { preferredMeetingTimes: { [key: string]: PreferredTimeSlot[] } }) => Promise<void>;
}

const PreferredTimesSettings: React.FC<PreferredTimesSettingsProps> = ({
  preferredMeetingTimes = {},
  onUpdate
}) => {
  const [localPreferredTimes, setLocalPreferredTimes] = useState<{[key: string]: PreferredTimeSlot[]}>(
    preferredMeetingTimes || {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }
  );
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({
        preferredMeetingTimes: localPreferredTimes
      });
    } catch (error) {
      console.error('Failed to save preferred times:', error);
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (day: string) => {
    setLocalPreferredTimes(prev => ({
      ...prev,
      [day]: [
        ...prev[day],
        { start: '09:00', end: '10:00', label: '' }
      ]
    }));
  };

  const updateTimeSlot = (day: string, index: number, field: keyof PreferredTimeSlot, value: string) => {
    setLocalPreferredTimes(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const removeTimeSlot = (day: string, index: number) => {
    setLocalPreferredTimes(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const toggleDayExpanded = (day: string) => {
    setExpandedDay(expandedDay === day ? null : day);
  };

  const formatTimeRange = (slots: PreferredTimeSlot[]) => {
    if (slots.length === 0) return 'No preferred times';
    return slots.map(slot => `${slot.start}-${slot.end}`).join(', ');
  };

  return (
    <div className="preferred-times-settings">
      <div className="settings-section">
        <h3>Preferred Meeting Times</h3>
        <p>Set your preferred times for meetings. These will be highlighted on your booking page to guide clients toward your optimal schedule.</p>

        <div className="days-list">
          {Object.entries(dayNames).map(([day, displayName]) => (
            <div key={day} className="day-section">
              <div 
                className="day-header"
                onClick={() => toggleDayExpanded(day)}
              >
                <div className="day-info">
                  <h4>{displayName}</h4>
                  <span className="time-summary">
                    {formatTimeRange(localPreferredTimes[day] || [])}
                  </span>
                </div>
                <button 
                  type="button"
                  className="expand-toggle"
                  aria-label={`${expandedDay === day ? 'Collapse' : 'Expand'} ${displayName}`}
                >
                  {expandedDay === day ? '−' : '+'}
                </button>
              </div>

              {expandedDay === day && (
                <div className="day-content">
                  <div className="time-slots">
                    {(localPreferredTimes[day] || []).map((slot, index) => (
                      <div key={index} className="time-slot">
                        <div className="time-inputs">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(day, index, 'start', e.target.value)}
                            className="time-input"
                          />
                          <span className="time-separator">to</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(day, index, 'end', e.target.value)}
                            className="time-input"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Label (optional)"
                          value={slot.label || ''}
                          onChange={(e) => updateTimeSlot(day, index, 'label', e.target.value)}
                          className="label-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(day, index)}
                          className="remove-slot-btn"
                          aria-label="Remove time slot"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => addTimeSlot(day)}
                    className="add-slot-btn"
                  >
                    + Add Time Slot
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="settings-actions">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="save-btn"
          >
            {saving ? 'Saving...' : 'Save Preferred Times'}
          </button>
        </div>

        <div className="preferred-times-help">
          <h4>How Preferred Times Work</h4>
          <ul>
            <li><strong>Highlight preferred slots:</strong> Times you set will be visually highlighted on your booking page</li>
            <li><strong>Guide your clients:</strong> Clients will see which times work best for you</li>
            <li><strong>Optional labels:</strong> Add labels like "Morning Focus" or "Afternoon Meetings"</li>
            <li><strong>Flexible scheduling:</strong> Clients can still book outside preferred times if available</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PreferredTimesSettings;