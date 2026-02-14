import { Component, createSignal, onCleanup, Show } from "solid-js";
import Modal from "./Modal";
import Button from "./Button";
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface LocationModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: (location: { name: string; lat: number; lng: number } | null) => void;
  initialLocation?: { name: string; lat: number; lng: number };
}

const LocationModal: Component<LocationModalProps> = (props) => {
  let mapContainer: HTMLDivElement | undefined;
  const [map, setMap] = createSignal<maplibregl.Map | null>(null);
  const [marker, setMarker] = createSignal<maplibregl.Marker | null>(null);
  const [locationName, setLocationName] = createSignal("");
  const [coords, setCoords] = createSignal<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = createSignal(false);

  // Default to Monas (Jakarta)
  const defaultCenter = { lat: -6.1754, lng: 106.8272 };

  const initMap = () => {
    if (!mapContainer || map()) return;

    const hasInitial = !!props.initialLocation;
    const initialLat = props.initialLocation?.lat || defaultCenter.lat;
    const initialLng = props.initialLocation?.lng || defaultCenter.lng;

    const mapInstance = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty', // Vector Style
      center: [initialLng, initialLat],
      zoom: 14,
      attributionControl: false // Custom attribution if needed
    });

    mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    const initialMarker = new maplibregl.Marker({ draggable: true })
      .setLngLat([initialLng, initialLat])
      .addTo(mapInstance);

    initialMarker.on('dragend', () => {
      const lngLat = initialMarker.getLngLat();
      handleLocationSelect(lngLat.lat, lngLat.lng);
    });

    mapInstance.on('click', (e) => {
      handleLocationSelect(e.lngLat.lat, e.lngLat.lng);
    });

    setMap(mapInstance);
    setMarker(initialMarker);

    if (hasInitial) {
        setLocationName(props.initialLocation!.name);
        setCoords({ lat: props.initialLocation!.lat, lng: props.initialLocation!.lng });
    } else {
        // Default to Monas first
        handleLocationSelect(initialLat, initialLng);

        // Try to get User Location
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    // Fly to user location
                    mapInstance.flyTo({ center: [longitude, latitude], zoom: 15 });
                    initialMarker.setLngLat([longitude, latitude]);
                    handleLocationSelect(latitude, longitude);
                },
                (error) => {
                    console.log("Geolocation permission denied or failed, staying at Monas.", error);
                }
            );
        }
    }
  };

  // Ensure map resizes correctly when modal opens
  let resizeTimer: number;
  const checkResize = () => {
      if (props.show && map()) {
          // Slight delay to allow modal transition
          resizeTimer = setTimeout(() => {
              map()?.resize();
          }, 200) as any;
      } else if (props.show && !map()) {
          // Init if not already
           resizeTimer = setTimeout(() => {
              initMap();
          }, 100) as any;
      }
  };

  const handleLocationSelect = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    marker()?.setLngLat([lng, lat]);
    
    // Fly to location smoothly
    map()?.flyTo({ center: [lng, lat], zoom: 14 });

    // Reverse Geocoding via Nominatim (Still uses raster service for names, but map is vector)
    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        // Simplify address
        const parts = data.display_name.split(',').slice(0, 3).join(',');
        setLocationName(parts);
      }
    } catch (error) {
      console.error("Failed to fetch address", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationSelect(position.coords.latitude, position.coords.longitude);
          setLoading(false);
        },
        (error) => {
          console.error("Error getting location", error);
          setLoading(false);
          alert("Gagal mendeteksi lokasi.");
        }
      );
    } else {
      alert("Browser tidak mendukung Geolocation.");
    }
  };

  const handleRemove = () => {
    props.onConfirm(null);
    props.onClose();
  };

  const handleConfirm = () => {
    if (coords()) {
      props.onConfirm({
        name: locationName(),
        lat: coords()!.lat,
        lng: coords()!.lng
      });
      props.onClose();
    }
  };

  onCleanup(() => {
      map()?.remove();
  });

  return (
    <Modal
      show={props.show}
      onClose={props.onClose}
      title="Pilih Lokasi"
      actions={
        <div class="flex justify-between w-full mt-4 px-1 items-center">
            <div>
                <Button variant="text" onClick={handleGetCurrentLocation} disabled={loading()}>
                     <span class="material-symbols-rounded mr-2">my_location</span>
                     Lokasi Saya
                </Button>
            </div>
            <div class="flex gap-2">
                <Show when={props.initialLocation}>
                    <Button 
                        variant="text" 
                        class="!text-[var(--color-error)] hover:!bg-[var(--color-error)]/10" 
                        onClick={handleRemove}
                    >
                        Hapus
                    </Button>
                </Show>
                <Button variant="text" onClick={props.onClose}>Batal</Button>
                <Button variant="filled" onClick={handleConfirm} disabled={!coords() || loading()}>
                    Simpan
                </Button>
            </div>
        </div>
      }
    >
        {/* Trigger resize/init when shown */}
        <Show when={props.show}>
            {(() => { checkResize(); return null; })()}
        </Show>

        <div class="flex flex-col gap-3">
            <input 
                type="text" 
                class="w-full h-12 px-4 bg-[var(--color-surface-container-low)] border-none rounded-2xl focus:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] outline-none"
                placeholder="Nama lokasi..."
                value={locationName()}
                onInput={(e) => setLocationName(e.currentTarget.value)}
            />
            
            <div class="w-full h-[300px] rounded-2xl overflow-hidden relative bg-[var(--color-surface-variant)]">
               <div ref={mapContainer} class="w-full h-full z-10" />
               <Show when={loading()}>
                   <div class="absolute inset-0 bg-black/20 flex items-center justify-center z-20">
                       <span class="loading loading-spinner loading-md text-white"></span>
                   </div>
               </Show>
            </div>
        </div>
    </Modal>
  );
};

export default LocationModal;
