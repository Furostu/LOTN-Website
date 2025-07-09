// src/firebase.js
import { initializeApp }  from "firebase/app";
import { getFirestore }   from "firebase/firestore";
import { getAnalytics }   from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:         "AIzaSyBSSFAfb9dftw7wns3VCboQE2e_pTK6fSA",
  authDomain:     "lotn-commonwealth-app.firebaseapp.com",
  projectId:      "lotn-commonwealth-app",
  storageBucket:  "lotn-commonwealth-app.appspot.com",     // ← notice the “.appspot.com”
  messagingSenderId:"590908768684",
  appId:          "1:590908768684:web:1016e3edabdde9be497a09",
  measurementId:  "G-NPJZBJ0E7L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize and export Firestore
export const db = getFirestore(app);
// (Optional) analytics if you need it
export const analytics = getAnalytics(app);

export default app;
