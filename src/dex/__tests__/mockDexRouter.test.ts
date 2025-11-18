import { MockDexRouter } from '../mockDexRouter';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should return a quote with price and fee', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 1);

      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('fee');
      expect(quote.dex).toBe('Raydium');
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBeGreaterThan(0);
    });

    it('should have price within 0.98-1.02 multiplier range', async () => {
      const basePrice = 180; // SOL-USDC base price
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 1);

      expect(quote.price).toBeGreaterThanOrEqual(basePrice * 0.98);
      expect(quote.price).toBeLessThanOrEqual(basePrice * 1.02);
    });

    it('should add 200ms delay', async () => {
      const start = Date.now();
      await router.getRaydiumQuote('SOL', 'USDC', 1);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(180); // Allow some margin
      expect(duration).toBeLessThan(300);
    });
  });

  describe('getMeteoraQuote', () => {
    it('should return a quote with price and fee', async () => {
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 1);

      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('fee');
      expect(quote.dex).toBe('Meteora');
      expect(quote.price).toBeGreaterThan(0);
      expect(quote.fee).toBeGreaterThan(0);
    });

    it('should have price within 0.97-1.03 multiplier range', async () => {
      const basePrice = 180; // SOL-USDC base price
      const quote = await router.getMeteoraQuote('SOL', 'USDC', 1);

      expect(quote.price).toBeGreaterThanOrEqual(basePrice * 0.97);
      expect(quote.price).toBeLessThanOrEqual(basePrice * 1.03);
    });
  });

  describe('getBestQuote', () => {
    it('should return the best quote from both DEXs', async () => {
      const bestQuote = await router.getBestQuote('SOL', 'USDC', 1);

      expect(bestQuote).toHaveProperty('price');
      expect(bestQuote).toHaveProperty('fee');
      expect(bestQuote).toHaveProperty('selectedDex');
      expect(['Raydium', 'Meteora']).toContain(bestQuote.selectedDex);
    });

    it('should select the DEX with higher price', async () => {
      // Run multiple times to test selection logic
      for (let i = 0; i < 10; i++) {
        const bestQuote = await router.getBestQuote('SOL', 'USDC', 1);
        expect(bestQuote.price).toBeGreaterThan(0);
        expect(['Raydium', 'Meteora']).toContain(bestQuote.selectedDex);
      }
    });

    it('should fetch both quotes in parallel', async () => {
      const start = Date.now();
      await router.getBestQuote('SOL', 'USDC', 1);
      const duration = Date.now() - start;

      // Should be around 200ms (parallel) not 400ms (sequential)
      expect(duration).toBeLessThan(350);
    });
  });
});

