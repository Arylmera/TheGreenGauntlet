import logo from '../assets/logo.png';

type Props = {
  size?: number;
  className?: string;
};

export function TeamAvatar({ size = 40, className = '' }: Props) {
  return (
    <img
      src={logo}
      alt=""
      aria-hidden
      width={size}
      height={size}
      className={`rounded-full bg-surface-off border border-line-light select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
