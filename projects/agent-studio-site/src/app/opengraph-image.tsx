import { ImageResponse } from 'next/og';

/**
 * Social share card.
 *
 * Generated rather than authored as a static asset so it cannot drift from the
 * design tokens, and so per-route variants are a copy of this file rather than
 * a trip through a design tool.
 *
 * Deliberately built from type and the accent alone — no photography, no
 * screenshot of the 3D. A screenshot of a WebGL scene reads as noise at the
 * size these are actually shown in a timeline, whereas a large headline stays
 * legible on a phone.
 *
 * Uses only system-safe layout: `next/og` runs in a constrained runtime where
 * unsupported CSS silently produces a blank card, so this sticks to flexbox,
 * solid fills, and absolute positioning.
 */

export const alt = 'AI Agent Studio — AI agents that ship real work';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#08080A',
          padding: 72,
          position: 'relative',
        }}
      >
        {/* Accent rule along the top edge — the one piece of colour, matching
            the preloader's fill bar so the brand reads consistently. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 8,
            background: '#CBFF4D',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#CBFF4D',
          }}
        >
          AI Agent Studio
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: -3,
              color: '#F4F4F2',
              fontWeight: 700,
              maxWidth: 900,
            }}
          >
            Agents that ship real work.
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              color: '#9A9A96',
              maxWidth: 820,
            }}
          >
            Pre-built agents, custom builds, and multi-agent teams.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
