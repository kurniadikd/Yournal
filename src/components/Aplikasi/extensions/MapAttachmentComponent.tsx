import { openUrl } from '@tauri-apps/plugin-opener';
import { onMount, onCleanup, createSignal } from 'solid-js';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapAttachmentAttributes {
  name: string;
  lat: number;
  lng: number;
}

export default function MapAttachmentComponent(props: {
  node: { attrs: MapAttachmentAttributes },
  updateAttributes: (attrs: Partial<MapAttachmentAttributes>) => void,
  selected: boolean,
  deleteNode: () => void
}) {
  let mapContainer: HTMLDivElement | undefined;
  const [map, setMap] = createSignal<maplibregl.Map | null>(null);
  const { name, lat, lng } = props.node.attrs;

  const applyMapTheme = (m: maplibregl.Map) => {
    const style = getComputedStyle(document.documentElement);
    const getColor = (varName: string, fallback: string) => style.getPropertyValue(varName).trim() || fallback;

    const cPrimary = getColor('--color-primary', '#6200ee');
    const cSecondary = getColor('--color-secondary', '#03dac6');
    const cTertiary = getColor('--color-tertiary', '#018786');
    const cSurface = getColor('--color-surface', '#ffffff');
    const cSurfaceVar = getColor('--color-surface-variant', '#eeeeee');
    const cOnSurface = getColor('--color-on-surface', '#000000');
    const cOnTertiary = getColor('--color-on-tertiary', '#ffffff');
    const cOutline = getColor('--color-outline', '#e0e0e0');

    if (!m.getLayer('background')) {
      m.addLayer({
        id: 'background',
        type: 'background',
        paint: { 'background-color': cSurface }
      }, m.getStyle().layers[0].id);
    } else {
      m.setPaintProperty('background', 'background-color', cSurface);
    }

    m.getStyle().layers.forEach(layer => {
      const sourceLayer = layer['source-layer'];
      if (layer.id === 'water' || sourceLayer === 'water' || sourceLayer === 'waterway') {
        if (layer.type === 'fill') {
          m.setPaintProperty(layer.id, 'fill-color', cSecondary);
          m.setPaintProperty(layer.id, 'fill-opacity', 0.15);
        } else if (layer.type === 'line') {
          m.setPaintProperty(layer.id, 'line-color', cSecondary);
          m.setPaintProperty(layer.id, 'line-opacity', 0.3);
        }
      }
      if (['park', 'landcover_wood', 'landcover_grass', 'landuse_residential'].some(k => layer.id.includes(k))) {
        if (layer.type === 'fill') {
          m.setPaintProperty(layer.id, 'fill-color', cPrimary);
          m.setPaintProperty(layer.id, 'fill-opacity', 0.05);
        }
      }
      if (layer.id.includes('building')) {
        if (layer.type === 'fill' || layer.type === 'fill-extrusion') {
          const prop = layer.type === 'fill-extrusion' ? 'fill-extrusion-color' : 'fill-color';
          m.setPaintProperty(layer.id, prop, cSurfaceVar);
        }
      }
      if (sourceLayer === 'transportation' && layer.type === 'line') {
        m.setPaintProperty(layer.id, 'line-color', cOutline);
      }
      if (layer.type === 'symbol' && layer.paint && 'text-color' in layer.paint) {
        m.setPaintProperty(layer.id, 'text-color', cOnSurface);
        m.setPaintProperty(layer.id, 'text-halo-color', cSurface);
      }
    });

    // Create marker
    const marker = new maplibregl.Marker()
      .setLngLat([lng, lat])
      .addTo(m);
    
    const el = marker.getElement();
    el.querySelectorAll('path, circle').forEach((path) => {
      const isInner = path.getAttribute('fill') === '#FFFFFF' || path.getAttribute('fill') === 'white';
      if (isInner) {
        (path as SVGElement).style.fill = cOnTertiary;
      } else {
        (path as SVGElement).style.fill = cTertiary;
      }
      (path as SVGElement).style.fillOpacity = "1";
      (path as SVGElement).style.strokeOpacity = "1";
    });
  };

  onMount(() => {
    if (!mapContainer) return;

    const m = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lng, lat],
      zoom: 13,
      attributionControl: false,
      interactive: false // Static preview
    });

    m.on('style.load', () => applyMapTheme(m));
    setMap(m);
  });

  onCleanup(() => {
    map()?.remove();
  });

  const handleOpenMap = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (lat && lng) {
      await openUrl(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    }
  };

  return (
    <div 
      class={`
        my-4 rounded-xl border overflow-hidden transition-all select-none
        bg-[var(--color-surface-container)] 
        ${props.selected 
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-elevation-2' 
          : 'border-[var(--color-outline-variant)]/50 hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-outline)] cursor-pointer'
        }
      `}
      onClick={handleOpenMap}
      title="Buka di Google Maps"
    >
      <div class="flex h-32">
        {/* Left side: Real Map Preview */}
        <div class="w-40 bg-[var(--color-surface-variant)] shrink-0 relative overflow-hidden">
          <div ref={mapContainer} class="w-full h-full pointer-events-none" />
          {/* Subtle overlay to ensure click goes to card */}
          <div class="absolute inset-0 z-10" />
        </div>

        {/* Right side: Content */}
        <div class="flex-1 p-4 flex flex-col justify-center min-w-0 pr-12 relative">
          <h3 class="text-base font-bold text-[var(--color-on-surface)] line-clamp-1 mb-1">
            {name || "Lokasi Tidak Bernama"}
          </h3>
          
          <p class="text-sm text-[var(--color-on-surface-variant)] font-mono">
            {lat?.toFixed(5)}, {lng?.toFixed(5)}
          </p>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.deleteNode();
            }}
            title="Hapus Lokasi"
            class="absolute top-1/2 -translate-y-1/2 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-error-container)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)] transition-colors"
          >
            <span class="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
