// Test setup file for Jest
require('dotenv').config({ path: '.env.test' });

// Mock external dependencies for testing
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        setCredentials: jest.fn(),
        on: jest.fn()
      }))
    },
    calendar: jest.fn().mockReturnValue({
      calendarList: {
        list: jest.fn().mockResolvedValue({
          data: { items: [] }
        })
      },
      events: {
        list: jest.fn().mockResolvedValue({
          data: { items: [] }
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'test-event-id' }
        })
      }
    })
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://scheduler_user:scheduler_password@localhost:5432/scheduler_test_db';