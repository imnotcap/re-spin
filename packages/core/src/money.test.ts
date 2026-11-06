import { describe, expect, it } from 'vitest';
import { add, formatOre, fromKr, ore, percentOf } from './money';

describe('money', () => {
  it('afviser decimaler og usikre tal', () => {
    expect(() => ore(1.5)).toThrow();
    expect(() => ore(Number.NaN)).toThrow();
    expect(() => ore(Number.MAX_SAFE_INTEGER)).toThrow();
  });
  it('runder procenter half-up i hele øre', () => {
    expect(percentOf(ore(450_00), 100)).toBe(450);     // 1 % af 450 kr
    expect(percentOf(ore(450_00), 50)).toBe(225);      // 0,5 %
    expect(percentOf(ore(1), 5000)).toBe(1);           // 0,5 øre → 1 (half-up)
    expect(percentOf(ore(99), 100)).toBe(1);           // 0,99 øre → 1
  });
  it('formaterer til dansk', () => {
    expect(formatOre(ore(45_000))).toBe('450\u00A0kr.');
    expect(formatOre(fromKr(445.5))).toBe('445,50\u00A0kr.');
  });
  it('lægger sammen uden float-fejl', () => {
    expect(add(ore(10), ore(20), ore(30))).toBe(60);
  });
});
