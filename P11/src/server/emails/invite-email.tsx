import { brand } from "@/config/brand";

export function InviteEmail({
  workspaceName,
  inviterName,
  acceptUrl,
}: {
  workspaceName: string;
  inviterName: string | null;
  acceptUrl: string;
}) {
  const from = inviterName ? `${inviterName} has` : "Someone has";

  return (
    <html>
      <body
        style={{
          backgroundColor: "#0b0d10",
          color: "#e8eaed",
          fontFamily: "Helvetica, Arial, sans-serif",
          padding: "32px 16px",
        }}
      >
        <table
          role="presentation"
          width="100%"
          style={{ maxWidth: 420, margin: "0 auto" }}
        >
          <tbody>
            <tr>
              <td>
                <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
                  {brand.name.toUpperCase()}
                </p>
                <h1 style={{ fontSize: 20, margin: "24px 0 8px" }}>
                  You&apos;re invited to {workspaceName}
                </h1>
                <p style={{ fontSize: 14, color: "#a1a8b3", lineHeight: 1.5 }}>
                  {from} invited you to join{" "}
                  <strong>{workspaceName}</strong> on {brand.name}.
                </p>
                <a
                  href={acceptUrl}
                  style={{
                    display: "inline-block",
                    marginTop: 20,
                    padding: "12px 20px",
                    backgroundColor: "#e8a33d",
                    color: "#0b0d10",
                    fontWeight: 700,
                    textDecoration: "none",
                    borderRadius: 8,
                  }}
                >
                  Accept invite
                </a>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 32 }}>
                  If you weren&apos;t expecting this, you can ignore this
                  email.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
