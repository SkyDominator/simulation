import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppController from './AppController';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AppController />
    </AuthProvider>
  );
}

export default App;
