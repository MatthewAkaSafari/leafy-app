import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json'; // Ensure the path is correct
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://leafy-app-c420-default-rtdb.firebaseio.com/"
});
const messaging = admin.messaging();
export { messaging };
