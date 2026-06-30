import { useAuth } from './AuthProvider';
import LoginScreen from './LoginScreen';
import App from '../App';
import { AppStoreProvider } from '../store/AppStore';

/**
 * Decides what to render based on auth state:
 *  - returning user (was signed in last time) -> render the app IMMEDIATELY from
 *    local data while Firebase confirms the session in the background. This is
 *    the key to an instant launch: we no longer block on the slow first auth
 *    round-trip / Firebase bundle load.
 *  - first launch / after logout, still resolving -> a small loading screen
 *  - signed out -> the login screen
 *  - signed in  -> the full app (with data store mounted)
 *
 * The AppStoreProvider (which opens Firestore subscriptions) is mounted as soon
 * as we optimistically show the app; the Firestore SDK carries the restored
 * auth token once it resolves, and reads come from the local cache meanwhile.
 */
export default function AuthGate() {
  const { user, loading, knownSignedIn } = useAuth();

  // Returning user: skip the loader and show the app right away.
  if (user || (loading && knownSignedIn)) {
    return (
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    );
  }

  // First launch (or just after logout) while auth is still resolving.
  if (loading) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center' }}>
          Loading…
        </div>
      </div>
    );
  }

  return <LoginScreen />;
}
