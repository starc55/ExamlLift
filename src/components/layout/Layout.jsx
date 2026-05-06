import { useState } from "react";
import Navbar from "../navbar/Navbar";
import Sidebar from "../sidebar/Sidebar";

function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="app-shell__content">
        <Navbar onMenuToggle={() => setIsSidebarOpen((value) => !value)} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
