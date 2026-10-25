import { describe, expect, it } from 'vitest';
import { makeSource } from '@/domain/sources';
import { categorizeElements, classifyOverpass } from '@/providers/facilities/overpassShared';
import { computeNearestFibre } from '@/providers/fibre/overpass';

const SRC = makeSource('osm:overpass', 'Test');

describe('classifyOverpass', () => {
  it('classifies school, health, tower, substation and ICT tags', () => {
    expect(classifyOverpass({ amenity: 'school' }).kind).toBe('school');
    expect(classifyOverpass({ healthcare: 'hospital' }).kind).toBe('health');
    expect(classifyOverpass({ 'tower:type': 'communication' }).kind).toBe('tower');
    expect(classifyOverpass({ power: 'substation' }).kind).toBe('substation');
    expect(classifyOverpass({ amenity: 'telephone_office' }).kind).toBe('ict');
    expect(classifyOverpass({ amenity: 'unknown-thing' }).kind).toBe('other');
  });
});

describe('categorizeElements', () => {
  it('maps nodes and way-centers, dedupes and carries provenance', () => {
    const section = categorizeElements(
      [
        { type: 'node', id: 1, lat: 5.6, lon: 6.1, tags: { amenity: 'school', name: 'School A' } },
        { type: 'node', id: 2, lat: 5.61, lon: 6.11, tags: { healthcare: 'clinic', name: 'Clinic B' } },
        { type: 'node', id: 1, lat: 5.6, lon: 6.1, tags: { amenity: 'school', name: 'School A' } },
        { type: 'way', id: 10, center: { lat: 5.62, lon: 6.12 }, tags: { power: 'substation', name: 'Sub C' } },
        { type: 'node', id: 3, lat: 5.63, lon: 6.13, tags: { amenity: 'townhall', name: 'Town Hall' } },
      ],
      10,
      SRC,
    );
    expect(section.status).toBe('ok');
    expect(section.schools).toHaveLength(1);
    expect(section.health).toHaveLength(1);
    expect(section.government).toHaveLength(1);
    expect(section.infrastructure).toHaveLength(1);
    expect(section.infrastructure[0].kind).toBe('substation');
    expect(section.schools[0].source.url).toBe(SRC.url);
  });
});

describe('computeNearestFibre', () => {
  const location = { latitude: 5.5, longitude: 6.0 };
  type TestElement = {
    type: 'way';
    id: number;
    tags?: Record<string, string>;
    geometry?: Array<{ lat: number; lon: number }>;
  };

  it('returns the nearest of several mapped lines', () => {
    const elements: TestElement[] = [
      { type: 'way', id: 1, tags: { name: 'Far' }, geometry: [{ lat: 5.2, lon: 6.0 }, { lat: 5.2, lon: 6.2 }] },
      { type: 'way', id: 2, tags: { name: 'Near' }, geometry: [{ lat: 5.49, lon: 5.9 }, { lat: 5.49, lon: 6.1 }] },
    ];
    const result = computeNearestFibre(location, elements);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Near');
    expect(result!.mode).toBe('osm-mapped');
    expect(result!.distanceKm).toBeLessThan(5);
  });

  it('returns null when there is no geometry', () => {
    const bare: TestElement[] = [{ type: 'way', id: 9 }];
    expect(computeNearestFibre(location, bare)).toBeNull();
  });
});