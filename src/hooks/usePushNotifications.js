import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

export const usePushNotifications = (userProfile) => {
  useEffect(() => {
    // Only run this on native mobile devices, not in the web browser
    if (!Capacitor.isNativePlatform() || !userProfile?.id) return;

    const registerPushNotifications = async () => {
      try {
        // 1. Request permission from the student
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('User denied push notification permissions');
          return;
        }

        // 2. Register the device with FCM
        await PushNotifications.register();

        // 3. Listen for the token from FCM
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ' + token.value);
          
          // 4. Save the token to the student's Firestore document
          const userRef = doc(db, 'users', userProfile.id);
          
          // We use arrayUnion so if a student logs in on a phone AND a tablet, 
          // both devices receive the notification.
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token.value) 
          });
        });

        // 4. Handle errors during registration
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ', error);
        });

        // 5. Listen for incoming notifications while the app is open
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push received: ', notification);
          // Optional: You could use your showToast() here to show an in-app alert!
        });

      } catch (error) {
        console.error("Failed to initialize push notifications", error);
      }
    };

    registerPushNotifications();

    // Cleanup listeners when component unmounts
    return () => {
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [userProfile?.id]); // Re-run if the user changes (e.g., login/logout)
};