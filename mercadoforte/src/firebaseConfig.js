import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAAMDVETtUUMQ0FrKikWF7-x6UKxu_0Dyk",
  authDomain: "saas-mercado-forte.firebaseapp.com",
  projectId: "saas-mercado-forte",
  storageBucket: "saas-mercado-forte.firebasestorage.app",
  messagingSenderId: "50138078035",
  appId: "1:50138078035:web:49cec1073559ffef861fa6",
  measurementId: "G-V34Q8LL4DL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

