import SearchBox from '@/components/SearchBox';

const FLOW = [
  ['Enter a Nigerian community or LGA', 'e.g. “Oghara, Delta State”.'],
  ['Find the geographic location', 'resolved to coordinates via a geocoding provider.'],
  ['Collect available public data', 'population, telecom, internet, fibre, electricity, facilities.'],
  ['Normalize the data', 'every provider returns one shared, documented shape.'],
  ['Build the location profile', 'sections with full provenance for each value.'],
  ['Identify connectivity gaps', 'deterministic rules — never invented estimates.'],
  ['Generate evidence-backed indicators', 'score, completeness, and priority suggestions.'],
  ['Show sources', 'every dataset is traceable and linked.'],
] as const;

const SOURCES_LIST = [
  ['World Bank Open Data', 'national population, electricity access, internet & broadband indicators (live API).'],
  ['OpenStreetMap · Nominatim', 'geocoding of communities, towns and LGAs (live API).'],
  ['OpenStreetMap · Overpass', 'schools, health facilities, towers, substations, fibre routes (live API).'],
  ['HDX · OCHA', 'LGA population statistics and administrative boundaries (import scripts).'],
  ['OpenCelliD', 'optional cell-tower snapshot imports for infrastructure presence evidence.'],
] as const;

export default function HomePage() {
  return (
    <div className="mt-14">
      {/* ---------------------------------------------------------------- */}
      {/* Hero — typography-led, no horizontal rule across the top         */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-5xl">
        <p className="kicker">RuralNet</p>
        <h1 className="mt-4 font-display text-6xl leading-[1.05]">
          See the digital infrastructure
          <br />
          behind a place.
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-[#c8c8c8]">
          Explore population, connectivity, fibre, electricity, facilities and infrastructure gaps for Nigerian
          communities and LGAs — assembled from <span className="accent font-semibold">public datasets only</span>,
          with every value traced back to its source.
        </p>
        <div className="mt-8 w-full max-w-2xl">
          <SearchBox autoFocus />
          <div className="mt-2 text-xs text-[#8e8e8e]">
            Try:{' '}
            <a className="src-link" href="/place/Oghara%2C%20Delta%20State">
              Oghara, Delta State
            </a>{' '}·{' '}
            <a className="src-link" href="/place/Warri">
              Warri
            </a>{' '}·{' '}
            <a className="src-link" href="/place/Benin%20City%2C%20Edo%20State">
              Benin City, Edo State
            </a>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Problem statement                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-20 max-w-3xl panel-flat p-8">
        <p className="kicker">What it answers</p>
        <p className="mt-4 text-lg text-[#e6e6e6]">
          &ldquo;What does the digital infrastructure situation look like in this Nigerian community or LGA?&rdquo;
        </p>
        <p className="mt-4 text-[#bdbdbd]">
          Reporting on rural digital inclusion keeps repeating the same challenge: nobody can quickly say what
          <em>is actually known</em> about a specific place. RuralNet is a small open-source tool that collects the
          public data that exists, normalises it, and shows what it suggests — and, just as importantly, where the
          data is simply missing.
        </p>
        <p className="mt-4 text-[#bdbdbd]">
          It is an <strong>engineering/research experiment</strong>, not a product. No pricing, no billing, no lead
          generation, no fabricated users or statistics.
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-20 max-w-5xl">
        <p className="kicker">How it works</p>
        <h2 className="mt-4 font-display text-4xl">Data flows through a documented pipeline.</h2>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map(([title, sub], i) => (
            <li key={i} className="panel p-4">
              <div className="text-xs text-[#7c3aed]">0{i + 1}</div>
              <h3 className="font-label text-sm mt-1">{title}</h3>
              <p className="text-xs text-[#8e8e8e] mt-1">{sub}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Data sources                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-20 max-w-5xl">
        <p className="kicker">Data sources</p>
        <h2 className="mt-4 font-display text-4xl">Verified public datasets, nothing invented.</h2>
        <ul className="mt-8 space-y-3">
          {SOURCES_LIST.map(([name, desc]) => (
            <li key={name} className="panel p-4 flex flex-col sm:flex-row sm:items-baseline gap-3">
              <span className="font-label text-sm text-[#f4f2ee] w-56 shrink-0">{name}</span>
              <span className="text-sm text-[#9a9a9a]">{desc}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[#bdbdbd]">
          When a dataset cannot provide a value, RuralNet displays{' '}
          <span className="font-semibold">&ldquo;Data unavailable&rdquo;</span> — it never estimates to fill a gap.
        </p>
        <p className="mt-2 text-sm">
          <a className="src-link" href="/about">
            Full data &amp; sources documentation →
          </a>
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Methodology + openness                                          */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-20 grid gap-10 lg:grid-cols-2">
        <div className="panel-flat p-8">
          <p className="kicker">Methodology</p>
          <p className="mt-4 text-[#bdbdbd]">
            Distances, gaps, priorities and the Connectivity Infrastructure Indicator all come from deterministic,
            documented rules. The methodology page shows the formulas and the thresholds.
          </p>
          <p className="mt-3 text-sm">
            <a className="src-link" href="/methodology">
              Read the methodology →
            </a>
          </p>
        </div>
        <div className="panel-flat p-8">
          <p className="kicker">Open source</p>
          <p className="mt-4 text-[#bdbdbd]">
            Built to be read, run and contributed to — TypeScript, Next.js, Postgres, Leaflet, and a test suite that
            covers the rules engine. MIT licensed.
          </p>
          <p className="mt-3 text-sm">
            <a
              className="src-link"
              href="https://github.com/ruralnet/ruralnet"
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse on GitHub →
            </a>
          </p>
        </div>
      </section>

      <aside className="mt-20 max-w-3xl panel p-6 text-sm text-[#9a9a9a]">
        <span className="font-label text-[#e6e6e6]">Important disclaimer.</span>{' '}
        RuralNet provides data-supported indicators from public datasets. It is not an engineering survey, a telecom
        coverage guarantee, investment advice, or an infrastructure feasibility study.
      </aside>
    </div>
  );
}