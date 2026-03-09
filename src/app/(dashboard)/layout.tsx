import TopNav from "@/components/nav/TopNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopNav />
      <main className="pt-16">{children}</main>
    </>
  );
}
