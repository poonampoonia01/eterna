import { MockExecutor } from '../mockExecutor';
import { BestQuote } from '../../types/orderTypes';

describe('MockExecutor', () => {
  let executor: MockExecutor;

  beforeEach(() => {
    executor = new MockExecutor();
  });

  describe('executeSwap', () => {
    const mockBestQuote: BestQuote = {
      price: 185,
      fee: 0.555,
      dex: 'Raydium',
      selectedDex: 'Raydium',
    };

    it('should return execution result with txHash and executedPrice', async () => {
      const result = await executor.executeSwap(mockBestQuote, 185);

      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('executedPrice');
      expect(result).toHaveProperty('selectedDex');
      expect(result.txHash).toMatch(/^[a-f0-9]{64}$/); // 32 bytes = 64 hex chars
      expect(result.selectedDex).toBe('Raydium');
    });

    it('should generate unique transaction hashes', async () => {
      const result1 = await executor.executeSwap(mockBestQuote, 185);
      const result2 = await executor.executeSwap(mockBestQuote, 185);

      expect(result1.txHash).not.toBe(result2.txHash);
    }, 10000); // 10 second timeout for two executions

    it('should execute within 2-3 seconds', async () => {
      const start = Date.now();
      await executor.executeSwap(mockBestQuote, 185);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(1900);
      expect(duration).toBeLessThan(3500);
    });

    it('should have executed price within ±0.5% of quote price', async () => {
      const result = await executor.executeSwap(mockBestQuote, 185);

      const minPrice = mockBestQuote.price * 0.995;
      const maxPrice = mockBestQuote.price * 1.005;

      expect(result.executedPrice).toBeGreaterThanOrEqual(minPrice);
      expect(result.executedPrice).toBeLessThanOrEqual(maxPrice);
    });
  });
});

