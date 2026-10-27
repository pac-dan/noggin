import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Landing: Today (gut reset plan + builds). Brief and the Sunday review are a tap away.
export default function Home() {
  redirect("/today");
}
