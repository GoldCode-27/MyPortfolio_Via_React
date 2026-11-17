import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Firebase config (from your project settings).
// NOTE: Realtime Database requires `databaseURL` (add yours below).
const firebaseConfig = {
  apiKey: 'AIzaSyCu-HuQgyGZPNNXiOPL37Pwr7UFls54rWI',
  authDomain: 'portfolio-27-d695a.firebaseapp.com',
  databaseURL: 'https://portfolio-27-d695a-default-rtdb.europe-west1.firebasedatabase.app/',
  projectId: 'portfolio-27-d695a',
  storageBucket: 'portfolio-27-d695a.firebasestorage.app',
  messagingSenderId: '362670008982',
  appId: '1:362670008982:web:595fb606f2f4bc0fe2b0b7',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const db = getDatabase(firebaseApp)

