import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileNav } from "@/components/MobileNav";
import { StatusProvider } from "@/components/status-context";

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <StatusProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="w-full flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-8 lg:px-10 lg:pt-8">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </StatusProvider>
  );
}
