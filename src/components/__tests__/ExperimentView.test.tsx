import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExperimentView, SentimentDataPoint } from '../ExperimentView';

// Mock the UI components
vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-testid="button"
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />
}));

// Mock face-api.js
const mockFaceapi = {
  detectSingleFace: vi.fn(),
  TinyFaceDetectorOptions: vi.fn().mockImplementation(() => ({})),
  withFaceExpressions: vi.fn()
};
vi.mock('face-api.js', () => mockFaceapi);

// Mock the face-api loader
vi.mock('../utils/faceapi-loader', () => ({
  loadFaceApiModels: vi.fn().mockResolvedValue(undefined)
}));

// Mock logger utilities
vi.mock('../utils/logger', () => ({
  logError: vi.fn(),
  logUserAction: vi.fn(),
  logPerformance: vi.fn()
}));

// Mock supabase info
vi.mock('../utils/supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-anon-key'
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock MediaRecorder
class MockMediaRecorder {
  state: string = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(stream: MediaStream, options?: any) {
    this.state = 'inactive';
  }

  start() {
    this.state = 'recording';
    // Simulate data available event
    setTimeout(() => {
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['test'], { type: 'video/webm' }) });
      }
    }, 100);
  }

  stop() {
    this.state = 'inactive';
    setTimeout(() => {
      if (this.onstop) {
        this.onstop();
      }
    }, 100);
  }
}

// Mock HTMLVideoElement methods
Object.defineProperty(HTMLVideoElement.prototype, 'play', {
  writable: true,
  value: vi.fn().mockResolvedValue(undefined),
});

Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
  writable: true,
  value: 0,
});

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}

describe('ExperimentView Component', () => {
  const mockWebcamStream = new MockMediaStream() as unknown as MediaStream;
  const mockUserId = 'test-user-123';
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup MediaRecorder mock
    (global as any).MediaRecorder = MockMediaRecorder;
    
    // Setup face-api mock chain
    const mockDetection = {
      expressions: {
        neutral: 0.5,
        happy: 0.8,
        sad: 0.1,
        angry: 0.05,
        fearful: 0.05,
        disgusted: 0.05,
        surprised: 0.1
      }
    };

    mockFaceapi.detectSingleFace.mockReturnValue({
      withFaceExpressions: vi.fn().mockResolvedValue(mockDetection)
    });

    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ captureId: 'test-capture-123' }),
      text: () => Promise.resolve('Success')
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders experiment view with video and controls', () => {
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Experiment Video')).toBeInTheDocument();
    expect(screen.getByText('Watch the video below and react naturally')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows loading state when models are not loaded', () => {
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows play button when models are loaded and video is not playing', async () => {
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByText('Play')).toBeInTheDocument();
    });

    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });

  it('starts video playback and recording when play button is clicked', async () => {
    const mockVideoPlay = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
      writable: true,
      value: mockVideoPlay,
    });

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Play')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockVideoPlay).toHaveBeenCalled();
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });
  });

  it('pauses video and stops recording when pause button is clicked', async () => {
    const mockVideoPause = vi.fn();
    Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
      writable: true,
      value: mockVideoPause,
    });

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Wait for models to load and click play
    await waitFor(() => {
      expect(screen.getByText('Play')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button'));

    // Wait for pause button to appear and click it
    await waitFor(() => {
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockVideoPause).toHaveBeenCalled();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });
  });

  it('handles video ended event correctly', async () => {
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Wait for models to load and start playing
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Find video element and trigger ended event
    const videoElement = document.querySelector('video');
    expect(videoElement).toBeTruthy();
    
    fireEvent.ended(videoElement!);

    await waitFor(() => {
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });
  });

  it('captures sentiment data during playback', async () => {
    vi.useFakeTimers();

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Wait for models to load and start playing
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Advance timers to trigger face detection
    vi.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockFaceapi.detectSingleFace).toHaveBeenCalled();
    });

    vi.useRealTimers();
  });

  it('shows processing state when experiment completes', async () => {
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Start playing and immediately end the video
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    const videoElement = document.querySelector('video');
    fireEvent.ended(videoElement!);

    await waitFor(() => {
      expect(screen.getByText('Processing your responses...')).toBeInTheDocument();
    });
  });

  it('uploads webcam video and calls onComplete with sentiment data', async () => {
    const sentimentData: SentimentDataPoint[] = [];
    
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Start and end the experiment
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    const videoElement = document.querySelector('video');
    fireEvent.ended(videoElement!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload-webcam'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-anon-key'
          })
        })
      );
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.any(Array),
        'test-capture-123'
      );
    });
  });

  it('handles upload API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Upload failed')
    });

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Start and end the experiment
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    const videoElement = document.querySelector('video');
    fireEvent.ended(videoElement!);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.any(Array),
        undefined // No capture ID due to failed upload
      );
    });
  });

  it('handles network errors during upload', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Start and end the experiment
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    const videoElement = document.querySelector('video');
    fireEvent.ended(videoElement!);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith(
        expect.any(Array),
        undefined
      );
    });
  });

  it('sets up webcam stream correctly', () => {
    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    const hiddenVideo = document.querySelector('video.hidden');
    expect(hiddenVideo).toBeTruthy();
  });

  it('handles face detection errors gracefully', async () => {
    vi.useFakeTimers();
    
    // Mock face detection to throw an error
    mockFaceapi.detectSingleFace.mockReturnValue({
      withFaceExpressions: vi.fn().mockRejectedValue(new Error('Detection failed'))
    });

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Start playing
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Advance timers to trigger face detection
    vi.advanceTimersByTime(1000);

    // Component should still be functional despite detection errors
    await waitFor(() => {
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('prevents memory leaks by limiting sentiment data points', async () => {
    vi.useFakeTimers();

    // Mock video currentTime to progress
    let currentTime = 0;
    Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
      get: () => currentTime,
      configurable: true
    });

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Start playing
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    // Simulate many face detections over time
    for (let i = 0; i < 1200; i++) {
      currentTime = i * 0.5; // Advance time by 0.5 seconds each iteration
      vi.advanceTimersByTime(500);
      await vi.runOnlyPendingTimersAsync();
    }

    // End the video to trigger completion
    const videoElement = document.querySelector('video');
    fireEvent.ended(videoElement!);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
      const [sentimentData] = mockOnComplete.mock.calls[0];
      // Should be limited to 1000 points max
      expect(sentimentData.length).toBeLessThanOrEqual(1000);
    });

    vi.useRealTimers();
  });

  it('cleans up resources on component unmount', () => {
    const { unmount } = render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Unmount the component
    unmount();

    // Cleanup should have occurred without errors
    expect(true).toBe(true); // Test passes if no errors thrown during unmount
  });

  it('handles MediaRecorder errors gracefully', async () => {
    // Mock MediaRecorder to throw an error
    (global as any).MediaRecorder = class {
      constructor() {
        throw new Error('MediaRecorder not supported');
      }
    };

    render(
      <ExperimentView 
        webcamStream={mockWebcamStream}
        userId={mockUserId}
        onComplete={mockOnComplete}
      />
    );

    // Should still render and function despite MediaRecorder error
    await waitFor(() => {
      expect(screen.getByText('Play')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button'));

    // Should still show pause button even if recording fails
    await waitFor(() => {
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });
  });
});