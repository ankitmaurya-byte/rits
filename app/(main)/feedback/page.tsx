"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { MessageSquareText, Send } from "lucide-react";

import { api } from "@/convex/_generated/api";

export default function FeedbackPage() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const [subject, setSubject] = useState("Rits feedback");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      toast.error("Add your feedback before sending.");
      return;
    }

    const email = currentUser?.email ? `\n\nFrom: ${currentUser.email}` : "";
    const href = `mailto:hello@rits.fun?subject=${encodeURIComponent(subject.trim() || "Rits feedback")}&body=${encodeURIComponent(`${trimmedMessage}${email}`)}`;
    window.location.href = href;
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="mx-auto max-w-3xl feature-card relative overflow-hidden">
        <div className="absolute left-0 top-0 h-56 w-56 pointer-events-none" style={{ background: "radial-gradient(circle at top left, var(--accent-orange-glow) 0%, transparent 70%)", opacity: 0.16 }} />
        <div className="relative z-10">
          <div className="mb-8 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--ink)" }}>
              <MessageSquareText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-medium tracking-tight" style={{ color: "var(--ink)" }}>Feedback</h1>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--charcoal)" }}>
                Share bugs, ideas, rough edges, or product requests. We open your email client with the feedback prefilled.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium" style={{ color: "var(--body)" }}>Message</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input-field min-h-48 resize-y py-3" placeholder="What should we improve? What feels broken? What would make Rits more useful for you?" />
            </label>

            <div className="flex justify-end border-t pt-5" style={{ borderColor: "var(--divider-soft)" }}>
              <button onClick={handleSubmit} className="btn-primary">
                <Send size={16} /> Send feedback
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
