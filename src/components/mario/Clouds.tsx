export function Clouds() {
  return (
    <svg
      viewBox="0 0 800 120"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 h-16 sm:h-20 lg:h-24 w-full opacity-90"
      aria-hidden
    >
      <Cloud x={60} y={50} scale={1} />
      <Cloud x={320} y={30} scale={0.8} />
      <Cloud x={560} y={60} scale={1.1} />
      <Cloud x={720} y={35} scale={0.7} />
    </svg>
  );
}

type CloudProps = { x: number; y: number; scale: number };

function Cloud({ x, y, scale }: CloudProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M0 30 Q0 10 20 10 Q26 -4 46 4 Q60 -4 74 8 Q96 6 96 28 Q96 42 80 42 L12 42 Q0 42 0 30 Z"
        fill="#f8f4e3"
        stroke="#1a1a1a"
        strokeWidth="2"
      />
    </g>
  );
}
