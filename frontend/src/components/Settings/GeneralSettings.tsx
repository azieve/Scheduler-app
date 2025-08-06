import React, { useState } from 'react';

interface GeneralSettingsProps {
  settings: {
    defaultBufferBefore: number;
    defaultBufferAfter: number;
    minimumNoticeMinutes: number;
    maxAdvanceDays: number;
    allowBackToBackBookings: boolean;
    autoConfirmBookings: boolean;
  };
  onUpdate: (updates: any) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate }) => {
  const [localSettings, setLocalSettings] = useState(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = (field: string, value: number | boolean) => {
    setLocalSettings({
      ...localSettings,
      [field]: value,
    });
    setHasChanges(true);
  };

  const saveChanges = () => {
    onUpdate(localSettings);
    setHasChanges(false);
  };

  const resetChanges = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  return (
    <div className="general-settings">
      <div className="settings-section">
        <h2>Buffer Times</h2>
        <p>Add buffer time before and after meetings to prevent back-to-back scheduling</p>
        
        <div className="setting-group">
          <label>Buffer Before Meeting (minutes)</label>
          <input
            type="number"
            min="0"
            max="60"
            value={localSettings.defaultBufferBefore}
            onChange={(e) => updateSetting('defaultBufferBefore', parseInt(e.target.value) || 0)}
            className="number-input"
          />
          <small>Time blocked before each meeting starts</small>
        </div>

        <div className="setting-group">
          <label>Buffer After Meeting (minutes)</label>
          <input
            type="number"
            min="0"
            max="60"
            value={localSettings.defaultBufferAfter}
            onChange={(e) => updateSetting('defaultBufferAfter', parseInt(e.target.value) || 0)}
            className="number-input"
          />
          <small>Time blocked after each meeting ends</small>
        </div>
      </div>

      <div className="settings-section">
        <h2>Booking Restrictions</h2>
        <p>Control when people can book meetings with you</p>
        
        <div className="setting-group">
          <label>Minimum Notice (minutes)</label>
          <input
            type="number"
            min="0"
            max="1440"
            step="15"
            value={localSettings.minimumNoticeMinutes}
            onChange={(e) => updateSetting('minimumNoticeMinutes', parseInt(e.target.value) || 0)}
            className="number-input"
          />
          <small>How far in advance someone must book a meeting</small>
        </div>

        <div className="setting-group">
          <label>Maximum Advance Booking (days)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={localSettings.maxAdvanceDays}
            onChange={(e) => updateSetting('maxAdvanceDays', parseInt(e.target.value) || 30)}
            className="number-input"
          />
          <small>How far in the future people can book meetings</small>
        </div>
      </div>

      <div className="settings-section">
        <h2>Booking Preferences</h2>
        <p>Configure how bookings are handled</p>
        
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={localSettings.allowBackToBackBookings}
              onChange={(e) => updateSetting('allowBackToBackBookings', e.target.checked)}
            />
            <span>Allow Back-to-Back Bookings</span>
          </label>
          <small>Permit meetings to be scheduled consecutively without buffer time</small>
        </div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={localSettings.autoConfirmBookings}
              onChange={(e) => updateSetting('autoConfirmBookings', e.target.checked)}
            />
            <span>Auto-Confirm Bookings</span>
          </label>
          <small>Automatically confirm new bookings without manual approval</small>
        </div>
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

export default GeneralSettings;