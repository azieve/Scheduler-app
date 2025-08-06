const AvailabilityService = require('../../src/services/availabilityService');

describe('AvailabilityService', () => {
  describe('formatTime', () => {
    test('should format time in 12-hour format', () => {
      const date = new Date('2024-01-01T14:30:00Z');
      const formatted = AvailabilityService.formatTime(date);
      expect(formatted).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    });

    test('should handle midnight', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const formatted = AvailabilityService.formatTime(date);
      expect(formatted).toMatch(/12:00 AM/);
    });

    test('should handle noon', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = AvailabilityService.formatTime(date);
      expect(formatted).toMatch(/12:00 PM/);
    });
  });

  describe('formatDate', () => {
    test('should format date in readable format', () => {
      const date = new Date('2024-01-01T12:00:00Z');
      const formatted = AvailabilityService.formatDate(date);
      expect(formatted).toMatch(/Monday, January \d{1,2}, 2024/);
    });
  });

  describe('generateTimeSlots', () => {
    test('should generate time slots with correct duration', () => {
      const startTime = new Date('2024-01-01T09:00:00Z');
      const endTime = new Date('2024-01-01T10:00:00Z');
      const duration = 30;

      const slots = AvailabilityService.generateTimeSlots(startTime, endTime, duration);

      expect(slots).toHaveLength(3); // 9:00-9:30, 9:15-9:45, 9:30-10:00
      expect(slots[0].start).toEqual(expect.any(Date));
      expect(slots[0].end).toEqual(expect.any(Date));
      expect(slots[0].startTime).toEqual(expect.any(String));
      expect(slots[0].endTime).toEqual(expect.any(String));
    });

    test('should generate no slots if duration exceeds available time', () => {
      const startTime = new Date('2024-01-01T09:00:00Z');
      const endTime = new Date('2024-01-01T09:15:00Z');
      const duration = 30;

      const slots = AvailabilityService.generateTimeSlots(startTime, endTime, duration);

      expect(slots).toHaveLength(0);
    });

    test('should filter past times for today', () => {
      const now = new Date();
      const today = new Date(now);
      today.setHours(9, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(17, 0, 0, 0);

      const slots = AvailabilityService.generateTimeSlots(today, endOfDay, 30);

      // Should have some slots but not include past times
      expect(slots.length).toBeGreaterThanOrEqual(0);
      if (slots.length > 0) {
        expect(new Date(slots[0].start).getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });
});