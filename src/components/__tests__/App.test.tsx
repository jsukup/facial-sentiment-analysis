import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../App';

// Mock the lazy-loaded components
vi.mock('../AdminDashboard', () => ({
  AdminDashboard: () => <div data-testid="admin-dashboard">Admin Dashboard</div>
}));

vi.mock('../AdminLogin', () => ({
  AdminLogin: ({ onLoginSuccess }: { onLoginSuccess: () => void }) => (
    <div data-testid="admin-login">
      <button onClick={onLoginSuccess} data-testid="login-button">Login</button>
    </div>
  )
}));

vi.mock('../PrivacyModal', () => ({
  PrivacyModal: ({ open, onAccept, onReject }: any) => 
    open ? (
      <div data-testid="privacy-modal">
        <button onClick={onAccept} data-testid="accept-privacy">Accept</button>
        <button onClick={onReject} data-testid="reject-privacy">Reject</button>
      </div>
    ) : null
}));

vi.mock('../DemographicForm', () => ({
  DemographicForm: ({ onComplete }: any) => (
    <div data-testid="demographic-form">
      <button 
        onClick={() => onComplete({ age: '25-34', gender: 'female', race: 'asian', nationality: 'US' })}
        data-testid="submit-demographics"
      >
        Submit Demographics
      </button>
    </div>
  )
}));

vi.mock('../WebcamSetup', () => ({
  WebcamSetup: ({ onReady }: any) => (
    <div data-testid="webcam-setup">
      <button 
        onClick={() => onReady(new MediaStream())}
        data-testid="webcam-ready"
      >
        Ready
      </button>
    </div>
  )
}));

vi.mock('../ExperimentView', () => ({
  ExperimentView: ({ onComplete }: any) => (
    <div data-testid="experiment-view">
      <button 
        onClick={() => onComplete([], 'test-capture-id')}
        data-testid="complete-experiment"
      >
        Complete
      </button>
    </div>
  )
}));

vi.mock('../ThankYouModal', () => ({
  ThankYouModal: ({ open }: any) => 
    open ? <div data-testid="thank-you-modal">Thank You</div> : null
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, userId: 'test-user-id' })
    });
  });

  it('renders mode selection screen initially', () => {
    render(<App />);
    
    expect(screen.getByText('Real-time Facial Sentiment Analysis')).toBeInTheDocument();
    expect(screen.getByText('Participant Mode')).toBeInTheDocument();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('switches to participant mode when participant button is clicked', () => {
    render(<App />);
    
    fireEvent.click(screen.getByText('Participant Mode'));
    
    expect(screen.getByTestId('privacy-modal')).toBeInTheDocument();
  });

  it('switches to admin mode when admin button is clicked', () => {
    render(<App />);
    
    fireEvent.click(screen.getByText('Admin Dashboard'));
    
    expect(screen.getByTestId('admin-login')).toBeInTheDocument();
  });

  it('handles admin login successfully', async () => {
    render(<App />);
    
    fireEvent.click(screen.getByText('Admin Dashboard'));
    fireEvent.click(screen.getByTestId('login-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
    });
  });

  it('handles privacy policy acceptance and proceeds to demographics', async () => {
    render(<App />);
    
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('accept-privacy'));
    
    await waitFor(() => {
      expect(screen.getByTestId('demographic-form')).toBeInTheDocument();
    });
  });

  it('handles privacy policy rejection and returns to mode selection', async () => {
    render(<App />);
    
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('reject-privacy'));
    
    await waitFor(() => {
      expect(screen.getByText('Real-time Facial Sentiment Analysis')).toBeInTheDocument();
    });
  });

  it('handles complete participant flow', async () => {
    render(<App />);
    
    // Start participant mode
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('accept-privacy'));
    
    // Complete demographics
    await waitFor(() => {
      expect(screen.getByTestId('demographic-form')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('submit-demographics'));
    
    // Setup webcam
    await waitFor(() => {
      expect(screen.getByTestId('webcam-setup')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('webcam-ready'));
    
    // Complete experiment
    await waitFor(() => {
      expect(screen.getByTestId('experiment-view')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('complete-experiment'));
    
    // Verify thank you modal
    await waitFor(() => {
      expect(screen.getByTestId('thank-you-modal')).toBeInTheDocument();
    });
  });

  it('handles demographic submission API call', async () => {
    render(<App />);
    
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('accept-privacy'));
    
    await waitFor(() => {
      expect(screen.getByTestId('demographic-form')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('submit-demographics'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/demographics'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('25-34')
        })
      );
    });
  });

  it('handles demographic submission API error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' })
    });
    
    // Mock console.error to avoid test output noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<App />);
    
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('accept-privacy'));
    
    await waitFor(() => {
      expect(screen.getByTestId('demographic-form')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('submit-demographics'));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error storing demographics:',
        expect.any(Object)
      );
    });
    
    consoleSpy.mockRestore();
  });

  it('handles experiment completion with sentiment data', async () => {
    render(<App />);
    
    // Navigate to experiment view
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('accept-privacy'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('submit-demographics'));
    });
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('webcam-ready'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('experiment-view')).toBeInTheDocument();
    });
    
    // Complete experiment with sentiment data
    fireEvent.click(screen.getByTestId('complete-experiment'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/sentiment'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('maintains state correctly through app flow', async () => {
    render(<App />);
    
    // Verify initial state
    expect(screen.getByText('Real-time Facial Sentiment Analysis')).toBeInTheDocument();
    
    // Start participant flow
    fireEvent.click(screen.getByText('Participant Mode'));
    fireEvent.click(screen.getByTestId('accept-privacy'));
    
    // Verify state progression
    await waitFor(() => {
      expect(screen.getByTestId('demographic-form')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('submit-demographics'));
    
    await waitFor(() => {
      expect(screen.getByTestId('webcam-setup')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('webcam-ready'));
    
    await waitFor(() => {
      expect(screen.getByTestId('experiment-view')).toBeInTheDocument();
    });
  });
});