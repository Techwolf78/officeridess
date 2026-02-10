import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

// Fetch directions from Google API
export async function getDirections(origin: {lat: number, lng: number}, destination: {lat: number, lng: number}, waypoints?: {lat: number, lng: number}[]): Promise<{route: {lat: number, lng: number}[], distance: number, eta: number}> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${apiKey}`;

  if (waypoints && waypoints.length > 0) {
    const waypointsStr = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
    url += `&waypoints=${waypointsStr}`;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK') {
    const polyline = data.routes[0].overview_polyline.points;
    const route = decodePolyline(polyline);
    const distance = data.routes[0].legs.reduce((acc: number, leg: any) => acc + leg.distance.value, 0) / 1000; // km
    const eta = data.routes[0].legs.reduce((acc: number, leg: any) => acc + leg.duration.value, 0) / 60; // minutes
    return { route, distance, eta };
  } else {
    console.error('Directions API error:', data.status);
    // Fallback to straight line
    const dist = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return { route: [origin, destination], distance: dist, eta: Math.round(dist / 50 * 60) };
  }
}
