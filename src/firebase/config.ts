import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

/**
 * Firebase / Firestore configuration.
 *
 * SETUP (one time, on a computer):
 *  1. Go to https://console.firebase.google.com and create a project.
 *  2. Inside the project, click the Web icon (</>) to "Add app", give it a
 *     nickname, and Firebase will show you a `firebaseConfig` object.
 *  3. Copy those 6 values into the object below.
 *  4. In the left menu open  Build > Firestore Database > Create database.
 *     Choose a location and start in "test mode" (or paste the rules from
 *     firestore.rules in this folder).
 *  5. Rebuild / redeploy the app. Both your PC and iPhone will now sync in
 *     real time automatically — no login, no "Sync" button needed.
 *
 * NOTE: These web config values are NOT secrets. Firebase web apps are meant to
 * expose them; access is controlled by Firestore security rules, not by hiding
 * these keys.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBSphAIVU2A7ICo0AJrpsFJ3DRfpmufBww",
  authDomain: "chalet-booking-app-95929.firebaseapp.com",
  projectId: "chalet-booking-app-95929",
  storageBucket: "chalet-booking-app-95929.firebasestorage.app",
  messagingSenderId: "460964015945",
  appId: "1:460964015945:web:bc9850eae91e195ad27498",
  measurementId: "G-Y6NBVBV3S6"
};


/** True once you have pasted at least the apiKey and projectId above. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // persistentLocalCache keeps an offline copy in IndexedDB so the app keeps
  // working with no internet and queues writes until back online.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
}

export { app, db, auth };
