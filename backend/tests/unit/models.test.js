const User = require('../../src/models/User');
const MeetingType = require('../../src/models/MeetingType');

describe('User Model', () => {
  describe('generateUsername', () => {
    test('should generate username from email', () => {
      const email = 'john.doe@example.com';
      const username = User.generateUsername(email);
      expect(username).toBe('johndoe');
    });

    test('should handle special characters in email', () => {
      const email = 'user+test@example.com';
      const username = User.generateUsername(email);
      expect(username).toBe('usertest');
    });

    test('should handle uppercase letters', () => {
      const email = 'JOHN.DOE@EXAMPLE.COM';
      const username = User.generateUsername(email);
      expect(username).toBe('johndoe');
    });
  });
});

describe('MeetingType Model', () => {
  describe('generateSlug', () => {
    test('should generate slug from name', () => {
      const name = 'My Meeting Type';
      const slug = MeetingType.generateSlug(name);
      expect(slug).toBe('my-meeting-type');
    });

    test('should handle special characters', () => {
      const name = 'Meeting & Discussion!';
      const slug = MeetingType.generateSlug(name);
      expect(slug).toBe('meeting-discussion');
    });

    test('should handle multiple spaces and hyphens', () => {
      const name = 'Multiple   Spaces -- Test';
      const slug = MeetingType.generateSlug(name);
      expect(slug).toBe('multiple-spaces-test');
    });
  });

  describe('getBookingUrl', () => {
    let meetingType;

    beforeEach(() => {
      meetingType = {
        publicSlug: 'test-meeting',
        getBookingUrl: MeetingType.prototype.getBookingUrl
      };
    });

    test('should generate URL with username', () => {
      const user = { username: 'johndoe' };
      const url = meetingType.getBookingUrl(user);
      expect(url).toBe('http://localhost:3000/johndoe/test-meeting');
    });

    test('should generate placeholder URL without user', () => {
      const url = meetingType.getBookingUrl();
      expect(url).toBe('http://localhost:3000/book/[username]/test-meeting');
    });

    test('should use custom base URL', () => {
      const user = { username: 'johndoe' };
      const url = meetingType.getBookingUrl(user, 'https://example.com');
      expect(url).toBe('https://example.com/johndoe/test-meeting');
    });
  });
});