import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemographicForm, DemographicData } from '../DemographicForm';

// Mock the UI components
vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, type, className, disabled }: any) => (
    <button 
      onClick={onClick} 
      type={type}
      disabled={disabled}
      className={className}
      data-testid="button"
    >
      {children}
    </button>
  )
}));

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: any) => (
    <div data-testid="dialog-content" className={className}>{children}</div>
  ),
  DialogDescription: ({ children }: any) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  DialogFooter: ({ children }: any) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
  DialogHeader: ({ children }: any) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: any) => (
    <h2 data-testid="dialog-title">{children}</h2>
  )
}));

vi.mock('../ui/input', () => ({
  Input: ({ id, value, onChange, placeholder, required, ...props }: any) => (
    <input
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      data-testid="input"
      data-field={id}
      {...props}
    />
  )
}));

vi.mock('../ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor} data-testid="label">{children}</label>
  )
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange && onValueChange('test-value')}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, id }: any) => (
    <div data-testid="select-trigger" data-field={id}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>
}));

describe('DemographicForm Component', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open is true', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Demographic Information');
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('Please provide the following information for research purposes');
  });

  it('does not render when open is false', () => {
    render(<DemographicForm open={false} onComplete={mockOnComplete} />);
    
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Check for all labels
    expect(screen.getByText('Age Range')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Race')).toBeInTheDocument();
    expect(screen.getByText('Ethnicity')).toBeInTheDocument();
    expect(screen.getByText('Nationality')).toBeInTheDocument();
    
    // Check for form controls
    expect(screen.getAllByTestId('select-trigger')).toHaveLength(3); // age, gender, race
    expect(screen.getAllByTestId('input')).toHaveLength(2); // ethnicity, nationality
    expect(screen.getByTestId('button')).toHaveTextContent('Complete');
  });

  it('shows correct placeholder text for all fields', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Select age range')).toBeInTheDocument();
    expect(screen.getByText('Select gender')).toBeInTheDocument();
    expect(screen.getByText('Select race')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter ethnicity (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter nationality')).toBeInTheDocument();
  });

  it('handles age selection correctly', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    const ageSelect = screen.getAllByTestId('select')[0];
    fireEvent.click(ageSelect);
    
    // Should show age-related content
    expect(screen.getByText('18-24')).toBeInTheDocument();
    expect(screen.getByText('25-34')).toBeInTheDocument();
    expect(screen.getByText('35-44')).toBeInTheDocument();
    expect(screen.getByText('45-54')).toBeInTheDocument();
    expect(screen.getByText('55-64')).toBeInTheDocument();
    expect(screen.getByText('65+')).toBeInTheDocument();
    expect(screen.getByText('Prefer not to say')).toBeInTheDocument();
  });

  it('handles gender selection correctly', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    const genderSelect = screen.getAllByTestId('select')[1];
    fireEvent.click(genderSelect);
    
    // Should show gender options
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Non-binary')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getAllByText('Prefer not to say')).toHaveLength(2); // One for age, one for gender
  });

  it('handles race selection correctly', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    const raceSelect = screen.getAllByTestId('select')[2];
    fireEvent.click(raceSelect);
    
    // Should show race options
    expect(screen.getByText('Asian')).toBeInTheDocument();
    expect(screen.getByText('Black or African American')).toBeInTheDocument();
    expect(screen.getByText('White or Caucasian')).toBeInTheDocument();
    expect(screen.getByText('Hispanic or Latino')).toBeInTheDocument();
    expect(screen.getByText('Native American or Alaska Native')).toBeInTheDocument();
    expect(screen.getByText('Native Hawaiian or Pacific Islander')).toBeInTheDocument();
    expect(screen.getByText('Multiracial')).toBeInTheDocument();
    expect(screen.getAllByText('Other')).toHaveLength(2); // One for gender, one for race
  });

  it('handles text input changes for ethnicity', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    const ethnicityInput = screen.getByPlaceholderText('Enter ethnicity (optional)');
    await user.type(ethnicityInput, 'Italian-American');
    
    expect(ethnicityInput).toHaveValue('Italian-American');
  });

  it('handles text input changes for nationality', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    await user.type(nationalityInput, 'United States');
    
    expect(nationalityInput).toHaveValue('United States');
  });

  it('submits form with correct data when all fields are filled', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Fill out the form
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    await user.type(nationalityInput, 'United States');
    
    const ethnicityInput = screen.getByPlaceholderText('Enter ethnicity (optional)');
    await user.type(ethnicityInput, 'Italian-American');
    
    // Click selects (they'll use the mock value 'test-value')
    const ageSelect = screen.getAllByTestId('select')[0];
    fireEvent.click(ageSelect);
    
    const genderSelect = screen.getAllByTestId('select')[1];
    fireEvent.click(genderSelect);
    
    const raceSelect = screen.getAllByTestId('select')[2];
    fireEvent.click(raceSelect);
    
    // Submit the form
    const submitButton = screen.getByTestId('button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        age: 'test-value',
        gender: 'test-value',
        race: 'test-value',
        ethnicity: 'Italian-American',
        nationality: 'United States'
      });
    });
  });

  it('submits form with empty optional fields', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Fill only required field
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    await user.type(nationalityInput, 'Canada');
    
    // Submit the form
    const submitButton = screen.getByTestId('button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        age: '',
        gender: '',
        race: '',
        ethnicity: '',
        nationality: 'Canada'
      });
    });
  });

  it('prevents form submission when required fields are empty', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Try to submit without filling nationality (required field)
    const submitButton = screen.getByTestId('button');
    fireEvent.click(submitButton);
    
    // onComplete should not be called
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('has proper form accessibility attributes', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Check that inputs have proper labels
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    expect(nationalityInput).toHaveAttribute('id', 'nationality');
    
    const ethnicityInput = screen.getByPlaceholderText('Enter ethnicity (optional)');
    expect(ethnicityInput).toHaveAttribute('id', 'ethnicity');
    
    // Check required attribute on nationality field
    expect(nationalityInput).toHaveAttribute('required');
    expect(ethnicityInput).not.toHaveAttribute('required');
  });

  it('displays form in scrollable container for mobile', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    const dialogContent = screen.getByTestId('dialog-content');
    expect(dialogContent).toHaveClass('max-w-lg', 'max-h-[80vh]', 'overflow-y-auto');
  });

  it('handles form submission via Enter key', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Fill required field
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    await user.type(nationalityInput, 'France');
    
    // Press Enter to submit
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        age: '',
        gender: '',
        race: '',
        ethnicity: '',
        nationality: 'France'
      });
    });
  });

  it('maintains form state between re-renders', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Fill some fields
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    await user.type(nationalityInput, 'Japan');
    
    const ethnicityInput = screen.getByPlaceholderText('Enter ethnicity (optional)');
    await user.type(ethnicityInput, 'Japanese');
    
    // Re-render with same props
    rerender(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Values should be maintained
    expect(screen.getByPlaceholderText('Enter nationality')).toHaveValue('Japan');
    expect(screen.getByPlaceholderText('Enter ethnicity (optional)')).toHaveValue('Japanese');
  });

  it('handles rapid form interactions correctly', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Rapidly interact with multiple fields
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    const ethnicityInput = screen.getByPlaceholderText('Enter ethnicity (optional)');
    
    await user.type(nationalityInput, 'Australia');
    await user.type(ethnicityInput, 'Aboriginal');
    
    // Click multiple selects quickly
    const selects = screen.getAllByTestId('select');
    for (const select of selects) {
      fireEvent.click(select);
    }
    
    // Submit
    const submitButton = screen.getByTestId('button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        age: 'test-value',
        gender: 'test-value', 
        race: 'test-value',
        ethnicity: 'Aboriginal',
        nationality: 'Australia'
      });
    });
  });

  it('includes all demographic categories required by research standards', () => {
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Verify comprehensive age ranges
    expect(screen.getByText('18-24')).toBeInTheDocument();
    expect(screen.getByText('65+')).toBeInTheDocument();
    
    // Verify inclusive gender options
    expect(screen.getByText('Non-binary')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    
    // Verify comprehensive race categories
    expect(screen.getByText('Multiracial')).toBeInTheDocument();
    expect(screen.getByText('Native Hawaiian or Pacific Islander')).toBeInTheDocument();
    
    // Verify privacy options
    expect(screen.getAllByText('Prefer not to say')).toHaveLength(3); // age, gender, race
  });

  it('has proper data structure for backend integration', async () => {
    const user = userEvent.setup();
    render(<DemographicForm open={true} onComplete={mockOnComplete} />);
    
    // Fill form with realistic data
    const nationalityInput = screen.getByPlaceholderText('Enter nationality');
    await user.type(nationalityInput, 'United Kingdom');
    
    const ethnicityInput = screen.getByPlaceholderText('Enter ethnicity (optional)');
    await user.type(ethnicityInput, 'British');
    
    // Submit
    const submitButton = screen.getByTestId('button');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      const submittedData = mockOnComplete.mock.calls[0][0] as DemographicData;
      
      // Verify data structure matches interface
      expect(submittedData).toHaveProperty('age');
      expect(submittedData).toHaveProperty('gender');
      expect(submittedData).toHaveProperty('race');
      expect(submittedData).toHaveProperty('ethnicity');
      expect(submittedData).toHaveProperty('nationality');
      
      // Verify types
      expect(typeof submittedData.age).toBe('string');
      expect(typeof submittedData.gender).toBe('string');
      expect(typeof submittedData.race).toBe('string');
      expect(typeof submittedData.ethnicity).toBe('string');
      expect(typeof submittedData.nationality).toBe('string');
    });
  });
});