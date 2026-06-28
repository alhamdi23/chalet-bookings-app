import { useAuth } from './AuthProvider';
import LoginScreen from './LoginScreen';
import App from '../App';
import { AppStoreProvider } from '../store/AppStore';

/**
 * Decides what to render based on auth state:
 *  - while Firebase is resolving the session -> a small loading screen
 *  - signed out -> the login screen
 *  - signed in  -> the full app (with data store mounted)
 *
 * The AppStoreProvider (which opens Firestore subscriptions) is only mounted
 * once the user is signed in, so reads/writes always carry an auth token.
 */
export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-shell">
        <div className="login-card" style={{ textAlign: 'center' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AppStoreProvider>
      <App />
    </AppStoreProvider>
  );
}
