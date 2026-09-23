// Firebase Client SDK configuration for Virexo
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA94kg8nJ0uR1NCvQf_JUeo58Gj2ePkr04",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "virexo-chat-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "virexo-chat-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "virexo-chat-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "53907129704",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:53907129704:web:351e805dde43d3bb2742dd"
};
