import { Component, createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Note } from "../../services/db";
import { themeStore } from "../../theme";

interface PetaDuniaProps {
  notes: Note[];
}

/**
 * Inner map component that creates a fresh MapLibre instance on mount
 * and fully destroys it on cleanup. No reactive updates to sources —
 * the parent remounts this component via a key when notes change.
 */
const PetaDuniaInner: Component<PetaDuniaProps> = (props) => {
  let mapContainer: HTMLDivElement | undefined;

  const defaultCenter = { lat: -2.5489, lng: 118.0149 };

  const applyMapTheme = (m: maplibregl.Map) => {
    try {
      if (!m.isStyleLoaded()) return;

      const style = getComputedStyle(document.documentElement);
      const getColor = (varName: string, fallback: string) => {
        const val = style.getPropertyValue(varName).trim();
        return val || fallback;
      };

      const cPrimary = getColor('--color-primary', '#6200ee');
      const cSecondary = getColor('--color-secondary', '#03dac6');
      const cTertiary = getColor('--color-tertiary', '#018786');
      const cSurface = getColor('--color-surface', '#ffffff');
      const cSurfaceVar = getColor('--color-surface-variant', '#eeeeee');
      const cOnSurface = getColor('--color-on-surface', '#000000');
      const cOutline = getColor('--color-outline', '#e0e0e0');

      // Background
      if (!m.getLayer('background')) {
        m.addLayer({
          id: 'background',
          type: 'background',
          paint: { 'background-color': cSurface }
        }, m.getStyle().layers[0].id);
      } else {
        m.setPaintProperty('background', 'background-color', cSurface);
      }

      // Hide raster relief at low zoom
      if (m.getLayer('natural_earth')) {
        m.setLayoutProperty('natural_earth', 'visibility', 'none');
      }

      const layers = m.getStyle().layers;
      layers.forEach(layer => {
        const sourceLayer = (layer as any)['source-layer'];
        
        if (layer.id === 'water' || sourceLayer === 'water' || sourceLayer === 'waterway' || (layer.id && layer.id.includes('ocean'))) {
          if (layer.type === 'fill') {
            m.setPaintProperty(layer.id, 'fill-color', cSecondary);
            m.setPaintProperty(layer.id, 'fill-opacity', 0.35);
          } else if (layer.type === 'line') {
            m.setPaintProperty(layer.id, 'line-color', cSecondary);
            m.setPaintProperty(layer.id, 'line-opacity', 0.5);
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

        if (sourceLayer === 'transportation') {
          if (layer.type === 'line') {
            m.setPaintProperty(layer.id, 'line-color', cOutline);
            m.setPaintProperty(layer.id, 'line-opacity', 0.3);
          }
        }
        
        if (layer.type === 'symbol') {
          if (layer.paint && 'text-color' in layer.paint) {
            m.setPaintProperty(layer.id, 'text-color', cOnSurface);
            m.setPaintProperty(layer.id, 'text-halo-color', cSurface);
          }
        }
      });

      // Update Heatmap colors if they exist
      if (m.getLayer('notes-heat')) {
        m.setPaintProperty('notes-heat', 'heatmap-color', [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, cPrimary,
          0.6, cSecondary,
          1, cTertiary
        ]);
      }
      if (m.getLayer('notes-point')) {
        m.setPaintProperty('notes-point', 'circle-color', cPrimary);
        m.setPaintProperty('notes-point', 'circle-stroke-color', cSurface);
      }
    } catch (err) {
      console.warn("PetaDunia: applyMapTheme error (non-fatal):", err);
    }
  };

  const addHeatmapLayers = (m: maplibregl.Map) => {
    try {
      if (!m.isStyleLoaded()) return;

      const features: any[] = [];
      props.notes.forEach((note) => {
        if (note.location) {
          try {
            const locData = JSON.parse(note.location);
            if (locData && typeof locData.lat === "number" && typeof locData.lng === "number") {
              features.push({
                type: "Feature",
                properties: { title: note.title, id: note.id },
                geometry: { type: "Point", coordinates: [locData.lng, locData.lat] },
              });
            }
          } catch (e) {
            console.warn("Invalid location JSON in note:", note.id);
          }
        }
      });

      const geoData = { type: "FeatureCollection", features };
      const sourceId = "notes-locations";

      m.addSource(sourceId, { type: "geojson", data: geoData as any });

      const style = getComputedStyle(document.documentElement);
      const cPrimary = style.getPropertyValue("--color-primary").trim() || "#6200ee";
      const cSecondary = style.getPropertyValue("--color-secondary").trim() || "#03dac6";
      const cTertiary = style.getPropertyValue("--color-tertiary").trim() || "#018786";
      const cSurface = style.getPropertyValue("--color-surface").trim() || "#fff";

      const layers = m.getStyle().layers;
      const firstSymbolLayerId = layers.find(l => l.type === 'symbol')?.id;

      m.addLayer({
        id: "notes-heat",
        type: "heatmap",
        source: sourceId,
        maxzoom: 15,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, cPrimary,
            0.6, cSecondary,
            1, cTertiary,
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 15, 15, 40],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 15, 0],
        },
      }, firstSymbolLayerId);

      m.addLayer({
        id: "notes-point",
        type: "circle",
        source: sourceId,
        minzoom: 8,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 4, 15, 12],
          "circle-color": cPrimary,
          "circle-stroke-color": cSurface,
          "circle-stroke-width": 2,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0, 12, 1],
          "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0, 12, 1],
        },
      }, firstSymbolLayerId);
    } catch (err) {
      console.warn("PetaDunia: addHeatmapLayers error (non-fatal):", err);
    }
  };

  onMount(() => {
    if (!mapContainer) return;

    const m = new maplibregl.Map({
      container: mapContainer,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 2,
      attributionControl: false,
      interactive: true,
    });

    m.on("style.load", () => {
      setTimeout(() => {
        applyMapTheme(m);
        addHeatmapLayers(m);
      }, 100);
    });

    // Listen for theme changes to re-theme the map
    createEffect(() => {
      themeStore.state.isDark;
      themeStore.state.seedColor;
      themeStore.state.style;
      themeStore.state.generatedPalettes;

      if (m.isStyleLoaded()) {
        setTimeout(() => applyMapTheme(m), 50);
      }
    });

    onCleanup(() => {
      m.remove();
    });
  });

  return (
    <div class="relative w-full h-full rounded-[32px] overflow-hidden border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container-low)]">
      <div ref={mapContainer} class="w-full h-full" />
      <div class="absolute inset-0 pointer-events-none rounded-[32px] box-border border border-[var(--color-outline)]/10"></div>
    </div>
  );
};

/**
 * Wrapper that forces a full remount of the inner map component
 * whenever `notes` change. Uses SolidJS's `<Show keyed>` which
 * destroys and recreates children when the key value changes.
 */
const PetaDunia: Component<PetaDuniaProps> = (props) => {
  const [version, setVersion] = createSignal(0);

  createEffect(() => {
    // Track notes changes — any change bumps the version
    props.notes.length;
    setVersion(v => v + 1);
  });

  return (
    <Show when={version()} keyed>
      {(_v) => <PetaDuniaInner notes={props.notes} />}
    </Show>
  );
};

export default PetaDunia;

