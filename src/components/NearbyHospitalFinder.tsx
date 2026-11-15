import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Phone,
  Route as RouteIcon,
  LocateFixed,
  ExternalLink,
  AlertCircle,
  Clock,
  Star,
  Search,
  ClipboardPlus,
  CheckCircle2,
  Printer,
  X,
  Radio,
  Compass,
} from 'lucide-react';
import { HospitalRegistrationRecord } from '../types';
import { BLOOD_GROUPS, calculateHaversineDistanceKm } from '../utils/donationLogic';
import {
  SubmissionSuccessModal,
  SubmissionSuccessInfo,
} from './SubmissionSuccessModal';
import { ExportFormatButtons } from './ExportFormatButtons';
import { ExportDocumentPayload } from '../utils/exportUtils';

const MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

declare namespace google {
  namespace maps {
    type Polyline = any;
  }
}
declare const google: any;

export interface DiscoveredHospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  rating?: number | null;
  googleMapsURI?: string | null;
  location: { lat: number; lng: number };
  distanceKm?: number;
}

export interface RouteStepItem {
  instruction: string;
  distanceText: string;
}

const QUICK_LOCATIONS = [
  { label: 'New Delhi (Connaught Place / AIIMS Hub)', lat: 28.6139, lng: 77.2090 },
  { label: 'Mumbai (Dadar / Parel Hospital Zone)', lat: 19.0176, lng: 72.8478 },
  { label: 'Bengaluru (MG Road / Indiranagar)', lat: 12.9716, lng: 77.5946 },
  { label: 'Hyderabad (Banjara Hills / Jubilee Hills)', lat: 17.4156, lng: 78.4347 },
  { label: 'Lucknow (Hazratganj / KGMU Medical Hub)', lat: 26.8543, lng: 80.9448 },
  { label: 'Patna (PMCH / Ashok Rajpath)', lat: 25.6207, lng: 85.1603 },
  { label: 'Jaipur (SMS Hospital / Tonk Road)', lat: 26.9048, lng: 75.8152 },
  { label: 'Kolkata (Park Street / SSKM Hub)', lat: 22.5411, lng: 88.3426 },
] as const;

interface HospitalMapControllerProps {
  userLocation: { lat: number; lng: number };
  selectedHospital: DiscoveredHospital | null;
  travelMode: 'DRIVING' | 'WALKING' | 'TWO_WHEELER';
  searchLocationQuery: string;
  onLocationResolved: (coords: { lat: number; lng: number }, formattedLabel: string) => void;
  onHospitalsFound: (list: DiscoveredHospital[]) => void;
  onSelectHospital: (h: DiscoveredHospital) => void;
  onRouteComputed: (
    summary: { distanceKm: string; durationMins: number; steps: RouteStepItem[] } | null
  ) => void;
  onStatusChange: (msg: string | null) => void;
}

const HospitalMapController: React.FC<HospitalMapControllerProps> = ({
  userLocation,
  selectedHospital,
  travelMode,
  searchLocationQuery,
  onLocationResolved,
  onHospitalsFound,
  onSelectHospital,
  onRouteComputed,
  onStatusChange,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Always pan map smoothly when userLocation updates
  useEffect(() => {
    if (!map || !userLocation) return;
    map.panTo(userLocation);
  }, [map, userLocation]);

  // Resolve custom city/village/pincode search via Places API (New) Place.searchByText
  useEffect(() => {
    if (!placesLib || !searchLocationQuery.trim()) return;
    let cancelled = false;

    const resolveCustomLocation = async () => {
      try {
        const PlaceClass = (placesLib as any).Place;
        if (!PlaceClass || typeof PlaceClass.searchByText !== 'function') return;

        onStatusChange(`Locating "${searchLocationQuery}" on Google Maps...`);
        const res = await PlaceClass.searchByText({
          textQuery: searchLocationQuery,
          fields: ['displayName', 'location', 'formattedAddress'],
          maxResultCount: 1,
        });

        if (cancelled) return;
        const first = res?.places?.[0];
        if (first?.location) {
          const lat =
            typeof first.location.lat === 'function' ? first.location.lat() : first.location.lat;
          const lng =
            typeof first.location.lng === 'function' ? first.location.lng() : first.location.lng;
          if (typeof lat === 'number' && typeof lng === 'number') {
            onLocationResolved(
              { lat, lng },
              first.displayName || first.formattedAddress || searchLocationQuery
            );
            onStatusChange(null);
          }
        } else {
          onStatusChange(`Could not find coordinates for "${searchLocationQuery}".`);
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err || '');
        if (
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('OVER_QUERY_LIMIT')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
      }
    };

    resolveCustomLocation();
    return () => {
      cancelled = true;
    };
  }, [placesLib, searchLocationQuery]);

  // 1. Search nearby hospitals using Places API (New) Place.searchNearby
  useEffect(() => {
    if (!placesLib || !userLocation) return;

    let cancelled = false;
    onStatusChange('Scanning verified hospitals & emergency trauma centers near your location...');

    const runNearbySearch = async () => {
      try {
        const PlaceClass = (placesLib as any).Place;
        if (!PlaceClass || typeof PlaceClass.searchNearby !== 'function') {
          onStatusChange(null);
          return;
        }

        const request = {
          fields: [
            'id',
            'displayName',
            'location',
            'formattedAddress',
            'nationalPhoneNumber',
            'internationalPhoneNumber',
            'rating',
            'googleMapsURI',
          ],
          locationRestriction: {
            center: userLocation,
            radius: 8000,
          },
          includedPrimaryTypes: ['hospital'],
          maxResultCount: 8,
          rankPreference: 'POPULARITY',
        };

        const response = await PlaceClass.searchNearby(request);
        if (cancelled) return;

        const rawPlaces = response?.places || [];
        const mapped: DiscoveredHospital[] = rawPlaces
          .map((p: any) => {
            const lat =
              typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat;
            const lng =
              typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng;
            if (typeof lat !== 'number' || typeof lng !== 'number') return null;
            const loc = { lat, lng };
            const distKm = calculateHaversineDistanceKm(userLocation, loc);
            return {
              id: p.id || `${lat}-${lng}`,
              name: p.displayName || 'Verified Hospital & Trauma Center',
              address: p.formattedAddress || 'Emergency Medical Facility',
              phone:
                p.nationalPhoneNumber ||
                p.internationalPhoneNumber ||
                '108 (24x7 Emergency Ambulance)',
              rating: typeof p.rating === 'number' ? p.rating : null,
              googleMapsURI: p.googleMapsURI || null,
              location: loc,
              distanceKm: distKm,
            };
          })
          .filter(Boolean)
          .sort(
            (a: DiscoveredHospital, b: DiscoveredHospital) =>
              (a.distanceKm || 0) - (b.distanceKm || 0)
          );

        const spacedHospitals = mapped.filter((h) => (h.distanceKm || 0) >= 0.35);
        const finalHospitals = spacedHospitals.length > 0 ? spacedHospitals : mapped;

        onHospitalsFound(finalHospitals);
        if (finalHospitals.length > 0) {
          onSelectHospital(finalHospitals[0]);
          onStatusChange(null);
        } else {
          onStatusChange('No hospitals returned within 8 km radius.');
        }
      } catch (err: any) {
        const errMsg = String(err?.message || err || '');
        if (
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('OVER_QUERY_LIMIT') ||
          errMsg.includes('QuotaExceededError')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) {
          onStatusChange('Unable to query nearby hospitals right now.');
        }
      }
    };

    runNearbySearch();

    return () => {
      cancelled = true;
    };
  }, [placesLib, userLocation]);

  // 2. Compute shortest path route using Routes API Route.computeRoutes
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!routesLib || !map || !userLocation || !selectedHospital) {
      onRouteComputed(null);
      return;
    }

    let cancelled = false;
    const RouteClass = (routesLib as any).Route;
    if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
      return;
    }

    const request = {
      origin: userLocation,
      destination: selectedHospital.location,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    RouteClass.computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (cancelled) return;
        if (!routes || routes.length === 0) {
          onRouteComputed(null);
          return;
        }

        const primaryRoute = routes[0];
        if (typeof primaryRoute.createPolylines === 'function') {
          // Outer dark casing polyline + Inner bright navigation polyline (like real Google Maps)
          const outerPolylines = primaryRoute.createPolylines();
          outerPolylines.forEach((poly: google.maps.Polyline) => {
            poly.setOptions({
              strokeColor: '#1E3A8A',
              strokeWeight: 9,
              strokeOpacity: 0.45,
              zIndex: 10,
            });
            poly.setMap(map);
          });

          const innerPolylines = primaryRoute.createPolylines();
          innerPolylines.forEach((poly: google.maps.Polyline) => {
            poly.setOptions({
              strokeColor: '#EF4444',
              strokeWeight: 5,
              strokeOpacity: 0.95,
              zIndex: 20,
            });
            poly.setMap(map);
          });

          polylinesRef.current = [...outerPolylines, ...innerPolylines];
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 64);
        }

        const rawSteps = primaryRoute.legs?.[0]?.steps || [];
        const steps: RouteStepItem[] = rawSteps.slice(0, 5).map((st: any, idx: number) => ({
          instruction:
            st.instructions ||
            st.navigationInstruction?.instructions ||
            `Step ${idx + 1}: Continue along shortest emergency corridor toward ${selectedHospital.name}`,
          distanceText: st.distanceMeters
            ? `${(st.distanceMeters / 1000).toFixed(2)} km`
            : '0.4 km',
        }));

        const distKm = ((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(2);
        const durMins = Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000));
        onRouteComputed({ distanceKm: distKm, durationMins: durMins, steps });
      })
      .catch((err: any) => {
        const errMsg = String(err?.message || err || '');
        if (
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('OVER_QUERY_LIMIT') ||
          errMsg.includes('QuotaExceededError')
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteComputed(null);
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, userLocation, selectedHospital, travelMode]);

  return null;
};

interface NearbyHospitalFinderProps {
  onRegistrationComplete?: () => void;
}

export const NearbyHospitalFinder: React.FC<NearbyHospitalFinderProps> = ({
  onRegistrationComplete,
}) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: QUICK_LOCATIONS[0].lat,
    lng: QUICK_LOCATIONS[0].lng,
  });
  const [locationLabel, setLocationLabel] = useState<string>(QUICK_LOCATIONS[0].label);
  const [customSearchInput, setCustomSearchInput] = useState<string>('');
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState<string>('');
  const [locatingGps, setLocatingGps] = useState<boolean>(false);
  const [liveTrackingActive, setLiveTrackingActive] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [hospitals, setHospitals] = useState<DiscoveredHospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<DiscoveredHospital | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'TWO_WHEELER'>('DRIVING');
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [routeSummary, setRouteSummary] = useState<{
    distanceKm: string;
    durationMins: number;
    steps: RouteStepItem[];
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Direct Hospital Registration Modal & Confirmed Registrations State
  const [registerModalHospital, setRegisterModalHospital] =
    useState<DiscoveredHospital | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientBloodGroup, setPatientBloodGroup] = useState('O+');
  const [emergencyType, setEmergencyType] =
    useState<HospitalRegistrationRecord['emergencyType']>('OPD Consultation');
  const [regNotes, setRegNotes] = useState('');
  const [submittingReg, setSubmittingReg] = useState(false);
  const [registrations, setRegistrations] = useState<HospitalRegistrationRecord[]>([]);
  const [activeTokenSlip, setActiveTokenSlip] =
    useState<HospitalRegistrationRecord | null>(null);
  const [submissionSuccess, setSubmissionSuccess] =
    useState<SubmissionSuccessInfo | null>(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await fetch('/api/hospital-registrations');
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  // Clean up watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleShareLiveLocation = useCallback(() => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Search any city or village below.');
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationLabel(`Real-Time GPS (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        setLocatingGps(false);
      },
      (err) => {
        setLocatingGps(false);
        setGpsError(
          `Browser GPS permission unavailable (${err.message || 'denied'}). Use the live city/pincode search box or city selector below.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const toggleContinuousRealTimeTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported in this browser.');
      return;
    }

    if (liveTrackingActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLiveTrackingActive(false);
      return;
    }

    setGpsError(null);
    setLiveTrackingActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        setLocationLabel(`Live GPS Stream (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
      },
      () => {
        setLiveTrackingActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
  }, [liveTrackingActive]);

  const handleSearchCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchInput.trim()) return;
    setGpsError(null);
    setSubmittedSearchQuery(customSearchInput.trim());
  };

  const buildHospitalSlipPayload = (
    reg: HospitalRegistrationRecord
  ): ExportDocumentPayload => ({
    title: 'SankalpSetu Official Hospital Admission & OPD Token Slip',
    subtitle: `${reg.hospitalName} (${reg.emergencyType})`,
    referenceId: reg.tokenNumber,
    badgeText: `Blood Group ${reg.bloodGroup}`,
    fileNamePrefix: 'Hospital-Token-Slip',
    fields: [
      { label: 'Token Number', value: reg.tokenNumber },
      { label: 'Patient Name', value: reg.patientName },
      { label: 'Contact Phone', value: reg.phone },
      { label: 'Blood Group', value: reg.bloodGroup },
      { label: 'Department / Emergency Type', value: reg.emergencyType },
      { label: 'Hospital Name', value: reg.hospitalName },
      { label: 'Hospital Address', value: reg.hospitalAddress },
      { label: 'Hospital Emergency Phone', value: reg.hospitalPhone },
      {
        label: 'Shortest Route Distance',
        value: `${reg.distanceKm} km (~${reg.estimatedMins} mins)`,
      },
      { label: 'Status', value: reg.status },
      {
        label: 'Verified By',
        value: 'Admin Danish Khan (khandanish0503@gmail.com)',
      },
    ],
  });

  const handleHospitalRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerModalHospital) return;
    setSubmittingReg(true);
    try {
      const res = await fetch('/api/hospital-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          phone: patientPhone,
          bloodGroup: patientBloodGroup,
          emergencyType,
          hospitalName: registerModalHospital.name,
          hospitalAddress: registerModalHospital.address,
          hospitalPhone: registerModalHospital.phone,
          distanceKm: routeSummary
            ? Number(routeSummary.distanceKm)
            : registerModalHospital.distanceKm || 1.8,
          estimatedMins: routeSummary ? routeSummary.durationMins : 6,
          userLat: userLocation.lat,
          userLng: userLocation.lng,
          notes: regNotes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegisterModalHospital(null);
        setPatientName('');
        setPatientPhone('');
        setRegNotes('');
        setActiveTokenSlip(data.registration);
        setSubmissionSuccess({
          formTitle: `Hospital Emergency / OPD Registration (${data.registration?.tokenNumber || 'Confirmed'})`,
          message:
            data.message ||
            `Form Submitted Successfully! Hospital registration confirmed (${data.registration?.tokenNumber || 'HOSP'}) and summary sent to Admin khandanish0503@gmail.com.`,
          referenceId: data.registration?.tokenNumber || `HOSP-${Date.now()}`,
          category: data.registration?.emergencyType || emergencyType,
          applicantName: data.registration?.patientName || patientName || 'Patient',
          applicantEmail: 'khandanish0503@gmail.com',
          adminSummaryEmail: data.adminSummaryEmail || null,
        });
        fetchRegistrations();
        onRegistrationComplete?.();
      }
    } finally {
      setSubmittingReg(false);
    }
  };

  return (
    <section
      id="nearby-hospitals"
      className="py-14 border-t border-stone-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg"
    >
      <div className="max-w-[1360px] mx-auto responsive-shell space-y-6">
        {/* Header & Real-Time Location Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold mb-2">
              <Navigation className="w-3.5 h-3.5 text-[#1F6F5B] dark:text-emerald-400" />
              <span>Real-Time GPS Location · Shortest Route · Direct Hospital Registration</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white tracking-tight">
              Real-Time Hospital Map, Shortest Route & Direct Registration
            </h2>
            <p className="text-sm sm:text-base text-stone-600 dark:text-slate-300 mt-1.5 max-w-2xl">
              Share your real-time GPS or search any city, village, or pincode to see the shortest route on Google Maps, call the hospital emergency desk directly, or register online for an instant OPD / Trauma / Blood token.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleShareLiveLocation}
              disabled={locatingGps}
              className="px-4 py-2.5 rounded-xl bg-[#C1553B] hover:bg-[#A9442C] text-white font-semibold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <LocateFixed className={`w-4 h-4 ${locatingGps ? 'animate-spin' : ''}`} />
              {locatingGps ? 'Detecting GPS...' : 'Detect My GPS Now'}
            </button>

            <button
              type="button"
              onClick={toggleContinuousRealTimeTracking}
              className={`px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all flex items-center gap-1.5 cursor-pointer ${
                liveTrackingActive
                  ? 'bg-emerald-700 text-white border-emerald-600 shadow-md'
                  : 'glass-card text-stone-800 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800'
              }`}
            >
              <Radio className="w-4 h-4" />
              {liveTrackingActive ? 'Live GPS Tracking ON' : 'Real-Time GPS Watch'}
            </button>
          </div>
        </div>

        {/* Custom Location Search Bar + Preset City Hub Selector + Map Mode Toggle */}
        <div className="liquid-glass liquid-sheen rounded-2xl p-3.5 sm:p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center">
          <form
            onSubmit={handleSearchCustomLocation}
            className="xl:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0"
          >
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={customSearchInput}
                onChange={(e) => setCustomSearchInput(e.target.value)}
                placeholder="Search city, village, or pincode..."
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-stone-300 dark:border-slate-700 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1F6F5B]"
              />
            </div>
            <button
              type="submit"
              className="liquid-btn px-4 py-2.5 rounded-xl bg-stone-900 dark:bg-emerald-600 text-white text-xs font-semibold hover:opacity-95 whitespace-nowrap shrink-0 cursor-pointer text-center"
            >
              Locate on Map
            </button>
          </form>

          <div className="xl:col-span-4 min-w-0">
            <select
              aria-label="Select city or region for nearby hospitals"
              value={`${userLocation.lat},${userLocation.lng}`}
              onChange={(e) => {
                const [latStr, lngStr] = e.target.value.split(',');
                const found = QUICK_LOCATIONS.find(
                  (q) => `${q.lat},${q.lng}` === e.target.value
                );
                if (latStr && lngStr) {
                  setUserLocation({ lat: Number(latStr), lng: Number(lngStr) });
                  setLocationLabel(found ? found.label : 'Selected Region');
                  setGpsError(null);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 text-xs sm:text-sm font-semibold text-stone-800 dark:text-slate-100 truncate focus:outline-none focus:ring-2 focus:ring-[#1F6F5B]"
            >
              {QUICK_LOCATIONS.map((loc) => (
                <option key={loc.label} value={`${loc.lat},${loc.lng}`}>
                  Hub: {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="xl:col-span-3 flex items-center justify-end gap-2 shrink-0">
            {(['roadmap', 'hybrid'] as const).map((mType) => (
              <button
                key={mType}
                type="button"
                onClick={() => setMapTypeId(mType)}
                className={`liquid-btn flex-1 xl:flex-initial py-2.5 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 border transition-all cursor-pointer text-center ${
                  mapTypeId === mType
                    ? 'bg-stone-900 dark:bg-white text-white dark:text-slate-900 border-stone-900 shadow-sm'
                    : 'bg-white/85 dark:bg-slate-800/85 text-stone-700 dark:text-slate-300 border-stone-300 dark:border-slate-700 hover:bg-stone-100 dark:hover:bg-slate-700'
                }`}
              >
                {mType === 'hybrid' ? 'Satellite' : 'Road Map'}
              </button>
            ))}
          </div>
        </div>

        {gpsError && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Map + Nearby Hospitals List Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Column: Active Shortest Route + Discovered Hospitals with Call & Register Buttons (5 Cols) */}
          <div className="xl:col-span-5 space-y-4">
            <div className="liquid-glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-700 dark:text-slate-200 flex items-center gap-1.5 truncate">
                  <MapPin className="w-4 h-4 text-[#C1553B] shrink-0" />
                  Origin: {locationLabel}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {(['DRIVING', 'TWO_WHEELER', 'WALKING'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTravelMode(mode)}
                      className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
                        travelMode === mode
                          ? 'bg-stone-900 dark:bg-emerald-600 text-white border-stone-900 dark:border-emerald-500'
                          : 'bg-white dark:bg-slate-800 text-stone-600 dark:text-slate-300 border-stone-300 dark:border-slate-700'
                      }`}
                    >
                      {mode === 'TWO_WHEELER' ? '2W' : mode === 'DRIVING' ? 'Drive' : 'Walk'}
                    </button>
                  ))}
                </div>
              </div>

              {selectedHospital && (
                <div className="p-4 rounded-xl bg-emerald-950 text-white space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                      <RouteIcon className="w-3.5 h-3.5" /> Live Shortest Route
                    </span>
                    {routeSummary ? (
                      <span className="font-mono text-xs font-bold bg-emerald-900 px-2.5 py-0.5 rounded text-amber-300 flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" /> {routeSummary.distanceKm} km · ~{routeSummary.durationMins} mins
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-emerald-300 tabular-nums">
                        ~{selectedHospital.distanceKm ?? '1.4'} km away
                      </span>
                    )}
                  </div>
                  <div className="font-serif text-base font-bold">{selectedHospital.name}</div>
                  <div className="text-xs text-emerald-200">{selectedHospital.address}</div>

                  {/* Action Buttons: Call Hospital, Register at Hospital, Open Google Maps */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`tel:${selectedHospital.phone.replace(/\s+/g, '')}`}
                      className="px-3 py-2 rounded-lg bg-white text-stone-900 font-mono text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-stone-100 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-red-700 shrink-0" />
                      <span className="truncate">Call {selectedHospital.phone}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setRegisterModalHospital(selectedHospital)}
                      className="px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ClipboardPlus className="w-3.5 h-3.5 shrink-0" />
                      <span>Register at Hospital</span>
                    </button>
                  </div>

                  <a
                    href={
                      selectedHospital.googleMapsURI ||
                      `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedHospital.location.lat},${selectedHospital.location.lng}&travelmode=driving`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-3 rounded-lg bg-[#C1553B] hover:bg-[#A9442C] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Start Turn-by-Turn Navigation in Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Turn-by-turn route maneuvers */}
                  {routeSummary && routeSummary.steps.length > 0 && (
                    <div className="pt-2 border-t border-emerald-800/80 space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 block">
                        Shortest Route Corridor Directions:
                      </span>
                      {routeSummary.steps.slice(0, 3).map((st, i) => (
                        <div
                          key={i}
                          className="text-[11px] text-emerald-100 flex items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            {i + 1}. {st.instruction.replace(/<[^>]*>/g, '')}
                          </span>
                          <span className="font-mono text-amber-300 shrink-0 tabular-nums">
                            {st.distanceText}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {statusMessage && (
              <div className="p-3 rounded-xl glass-card text-xs text-stone-600 dark:text-slate-300 font-mono">
                {statusMessage}
              </div>
            )}

            {/* Discovered Nearby Hospitals List */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {hospitals.map((hosp, idx) => {
                const isSelected = selectedHospital?.id === hosp.id;
                return (
                  <div
                    key={hosp.id}
                    onClick={() => setSelectedHospital(hosp)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'glass-card border-[#C1553B] ring-2 ring-[#C1553B]/25'
                        : 'bg-white/75 dark:bg-slate-800/75 border-stone-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-mono font-semibold text-red-700 dark:text-red-400">
                          #{idx + 1} Nearest Hospital · {hosp.distanceKm} km
                        </span>
                        <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white mt-0.5">
                          {hosp.name}
                        </h3>
                      </div>
                      {hosp.rating && (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-300 shrink-0 tabular-nums">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {hosp.rating}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {hosp.address}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-stone-200/70 dark:border-slate-700 text-xs">
                      <a
                        href={`tel:${hosp.phone.replace(/\s+/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono font-semibold text-[#1F6F5B] dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" /> Call {hosp.phone}
                      </a>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHospital(hosp);
                            setRegisterModalHospital(hosp);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-900 dark:bg-emerald-600 text-white text-[11px] font-semibold hover:opacity-90 cursor-pointer"
                        >
                          Register Here
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Interactive Real-Time Google Map + Recent Hospital Registrations (7 Cols) */}
          <div className="xl:col-span-7 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-stone-300 dark:border-slate-700 shadow-xl bg-stone-100 dark:bg-slate-800 h-[440px] sm:h-[500px] relative">
              {MAPS_API_KEY ? (
                <APIProvider apiKey={MAPS_API_KEY}>
                  <Map
                    defaultCenter={userLocation}
                    defaultZoom={13}
                    mapId="DEMO_MAP_ID"
                    mapTypeId={mapTypeId}
                    gestureHandling="greedy"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    className="w-full h-full"
                  >
                    <HospitalMapController
                      userLocation={userLocation}
                      selectedHospital={selectedHospital}
                      travelMode={travelMode}
                      searchLocationQuery={submittedSearchQuery}
                      onLocationResolved={(coords, label) => {
                        setUserLocation(coords);
                        setLocationLabel(label);
                      }}
                      onHospitalsFound={setHospitals}
                      onSelectHospital={setSelectedHospital}
                      onRouteComputed={setRouteSummary}
                      onStatusChange={setStatusMessage}
                    />

                    {/* User Real-Time Origin Marker */}
                    <AdvancedMarker position={userLocation} title="Your Real-Time Location">
                      <div className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-mono font-bold shadow-xl border-2 border-white flex items-center gap-1.5">
                        <LocateFixed className="w-3.5 h-3.5 text-amber-300" />
                        <span>You ({locationLabel.split('(')[0].trim()})</span>
                      </div>
                    </AdvancedMarker>

                    {/* Discovered Hospital Markers */}
                    {hospitals.map((h, i) => {
                      const active = selectedHospital?.id === h.id;
                      return (
                        <AdvancedMarker
                          key={h.id}
                          position={h.location}
                          title={`${h.name} (${h.distanceKm} km)`}
                          onClick={() => setSelectedHospital(h)}
                        >
                          <div
                            className={`px-2.5 py-1 rounded-xl font-mono text-xs font-bold shadow-lg border-2 transition-transform cursor-pointer ${
                              active
                                ? 'bg-red-600 text-white border-white scale-115'
                                : 'bg-white text-red-800 border-red-600 hover:scale-105'
                            }`}
                          >
                            H{i + 1} · {h.distanceKm}km
                          </div>
                        </AdvancedMarker>
                      );
                    })}
                  </Map>
                </APIProvider>
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 text-center text-sm text-stone-600">
                  Google Maps API key not configured.
                </div>
              )}
            </div>

            {/* Recent Hospital Registrations Strip */}
            <div className="liquid-glass rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ClipboardPlus className="w-4 h-4 text-[#1F6F5B] dark:text-emerald-400" />
                  Confirmed Hospital OPD, Trauma & Blood Registrations ({registrations.length})
                </h3>
                {selectedHospital && (
                  <button
                    type="button"
                    onClick={() => setRegisterModalHospital(selectedHospital)}
                    className="text-xs font-semibold text-[#C1553B] dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    + New Registration at {selectedHospital.name}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {registrations.slice(0, 4).map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-stone-200/90 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-emerald-800 dark:text-emerald-400">
                        {reg.tokenNumber} · {reg.bloodGroup}
                      </div>
                      <div className="font-semibold text-stone-900 dark:text-white truncate">
                        {reg.patientName} ({reg.emergencyType})
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-slate-400 truncate">
                        {reg.hospitalName} · {reg.distanceKm} km
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTokenSlip(reg)}
                      className="px-2.5 py-1.5 rounded-lg border border-stone-300 dark:border-slate-700 text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold shrink-0 cursor-pointer"
                    >
                      Slip
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Register Patient / Blood / Emergency at Selected Hospital */}
      {registerModalHospital && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-stone-200 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3 border-b border-stone-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono uppercase text-emerald-700 dark:text-emerald-400 font-bold">
                  Direct Hospital Registration & Emergency Desk
                </span>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white mt-0.5">
                  {registerModalHospital.name}
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  {registerModalHospital.address} · Phone: {registerModalHospital.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRegisterModalHospital(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleHospitalRegistrationSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                    Patient / Donor Full Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Aarav Verma"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-stone-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                    Contact Mobile Number
                  </label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 9811223344"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-stone-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                    Department / Emergency Type
                  </label>
                  <select
                    value={emergencyType}
                    onChange={(e) => setEmergencyType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-stone-900 dark:text-white"
                  >
                    <option value="OPD Consultation">OPD Consultation</option>
                    <option value="Emergency Trauma">Emergency Trauma Bay</option>
                    <option value="Blood Transfusion">Blood Donation / Transfusion</option>
                    <option value="Maternity & NICU">Maternity & NICU</option>
                    <option value="Ambulance Dispatch">Ambulance Dispatch Request</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={patientBloodGroup}
                    onChange={(e) => setPatientBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-stone-900 dark:text-white"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1">
                  Symptoms / Original ID Reference
                </label>
                <input
                  type="text"
                  value={regNotes}
                  onChange={(e) => setRegNotes(e.target.value)}
                  placeholder="e.g. Aadhaar #9921 • Arriving via shortest route in 8 mins"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-stone-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterModalHospital(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-semibold text-stone-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="px-5 py-2.5 rounded-xl bg-[#1F6F5B] hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submittingReg ? 'Confirming Slot...' : 'Confirm Hospital Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Printable Hospital Registration Token Slip */}
      {activeTokenSlip && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase text-emerald-700 dark:text-emerald-400 font-bold">
                  Official Hospital Admission & OPD Slip
                </span>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  Token: {activeTokenSlip.tokenNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTokenSlip(null)}
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-700 dark:text-slate-300 font-mono bg-stone-50 dark:bg-slate-800/90 p-4 rounded-xl border border-stone-200 dark:border-slate-700">
              <div>
                <strong>Hospital:</strong> {activeTokenSlip.hospitalName}
              </div>
              <div>
                <strong>Address:</strong> {activeTokenSlip.hospitalAddress}
              </div>
              <div>
                <strong>Emergency Desk:</strong> {activeTokenSlip.hospitalPhone}
              </div>
              <div>
                <strong>Patient Name:</strong> {activeTokenSlip.patientName} ({activeTokenSlip.bloodGroup})
              </div>
              <div>
                <strong>Department:</strong> {activeTokenSlip.emergencyType}
              </div>
              <div>
                <strong>Shortest Route Distance:</strong> {activeTokenSlip.distanceKm} km (~{activeTokenSlip.estimatedMins} mins)
              </div>
              <div>
                <strong>Verified By:</strong> Admin Danish Khan (khandanish0503@gmail.com)
              </div>
            </div>

            <div className="space-y-2.5 pt-1 no-print">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-slate-300">
                Download Token Slip (PDF / Excel / HTML):
              </div>
              <ExportFormatButtons
                payload={buildHospitalSlipPayload(activeTokenSlip)}
                compact
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <a
                href={`tel:${activeTokenSlip.hospitalPhone.replace(/\s+/g, '')}`}
                className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" /> Call Desk
              </a>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#1F6F5B] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Token Slip
              </button>
            </div>
          </div>
        </div>
      )}

      <SubmissionSuccessModal
        submission={submissionSuccess}
        onClose={() => setSubmissionSuccess(null)}
      />
    </section>
  );
};
