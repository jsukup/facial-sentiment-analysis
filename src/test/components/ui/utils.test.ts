import { describe, it, expect } from 'vitest';
import { cn } from '../../../components/ui/utils';

describe('UI Utils - cn function', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-200');
    expect(result).toBe('text-red-500 bg-blue-200');
  });

  it('should handle conflicting Tailwind classes', () => {
    const result = cn('text-red-500', 'text-blue-500');
    expect(result).toBe('text-blue-500');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    );
    
    expect(result).toBe('base-class active-class');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['text-red-500', 'bg-blue-200'], 'font-bold');
    expect(result).toBe('text-red-500 bg-blue-200 font-bold');
  });

  it('should handle objects with conditional classes', () => {
    const result = cn({
      'text-red-500': true,
      'bg-blue-200': false,
      'font-bold': true
    });
    
    expect(result).toBe('text-red-500 font-bold');
  });

  it('should handle complex responsive classes', () => {
    const result = cn(
      'text-sm md:text-lg',
      'p-2 md:p-4',
      'w-full lg:w-1/2'
    );
    
    expect(result).toBe('text-sm md:text-lg p-2 md:p-4 w-full lg:w-1/2');
  });

  it('should merge conflicting responsive classes correctly', () => {
    const result = cn('p-2', 'p-4'); // Second should override
    expect(result).toBe('p-4');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle null and undefined inputs', () => {
    const result = cn('text-red-500', null, undefined, 'bg-blue-200');
    expect(result).toBe('text-red-500 bg-blue-200');
  });

  it('should handle complex component class merging', () => {
    // Simulate typical component usage
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium';
    const variantClasses = 'bg-primary text-primary-foreground hover:bg-primary/90';
    const sizeClasses = 'h-10 px-4 py-2';
    const customClasses = 'w-full bg-red-500'; // Custom background should override
    
    const result = cn(baseClasses, variantClasses, sizeClasses, customClasses);
    
    expect(result).toContain('inline-flex items-center justify-center rounded-md text-sm font-medium');
    expect(result).toContain('text-primary-foreground');
    expect(result).toContain('h-10 px-4 py-2');
    expect(result).toContain('w-full bg-red-500');
    
    // Check that the result properly merges classes
    const resultClasses = result.split(' ');
    expect(resultClasses).toContain('bg-red-500'); // Latest background should be present
  });

  it('should handle Tailwind arbitrary values', () => {
    const result = cn('text-[#ff0000]', 'bg-[rgb(255,0,0)]', 'w-[100px]');
    expect(result).toBe('text-[#ff0000] bg-[rgb(255,0,0)] w-[100px]');
  });

  it('should handle modifier combinations', () => {
    const result = cn(
      'hover:text-red-500',
      'focus:text-blue-500',
      'dark:text-white',
      'sm:hover:text-green-500'
    );
    
    expect(result).toBe('hover:text-red-500 focus:text-blue-500 dark:text-white sm:hover:text-green-500');
  });

  it('should properly merge conflicting modifiers', () => {
    const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
    expect(result).toBe('hover:bg-blue-500');
  });

  it('should handle whitespace and duplicate classes', () => {
    const result = cn('  text-red-500  ', 'text-red-500', '  bg-blue-200  ');
    expect(result).toBe('text-red-500 bg-blue-200');
  });
});