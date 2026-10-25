import { describe, expect, it } from 'vitest';
import {
  boundingBoxAround,
  distanceToSegmentKm,
  haversineKm,
  nearestDistanceKm,
  nearestDistanceToLineGeojsonKm,
  pointInPolygon,
} from '@/domain/geo';

const OGHARA = { latitude: 5.5897, longitude: 6.0998 };
const BENIN_CITY = { latitude: 6.3176, longitude: 5.6145 };

describe('haversineKm', () => {
  it('is zero for identical points', () => {
    expect(haversineKm(OGHARA, OGHARA)).toBe(0);
  });

  it('computes a plausible Oghara–Benin City distance', () => {
    const d = haversineKm(OGHARA, BENIN_CITY);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(130);
  });

  it('is symmetric', () => {
    expect(haversineKm(OGHARA, BENIN_CITY)).toBeCloseTo(haversineKm(BENIN_CITY, OGHARA), 9);
  });
});

describe('nearestDistanceKm', () => {
  it('returns null for an empty candidate set', () => {
    expect(nearestDistanceKm(OGHARA, [])).toBeNull();
  });

  it('returns the minimum distance', () => {
    const near = { latitude: 5.6, longitude: 6.1 };
    expect(nearestDistanceKm(OGHARA, [BENIN_CITY, near])).toBeCloseTo(haversineKm(OGHARA, near), 6);
  });
});

describe('boundingBoxAround', () => {
  it('produces a box that contains the center', () => {
    const [s, w, n, e] = boundingBoxAround(OGHARA, 10);
    expect(s).toBeLessThan(OGHARA.latitude);
    expect(n).toBeGreaterThan(OGHARA.latitude);
    expect(w).toBeLessThan(OGHARA.longitude);
    expect(e).toBeGreaterThan(OGHARA.longitude);
  });
});

describe('distanceToSegmentKm', () => {
  it('is near zero for a point on the segment', () => {
    const d = distanceToSegmentKm(
      { latitude: 0, longitude: 0 },
      { latitude: -1, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );
    expect(d).toBeLessThan(0.5);
  });

  it('respects finite segment endpoints', () => {
    const d = distanceToSegmentKm(
      { latitude: 0, longitude: 0 },
      { latitude: 2, longitude: 2 },
      { latitude: 1, longitude: 1 },
    );
    // nearest endpoint is (1,1); distance ~156 km
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(200);
  });
});

describe('nearestDistanceToLineGeojsonKm', () => {
  it('finds the distance to a LineString', () => {
    const line = {
      type: 'LineString',
      coordinates: [
        [6.0, 5.2],
        [6.3, 5.2],
      ],
    };
    const d = nearestDistanceToLineGeojsonKm({ latitude: 5.4, longitude: 6.15 }, line);
    // the line sits around latitude 5.2, about 22 km south of 5.4
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(30);
  });

  it('handles MultiLineString and Points', () => {
    const multi = { type: 'MultiLineString', coordinates: [[[6.0, 5.2], [6.3, 5.2]], [[6.5, 5.6], [6.7, 5.6]]] };
    expect(nearestDistanceToLineGeojsonKm({ latitude: 5.65, longitude: 6.6 }, multi)).toBeLessThan(15);
    const pt = { type: 'Point', coordinates: [6.0, 5.0] };
    expect(nearestDistanceToLineGeojsonKm({ latitude: 5.5, longitude: 6.0 }, pt)).toBeCloseTo(55.6, 0);
  });

  it('throws for unsupported geometry types', () => {
    expect(() =>
      nearestDistanceToLineGeojsonKm({ latitude: 5.5, longitude: 6.0 }, { type: 'Polygon', coordinates: [] }),
    ).toThrow();
  });
});

describe('pointInPolygon', () => {
  const square: Array<[number, number]> = [
    [6, 5],
    [7, 5],
    [7, 6],
    [6, 6],
  ];

  it('contains a point inside and rejects one outside', () => {
    expect(pointInPolygon({ latitude: 5.5, longitude: 6.5 }, square)).toBe(true);
    expect(pointInPolygon({ latitude: 8, longitude: 8 }, square)).toBe(false);
  });
});