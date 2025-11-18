import { Logger } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should log info messages', () => {
    Logger.info('Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleLogSpy.mock.calls[0][0]).toContain('INFO');
    expect(consoleLogSpy.mock.calls[0][0]).toContain('Test message');
  });

  it('should log error messages', () => {
    Logger.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('ERROR');
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error message');
  });

  it('should log warn messages', () => {
    Logger.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy.mock.calls[0][0]).toContain('WARN');
    expect(consoleWarnSpy.mock.calls[0][0]).toContain('Warning message');
  });

  it('should include data in log messages', () => {
    const testData = { orderId: '123', status: 'pending' };
    Logger.info('Test message', testData);
    expect(consoleLogSpy.mock.calls[0][0]).toContain('123');
  });

  it('should log debug messages in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    Logger.debug('Debug message');
    expect(consoleDebugSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should not log debug messages in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    Logger.debug('Debug message');
    expect(consoleDebugSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});

