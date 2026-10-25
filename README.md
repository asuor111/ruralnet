# RuralNet

> I came across reporting about the need for greater rural digital inclusion and investment in Nigeria.

> It made me wonder what software could tell us about the infrastructure situation of a specific Nigerian community.

**RuralNet answers one question:** *“What does the digital infrastructure situation look like in this Nigerian community or LGA?”*

Type in a community, town, or LGA — *Oghara, Delta State* — and RuralNet assembles a structured profile from **public datasets**: population, telecom/network coverage, internet availability, fibre proximity, electricity access, schools and health facilities, existing digital infrastructure, connectivity gaps, and evidence-backed infrastructure priority indicators.

Every data point carries its **source, dataset, URL, retrieval date, and geographic scope**. Where a dataset cannot provide a value, RuralNet displays **“Data unavailable”** — it never invents an estimate.

**This is an engineering/research experiment, not a product.** There is no pricing, subscription, billing, CRM, lead generation, or sales automation, and there are no fabricated statistics, users, or AI-generated recommendations.

---

## What a profile contains

Searching *Oghara, Delta State* produces (mock mode, zero setup):

| Section | Example |
| --- | --- |
| Location | Oghara · Ughelli North · Delta State · Nigeria (lat/lon from geocoder) |
| Population | 194,000 (reported, LGA figure · source + retrieval date shown) |
| Telecom coverage | 2G / 3G / 4G / 5G availability bars |
| Internet availability | national usage + fixed broadband indicators |
| Fibre proximity | 8.4 km — labelled *“distance to mapped fibre infrastructure”* |
| Electricity | access % (national reference) + mapped substations |
| Schools / health | 17 / 4 within 10 km (mapped counts, not inventories) |
| Existing digital infrastructure | towers, substations, ICT centres, fibre digest |
| Connectivity gaps | deterministic observations tied to the evidence |
| Priorities | questions worth investigating, each with a “why” |
| Indicator | Connectivity Infrastructure Indicator + data completeness |
| Sources | every dataset linked and dated; JSON/CSV export available |

Try it: `npm run dev` → search **Oghara, Delta State**.

## System design

```
Browser (Next.js App Router, React, Tailwind, Leaflet)
        │  /api/search · /api/research · /api/export · /api/health
        ▼
Services layer        research orchestration, caching, rate limiting
        │
        ▼
Provider interfaces   population · coverage · internet · fibre ·
                      electricity · facilities · geocoding
                      (each returns normalized data + SourceRef)
        ▼
Domain engine         location normalization · geo math (haversine) ·
                      gap rules · priority rules · transparent score
        │
        ├── Live mode: World Bank API · OpenStreetMap Nominatim & Overpass
        ├── Imports:   HDX COD-PS (LGA population) · COD-AB (boundaries) ·
        │              fibre GeoJSON · OpenCelliD towers
        └── Mock mode: clearly-labelled development datasets (default)
```

Stack: **Next.js 15 + TypeScript · React 19 · Tailwind CSS 4 · Leaflet · PostgreSQL + Prisma · Vitest**. No microservices, no queues, no paid APIs in the core path.

## Source code layout

```
src/
├── domain/          pure, testable rules engine (no I/O)
│   ├── types.ts     shared domain types (sections, provenance, score)
│   ├── normalize.ts query validation + Nigerian state detection
│   ├── geo.ts       haversine, point-to-line distance, point-in-polygon
│   ├── gaps.ts      deterministic connectivity-gap rules
│   ├── priorities.ts deterministic investigation suggestions
│   ├── score.ts     Connectivity Infrastructure Indicator
│   └── sources.ts   single catalogue of every external dataset
├── providers/       one folder per domain; real + mock + import
│   ├── geocoding/  population/  coverage/  internet/  fibre/
│   ├── electricity/ facilities/
│   └── registry.ts  mode → provider set
├── services/        research orchestration, caching, Prisma persistence,
│                    rate limiting, JSON/CSV export
├── components/      UI (report panels, Leaflet map, search box)
└── app/
    ├── api/         /search /research /export /health
    ├── place/[slug] the tabbed profile
    ├── methodology  transparency documentation
    └── about        data sources & open-source information
tests/               domain, providers, services, API and DB tests
scripts/             data importers + end-to-end smoke test
prisma/schema.prisma database schema (every record traces to a source)
```

## Data sources

Only **verified public datasets** are referenced. Verified live during development (2026-09-28):

| Domain | Provider | Status |
| --- | --- | --- |
| Geocoding | OpenStreetMap Nominatim | live API, no key |
| Population | World Bank `SP.POP.TOTL` | live API, national |
| Population (LGA) | HDX COD-PS (`cod-ps-nga`) | downloadable import |
| Internet | World Bank `IT.NET.USER.ZS`, `IT.NET.BBND` | live API |
| Electricity | World Bank `EG.ELC.ACCS.ZS` + OSM substations | live API + OSM |
| Facilities | OpenStreetMap Overpass | live API |
| Fibre | OpenStreetMap (OSM fibre/cable routes) | live API |
| Fibre routes | any trusted GeoJSON line export | downloadable import |
| Towers | OpenCelliD snapshot | downloadable import |
| Boundaries | HDX COD-AB (`cod-ab-nga`) | downloadable import |

No dataset that was not verified is claimed to exist. If a proposed dataset is
unavailable, the provider interface exists and the documentation says so — the
section shows “Data unavailable” rather than a fabricated number.

## Methodology in one paragraph

Distances are great-circle (haversine); fibre distance is measured to the
nearest **point on a mapped line** and is always labelled *“distance to mapped
fibre infrastructure”* — proximity is **not** availability. Gaps and
priorities come from deterministic, documented rules (`analysisConfig.ts`
holds every threshold). The **Connectivity Infrastructure Indicator** is a
weighted composite of six components (population 20% · telecom 20% · internet
20% · fibre 15% · electricity 10% · facilities 15%); components without
sufficient data are **excluded, not guessed**, and the sum of included weights
is reported as **data completeness**. Full documentation lives in
[`src/app/methodology/page.tsx`](src/app/methodology/page.tsx).

## Getting started

### Requirements

- Node.js **20+** (tested on 20.18), npm 10+
- Optional: Docker (for the PostgreSQL container) or a local PostgreSQL

### 1 · Install

```bash
git clone <your fork> ruralnet
cd ruralnet
npm install
npx prisma generate        # generates the typed Prisma client
```

### 2 · Run in mock mode (recommended for development — zero external calls)

```bash
cp .env.example .env       # keep RURALNET_MODE=mock
npm run dev
```

Open http://localhost:3000 and search **Oghara, Delta State**. A
**DEVELOPMENT / MOCK DATA** banner is shown and every value is labelled with
the mock provider. Mock data is for exercising the pipeline only and is never
presented as real Nigerian data.

### 3 · Run in live mode (real public data)

```bash
# .env
RURALNET_MODE=live
NOMINATIM_EMAIL=you@example.com   # optional; OSM usage policy asks for contact
```

Restart the dev server. Nominatim, the World Bank API and Overpass are now
called for real. Live public APIs can be slow; results are cached (24 h by
default). Any dataset that cannot be reached reports **“Data unavailable”**
with the provider’s reason. One failing provider never fails the whole run.

### Database setup (optional in mock mode)

RuralNet runs fine without a database — research results are cached in memory
and nothing is persisted. Enable PostgreSQL for cross-restart caching and an
audit store:

```bash
npm run db:up               # docker compose up -d postgres
# .env
DATABASE_URL=postgresql://ruralnet:ruralnet@localhost:5432/ruralnet?schema=public
npm run prisma:migrate      # prisma migrate dev
```

With `DATABASE_URL` set, every research run is stored in `ResearchRun` (full
report JSON, score, provider statuses) and reused while the cache is fresh:
`Location → cached research → refresh only when necessary`.

## Importing datasets

Live providers also read **imported public files**; when a file is absent the
section reports “Data unavailable” with instructions.

```bash
# LGA population (HDX COD-PS) — https://data.humdata.org/dataset/cod-ps-nga
npm run import:population -- --path=./downloads/nga_admpop_adm2_2022.csv

# Fibre routes (any trusted GeoJSON line export)
npm run import:fibre -- --path=./downloads/fibre_routes.geojson

# Coverage / towers (OpenCelliD cells.csv or any CSV with lat/lon)
npm run import:coverage -- --path=./downloads/cells.csv

# LGA boundary for the map (HDX COD-AB) — https://data.humdata.org/dataset/cod-ab-nga
npm run import:boundaries -- --path=./downloads/nga_admin_boundaries.geojson --name="Ughelli North"
```

Outputs land in `data/generated/` (see `data/README.md`). No bulk dataset is
committed to the repository.

## Testing

```bash
npm test                 # unit + integration (mock mode, no DB required)
npm run typecheck        # strict TypeScript across the repo
npm run build            # production build of the Next.js app
npm run smoke            # end-to-end check against a running server
```

The suite covers: query normalization, geographic distance calculations,
provider normalization, missing-data handling, gap rules, priority rules, the
score calculation, source/provenance tracking, API endpoints, exports, and —
when `TEST_DATABASE_URL` is provided — database operations against real
Postgres. Both *complete-data* and *partial/missing-data* scenarios are
tested.

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/search?q=Oghara` | resolve a query to candidate locations |
| `GET /api/research?q=Oghara, Delta State&refresh=1` | full sourced profile (cached by default) |
| `GET /api/export?q=…&format=json\|csv` | downloadable profile preserving sources |
| `GET /api/health` | readiness probe (mode + database status) |

Endpoints validate input, enforce allow-lists (URLs, formats, hosts), apply
per-IP rate limits, and never expose API keys.

## What the tool knows it cannot do

- It cannot prove that a community receives telecom service (tower presence ≠
  coverage; mapping completeness varies).
- It cannot sell or guarantee fibre availability near a mapped route.
- It cannot measure electricity reliability (data measures access).
- It has no real-time network status, operator contracts, or pricing.
- It offers data-supported indicators — **not** engineering surveys,
  coverage guarantees, investment advice, or feasibility studies.

## Contributing

Contributions that add **verifiable public datasets**, harden the rules
engine, or improve the methodology are welcome. Please:

1. Verify any proposed data source exists and is legally accessible before
   opening a PR (see `src/domain/sources.ts` for the catalogue).
2. Keep provenance intact: every record must trace to a source.
3. Add tests for both data-present and data-missing cases.
4. Run `npm run typecheck`, `npm test`, and `npm run build` locally.

## License

MIT — see [LICENSE](LICENSE).

*Built as a focused piece of open-source engineering: a small tool that makes a
real-world problem — rural digital inclusion in Nigeria — easier to understand
through data.*