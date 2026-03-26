import { useState, useCallback } from "react";
import TopNav from "./TopNav";
import EcoBotSidebar from "./EcoBotSidebar";
import "./Layout.css";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggle = useCallback((open) => {
    setSidebarOpen(open);
  }, []);

  return (
    <div className="layout-root" data-sidebar={sidebarOpen ? "open" : "closed"}>
      <TopNav />
      <main className={"layout-content" + (sidebarOpen ? " sidebar-open" : " sidebar-closed")}>
        {children}
      </main>
      <EcoBotSidebar onToggle={handleToggle} />
    </div>
  );
}