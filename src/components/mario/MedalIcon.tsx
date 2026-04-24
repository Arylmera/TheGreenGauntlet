type Rank = 1 | 2 | 3;

type Props = {
  rank: Rank;
  className?: string;
};

const TONE: Record<Rank, 'gold' | 'silver' | 'bronze'> = {
  1: 'gold',
  2: 'silver',
  3: 'bronze',
};

/** CSS-only medal coin with embedded rank digit (via ::after attr(data-rank)). */
export function MedalIcon({ rank, className = '' }: Props) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <span className={`medal-coin ${TONE[rank]}`} data-rank={rank} />
    </div>
  );
}
