type Props = {
  className?: string;
  size?: number;
};

export function CoinIcon({ className, size = 16 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="#ffd700" stroke="#b88a00" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#b88a00" strokeWidth="1.25" />
      <path d="M12 8v8M10.5 10h3M10.5 14h3" stroke="#b88a00" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
