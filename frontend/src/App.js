import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Home from './pages/Home';
import Login from './pages/Login';
import FormulaCalculator from './pages/FormulaCalculator';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // 檢查是否是允許的電子郵件
        if (currentUser.email === process.env.REACT_APP_LOGIN_ACCOUNT1 || currentUser.email === process.env.REACT_APP_LOGIN_ACCOUNT2 || currentUser.email === process.env.REACT_APP_LOGIN_ACCOUNT3) {
          setUser(currentUser);
          setAccessDenied(false);
        } else {
          // 如果不是允許的電子郵件，登出並設置訪問拒絕狀態
          setAccessDenied(true);
          auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
        setAccessDenied(false);
      }
      setLoading(false);
    });

    // 清理訂閱
    return () => unsubscribe();
  }, []);

  // 保護路由，需要登入才能訪問
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="text-center my-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">載入中...</span>
          </div>
          <p className="mt-2">正在檢查登入狀態，請稍候...</p>
        </div>
      );
    }

    if (!user) return <Navigate to="/login" />;
    return children;
  };

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" /> :
            <Login accessDenied={accessDenied} />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/formula-calculator" element={
          <ProtectedRoute>
            <FormulaCalculator />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
