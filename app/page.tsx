import { redirect } from "next/navigation";
import { localWeekday } from "@/lib/format";

export const dynamic = "force-dynamic";

// Landing: the Sunday review on Sundays, the brief every other day.
export default function Home() {
  redirect(localWeekday() === 0 ? "/review" : "/brief");
}
