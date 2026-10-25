// About — data sources, architecture, and open-source information.
// Exported datasets remain verifiable: every source below is either a live
// public API or a downloadable public file with an import script.

export default function AboutPage() {
  return (
    <div className="mt-12 max-w-4xl">
      <p className="kicker">Data &amp; sources</p>
      <h1 className="mt-4 font-display text-5xl leading-tight">Every dataset is public and traceable.</h1>
      <p className="mt-6 text-lg text-[#c8c8c8]">
        RuralNet runs on free public datasets. Where a live API exists it is called directly; otherwise a
        downloadable public file is imported through a documented script. Nothing is scraped and nothing is
        estimated to fill gaps.
      </p>

      <h2 className="mt-12 font-display text-3xl">Live public APIs</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-[#8e8e8e] text-xs">
            <th className="pb-2">Provider</th>
            <th className="pb-2">Dataset</th>
            <th className="pb-2">Used for</th>
            <th className="pb-2">Licence</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['World Bank Open Data', 'SP.POP.TOTL · EG.ELC.ACCS.ZS · IT.NET.USER.ZS · IT.NET.BBND', 'population, electricity, internet, broadband (national)', 'CC BY-4.0'],
            ['OpenStreetMap Nominatim', 'Geocoding API (v2 JSON)', 'place resolution to coordinates', 'ODbL 1.0'],
            ['OpenStreetMap Overpass', 'mapped POIs, lines and relations', 'schools, health, towers, substations, fibre routes', 'ODbL 1.0'],
          ].map(([a, b, c, d]) => (
            <tr key={a} className="border-b border-[#2a2a2a]">
              <td className="py-2 text-[#e6e6e6]">{a}</td>
              <td className="py-2 text-[#9a9a9a]">{b}</td>
              <td className="py-2 text-[#9a9a9a]">{c}</td>
              <td className="py-2 text-[#9a9a9a]">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-12 font-display text-3xl">Downloadable datasets (import scripts)</h2>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-[#8e8e8e] text-xs">
            <th className="pb-2">Dataset</th>
            <th className="pb-2">Source</th>
            <th className="pb-2">Script</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['LGA population statistics (COD-PS)', 'HDX — data.humdata.org/dataset/cod-ps-nga', 'npm run import:population'],
            ['LGA administrative boundaries (COD-AB)', 'HDX — data.humdata.org/dataset/cod-ab-nga', 'npm run import:boundaries'],
            ['Fibre / cable routes (GeoJSON)', 'any open line export you trust', 'npm run import:fibre'],
            ['Cell tower snapshot', 'OpenCelliD cells.csv snapshot', 'npm run import:coverage'],
          ].map(([a, b, c]) => (
            <tr key={a} className="border-b border-[#2a2a2a]">
              <td className="py-2 text-[#e6e6e6]">{a}</td>
              <td className="py-2 text-[#9a9a9a]">{b}</td>
              <td className="py-2 text-[#9a9a9a] font-mono text-xs">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-12 font-display text-3xl">How data becomes a profile</h2>
      <p className="mt-4 text-[#c8c8c8]">
        The stack is intentionally small: Next.js (App Router) with TypeScript, a pure TypeScript domain/rules
        engine, provider modules behind stable interfaces, Postgres with Prisma for caching and audit, Leaflet for
        mapping, and Vitest for tests. There are no microservices, no queues, and no paid APIs in the core path.
      </p>

      <h2 className="mt-12 font-display text-3xl">Open source</h2>
      <p className="mt-4 text-[#c8c8c8]">
        RuralNet is MIT licensed. It is an engineering/research experiment with no accounts, billing, CRM,
        lead-gen or SaaS features. Contributions that add verifiable public datasets or harden the methodology are
        welcome.
      </p>
      <p className="mt-3 text-sm">
        <a className="src-link" href="https://github.com/ruralnet/ruralnet" target="_blank" rel="noopener noreferrer">
          GitHub repository →
        </a>
      </p>

      <aside className="mt-12 panel p-6 text-sm text-[#9a9a9a]">
        <span className="font-label text-[#e6e6e6]">Retrieval discipline.</span> Every provider run stamps the date it
        fetched its data. Sources shown in a profile reflect what was retrieved during that run, and the pipeline
        refuses to present older data as fresh.
      </aside>
    </div>
  );
}