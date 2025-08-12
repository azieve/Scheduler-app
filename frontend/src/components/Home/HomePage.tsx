import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSignUp = () => {
    window.location.href = 'http://localhost:3001/api/auth/google';
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <h2>📅 ScheduleEase</h2>
          </div>
          <div className="nav-actions">
            <button onClick={handleLogin} className="nav-btn login-btn">
              Sign In
            </button>
            <button onClick={handleSignUp} className="nav-btn signup-btn">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              Scheduling Made <span className="gradient-text">Simple</span>
            </h1>
            <p className="hero-subtitle">
              Stop the back-and-forth emails. Share your calendar, let others book time with you seamlessly.
              Integrate with multiple Google accounts, set preferred times, and automate your scheduling workflow.
            </p>
            <div className="hero-actions">
              <button onClick={handleSignUp} className="cta-button primary">
                Start Scheduling Free
                <span className="cta-arrow">→</span>
              </button>
              <button className="cta-button secondary">
                <span className="play-icon">▶</span>
                See How It Works
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">10k+</span>
                <span className="stat-label">Meetings Scheduled</span>
              </div>
              <div className="stat">
                <span className="stat-number">500+</span>
                <span className="stat-label">Happy Users</span>
              </div>
              <div className="stat">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="calendar-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="mockup-title">Your Schedule</div>
              </div>
              <div className="mockup-calendar">
                <div className="calendar-day">
                  <div className="day-header">Monday, Aug 12</div>
                  <div className="time-slots">
                    <div className="slot available">9:00 AM</div>
                    <div className="slot preferred">⭐ 2:00 PM</div>
                    <div className="slot available">4:00 PM</div>
                  </div>
                </div>
                <div className="calendar-day">
                  <div className="day-header">Tuesday, Aug 13</div>
                  <div className="time-slots">
                    <div className="slot busy">10:00 AM - Busy</div>
                    <div className="slot preferred">⭐ 1:00 PM</div>
                    <div className="slot available">3:00 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <div className="section-header">
            <h2>Everything you need to schedule smarter</h2>
            <p>Powerful features that make scheduling effortless for everyone</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h3>Multiple Calendar Integration</h3>
              <p>Connect all your Google accounts - personal, work, and side projects. We'll check availability across all calendars automatically.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3>Preferred Times</h3>
              <p>Set your golden hours when you prefer meetings. Visitors see these highlighted, making it easier to book when you're at your best.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🚫</div>
              <h3>Smart Blocking</h3>
              <p>Block focus time, lunch breaks, or recurring personal commitments. Your availability stays accurate without manual updates.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Confirmations</h3>
              <p>Bookings are confirmed instantly with calendar invites sent automatically. No more waiting or forgotten meetings.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Custom Meeting Types</h3>
              <p>Coffee chats, strategy sessions, or quick calls - create different meeting types with custom durations, locations, and descriptions.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3>Privacy Controls</h3>
              <p>Set minimum notice periods, maximum booking windows, and buffer times. You control when and how people can book with you.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="how-it-works-container">
          <div className="section-header">
            <h2>Get started in minutes</h2>
            <p>Three simple steps to transform your scheduling</p>
          </div>
          
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Connect Your Calendars</h3>
                <p>Sign in with Google and connect all your calendar accounts. We'll sync your availability in real-time.</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Configure Your Preferences</h3>
                <p>Set your working hours, preferred meeting times, and create custom meeting types for different occasions.</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Share Your Link</h3>
                <p>Get a personalized booking link to share via email, social media, or embed on your website.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2>Ready to eliminate scheduling chaos?</h2>
            <p>Join thousands of professionals who've transformed their calendar management</p>
            <button onClick={handleSignUp} className="cta-button primary large">
              Start Your Free Account
              <span className="cta-arrow">→</span>
            </button>
            <p className="cta-note">No credit card required • Free forever plan available</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-logo">
              <h3>📅 ScheduleEase</h3>
              <p>Making scheduling simple for everyone</p>
            </div>
            <div className="footer-links">
              <div className="footer-section">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <a href="#integrations">Integrations</a>
              </div>
              <div className="footer-section">
                <h4>Support</h4>
                <a href="#help">Help Center</a>
                <a href="#contact">Contact Us</a>
                <a href="#status">Status</a>
              </div>
              <div className="footer-section">
                <h4>Company</h4>
                <a href="#about">About</a>
                <a href="#privacy">Privacy</a>
                <a href="#terms">Terms</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 ScheduleEase. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;