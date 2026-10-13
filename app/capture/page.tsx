import { Sheet } from "@/components/Sheet";
import { Capture } from "./client";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ card_id?: string; brief_id?: string; question_id?: string }>;
}) {
  const p = await searchParams;
  return (
    <Sheet title="Capture">
      <Capture cardId={p.card_id ?? null} briefId={p.brief_id ?? null} questionId={p.question_id ?? null} />
    </Sheet>
  );
}
