import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversineDistanceKm } from '../utils/batching';

// Fix default Leaflet icon paths in bundlers like Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * Creates custom SVG HTML DivIcons for Leaflet
 */
function createCustomPin({
  type = 'donation',
  color = '#10b981',
  label = '',
  step = null,
  pulse = false,
}) {
  const stepBadgeHtml =
    step !== null
      ? `<span style="position: absolute; top: -6px; right: -6px; background: #0f172a; color: #fff; font-size: 10px; font-weight: 800; border-radius: 9999px; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">${step}</span>`
      : '';

  const pulseRing = pulse
    ? `<span style="position: absolute; inset: -4px; border-radius: 9999px; background: ${color}; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
    : '';

  let iconSvg = '';
  if (type === 'driver') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
  } else if (type === 'shelter') {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path><path d="M9 9h1"></path><path d="M9 13h1"></path><path d="M9 17h1"></path><path d="M14 9h1"></path><path d="M14 13h1"></path><path d="M14 17h1"></path></svg>`;
  } else {
    iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
  }

  const html = `
    <div style="position: relative; width: 34px; height: 34px;">
      ${pulseRing}
      <div style="width: 34px; height: 34px; background: ${color}; color: #ffffff; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25), 0 2px 4px -2px rgba(0,0,0,0.2); transition: transform 0.2s;">
        ${iconSvg}
      </div>
      ${stepBadgeHtml}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

/**
 * Leaflet OpenStreetMap interactive map component.
 * Displays:
 * 1. Active donations colored by risk score (Green <33, Amber 33-66, Red >66)
 * 2. Shelters colored by remaining capacity
 * 3. Driver current location
 * 4. Polyline connecting assigned route stops
 */
export default function LeafletMap({
  driverLocation = { lat: 37.7749, lng: -122.4194 },
  donations = [],
  shelters = [],
  assignedRoute = [],
  highlightedDonationId = null,
  height = '420px',
  onSelectDonation = null,
  maxRadiusKm = 100, // Show under 100km only
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routePolylineRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = driverLocation?.lat || 37.7749;
    const initialLng = driverLocation?.lng || -122.4194;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
      zoomControl: true,
    });

    // Free OpenStreetMap Tile Layer (no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Route (Filtered within maxRadiusKm)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    const boundsPoints = [];
    const centerLat = Number(driverLocation?.lat) || 37.7749;
    const centerLng = Number(driverLocation?.lng) || -122.4194;

    // Optional 100km radius circle
    if (maxRadiusKm && maxRadiusKm > 0) {
      L.circle([centerLat, centerLng], {
        radius: maxRadiusKm * 1000, // in meters
        color: '#10b981',
        weight: 1.5,
        dashArray: '6, 6',
        fillColor: '#10b981',
        fillOpacity: 0.04,
      }).addTo(layer);
    }

    // 1. Driver Current Location Marker
    if (driverLocation?.lat && driverLocation?.lng) {
      const driverLat = Number(driverLocation.lat);
      const driverLng = Number(driverLocation.lng);
      boundsPoints.push([driverLat, driverLng]);

      const driverMarker = L.marker([driverLat, driverLng], {
        icon: createCustomPin({
          type: 'driver',
          color: '#3b82f6', // vibrant blue
          step: assignedRoute.length > 0 ? 1 : null,
          pulse: true,
        }),
        zIndexOffset: 1000,
      });

      driverMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="background: #3b82f6; width: 8px; height: 8px; border-radius: 9999px;"></span>
            <strong style="font-size: 13px; color: #0f172a;">Your Dispatch Vehicle</strong>
          </div>
          <div style="font-size: 11px; color: #64748b;">Telemetry: ${driverLat.toFixed(4)}, ${driverLng.toFixed(4)}</div>
          <div style="margin-top: 6px; font-size: 11px; background: #eff6ff; color: #1e40af; padding: 3px 6px; border-radius: 6px; font-weight: 600;">
            ${assignedRoute.length > 0 ? `Active Route: ${assignedRoute.length} waypoint stops` : 'Available on Duty'}
          </div>
        </div>
      `);
      driverMarker.addTo(layer);
    }

    // 2. Active Donations Pins (Colored by Risk Score, filtered within maxRadiusKm)
    donations.forEach((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      // Filter out points beyond maxRadiusKm (under 100km only)
      if (maxRadiusKm && maxRadiusKm > 0) {
        const distFromCenter = haversineDistanceKm(centerLat, centerLng, lat, lng);
        if (distFromCenter > maxRadiusKm) return;
      }

      boundsPoints.push([lat, lng]);

      const risk = Number(item.riskScore) || 50;
      let color = '#10b981'; // Green (<33)
      let riskLabel = 'Low Risk (<33)';
      let pulse = false;

      if (risk > 66) {
        color = '#ef4444'; // Red (>66)
        riskLabel = 'Critical Risk (>66)';
        pulse = true;
      } else if (risk >= 33) {
        color = '#f59e0b'; // Amber (33-66)
        riskLabel = 'Medium Risk (33-66)';
      }

      // Check if this donation is on driver's assigned route
      const routeStep = assignedRoute.find((r) => r.donationId === item.id);
      const isAssigned = Boolean(routeStep);

      const marker = L.marker([lat, lng], {
        icon: createCustomPin({
          type: 'donation',
          color: isAssigned ? '#6366f1' : color,
          step: routeStep ? routeStep.step : null,
          pulse: pulse || isAssigned,
        }),
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Surplus Intake</span>
            <span style="font-size: 10px; background: ${color}20; color: ${color}; border: 1px solid ${color}60; padding: 1px 6px; border-radius: 9999px; font-weight: 700;">
              Risk: ${risk}
            </span>
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${item.foodType}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">${item.quantity}</div>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Status: <strong style="text-transform: capitalize; color: #0f172a;">${item.status}</strong></div>
          ${item.matchedShelterName ? `<div style="font-size: 10px; color: #4f46e5; margin-top: 2px;">Destination: <strong>${item.matchedShelterName}</strong></div>` : ''}
        </div>
      `);

      if (item.id === highlightedDonationId) {
        marker.openPopup();
      }

      marker.addTo(layer);
    });

    // 3. Shelter Pins (Colored by Capacity Remaining, filtered within maxRadiusKm)
    shelters.forEach((shelter) => {
      const lat = Number(shelter.lat);
      const lng = Number(shelter.lng);
      if (isNaN(lat) || isNaN(lng)) return;

      // Filter out shelters beyond maxRadiusKm
      if (maxRadiusKm && maxRadiusKm > 0) {
        const distFromCenter = haversineDistanceKm(centerLat, centerLng, lat, lng);
        if (distFromCenter > maxRadiusKm) return;
      }

      boundsPoints.push([lat, lng]);

      const capacity = Number(shelter.capacity) || 0;
      const currentLoad = Number(shelter.currentLoad) || 0;
      const remaining = Math.max(0, capacity - currentLoad);

      // Color by remaining headroom
      let color = '#0284c7'; // Blue/Sky default
      if (remaining <= 10) {
        color = '#ef4444'; // Near capacity / full
      } else if (remaining < 30) {
        color = '#f59e0b'; // Medium capacity
      } else {
        color = '#059669'; // Ample capacity
      }

      const routeStep = assignedRoute.find((r) => r.shelterId === shelter.id || r.shelterId === shelter.uid);

      const marker = L.marker([lat, lng], {
        icon: createCustomPin({
          type: 'shelter',
          color,
          step: routeStep ? routeStep.step : null,
          pulse: false,
        }),
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 190px; padding: 4px;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0284c7; margin-bottom: 2px;">
            Partner Shelter Hub
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${shelter.name}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            Intake Capacity: <strong>${currentLoad} / ${capacity}</strong> (${remaining} remaining)
          </div>
          ${Array.isArray(shelter.preferences) && shelter.preferences.length > 0 ? `
            <div style="margin-top: 6px; font-size: 10px; color: #64748b;">
              Preferences: <span style="color: #0f172a;">${shelter.preferences.slice(0, 2).join(', ')}${shelter.preferences.length > 2 ? '...' : ''}</span>
            </div>
          ` : ''}
        </div>
      `);

      marker.addTo(layer);
    });

    // 4. Polyline Connecting Assigned Route Stops
    if (assignedRoute && assignedRoute.length > 1) {
      const latLngs = assignedRoute.map((w) => [w.lat, w.lng]);

      routePolylineRef.current = L.polyline(latLngs, {
        color: '#6366f1', // Indigo route line
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(map);

      // Fit map view to encompass the entire active route
      map.fitBounds(routePolylineRef.current.getBounds(), {
        padding: [40, 40],
        maxZoom: 15,
      });
    } else if (boundsPoints.length > 0) {
      map.fitBounds(boundsPoints, {
        padding: [50, 50],
        maxZoom: 14,
      });
    }
  }, [driverLocation, donations, shelters, assignedRoute, highlightedDonationId, maxRadiusKm]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10" />

      {/* Map Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-md flex flex-wrap items-center justify-between text-[11px] gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700">Map Legend:</span>
          {maxRadiusKm && (
            <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[10px] border border-emerald-300">
              &le; {maxRadiusKm}km Active
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600">Low Risk (&lt;33)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600">Medium Risk (33-66)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-slate-600">Critical Risk (&gt;66)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
            <span className="text-slate-600">Shelter Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-slate-600">Driver Location</span>
          </div>
          {assignedRoute.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-600"></span>
              <span className="font-semibold text-indigo-700">Active Route Sequence</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
