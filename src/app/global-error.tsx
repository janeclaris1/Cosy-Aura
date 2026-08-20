"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#1A1A1A",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "80px 16px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 32, marginBottom: 16 }}>Application error</h1>
          <p style={{ color: "#666", marginBottom: 8 }}>
            A critical error occurred while rendering this page.
          </p>
          {error?.message ? (
            <p style={{ color: "#666", fontSize: 12, marginBottom: 32 }}>
              {error.message}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              background: "#B8860B",
              color: "#fff",
              border: "none",
              padding: "12px 24px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
