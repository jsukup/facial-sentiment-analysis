/**
 * Production logging service
 * Provides structured logging with different levels and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Prevent memory buildup

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Prevent memory leaks by limiting log history
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In development, also log to console for debugging
    if (this.isDevelopment) {
      const consoleMethod = entry.level === 'error' ? 'error' : 
                           entry.level === 'warn' ? 'warn' : 'log';
      
      if (entry.error) {
        console[consoleMethod](`[${entry.level.toUpperCase()}]`, entry.message, entry.error, entry.context);
      } else {
        console[consoleMethod](`[${entry.level.toUpperCase()}]`, entry.message, entry.context);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.addLog(this.createLogEntry('debug', message, context));
  }

  info(message: string, context?: LogContext): void {
    this.addLog(this.createLogEntry('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.addLog(this.createLogEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.addLog(this.createLogEntry('error', message, context, error));
  }

  // Get recent logs for debugging/support
  getRecentLogs(level?: LogLevel, limit = 50): LogEntry[] {
    let filtered = this.logs;
    
    if (level) {
      filtered = this.logs.filter(log => log.level === level);
    }
    
    return filtered.slice(-limit);
  }

  // Clear logs (for privacy/memory management)
  clearLogs(): void {
    this.logs = [];
  }

  // Export logs for support/debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Global logger instance
export const logger = new Logger();

// Convenience exports for common logging patterns
export const logUserAction = (action: string, userId?: string, metadata?: Record<string, unknown>) => {
  logger.info(`User action: ${action}`, {
    userId,
    action,
    metadata
  });
};

export const logError = (message: string, error: Error, component?: string, userId?: string) => {
  logger.error(message, error, {
    component,
    userId,
    metadata: {
      stack: error.stack,
      name: error.name
    }
  });
};

export const logPerformance = (action: string, duration: number, component?: string) => {
  logger.info(`Performance: ${action} completed in ${duration}ms`, {
    component,
    action,
    metadata: { duration }
  });
};