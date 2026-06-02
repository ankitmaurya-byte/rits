import { SharedNotePage } from "./shared-note-page";

export default async function ShareNoteRoute({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  return <SharedNotePage shareToken={shareToken} />;
}
