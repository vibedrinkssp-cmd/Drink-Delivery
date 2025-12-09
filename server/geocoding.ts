interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface DeliveryFeeResult {
  distance: number;
  fee: number;
  withinRange: boolean;
  maxDistance: number;
}

const USER_AGENT = 'VibeDrinks/1.0 (delivery-app)';

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'br',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'User-Agent': USER_AGENT,
        },
      }
    );

    if (!response.ok) {
      console.error('Nominatim API error:', response.status);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(results[0].lat),
      lng: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function buildAddressString(
  street: string,
  number: string,
  neighborhood: string,
  city: string,
  state: string
): string {
  return `${street}, ${number}, ${neighborhood}, ${city}, ${state}, Brasil`;
}

export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function calculateDeliveryFee(
  distance: number,
  ratePerKm: number,
  minFee: number,
  maxDistance: number
): DeliveryFeeResult {
  const withinRange = distance <= maxDistance;
  const fee = Math.max(distance * ratePerKm, minFee);
  
  return {
    distance,
    fee: Math.round(fee * 100) / 100,
    withinRange,
    maxDistance,
  };
}
