type Rank = 1 | 2 | 3;

type Props = {
  rank: Rank;
  className?: string;
};

export function MedalIcon({ rank, className }: Props) {
  const cn = className ?? '';
  if (rank === 1) return <StarMedal className={cn} />;
  if (rank === 2) return <FireFlowerMedal className={cn} />;
  return <MushroomMedal className={cn} />;
}

function StarMedal({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M24 4l5.9 12 13.1 1.9-9.5 9.3 2.3 13.1L24 34l-11.8 6.3 2.3-13.1L5 17.9 18.1 16z"
        fill="#ffea00"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="20" r="1.8" fill="#1a1a1a" />
      <circle cx="29" cy="20" r="1.8" fill="#1a1a1a" />
    </svg>
  );
}

function FireFlowerMedal({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="10" r="6" fill="#ffd700" stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="12" cy="20" r="6" fill="#e52521" stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="36" cy="20" r="6" fill="#e52521" stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="24" cy="22" r="7" fill="#ffe680" stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="21" cy="21" r="1.5" fill="#1a1a1a" />
      <circle cx="27" cy="21" r="1.5" fill="#1a1a1a" />
      <rect x="22" y="28" width="4" height="14" fill="#00a800" stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  );
}

function MushroomMedal({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        d="M8 24a16 16 0 0 1 32 0v4H8z"
        fill="#e52521"
        stroke="#1a1a1a"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="19" r="3.5" fill="#f8f4e3" />
      <circle cx="31" cy="19" r="3.5" fill="#f8f4e3" />
      <rect x="16" y="28" width="16" height="12" rx="2" fill="#f8f4e3" stroke="#1a1a1a" strokeWidth="2" />
      <circle cx="21" cy="34" r="1.4" fill="#1a1a1a" />
      <circle cx="27" cy="34" r="1.4" fill="#1a1a1a" />
    </svg>
  );
}
