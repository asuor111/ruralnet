// Methodology — full transparency documentation for how RuralNet works.
// Mirrors the deterministic rules implemented in src/domain.

export default function MethodologyPage() {
  return (
    <div className="mt-12 max-w-4xl">
      <p className="kicker">Methodology</p>
      <h1 className="mt-4 font-display text-5xl leading-tight">How the indicators are built.</h1>
      <p className="mt-6 text-lg text-[#c8c8c8]">
        RuralNet is a deterministic research tool. This page documents where data comes from, how distances are
        calculated, how gaps and priorities are identified, how missing data is handled, and what the tool cannot
        determine.
      </p>

      <Section title="1 · Where data comes from" anchor="data-origin">
        <p>
          Each domain has one or more <em>providers</em> that return a normalised shape. A provider is either a live
          public API, an imported public dataset, or (in development) a clearly-labelled mock implementation.
        </p>
        <ul className="list-disc space-y-2">
          <li><strong>Geocoding</strong> — OpenStreetMap Nominatim (live) or the RuralNet mock geocoder.</li>
          <li>
            <strong>Population</strong> — imported HDX COD-PS LGA figures when available; otherwise the World Bank
            national total (shown as “National” and clearly not an LGA figure).
          </li>
          <li>
            <strong>Telecom coverage</strong> — an imported coverage/tower snapshot when configured; otherwise the
            section honestly reports “Data unavailable”.
          </li>
          <li><strong>Internet availability</strong> — World Bank national indicators (internet usage, fixed broadband).</li>
          <li><strong>Fibre</strong> — OpenStreetMap fibre/cable routes (Overpass) or an imported GeoJSON export.</li>
          <li><strong>Electricity</strong> — World Bank national access rate plus OSM-mapped substations.</li>
          <li>
            <strong>Facilities</strong> — OpenStreetMap (Overpass): schools, health, government buildings, towers,
            substations, ICT centres.
          </li>
        </ul>
        <p>
          Every dataset is registered in one catalogue (<code>src/domain/sources.ts</code>) with provider, URL,
          licence and retrieval date. Mock providers never masquerade as real data — the mode is always announced.
        </p>
      </Section>

      <Section title="2 · How distances are calculated" anchor="distances">
        <p>
          All distances are great-circle (haversine) on a spherical Earth with radius 6,371 km — more than adequate
          at community/LGA scales. Distance to fibre is measured to the nearest <em>point on a mapped line</em>,
          using an equirectangular projection locally to solve point-to-segment distance.
        </p>
        <p className="mt-2">
          The tool always labels the result as <em>“distance to mapped fibre infrastructure”</em>. Proximity to a
          mapped route does not mean fibre service is available at the community.
        </p>
      </Section>

      <Section title="3 · How gaps are identified" anchor="gaps">
        <p>
          Gap rules are deterministic functions over the assembled profile (see <code>src/domain/gaps.ts</code> and
          its thresholds in <code>src/domain/analysisConfig.ts</code>). Rules currently include:
        </p>
        <ul className="list-disc space-y-1">
          <li>High population + limited broadband evidence.</li>
          <li>Large distance to nearest mapped fibre (or none mapped within the search radius).</li>
          <li>Schools present but connectivity at schools not evidenced.</li>
          <li>Health facilities present but connectivity not evidenced.</li>
          <li>Reported electricity access below threshold, or electricity data missing.</li>
          <li>Very few mapped towers near a populated centre.</li>
          <li>Overall dataset sparsity (few providers returned data).</li>
        </ul>
        <p>Gaps are phrased as “potential” indicators and always explain which data caused the observation.</p>
      </Section>

      <Section title="4 · Priorities" anchor="priorities">
        <p>
          Priorities are generated from the same evidence by documented rules — e.g. if schools exist and broadband
          evidence is weak, “Assess connectivity at schools” is suggested with counts and sources. They are
          <strong>investigation suggestions, not investment instructions</strong>.
        </p>
      </Section>

      <Section title="5 · Connectivity Infrastructure Indicator" anchor="connectivity-infrastructure-indicator">
        <p>The indicator is a weighted composite of six components (see <code>src/domain/score.ts</code>):</p>
        <table className="w-full text-sm mt-2">
          <thead>
            <tr className="text-left text-[#8e8e8e] text-xs">
              <th className="pb-2">Component</th>
              <th className="pb-2 text-right">Weight</th>
              <th className="pb-2">Definition</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Population / demand', '20%', 'log10(population)/6 capped at 100 — a demand-context signal.'],
              ['Telecom coverage', '20%', 'average of reported coverage % per technology band; if absent, presence proxy = min(100, towers × 20).'],
              ['Internet availability', '20%', 'individuals using the Internet (% , national reference).'],
              ['Fibre proximity', '15%', 'max(0, 100 − nearestKm × 8). Distance only, never a service claim.'],
              ['Electricity', '10%', 'access to electricity (% , national reference).'],
              ['Facility connectivity indicators', '15%', 'average of min(100, schools×5) and min(100, health×10).'],
            ].map(([name, weight, def]) => (
              <tr key={name} className="border-b border-[#2a2a2a]">
                <td className="py-2 text-[#e6e6e6]">{name}</td>
                <td className="py-2 text-right text-[#bdbdbd]">{weight}</td>
                <td className="py-2 text-[#9a9a9a]">{def}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">
          Components without sufficient data are <strong>excluded, not guessed</strong>. The indicator is the
          weighted average of the included components, and the sum of included weights is shown as{' '}
          <strong>data completeness</strong>. An indicator at 40% completeness is explicitly incomplete.
        </p>
      </Section>

      <Section title="6 · How missing data is handled" anchor="missing-data">
        <p>A domain reports “Data unavailable” with a reason when no configured dataset produced a value. This is
          especially important in rural areas, where public datasets are often incomplete. RuralNet never:</p>
        <ul className="list-disc space-y-1">
          <li>invents estimates to fill a gap,</li>
          <li>mixes years without showing the year,</li>
          <li>presents proximity as availability, or</li>
          <li>presents a national figure as a local one.</li>
        </ul>
      </Section>

      <Section title="7 · What this tool cannot determine" anchor="limits">
        <ul className="list-disc space-y-2">
          <li>Whether a community actually receives telecom service (tower presence ≠ coverage).</li>
          <li>Whether fibre service is purchasable or affordable nearby a mapped route.</li>
          <li>Electricity reliability (the data measures access, not outages).</li>
          <li>Real-time network status, operator contracts, or pricing.</li>
          <li>Anything that requires field surveys or private datasets.</li>
        </ul>
        <p>RuralNet is an evidence tool and a research experiment: it makes the state of public data visible, and its
          gaps visible too.</p>
      </Section>

      <aside className="panel p-6 text-sm text-[#9a9a9a]">
        <span className="font-label text-[#e6e6e6]">Disclaimer.</span> RuralNet provides data-supported indicators,
        not engineering surveys, telecom coverage guarantees, investment advice, or infrastructure feasibility
        studies.
      </aside>
    </div>
  );
}

function Section({ title, anchor, children }: { title: string; anchor: string; children: React.ReactNode }) {
  return (
    <section id={anchor} className="mt-14 panel-flat p-8">
      <h2 className="font-display text-3xl">{title}</h2>
      <div className="mt-4 text-[#c8c8c8] leading-relaxed">{children}</div>
    </section>
  );
}