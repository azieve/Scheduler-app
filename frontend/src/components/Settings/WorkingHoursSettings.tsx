import React, { useState } from 'react';

interface WorkingHours {
  [key: string]: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface WorkingHoursSettingsProps {
  workingHours: WorkingHours;
  timezone: string;
  onUpdate: (updates: { workingHours?: WorkingHours; timezone?: string }) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const WorkingHoursSettings: React.FC<WorkingHoursSettingsProps> = ({
  workingHours,
  timezone,
  onUpdate,
}) => {
  const [localWorkingHours, setLocalWorkingHours] = useState<WorkingHours>(workingHours);
  const [localTimezone, setLocalTimezone] = useState(timezone);
  const [hasChanges, setHasChanges] = useState(false);

  const updateDay = (day: string, field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    const newWorkingHours = {
      ...localWorkingHours,
      [day]: {
        ...localWorkingHours[day],
        [field]: value,
      },
    };
    setLocalWorkingHours(newWorkingHours);
    setHasChanges(true);
  };

  const toggleAllDays = (enabled: boolean) => {
    const newWorkingHours = { ...localWorkingHours };
    DAYS_OF_WEEK.forEach(({ key }) => {
      newWorkingHours[key] = {
        ...newWorkingHours[key],
        enabled,
      };
    });
    setLocalWorkingHours(newWorkingHours);
    setHasChanges(true);
  };

  const setBusinessHours = () => {
    const newWorkingHours = { ...localWorkingHours };
    DAYS_OF_WEEK.forEach(({ key }) => {
      const isWeekday = !['saturday', 'sunday'].includes(key);
      newWorkingHours[key] = {
        enabled: isWeekday,
        start: '09:00',
        end: '17:00',
      };
    });
    setLocalWorkingHours(newWorkingHours);
    setHasChanges(true);
  };

  const saveChanges = () => {
    onUpdate({
      workingHours: localWorkingHours,
      timezone: localTimezone,
    });
    setHasChanges(false);
  };

  const resetChanges = () => {
    setLocalWorkingHours(workingHours);
    setLocalTimezone(timezone);
    setHasChanges(false);
  };

  return (
    <div className="working-hours-settings">
      <div className="settings-section">
        <h2>Working Hours</h2>
        <p>Set your availability for each day of the week</p>

        <div className="quick-actions">
          <button onClick={() => toggleAllDays(true)} className="quick-action-btn">
            Enable All Days
          </button>
          <button onClick={() => toggleAllDays(false)} className="quick-action-btn">
            Disable All Days
          </button>
          <button onClick={setBusinessHours} className="quick-action-btn">
            Set Business Hours (9-5, Mon-Fri)
          </button>
        </div>

        <div className="days-grid">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const daySettings = localWorkingHours[key] || { enabled: false, start: '09:00', end: '17:00' };
            
            return (
              <div key={key} className={`day-settings ${daySettings.enabled ? 'enabled' : 'disabled'}`}>
                <div className="day-header">
                  <label className="day-toggle">
                    <input
                      type="checkbox"
                      checked={daySettings.enabled}
                      onChange={(e) => updateDay(key, 'enabled', e.target.checked)}
                    />
                    <span className="day-name">{label}</span>
                  </label>
                </div>
                
                {daySettings.enabled && (
                  <div className="time-inputs">
                    <div className="time-input-group">
                      <label>Start</label>
                      <input
                        type="time"
                        value={daySettings.start}
                        onChange={(e) => updateDay(key, 'start', e.target.value)}
                        className="time-input"
                      />
                    </div>
                    <div className="time-input-group">
                      <label>End</label>
                      <input
                        type="time"
                        value={daySettings.end}
                        onChange={(e) => updateDay(key, 'end', e.target.value)}
                        className="time-input"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <h3>Timezone</h3>
        <select
          value={localTimezone}
          onChange={(e) => {
            setLocalTimezone(e.target.value);
            setHasChanges(true);
          }}
          className="timezone-select"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {hasChanges && (
        <div className="changes-actions">
          <button onClick={saveChanges} className="save-btn">
            Save Changes
          </button>
          <button onClick={resetChanges} className="cancel-btn">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default WorkingHoursSettings;