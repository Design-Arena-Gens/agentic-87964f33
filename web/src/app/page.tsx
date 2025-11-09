import Link from 'next/link';

async function fetchAnalysis() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/analyze`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Page() {
  const data = await fetchAnalysis();
  const best = data?.best ?? null;
  const ranked = (data?.ranked as Array<any>) ?? [];

  return (
    <main style={{ maxWidth: 960, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Best Strong Buy (Under ?50, 2?Day Momentum)
      </h1>
      <p style={{ color: '#334155', marginBottom: '1rem' }}>
        Data from Yahoo Finance. This is not financial advice. Markets are risky.
      </p>

      {best ? (
        <section style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{best.symbol}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
            <Metric label="Price" value={`?${best.last.toFixed(2)}`} />
            <Metric label="2?Day Return" value={`${best.twoDayReturn.toFixed(2)}%`} />
            <Metric label="RSI" value={best.rsi?.toFixed(1) ?? '?'} />
            <Metric label="Volume Surge" value={`${best.volumeSurge?.toFixed(2)}x`} />
            <Metric label="Score" value={best.score?.toFixed(2)} />
          </div>
        </section>
      ) : (
        <p>No eligible stocks found under ?50 at this time or data unavailable.</p>
      )}

      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Top Candidates</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr>
              {['Rank', 'Symbol', 'Price', '2D %', 'RSI', 'Vol x', 'Score'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked?.slice(0, 10).map((row: any, idx: number) => (
              <tr key={row.symbol}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{idx + 1}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{row.symbol}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>?{row.last?.toFixed(2)}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{row.twoDayReturn?.toFixed(2)}%</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{row.rsi ? row.rsi.toFixed(1) : '?'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{row.volumeSurge ? `${row.volumeSurge.toFixed(2)}x` : '?'}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{row.score?.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: '#64748b', marginTop: '1rem', fontSize: 14 }}>
        Tip: Refresh the page to re-run the live analysis.
      </p>

      <footer style={{ marginTop: '2rem', color: '#475569' }}>
        <Link href="https://finance.yahoo.com" target="_blank">Yahoo Finance</Link>
        {" "}| Built for rapid analysis
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#475569', fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
