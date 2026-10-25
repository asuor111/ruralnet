// Provider registry: maps the runtime mode to concrete provider instances.
//
//   mock  -> every domain uses a clearly-labelled mock implementation
//   live  -> real public providers, with import-based providers taking
//            priority over generic APIs where a dataset file is present

import type { RunMode } from '@/domain/types';
import { getConfig } from '@/services/config';
import type { ProviderSet } from './types';
import { NominatimGeocodingProvider } from './geocoding/nominatim';
import { MockGeocodingProvider } from './mock/geocoding';
import {
  MockCoverageProvider,
  MockElectricityProvider,
  MockFacilitiesProvider,
  MockFibreProvider,
  MockInternetProvider,
  MockPopulationProvider,
} from './mock/data';
import {
  CoverageUnavailableProvider,
  WorldBankElectricityProvider,
  WorldBankInternetProvider,
  WorldBankPopulationProvider,
} from './worldbank';
import { OverpassFacilitiesProvider } from './facilities/overpass';
import { OverpassFibreProvider } from './fibre/overpass';
import { ImportPopulationProvider } from './population/import';
import { ImportFibreProvider } from './fibre/import';
import { ImportCoverageProvider } from './coverage/import';

export function buildProviderSet(mode: RunMode): ProviderSet {
  if (mode === 'mock') {
    return {
      geocoding: new MockGeocodingProvider(),
      population: [new MockPopulationProvider()],
      coverage: [new MockCoverageProvider()],
      internet: [new MockInternetProvider()],
      fibre: [new MockFibreProvider()],
      electricity: [new MockElectricityProvider()],
      facilities: [new MockFacilitiesProvider()],
    };
  }

  const cfg = getConfig();
  return {
    geocoding: new NominatimGeocodingProvider(),
    population: [new ImportPopulationProvider(), new WorldBankPopulationProvider()],
    coverage: [new ImportCoverageProvider(), new CoverageUnavailableProvider()],
    internet: [new WorldBankInternetProvider()],
    fibre: [new ImportFibreProvider(cfg.research.fibreSearchRadiusKm), new OverpassFibreProvider(cfg.research.fibreSearchRadiusKm)],
    electricity: [new WorldBankElectricityProvider()],
    facilities: [new OverpassFacilitiesProvider(cfg.research.facilitiesRadiusKm)],
  };
}