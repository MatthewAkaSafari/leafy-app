import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import React, { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import 'firebase/messaging';

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging (FCM)
const messaging = getMessaging(firebaseApp);

const Router: React.FC = () => {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
};

const MainApp: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Request notification permission
    Notification.requestPermission()
      .then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          return getToken(messaging, { vapidKey: process.env.REACT_APP_VAPID_KEY });
        } else {
          throw new Error('Notification permission not granted.');
        }
      })
      .then((token) => {
        console.log('FCM Token:', token);
        // Save the token to your server/database for sending notifications
      })
      .catch((err) => {
        console.error('Unable to get permission to notify.', err);
      });

    // Handle incoming messages
    onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      // Show notification or update UI
    });
  }, []);

  return (
    <div className="App">
      <h1>Welcome to Leafy!</h1>
      <MainApp />
    </div>
  );
};

export { MainApp };
export default App;