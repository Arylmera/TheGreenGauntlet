type CoinSize = 'sm' | 'md' | 'lg' | 'xl';

type Props = {
  className?: string;
  /** Preferred API: named size matching .coin-sm/md/lg/xl (14/22/36/56 px). */
  coinSize?: CoinSize;
  /** Legacy numeric size — mapped to the closest named bucket for callers that pass pixels. */
  size?: number;
  spin?: boolean;
};

function pickSize(size: number | undefined, coinSize: CoinSize | undefined): CoinSize {
  if (coinSize) return coinSize;
  if (size == null) return 'sm';
  if (size >= 48) return 'xl';
  if (size >= 30) return 'lg';
  if (size >= 18) return 'md';
  return 'sm';
}

export function CoinIcon({ className = '', size, coinSize, spin = false }: Props) {
  const cls = `coin coin-${pickSize(size, coinSize)}${spin ? ' spin' : ''}${className ? ' ' + className : ''}`;
  return <span className={cls} aria-hidden />;
}
