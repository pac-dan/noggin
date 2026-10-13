import { TabBar } from "@/components/TabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-[calc(84px+env(safe-area-inset-bottom)+16px)]">{children}</main>
      <TabBar />
    </>
  );
}
