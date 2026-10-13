import { appIcon } from "@/lib/app-icon";

export const dynamic = "force-static";
export const generateStaticParams = () => [{ size: "192.png" }, { size: "512.png" }];

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  return appIcon(size === "512.png" ? 512 : 192);
}
