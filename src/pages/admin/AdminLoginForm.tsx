import { useState, type FormEvent } from 'react';
import { HamburgerMenu } from '../../components/HamburgerMenu';
import { SkyStage } from '../../components/mario/Clouds';
import type { Theme } from '../../hooks/useTheme';

type Props = {
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  loginBusy: boolean;
  loginError: string | null;
  onSubmit: (password: string) => void | Promise<void>;
};

export function AdminLoginForm({ theme, onSetTheme, loginBusy, loginError, onSubmit }: Props) {
  const [password, setPassword] = useState('');
  const isMario = theme === 'mario';

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    await onSubmit(password);
    setPassword('');
  };

  return (
    <div className="admin relative min-h-screen flex items-center justify-center bg-surface-off dark:bg-dark-page px-4">
      {isMario && <SkyStage />}
      <div className="absolute top-3 right-3 z-40">
        <HamburgerMenu theme={theme} onSetTheme={onSetTheme} />
      </div>
      <form
        onSubmit={(e) => void submit(e)}
        className={
          isMario
            ? 'relative z-10 w-full max-w-sm scroll-panel p-6 space-y-4'
            : 'w-full max-w-sm bg-surface-white dark:bg-dark-card rounded-comfy border border-line-light dark:border-dark-line shadow-lvl-1 p-6 space-y-4'
        }
      >
        <h1
          className={
            isMario
              ? 'font-pixel text-[color:var(--mario-ink)] text-[14px] tight-px'
              : 'text-xl font-semibold text-ink-black dark:text-dark-text'
          }
        >
          {isMario ? 'ADMIN · SIGN IN' : 'Admin sign-in'}
        </h1>
        <label className="block">
          <span
            className={
              isMario
                ? 'block font-pixel text-[10px] text-[color:var(--mario-ink)] mb-2 tight-px'
                : 'block text-sm text-ink-charcoal dark:text-dark-mid mb-1'
            }
          >
            {isMario ? 'PASSWORD' : 'Password'}
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loginBusy}
            className={
              isMario
                ? 'pixel-input w-full'
                : 'w-full px-3 py-2 rounded-standard border border-line-light dark:border-dark-line bg-surface-white dark:bg-dark-card text-ink-black dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-green'
            }
          />
        </label>
        {loginError && (
          <p
            className={
              isMario
                ? 'font-crt text-[color:var(--mario-brick)] text-base'
                : 'text-sm text-semantic-danger'
            }
            role="alert"
          >
            {loginError}
          </p>
        )}
        <button
          type="submit"
          disabled={loginBusy || password.length === 0}
          className={
            isMario
              ? 'pixel-btn pixel-btn-green w-full'
              : 'w-full px-4 py-2 rounded-standard bg-brand-green text-white font-medium disabled:opacity-60'
          }
        >
          {loginBusy
            ? isMario
              ? 'SIGNING IN…'
              : 'Signing in…'
            : isMario
              ? 'SIGN IN'
              : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
