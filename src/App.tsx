import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Assessment from './pages/Assessment';
import BatchAssessment from './pages/BatchAssessment';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import { ApiProvider } from './context/ApiContext';

function App() {
  return (
    <ApiProvider>
      <Router>
        <div className="min-h-screen bg-primary-bg text-text-primary font-inter">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/assess" element={<Assessment />} />
            <Route path="/batch" element={<BatchAssessment />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/history" element={<History />} />
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#3a3a3a',
                color: '#ffffff',
                border: '1px solid #93C572',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#FF6B6B',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </div>
      </Router>
    </ApiProvider>
  );
}

export default App;