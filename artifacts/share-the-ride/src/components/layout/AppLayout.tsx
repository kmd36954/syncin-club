import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col relative" style={{ overflowX: "hidden", maxWidth: "100vw" }}>
      <Navbar />
      <main className="flex-1 flex flex-col" style={{ overflowX: "hidden" }}>
        {children}
      </main>
      
      {/* Simple Footer */}
      <footer className="mt-auto py-8 text-center text-sm text-muted-foreground border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <p>© {new Date().getFullYear()} SyncIn. Built for Pakistan.</p>
      </footer>
    </div>
  );
}
