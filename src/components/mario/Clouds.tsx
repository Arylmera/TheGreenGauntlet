/**
 * Fixed parallax sky stage: gradient sky, 3 drifting cloud lanes,
 * rolling hills, brick ground with grass strip. Purely decorative,
 * pointer-events: none. Rendered once at the page root under mario.
 */
export function SkyStage() {
  return (
    <div className="sky-stage" aria-hidden="true">
      <svg className="cloud-lane lane-1" viewBox="0 0 2400 120" preserveAspectRatio="none" width="200%" height="90">
        <defs>
          <g id="cloud-lg-a">
            <path
              d="M0 40 Q0 16 28 16 Q36 -6 64 2 Q82 -6 98 8 Q128 6 128 36 Q128 54 108 54 L18 54 Q0 54 0 40 Z"
              fill="#fff"
              stroke="#1a1a1a"
              strokeWidth="2.5"
            />
          </g>
          <g id="cloud-md-a">
            <path
              d="M0 32 Q0 12 22 12 Q28 -4 50 4 Q64 -4 78 6 Q100 4 100 30 Q100 44 84 44 L14 44 Q0 44 0 32 Z"
              fill="#fff"
              stroke="#1a1a1a"
              strokeWidth="2.5"
            />
          </g>
          <g id="cloud-sm-a">
            <path
              d="M0 24 Q0 8 16 8 Q22 -3 38 3 Q48 -3 60 5 Q76 4 76 22 Q76 34 62 34 L12 34 Q0 34 0 24 Z"
              fill="#fff"
              stroke="#1a1a1a"
              strokeWidth="2.5"
            />
          </g>
          <g id="lane-1-group">
            <g transform="translate(60 30)"><use href="#cloud-lg-a" /></g>
            <g transform="translate(480 60)"><use href="#cloud-sm-a" /></g>
            <g transform="translate(820 20)"><use href="#cloud-md-a" /></g>
            <g transform="translate(1180 50)"><use href="#cloud-lg-a" /></g>
          </g>
        </defs>
        <use href="#lane-1-group" />
        <use href="#lane-1-group" x="1200" />
      </svg>

      <svg className="cloud-lane lane-2" viewBox="0 0 2400 120" preserveAspectRatio="none" width="200%" height="72">
        <defs>
          <g id="lane-2-group">
            <g transform="translate(220 40)"><use href="#cloud-md-a" /></g>
            <g transform="translate(700 10)"><use href="#cloud-sm-a" /></g>
            <g transform="translate(1080 50)"><use href="#cloud-lg-a" /></g>
          </g>
        </defs>
        <use href="#lane-2-group" />
        <use href="#lane-2-group" x="1200" />
      </svg>

      <svg className="cloud-lane lane-3" viewBox="0 0 2400 120" preserveAspectRatio="none" width="200%" height="60">
        <defs>
          <g id="lane-3-group">
            <g transform="translate(120 60)"><use href="#cloud-sm-a" /></g>
            <g transform="translate(560 30)"><use href="#cloud-md-a" /></g>
            <g transform="translate(980 50)"><use href="#cloud-sm-a" /></g>
          </g>
        </defs>
        <use href="#lane-3-group" />
        <use href="#lane-3-group" x="1200" />
      </svg>

      <svg className="hill-band" viewBox="0 0 1920 260" preserveAspectRatio="none">
        <path
          d="M0 200 Q200 100 400 160 Q600 220 800 140 Q1000 80 1200 160 Q1400 220 1600 120 Q1800 60 1920 160 L1920 260 L0 260 Z"
          fill="#1f8a16"
          opacity="0.5"
          stroke="#0f5a0a"
          strokeWidth="2"
        />
        <path
          d="M0 220 Q160 160 320 210 Q480 250 640 190 Q800 150 960 200 Q1120 240 1280 180 Q1440 140 1600 200 Q1760 240 1920 200 L1920 260 L0 260 Z"
          fill="#2aa025"
          stroke="#0f5a0a"
          strokeWidth="2"
        />
        <g fill="#0f5a0a" opacity="0.4">
          <ellipse cx="280" cy="220" rx="30" ry="8" />
          <ellipse cx="720" cy="215" rx="40" ry="9" />
          <ellipse cx="1180" cy="225" rx="28" ry="7" />
          <ellipse cx="1660" cy="220" rx="36" ry="8" />
        </g>
      </svg>

      <div className="brick-ground" />
    </div>
  );
}

/** @deprecated Re-exported for backwards compatibility — use SkyStage. */
export const Clouds = SkyStage;
