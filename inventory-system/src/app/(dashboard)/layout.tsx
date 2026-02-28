import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
            <Sidebar />
            <main className="flex-1 overflow-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    );
}
