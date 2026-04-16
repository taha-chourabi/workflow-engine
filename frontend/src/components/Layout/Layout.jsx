import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="app-shell">
      <Navbar />
      <div className="flex">
        <Sidebar isAdmin={isAdmin} />
        <main className="flex-1 app-main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;