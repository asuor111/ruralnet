'use client';

// Themed Leaflet map over OpenStreetMap tiles with toggleable layers:
// location marker + search radius, schools, health facilities, telecom
// towers, fibre routes and electricity substations.
//
// Leaflet is imported dynamically (browser-only) because its module touches
// `window` at import time, which would break server-side rendering.

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css'; // bundler-processed; does not execute window code
import type { ResearchReport } from '@/domain/types';

type LeafletModule = typeof import('leaflet');

interface LayerDef {
  key: string;
  label: string;
  layer: unknown; // L.Layer — typed after leaflet is loaded
}

const MARKER_BOX =
  '<span style="display:block;width:11px;height:11px;border-radius:2px;border:1px solid #fff;background:%s"></span>';

function boxIcon(L: LeafletModule, color: string) {
  return L.divIcon({ html: MARKER_BOX.replace('%s', color), className: 'rn-marker', iconSize: [13, 13] });
}

function marker(L: LeafletModule, f: { latitude: number; longitude: number; name?: string }, color: string) {
  return L.marker([f.latitude, f.longitude], { icon: boxIcon(L, color), title: f.name ?? '' });
}

function buildLayers(L: LeafletModule, report: ResearchReport): LayerDef[] {
  const layers: LayerDef[] = [];
  const loc = report.location;
  const radiusM = report.sections.facilities.withinRadiusKm * 1000;

  layers.push({
    key: 'location',
    label: 'Location',
    layer: L.layerGroup([
      L.circle([loc.latitude, loc.longitude], radiusM, {
        color: '#7c3aed',
        weight: 1,
        opacity: 0.35,
        fillColor: '#7c3aed',
        fillOpacity: 0.04,
      }),
      marker(L, loc, '#7c3aed'),
    ]),
  });

  if (report.sections.facilities.schools.length > 0) {
    layers.push({
      key: 'schools',
      label: 'Schools',
      layer: L.layerGroup(report.sections.facilities.schools.map((s) => marker(L, s, '#28a745'))),
    });
  }
  if (report.sections.facilities.health.length > 0) {
    layers.push({
      key: 'health',
      label: 'Health facilities',
      layer: L.layerGroup(report.sections.facilities.health.map((h) => marker(L, h, '#c94b4b'))),
    });
  }
  if (report.sections.infrastructure.towers.length > 0) {
    layers.push({
      key: 'towers',
      label: 'Telecom infrastructure',
      layer: L.layerGroup(report.sections.infrastructure.towers.map((t) => marker(L, t, '#8a8a8a'))),
    });
  }
  if (report.sections.electricity.substations.length > 0) {
    layers.push({
      key: 'electricity',
      label: 'Electricity',
      layer: L.layerGroup(report.sections.electricity.substations.map((s) => marker(L, s, '#e0a020'))),
    });
  }

  const fibreGeom = report.sections.fibre.geometry as
    | { type: 'FeatureCollection'; features: Array<{ geometry: { type: 'LineString'; coordinates: number[][] } }> }
    | undefined;
  if (fibreGeom && fibreGeom.features && fibreGeom.features.length > 0) {
    const lines = fibreGeom.features
      .filter((f) => f && f.geometry && f.geometry.type === 'LineString' && Array.isArray(f.geometry.coordinates))
      .map((f) => {
        const points = f.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
        return L.polyline(points, { color: '#c9a3ff', weight: 2, opacity: 0.8 });
      });
    layers.push({ key: 'fibre', label: 'Fibre', layer: L.layerGroup(lines) });
  }

  return layers;
}

export default function ProfileMap({ report }: { report: ResearchReport }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const LRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<ReturnType<LeafletModule['map']> | null>(null);
  const layerDefsRef = useRef<LayerDef[]>([]);
  const mountKey = report.location.id;

  const [toggles, setToggles] = useState<Record<string, boolean>>({
    location: true,
    schools: true,
    health: true,
    towers: false,
    fibre: false,
    electricity: false,
  });

  useEffect(() => {
    let disposed = false;
    void (async () => {
      // Browser-only dynamic import: leaflet's module touches `window`.
      const L = (await import('leaflet')).default;
      if (disposed || !containerRef.current) return;
      LRef.current = L;
      const map = L.map(containerRef.current!, {
        center: [report.location.latitude, report.location.longitude],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      layerDefsRef.current = buildLayers(L, report);
      for (const def of layerDefsRef.current) {
        if (toggles[def.key]) (def.layer as unknown as { addTo(m: unknown): void }).addTo(map);
      }
    })();

    return () => {
      disposed = true;
      const map = mapRef.current;
      if (map) map.remove();
      mapRef.current = null;
      layerDefsRef.current = [];
      LRef.current = null;
    };
  }, [mountKey]);

  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L) return;
    for (const def of layerDefsRef.current) {
      if (toggles[def.key]) {
        (def.layer as unknown as { addTo(m: unknown): void }).addTo(map);
      } else {
        map.removeLayer(def.layer as never);
      }
    }
  }, [toggles]);

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <fieldset className="panel p-4">
        <legend className="kicker">Layers</legend>
        <ul className="space-y-2 text-sm">
          {(
            [
              ['location', 'Location'],
              ['schools', 'Schools'],
              ['health', 'Health facilities'],
              ['towers', 'Telecom infrastructure'],
              ['fibre', 'Fibre'],
              ['electricity', 'Electricity'],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={toggles[key] ?? false}
                  onChange={(e) => setToggles((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#8e8e8e]">
          Tiles © OpenStreetMap contributors. Points come from the datasets backing this profile.
        </p>
      </fieldset>
      <div
        ref={containerRef}
        className="h-[540px] w-full rounded border border-[#2a2a2a] bg-[#101010]"
        aria-label="Map of the selected location and mapped infrastructure"
      />
    </div>
  );
}