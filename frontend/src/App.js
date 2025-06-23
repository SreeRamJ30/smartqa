import './App.css';
import './components/common/main.css'; // Import global styles for DOM differences visualization
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard'; // Import the Dashboard component we'll create

function App() {
  return (
    <div className="App">
      {/* Removed the navigation bar */}
      
      {/* Main content area for routes */}
      <div> {/* Removed padding style since it's not needed without the navbar */}
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Removed direct CombinedResults route to keep all pages inside Dashboard */}
        </Routes>
      </div>
    </div>
  );
}

export default App;
