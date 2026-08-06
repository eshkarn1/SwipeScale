import { brand } from "@/config/brand";

/**
 * Deliberately plain — inline styles, table-free, no `@react-email/components`
 * (see the removal note in package.json history / DECISIONS §9: the package
 * ships marked "no longer supported" upstream). `@react-email/render` turns
 * any React tree into email-safe HTML; the component kit is convenience, not
 * a requirement.
 */
export function MagicLinkEmail({ url }: { url: string }) {
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
                  Sign in to {brand.name}
                </h1>
                <p style={{ fontSize: 14, color: "#a1a8b3", lineHeight: 1.5 }}>
                  Click the button below to finish signing in. This link
                  expires in 24 hours and can only be used once.
                </p>
                <a
                  href={url}
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
                  Sign in
                </a>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 32 }}>
                  If you didn&apos;t request this email, you can safely
                  ignore it.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
