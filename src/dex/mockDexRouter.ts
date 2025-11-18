import { sleep } from '../utils/sleep';
import { Logger } from '../utils/logger';
import { DexQuote, BestQuote } from '../types/orderTypes';

/**
 * Mock DEX Router that simulates price quotes from Raydium and Meteora
 */
export class MockDexRouter {
  private basePrices: Map<string, number> = new Map();

  constructor() {
    // Initialize base prices for common token pairs
    this.basePrices.set('SOL-USDC', 180);
    this.basePrices.set('USDC-SOL', 1 / 180);
    // Add more pairs as needed
  }

  /**
   * Get base price for a token pair
   */
  private getBasePrice(tokenIn: string, tokenOut: string): number {
    const pair = `${tokenIn}-${tokenOut}`;
    const reversePair = `${tokenOut}-${tokenIn}`;
    
    if (this.basePrices.has(pair)) {
      return this.basePrices.get(pair)!;
    }
    
    if (this.basePrices.has(reversePair)) {
      return 1 / this.basePrices.get(reversePair)!;
    }
    
    // Default base price if pair not found
    return 100;
  }

  /**
   * Generate a random price variation
   */
  private generateVariation(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Get quote from Raydium DEX
   * Raydium: 0.98-1.02 multiplier
   */
  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    await sleep(200); // 200ms delay as per spec
    
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const variation = this.generateVariation(0.98, 1.02);
    const price = basePrice * variation;
    const fee = amount * 0.003; // 0.3% fee
    
    Logger.debug('Raydium quote', { tokenIn, tokenOut, amount, price, fee });
    
    return {
      price,
      fee,
      dex: 'Raydium',
    };
  }

  /**
   * Get quote from Meteora DEX
   * Meteora: 0.97-1.03 multiplier
   */
  async getMeteoraQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<DexQuote> {
    await sleep(200); // 200ms delay as per spec
    
    const basePrice = this.getBasePrice(tokenIn, tokenOut);
    const variation = this.generateVariation(0.97, 1.03);
    const price = basePrice * variation;
    const fee = amount * 0.0035; // 0.35% fee
    
    Logger.debug('Meteora quote', { tokenIn, tokenOut, amount, price, fee });
    
    return {
      price,
      fee,
      dex: 'Meteora',
    };
  }

  /**
   * Get the best quote by comparing Raydium and Meteora
   * Returns the quote with the highest price (best for selling)
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amount: number
  ): Promise<BestQuote> {
    Logger.info('Fetching quotes from both DEXs', { tokenIn, tokenOut, amount });
    
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amount),
      this.getMeteoraQuote(tokenIn, tokenOut, amount),
    ]);

    // Compare prices (higher price is better for selling tokenIn)
    const bestQuote =
      raydiumQuote.price >= meteoraQuote.price ? raydiumQuote : meteoraQuote;

    Logger.info('Best quote selected', {
      selectedDex: bestQuote.dex,
      price: bestQuote.price,
      raydiumPrice: raydiumQuote.price,
      meteoraPrice: meteoraQuote.price,
    });

    return {
      ...bestQuote,
      selectedDex: bestQuote.dex,
    };
  }
}

