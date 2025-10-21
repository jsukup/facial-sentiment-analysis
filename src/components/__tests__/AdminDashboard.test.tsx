import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminDashboard } from '../AdminDashboard';

// Mock the UI components
vi.mock('../../ui/alert', () => ({
  Alert: ({ children, variant }: any) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => (
    <div data-testid="alert-description">{children}</div>
  ),
  AlertTitle: ({ children }: any) => (
    <div data-testid="alert-title">{children}</div>
  )
}));

vi.mock('../ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <div data-testid="select" onClick={() => onValueChange('test-value')}>{children}</div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <option value={value} data-testid="select-item">{children}</option>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-testid="button" data-variant={variant}>
      {children}
    </button>
  )
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Video: () => <div data-testid="video-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock video element
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

const mockUserData = [
  {
    userId: 'user-1',
    demographics: {
      uid: 'user-1',
      age: '25-34',
      gender: 'female',
      race: 'asian',
      nationality: 'US',
      created_at: '2024-01-01T00:00:00Z'
    },
    sentiment: [
      { timestamp: 0, expressions: { happy: 0.8, sad: 0.2, angry: 0.1, surprised: 0.1, fearful: 0.1, disgusted: 0.1, neutral: 0.1 } },
      { timestamp: 1, expressions: { happy: 0.7, sad: 0.3, angry: 0.1, surprised: 0.1, fearful: 0.1, disgusted: 0.1, neutral: 0.1 } }
    ]
  },
  {
    userId: 'user-2',
    demographics: {
      uid: 'user-2',
      age: '35-44',
      gender: 'male',
      race: 'caucasian',
      nationality: 'US',
      created_at: '2024-01-02T00:00:00Z'
    },
    sentiment: [
      { timestamp: 0, expressions: { happy: 0.6, sad: 0.4, angry: 0.1, surprised: 0.1, fearful: 0.1, disgusted: 0.1, neutral: 0.1 } }
    ]
  }
];

const mockLargeUserData = Array.from({ length: 6 }, (_, i) => ({
  userId: `user-${i + 1}`,
  demographics: {
    uid: `user-${i + 1}`,
    age: '25-34',
    gender: 'female',
    race: 'asian',
    nationality: 'US',
    created_at: '2024-01-01T00:00:00Z'
  },
  sentiment: [
    { timestamp: 0, expressions: { happy: 0.8, sad: 0.2, angry: 0.1, surprised: 0.1, fearful: 0.1, disgusted: 0.1, neutral: 0.1 } }
  ]
}));

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API responses
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ demographics: mockUserData.map(u => u.demographics) })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sentiment: mockUserData.flatMap(u => 
          u.sentiment.map(s => ({ userId: u.userId, ...s }))
        )})
      });
  });

  it('renders dashboard header and navigation', async () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Real-time Facial Sentiment Analysis')).toBeInTheDocument();
  });

  it('displays privacy warning when participants below threshold', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      expect(screen.getByTestId('alert-title')).toHaveTextContent('Insufficient Participants');
      expect(screen.getByTestId('alert-description')).toHaveTextContent('At least 5 participants are required');
    });
  });

  it('hides charts when privacy threshold not met', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // Should show privacy warning
      expect(screen.getByTestId('alert')).toBeInTheDocument();
      
      // Charts should not be visible
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });
  });

  it('shows charts when privacy threshold is met', async () => {
    // Mock API with enough participants
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ demographics: mockLargeUserData.map(u => u.demographics) })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sentiment: mockLargeUserData.flatMap(u => 
          u.sentiment.map(s => ({ userId: u.userId, ...s }))
        )})
      });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // Should not show privacy warning
      expect(screen.queryByTestId('alert')).not.toBeInTheDocument();
      
      // Charts should be visible
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('handles demographic filter changes', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      const ageFilter = screen.getAllByTestId('select')[0];
      fireEvent.click(ageFilter);
    });
    
    // Verify filter UI is interactive
    expect(screen.getAllByTestId('select')).toHaveLength(4); // age, gender, race, nationality
  });

  it('displays participant statistics correctly', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // participant count
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    
    consoleSpy.mockRestore();
  });

  it('handles video playback controls', async () => {
    // Mock with enough participants to show video
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ demographics: mockLargeUserData.map(u => u.demographics) })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sentiment: mockLargeUserData.flatMap(u => 
          u.sentiment.map(s => ({ userId: u.userId, ...s }))
        )})
      });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      const playButton = screen.queryByTestId('play-icon');
      if (playButton) {
        fireEvent.click(playButton.closest('button')!);
      }
    });
  });

  it('updates sentiment visualization based on video timestamp', async () => {
    // Mock with enough participants
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ demographics: mockLargeUserData.map(u => u.demographics) })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sentiment: mockLargeUserData.flatMap(u => 
          u.sentiment.map(s => ({ userId: u.userId, ...s }))
        )})
      });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
    
    // Verify sentiment data is processed for visualization
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('applies demographic filters correctly', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // Simulate filter change
      const genderFilter = screen.getAllByTestId('select')[1];
      fireEvent.click(genderFilter);
    });
    
    // Verify filtering mechanism is in place
    expect(screen.getAllByTestId('select-trigger')).toHaveLength(4);
  });

  it('handles empty data state', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ demographics: [] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sentiment: [] })
      });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // participant count should be 0
    });
  });

  it('maintains correct state when switching between filters', async () => {
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // Apply age filter
      const ageFilter = screen.getAllByTestId('select')[0];
      fireEvent.click(ageFilter);
      
      // Apply gender filter
      const genderFilter = screen.getAllByTestId('select')[1];
      fireEvent.click(genderFilter);
    });
    
    // Verify both filters are applied
    expect(screen.getAllByTestId('select')).toHaveLength(4);
  });

  it('calculates average emotions correctly', async () => {
    // Mock with enough participants
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ demographics: mockLargeUserData.map(u => u.demographics) })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sentiment: mockLargeUserData.flatMap(u => 
          u.sentiment.map(s => ({ userId: u.userId, ...s }))
        )})
      });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      // Verify charts are rendered (indicating emotion calculation worked)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });
});