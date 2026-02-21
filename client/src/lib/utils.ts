import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { RouteOption } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Haversine distance in km
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if point is within 300m of polyline
export function isPointNearPolyline(point: {lat: number, lng: number}, polyline: {lat: number, lng: number}[], thresholdMeters: number = 300): boolean {
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (dist <= thresholdMeters) return true;
  }
  return false;
}

function distanceToSegment(p: {lat: number, lng: number}, v: {lat: number, lng: number}, w: {lat: number, lng: number}): number {
  const dist = haversineDistance(p.lat, p.lng, v.lat, v.lng);
  const dist2 = haversineDistance(p.lat, p.lng, w.lat, w.lng);
  const dist3 = haversineDistance(v.lat, v.lng, w.lat, w.lng);
  if (dist3 === 0) return dist;
  const t = Math.max(0, Math.min(1, ((p.lat - v.lat) * (w.lat - v.lat) + (p.lng - v.lng) * (w.lng - v.lng)) / (dist3 * dist3)));
  const proj = {lat: v.lat + t * (w.lat - v.lat), lng: v.lng + t * (w.lng - v.lng)};
  return haversineDistance(p.lat, p.lng, proj.lat, proj.lng) * 1000; // meters
}

// Decode Google Polyline
export function decodePolyline(encoded: string): {lat: number, lng: number}[] {
  const points: {lat: number, lng: number}[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Reverse geocode lat/lng to address
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results.length > 0) {
    return data.results[0].formatted_address;
  } else {
    console.error('Reverse geocoding error:', data.status);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; // Fallback to coordinates
  }
}

// Validate direction: ensure origin comes before destination on the route
export function validateDirection(polyline: {lat: number, lng: number}[], origin: {lat: number, lng: number}, destination: {lat: number, lng: number}): boolean {
  let originIndex = -1;
  let destIndex = -1;
  let minOriginDist = Infinity;
  let minDestDist = Infinity;

  for (let i = 0; i < polyline.length; i++) {
    const originDist = haversineDistance(origin.lat, origin.lng, polyline[i].lat, polyline[i].lng);
    if (originDist < minOriginDist) {
      minOriginDist = originDist;
      originIndex = i;
    }
    const destDist = haversineDistance(destination.lat, destination.lng, polyline[i].lat, polyline[i].lng);
    if (destDist < minDestDist) {
      minDestDist = destDist;
      destIndex = i;
    }
  }

  return originIndex < destIndex;
}

// Check if user route overlaps with driver route (simple proximity check for partial matching)
export function doesRouteOverlap(userOrigin: {lat: number, lng: number}, userDest: {lat: number, lng: number}, driverPolyline: {lat: number, lng: number}[], thresholdMeters: number = 300): boolean {
  const originNear = isPointNearPolyline(userOrigin, driverPolyline, thresholdMeters);
  const destNear = isPointNearPolyline(userDest, driverPolyline, thresholdMeters);
  const directionValid = validateDirection(driverPolyline, userOrigin, userDest);
  return originNear && destNear && directionValid;
}

// Check if point is within flexible distance of polyline (BlaBlaCar-style: 5-10km tolerance)
export function isPointNearPolylineFlexible(point: {lat: number, lng: number}, polyline: {lat: number, lng: number}[], thresholdKm: number = 5): boolean {
  for (let i = 0; i < polyline.length - 1; i++) {
    const dist = distanceToSegment(point, polyline[i], polyline[i + 1]);
    if (dist <= thresholdKm * 1000) return true; // Convert km to meters
  }
  return false;
}

// Calculate route overlap score (0-1, higher is better match)
export function calculateRouteOverlapScore(
  userOrigin: {lat: number, lng: number},
  userDest: {lat: number, lng: number},
  driverPolyline: {lat: number, lng: number}[]
): number {
  let score = 0;

  // Check if origin is near driver's route
  const originNear = isPointNearPolylineFlexible(userOrigin, driverPolyline, 5);
  if (originNear) score += 0.3;

  // Check if destination is near driver's route
  const destNear = isPointNearPolylineFlexible(userDest, driverPolyline, 5);
  if (destNear) score += 0.3;

  // Check direction validity
  const directionValid = validateDirection(driverPolyline, userOrigin, userDest);
  if (directionValid) score += 0.2;

  // Calculate how much of user's route is covered by driver's route
  const routeCoverage = calculateRouteCoverage(userOrigin, userDest, driverPolyline);
  score += routeCoverage * 0.2;

  return Math.min(score, 1.0); // Cap at 1.0
}

// Calculate what percentage of user's route is covered by driver's route
function calculateRouteCoverage(
  userOrigin: {lat: number, lng: number},
  userDest: {lat: number, lng: number},
  driverPolyline: {lat: number, lng: number}[]
): number {
  // Create a simplified user route (straight line)
  const userRoute = [userOrigin, userDest];

  // Count how many segments of user route are near driver route
  let coveredSegments = 0;
  const totalSegments = userRoute.length - 1;

  for (let i = 0; i < totalSegments; i++) {
    if (isPointNearPolylineFlexible(userRoute[i], driverPolyline, 3) ||
        isPointNearPolylineFlexible(userRoute[i + 1], driverPolyline, 3)) {
      coveredSegments++;
    }
  }

  return coveredSegments / totalSegments;
}

// Enhanced route overlap check with flexible matching (BlaBlaCar-style)
export function doesRouteOverlapFlexible(
  userOrigin: {lat: number, lng: number},
  userDest: {lat: number, lng: number},
  driverPolyline: {lat: number, lng: number}[],
  minOverlapScore: number = 0.5
): boolean {
  const overlapScore = calculateRouteOverlapScore(userOrigin, userDest, driverPolyline);
  return overlapScore >= minOverlapScore;
}

// Check for intermediate stops compatibility
export function canAccommodateStops(
  userOrigin: {lat: number, lng: number},
  userDest: {lat: number, lng: number},
  driverStops: {lat: number, lng: number}[]
): boolean {
  // If driver has stops, check if user's origin/dest are compatible with stop sequence
  if (driverStops.length === 0) return true;

  // Simple check: user's points should be near driver's route or stops
  const originCompatible = isPointNearPolylineFlexible(userOrigin, driverStops, 2) ||
                          isPointNearPolylineFlexible(userOrigin, [userOrigin, ...driverStops, userDest], 5);

  const destCompatible = isPointNearPolylineFlexible(userDest, driverStops, 2) ||
                        isPointNearPolylineFlexible(userDest, [userOrigin, ...driverStops, userDest], 5);

  return originCompatible && destCompatible;
}

// Fetch directions from Google API (single route)
export async function getDirections(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}, waypoints?: {lat: number, lng: number}[]): Promise<{route: {lat: number, lng: number}[], distance: number, eta: number}> {
  const options = await getRouteOptions(origin, destination);
  if (options.length > 0) {
    const selected = options[0];
    return { route: decodePolyline(selected.polyline), distance: selected.distance, eta: selected.eta };
  } else {
    // Fallback
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return { route: [origin, destination], distance: dist, eta: Math.round(dist / 50 * 60) };
  }
}

// Fetch multiple route options from Google Directions API
export async function getRouteOptions(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}): Promise<RouteOption[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&alternatives=true&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.routes.length > 0) {
    return data.routes.map((route: any) => {
      const polyline = route.overview_polyline.points;
      const distance = route.legs.reduce((acc: number, leg: any) => acc + leg.distance.value, 0) / 1000; // km
      const eta = route.legs.reduce((acc: number, leg: any) => acc + leg.duration.value, 0) / 60; // minutes

      // Extract steps
      const steps: string[] = [];
      route.legs.forEach((leg: any) => {
        leg.steps.forEach((step: any) => {
          // Clean HTML from instructions
          const instruction = step.html_instructions.replace(/<[^>]*>/g, '');
          steps.push(instruction);
        });
      });

      // Extract main roads: unique road names from steps
      const roads: string[] = [];
      const roadRegex = /(?:onto|via|along)\s+([^,]+?)(?:\s*\(|,|$)/gi;
      steps.forEach(step => {
        let match;
        while ((match = roadRegex.exec(step)) !== null) {
          const road = match[1].trim();
          if (!roads.includes(road)) roads.push(road);
        }
      });

      // Check for tolls: if any step mentions toll
      const hasTolls = steps.some(step => step.toLowerCase().includes('toll'));

      return {
        polyline,
        distance,
        eta,
        steps,
        roads,
        hasTolls,
      };
    });
  } else {
    console.error('Directions API error:', data.status);
    // Fallback to straight line
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return [{
      polyline: '',
      distance: dist,
      eta: Math.round(dist / 50 * 60),
      steps: [`Drive from ${origin.lat.toFixed(6)}, ${origin.lng.toFixed(6)} to ${destination.lat.toFixed(6)}, ${destination.lng.toFixed(6)}`],
      roads: [],
      hasTolls: false,
    }];
  }
}
