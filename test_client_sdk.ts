import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

async function test() {
  try {
    console.log("Testing with Client SDK...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    const snap = await getDocs(collection(db, "settings"));
    console.log("Success! Found", snap.size, "documents");
  } catch (e: any) {
    console.error("Client SDK failed:", e.code, e.message);
  }
}

test();
