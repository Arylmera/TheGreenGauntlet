import { HamburgerMenu } from '../components/HamburgerMenu';
import { SkyStage } from '../components/mario/Clouds';
import { useTheme } from '../hooks/useTheme';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminLoginForm } from './admin/AdminLoginForm';
import { AdminTeamsTable } from './admin/AdminTeamsTable';

export function AdminPage() {
  const { theme, set: setTheme } = useTheme();
  const { authed, loginBusy, loginError, login, setAuthed } = useAdminAuth();
  const isMario = theme === 'mario';

  if (authed === null) {
    return (
      <div className="admin relative min-h-screen flex items-center justify-center bg-surface-off dark:bg-dark-page text-ink-mid dark:text-dark-dim">
        {isMario && <SkyStage />}
        <div className="absolute top-3 right-3 z-40">
          <HamburgerMenu theme={theme} onSetTheme={setTheme} />
        </div>
        <span className={isMario ? 'font-pixel text-white tight-px relative z-10' : ''}>
          Loading…
        </span>
      </div>
    );
  }

  if (!authed) {
    return (
      <AdminLoginForm
        theme={theme}
        onSetTheme={setTheme}
        loginBusy={loginBusy}
        loginError={loginError}
        onSubmit={login}
      />
    );
  }

  return (
    <AdminTeamsTable
      onLoggedOut={() => setAuthed(false)}
      theme={theme}
      onSetTheme={setTheme}
    />
  );
}
