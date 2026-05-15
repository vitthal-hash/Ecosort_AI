import { useState, useCallback } from "react";
import { motion } from "framer-motion";
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
      <motion.main 
        className={"layout-content" + (sidebarOpen ? " sidebar-open" : " sidebar-closed")}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {children}
      </motion.main>
      <EcoBotSidebar onToggle={handleToggle} />
    </div>
  );
}