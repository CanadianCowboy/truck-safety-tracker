import { InputError } from './validation';

export interface VinDecodeResult {
  vin: string;
  year: number | null;
  make: string;
  model: string;
  vehicle_type: string;
  equipment_type: string;
  gvwr: string;
  decoded_vehicle_type: string;
  manufacturer: string;
  engine: string;
  fuel_type: string;
  plant_country: string;
  raw_data: Record<string, string>;
  warnings: string[];
}

export async function decodeVin(input: unknown): Promise<VinDecodeResult> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Enter a VIN to decode.');
  const body = input as Record<string, unknown>;
  const vin = typeof body.vin === 'string' ? body.vin.trim().toUpperCase() : '';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new InputError('Enter a full 17-character VIN using letters and numbers (no I, O or Q).');
  const year = body.year == null || body.year === '' ? '' : String(body.year);
  if (year && (!/^\d{4}$/.test(year) || Number(year) < 1981 || Number(year) > 2100)) throw new InputError('Model year must be between 1981 and 2100, or left blank.');

  const url = new URL('https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/' + vin);
  url.searchParams.set('format', 'json');
  if (year) url.searchParams.set('modelyear', year);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    // Deliberately construct a fresh request: never forward cookies, passcodes, fleet data or redirects.
    const response = await fetch(url.href, {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
      signal: controller.signal,
    });
    // workerd supports manual/follow, not error. Reject 3xx rather than forwarding the VIN elsewhere.
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new InputError(response.status === 429
        ? 'NHTSA is rate limiting VIN lookups. Please try again later.'
        : 'NHTSA VIN decoding is temporarily unavailable. Please try again.', 502);
    }
    // A single flat VIN result is small; enforce a bound even on chunked responses.
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64 * 1024) {
          await reader.cancel();
          throw new InputError('NHTSA returned an oversized response. Please try again.', 502);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const data: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const results = data && typeof data === 'object' && 'Results' in data ? data.Results : null;
    const row: unknown = Array.isArray(results) ? results[0] : null;
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new InputError('NHTSA returned an invalid VIN response. Please try again.', 502);
    const fields = row as Record<string, unknown>;
    const text = (key: string) => typeof fields[key] === 'string' ? fields[key].trim().slice(0, 1000) : '';
    const make = text('Make');
    const model = text('Model');
    const modelYear = text('ModelYear');
    const equipmentType = text('BodyClass');
    const vehicleType = text('VehicleType');
    const rawData = Object.fromEntries(Object.entries(fields)
      .filter(([, value]) => typeof value === 'string')
      .map(([key, value]) => [key, (value as string).trim().slice(0, 1000)]));
    const warnings: string[] = [];
    const codes = text('ErrorCode').split(',').map(code => code.trim()).filter(Boolean);
    if (codes.some(code => code !== '0')) warnings.push(text('ErrorText') || 'NHTSA reported a partial or uncertain decode. Verify the VIN and vehicle details.');
    if (!make || !model || !modelYear) warnings.push('Some vehicle details are unavailable. Missing values will not replace your entries.');
    if (!make && !model && !modelYear && !equipmentType && !vehicleType) throw new InputError('No vehicle details found for this VIN. Check the VIN or enter details manually.', 422);
    const decodedYear = /^\d{4}$/.test(modelYear) && Number(modelYear) >= 1981 && Number(modelYear) <= 2100 ? Number(modelYear) : null;
    // NHTSA's generic TRUCK does not reliably distinguish a tractor from a straight truck.
    const fleetType = /trailer/i.test(vehicleType) ? 'Trailer'
      : /^truck[- ]tractor$/i.test(equipmentType) ? 'Tractor'
      : /^pickup$/i.test(equipmentType) ? 'Pickup / Service Truck' : '';
    return {
      vin, year: decodedYear, make, model, vehicle_type: fleetType,
      equipment_type: equipmentType, gvwr: text('GVWR'), decoded_vehicle_type: vehicleType,
      manufacturer: text('Manufacturer'),
      engine: [text('EngineManufacturer'), text('EngineModel'), text('DisplacementL') ? text('DisplacementL') + ' L' : ''].filter(Boolean).join(' · '),
      fuel_type: text('FuelTypePrimary'), plant_country: text('PlantCountry'), raw_data: rawData, warnings,
    };
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError(controller.signal.aborted
      ? 'NHTSA VIN lookup timed out. Please try again.'
      : 'Unable to reach NHTSA or read its VIN response. Please try again.', controller.signal.aborted ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }
}
