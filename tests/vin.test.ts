import { describe, expect, it } from 'vitest';
import { decodeVin } from '../src/vin';

// Publicly documented VIN; never inserted into fleet storage.
const publicVin = '1M8GDM9AXKP042788';

describe('NHTSA VIN decoder without substituted services', () => {
  it('rejects malformed inputs before a provider lookup', async () => {
    for (const body of [null, [], {}, { vin: 'short' }, { vin: '../' + publicVin }, { vin: publicVin.replace('M', 'I') }, { vin: publicVin, year: 1980 }, { vin: publicVin, year: 2101 }, { vin: publicVin, year: '2020.5' }]) {
      await expect(decodeVin(body)).rejects.toMatchObject({ status: 400 });
    }
  });

  it('decodes the public VIN using the real NHTSA API', async () => {
    const decoded = await decodeVin({ vin: ' ' + publicVin.toLowerCase() + ' ', year: 1989 });
    expect(decoded.vin).toBe(publicVin);
    expect(decoded.year).toBe(1989);
    expect(decoded.make).toBe('MOTOR COACH INDUSTRIES');
    expect(decoded.model.length).toBeGreaterThan(0);
    expect(decoded.decoded_vehicle_type).toBe('BUS');
    expect(decoded.vehicle_type).toBe('');
    expect(decoded.gvwr).toContain('Class 8');
    expect(Array.isArray(decoded.warnings)).toBe(true);
  }, 20000);
});
