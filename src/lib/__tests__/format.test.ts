import { describe, expect, it } from 'vitest';
import { fmtCurrency, fmtNumber, fmtRelative, initials, titleCase } from '../format';

describe('format helpers', () => {
  it('formats numbers and currency', () => {
    expect(fmtNumber(4821)).toBe('4,821');
    expect(fmtNumber(null)).toBe('–');
    expect(fmtCurrency(59.99)).toBe('$59.99');
    expect(fmtCurrency(2500, true)).toBe('$2.5K');
  });

  it('builds initials safely', () => {
    expect(initials('Elena Rostova')).toBe('ER');
    expect(initials('Madonna')).toBe('M');
    expect(initials('')).toBe('?');
    expect(initials(null)).toBe('?');
  });

  it('humanizes snake_case values', () => {
    expect(titleCase('in_progress')).toBe('In Progress');
    expect(titleCase('dosage-forms')).toBe('Dosage Forms');
  });

  it('reports relative time', () => {
    expect(fmtRelative(null)).toBe('Never');
    expect(fmtRelative(new Date(Date.now() - 3 * 3_600_000))).toBe('3h ago');
    expect(fmtRelative(new Date())).toBe('Just now');
  });
});
