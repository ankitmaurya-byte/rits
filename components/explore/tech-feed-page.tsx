"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  CircleSlash,
  Ellipsis,
  Flame,
  Globe2,
  Hash,
  Home,
  Lock,
  Mail,
  MessageCircle,
  MessageSquareText,
  PenSquare,
  Repeat2,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type FollowState = "following" | "requested" | "not_following";
type TopicTab = "For you" | "AI" | "Startups" | "Infra" | "Product";

type FeedPerson = {
  id: string;
  name: string;
  handle: string;
  role: string;
  company: string;
  focus: string[];
  isPrivate: boolean;
  allowMessages: boolean;
  followState: FollowState;
};

type FeedReply = {
  id: string;
  authorId: string;
  body: string;
  sentAt: string;
};

type FeedPost = {
  id: string;
  authorId: string;
  sentAt: string;
  topic: Exclude<TopicTab, "For you">;
  headline: string;
  body: string;
  tags: string[];
  likes: number;
  reposts: number;
  relevanceVotes: number;
  replies: FeedReply[];
};

type FeedSettings = {
  isPrivate: boolean;
  allowMessages: boolean;
  cooldownMinutes: number;
  strikeCount: number;
};

const currentUserId = "you";

const leftNav = [
  { label: "Home", icon: Home, active: true },
  { label: "Topics", icon: Hash },
  { label: "Messages", icon: Mail },
  { label: "Network", icon: Users },
  { label: "Saved", icon: Bookmark },
  { label: "Alerts", icon: Bell },
];

const topicTabs: TopicTab[] = ["For you", "AI", "Startups", "Infra", "Product"];

const initialPeople: FeedPerson[] = [
  { id: currentUserId, name: "You", handle: "@ankit", role: "Builder", company: "RITS", focus: ["agent tools", "startup systems", "product UX"], isPrivate: false, allowMessages: true, followState: "following" },
  { id: "maya", name: "Maya Chen", handle: "@mayachen", role: "Infra Engineer", company: "Scaleframe", focus: ["observability", "rag", "evals"], isPrivate: false, allowMessages: true, followState: "following" },
  { id: "rahul", name: "Rahul S", handle: "@rahuls", role: "Founder", company: "PromptLayer Labs", focus: ["agents", "developer tools", "b2b saas"], isPrivate: true, allowMessages: true, followState: "requested" },
  { id: "nina", name: "Nina Park", handle: "@ninapark", role: "PM", company: "CircuitOS", focus: ["ai product", "retention", "growth loops"], isPrivate: false, allowMessages: true, followState: "not_following" },
  { id: "omar", name: "Omar Idris", handle: "@omidris", role: "Researcher", company: "Open Compute Weekly", focus: ["foundation models", "benchmarks", "inference cost"], isPrivate: true, allowMessages: false, followState: "not_following" },
];

const initialPosts: FeedPost[] = [
  {
    id: "p1",
    authorId: "maya",
    sentAt: "12m ago",
    topic: "Infra",
    headline: "We cut eval latency by 43% by moving checks closer to retrieval",
    body: "A lot of teams still evaluate after generation. We shifted two quality checks into retrieval and saw lower cost plus faster fail-fast behavior. Curious if others are doing this in production.",
    tags: ["evals", "rag", "prod infra"],
    likes: 26,
    reposts: 4,
    relevanceVotes: 19,
    replies: [
      { id: "r1", authorId: "nina", body: "This is a stronger enterprise story than pure model tweaking. Easier to explain and cheaper to operate.", sentAt: "8m ago" },
      { id: "r2", authorId: currentUserId, body: "Would map this directly against infra competitors. Retrieval-stage quality keeps recurring as the wedge.", sentAt: "5m ago" },
    ],
  },
  {
    id: "p2",
    authorId: "rahul",
    sentAt: "39m ago",
    topic: "AI",
    headline: "Why most agent demos still break when a human joins the loop",
    body: "The weakest point is not tool execution, it is handoff clarity. If the system cannot explain state, assumptions, and next actions, humans stop trusting it immediately.",
    tags: ["agents", "handoff", "trust"],
    likes: 41,
    reposts: 9,
    relevanceVotes: 31,
    replies: [{ id: "r3", authorId: "maya", body: "State explainability is becoming the real UX layer for agent products.", sentAt: "30m ago" }],
  },
  {
    id: "p3",
    authorId: "omar",
    sentAt: "1h ago",
    topic: "Startups",
    headline: "Inference cost is now a product design constraint, not just infra overhead",
    body: "Teams are still shipping premium UX flows on top of expensive model paths without pricing the interaction loop. Cost should shape experience decisions from day one.",
    tags: ["models", "pricing", "inference"],
    likes: 33,
    reposts: 7,
    relevanceVotes: 29,
    replies: [],
  },
  {
    id: "p4",
    authorId: "nina",
    sentAt: "2h ago",
    topic: "Product",
    headline: "Product teams should document AI fallbacks like core UX flows",
    body: "Fallback states are no longer edge cases. They are part of the product. Teams that define graceful degradation early ship with much more user trust.",
    tags: ["product", "ai ux", "reliability"],
    likes: 18,
    reposts: 2,
    relevanceVotes: 22,
    replies: [],
  },
];

const trendCards = [
  { title: "OpenAI enterprise retention", meta: "4,200 posts" },
  { title: "RAG evaluation stacks", meta: "1,980 posts" },
  { title: "AI startup margins", meta: "1,420 posts" },
  { title: "Agent UX handoffs", meta: "890 posts" },
];

const newsCards = [
  { title: "Anthropic launches new enterprise controls", source: "Techmeme · 1h" },
  { title: "Infra startups see faster buyer cycles", source: "StrictlyVC · 2h" },
  { title: "Cursor-style UX patterns spread across devtools", source: "Not Boring · 5h" },
];

function getPerson(people: FeedPerson[], id: string) {
  return people.find((person) => person.id === id) ?? people[0]!;
}

export function TechFeedPage() {
  const [people, setPeople] = useState(initialPeople);
  const [posts, setPosts] = useState(initialPosts);
  const [activeTopic, setActiveTopic] = useState<TopicTab>("For you");
  const [searchValue, setSearchValue] = useState("");
  const [composerBody, setComposerBody] = useState("");
  const [composerTags, setComposerTags] = useState("ai, startups");
  const [openPostId, setOpenPostId] = useState<string | null>(initialPosts[0]!.id);
  const [replyDraftByPost, setReplyDraftByPost] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<FeedSettings>({ isPrivate: false, allowMessages: true, cooldownMinutes: 0, strikeCount: 1 });

  const filteredPosts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return posts.filter((post) => {
      const author = getPerson(people, post.authorId);
      const matchesTopic = activeTopic === "For you" || post.topic === activeTopic;
      const matchesQuery = !query || `${post.headline} ${post.body} ${post.tags.join(" ")} ${author.name} ${author.company}`.toLowerCase().includes(query);
      return matchesTopic && matchesQuery;
    });
  }, [activeTopic, people, posts, searchValue]);

  const pendingRequests = people.filter((person) => person.followState === "requested");
  const isPostingBlocked = settings.cooldownMinutes > 0 || settings.strikeCount >= 3;

  const handleCreatePost = () => {
    if (isPostingBlocked) {
      toast.error("Posting is on cooldown because of relevance strikes.");
      return;
    }
    if (!composerBody.trim()) {
      toast.error("Write something before posting.");
      return;
    }

    const headline = composerBody.trim().slice(0, 72);
    const nextPost: FeedPost = {
      id: `post-${Date.now()}`,
      authorId: currentUserId,
      sentAt: "Just now",
      topic: activeTopic === "For you" ? "AI" : activeTopic,
      headline,
      body: composerBody.trim(),
      tags: composerTags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5),
      likes: 0,
      reposts: 0,
      relevanceVotes: 1,
      replies: [],
    };

    setPosts((current) => [nextPost, ...current]);
    setOpenPostId(nextPost.id);
    setComposerBody("");
    toast.success("Posted to Tech Feed.");
  };

  const handleReply = (postId: string) => {
    const body = replyDraftByPost[postId]?.trim();
    if (!body) return;
    setPosts((current) => current.map((post) => post.id !== postId ? post : { ...post, replies: [{ id: `reply-${Date.now()}`, authorId: currentUserId, body, sentAt: "Just now" }, ...post.replies] }));
    setReplyDraftByPost((current) => ({ ...current, [postId]: "" }));
  };

  const handleFollowAction = (personId: string) => {
    setPeople((current) => current.map((person) => {
      if (person.id !== personId) return person;
      if (person.followState === "following") return { ...person, followState: "not_following" };
      if (person.isPrivate) return { ...person, followState: "requested" };
      return { ...person, followState: "following" };
    }));
  };

  const handleAcceptRequest = (personId: string) => {
    setPeople((current) => current.map((person) => person.id === personId ? { ...person, followState: "following" } : person));
  };

  const handleMessagePerson = (person: FeedPerson) => {
    if (!person.allowMessages) {
      toast.error("This person has messages turned off.");
      return;
    }
    toast.success(`Open private chat with ${person.name} from the chats area.`);
  };

  const handleStrike = () => {
    setSettings((current) => {
      const strikeCount = current.strikeCount + 1;
      return { ...current, strikeCount, cooldownMinutes: strikeCount >= 3 ? 60 : strikeCount * 10 };
    });
  };

  return (
    <div className="min-h-full" style={{ backgroundColor: "#000000" }}>
      <div className="mx-auto grid max-w-[1480px] grid-cols-1 xl:grid-cols-[280px_minmax(0,680px)_360px]">
        <aside className="hidden min-h-screen border-r px-5 py-6 xl:block" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" }}>
          <div className="sticky top-0">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.48)" }}>RITS Feed</p>
              <h1 className="mt-3 text-2xl font-medium tracking-tight text-white">Tech Feed</h1>
            </div>

            <nav className="space-y-1">
              {leftNav.map(({ label, icon: Icon, active }) => (
                <button key={label} type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[15px] transition-colors" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.72)", backgroundColor: active ? "rgba(255,255,255,0.08)" : "transparent" }}>
                  <Icon size={19} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <button type="button" onClick={handleCreatePost} disabled={isPostingBlocked || !composerBody.trim()} className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black transition-opacity disabled:opacity-50">
              <PenSquare size={16} className="mr-2" /> Post
            </button>

            <div className="mt-8 rounded-3xl border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Moderation status</p>
                  <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.58)" }}>{settings.strikeCount} strikes · {isPostingBlocked ? `${settings.cooldownMinutes}m cooldown` : "Posting active"}</p>
                </div>
                <ShieldAlert size={16} style={{ color: settings.strikeCount >= 3 ? "#ff2047" : "rgba(255,255,255,0.68)" }} />
              </div>
              <button type="button" onClick={handleStrike} className="mt-4 inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-sm" style={{ borderColor: "rgba(255,255,255,0.12)", color: "#ffffff" }}>Add strike</button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 border-x" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" }}>
          <div className="sticky top-0 z-20 border-b backdrop-blur-xl" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(0,0,0,0.88)" }}>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-xl font-medium text-white">Tech Feed</h2>
                <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.54)" }}>Builders, operators, researchers</p>
              </div>
              <button type="button" className="rounded-full p-2 text-white transition-colors hover:bg-white/8">
                <Sparkles size={18} />
              </button>
            </div>
            <div className="flex overflow-x-auto px-2">
              {topicTabs.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setActiveTopic(topic)}
                  className="relative min-w-[110px] px-4 py-4 text-sm font-medium transition-colors"
                  style={{ color: activeTopic === topic ? "#ffffff" : "rgba(255,255,255,0.62)" }}
                >
                  {topic}
                  {activeTopic === topic ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-white" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">A</div>
              <div className="min-w-0 flex-1">
                <textarea
                  value={composerBody}
                  onChange={(event) => setComposerBody(event.target.value)}
                  rows={3}
                  className="w-full resize-none bg-transparent text-[18px] leading-7 text-white outline-none placeholder:text-white/34"
                  placeholder="Share a technical take, startup signal, launch note, or research insight..."
                />
                <input value={composerTags} onChange={(event) => setComposerTags(event.target.value)} className="mt-3 w-full rounded-full border px-4 py-2 text-sm outline-none" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#050507", color: "#ffffff" }} placeholder="ai, infra, product" />
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <span>{settings.isPrivate ? <Lock size={12} className="mr-1 inline" /> : <Globe2 size={12} className="mr-1 inline" />}{settings.isPrivate ? "Private profile" : "Public profile"}</span>
                    <span>{settings.allowMessages ? <Mail size={12} className="mr-1 inline" /> : <CircleSlash size={12} className="mr-1 inline" />}{settings.allowMessages ? "Messages on" : "Messages off"}</span>
                  </div>
                  <button type="button" onClick={handleCreatePost} disabled={isPostingBlocked || !composerBody.trim()} className="inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-black transition-opacity disabled:opacity-50">
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            {filteredPosts.map((post) => {
              const author = getPerson(people, post.authorId);
              const isOpen = openPostId === post.id;
              const replyDraft = replyDraftByPost[post.id] ?? "";
              return (
                <article key={post.id} className="border-b px-5 py-4 transition-colors hover:bg-white/[0.02]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">{author.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium text-white">{author.name}</span>
                            <span style={{ color: "rgba(255,255,255,0.46)" }}>{author.handle}</span>
                            <span style={{ color: "rgba(255,255,255,0.34)" }}>·</span>
                            <span style={{ color: "rgba(255,255,255,0.46)" }}>{post.sentAt}</span>
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.42)" }}>{post.topic}</p>
                        </div>
                        <button type="button" className="rounded-full p-2 text-white/58 hover:bg-white/8 hover:text-white">
                          <Ellipsis size={16} />
                        </button>
                      </div>

                      <div className="mt-2">
                        <p className="text-[16px] font-medium leading-7 text-white">{post.headline}</p>
                        <p className="mt-2 text-[15px] leading-7" style={{ color: "rgba(255,255,255,0.82)" }}>{post.body}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {post.tags.map((tag) => <span key={tag} className="rounded-full border px-3 py-1 text-[11px]" style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.56)" }}>#{tag}</span>)}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 text-sm" style={{ color: "rgba(255,255,255,0.46)" }}>
                        <button type="button" onClick={() => setOpenPostId(isOpen ? null : post.id)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/8 hover:text-[#3b9eff]">
                          <MessageCircle size={16} /> {post.replies.length}
                        </button>
                        <button type="button" onClick={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, reposts: item.reposts + 1 } : item))} className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/8 hover:text-[#11ff99]">
                          <Repeat2 size={16} /> {post.reposts}
                        </button>
                        <button type="button" onClick={() => setPosts((current) => current.map((item) => item.id === post.id ? { ...item, likes: item.likes + 1 } : item))} className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/8 hover:text-[#ff2047]">
                          <Flame size={16} /> {post.likes}
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="mt-4 rounded-3xl border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
                          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.44)" }}>Thread</p>
                          <div className="space-y-3">
                            {post.replies.map((reply) => {
                              const replyAuthor = getPerson(people, reply.authorId);
                              const isCurrentUser = reply.authorId === currentUserId;
                              return (
                                <div key={reply.id} className={isCurrentUser ? "ml-auto max-w-[88%]" : "mr-auto max-w-[88%]"}>
                                  <div className="rounded-[24px] border px-4 py-3" style={{ borderColor: isCurrentUser ? "rgba(59,158,255,0.18)" : "rgba(255,255,255,0.08)", backgroundColor: isCurrentUser ? "rgba(59,158,255,0.08)" : "#0a0a0d" }}>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.42)" }}>{replyAuthor.name} · {reply.sentAt}</p>
                                    <p className="mt-2 text-sm leading-6" style={{ color: "rgba(255,255,255,0.84)" }}>{reply.body}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 flex items-end gap-3 rounded-[24px] border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" }}>
                            <textarea value={replyDraft} onChange={(event) => setReplyDraftByPost((current) => ({ ...current, [post.id]: event.target.value }))} rows={2} className="min-h-[24px] flex-1 resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/34" placeholder="Reply like a chat message..." />
                            <button type="button" onClick={() => handleReply(post.id)} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black">
                              <Send size={14} className="mr-1 inline" /> Reply
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </main>

        <aside className="hidden min-h-screen px-5 py-4 xl:block" style={{ backgroundColor: "#000000" }}>
          <div className="sticky top-0 space-y-4">
            <div className="rounded-full border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
              <div className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.52)" }}>
                <Search size={16} />
                <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-white/34" placeholder="Search Tech Feed" style={{ color: "#ffffff" }} />
              </div>
            </div>

            <div className="rounded-[24px] border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
              <p className="text-xl font-medium text-white">What’s happening</p>
              <div className="mt-4 space-y-4">
                {newsCards.map((card) => (
                  <article key={card.title} className="rounded-2xl p-3 transition-colors hover:bg-white/[0.03]">
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.42)" }}>{card.source}</p>
                    <p className="mt-2 text-sm leading-6 text-white">{card.title}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
              <p className="text-xl font-medium text-white">Trends for builders</p>
              <div className="mt-4 space-y-4">
                {trendCards.map((card) => (
                  <article key={card.title} className="rounded-2xl p-3 transition-colors hover:bg-white/[0.03]">
                    <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.42)" }}>Trending now</p>
                    <p className="mt-2 text-sm text-white">{card.title}</p>
                    <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.46)" }}>{card.meta}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
              <p className="text-xl font-medium text-white">Who to follow</p>
              <div className="mt-4 space-y-4">
                {people.filter((person) => person.id !== currentUserId).slice(0, 3).map((person) => (
                  <div key={person.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">{person.name}</p>
                        {person.isPrivate ? <Lock size={12} style={{ color: "rgba(255,194,82,0.8)" }} /> : null}
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.46)" }}>{person.handle} · {person.company}</p>
                    </div>
                    <button type="button" onClick={() => handleFollowAction(person.id)} className="rounded-full border px-3 py-1.5 text-xs font-medium text-white" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                      {person.followState === "following" ? "Following" : person.followState === "requested" ? "Requested" : "Follow"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
              <p className="text-sm font-medium text-white">Profile settings</p>
              <div className="mt-4 space-y-2 text-sm">
                <button type="button" onClick={() => setSettings((current) => ({ ...current, isPrivate: !current.isPrivate }))} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-white/78 hover:bg-white/[0.04]">
                  {settings.isPrivate ? <Lock size={15} /> : <Globe2 size={15} />} {settings.isPrivate ? "Private account" : "Public account"}
                </button>
                <button type="button" onClick={() => setSettings((current) => ({ ...current, allowMessages: !current.allowMessages }))} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-white/78 hover:bg-white/[0.04]">
                  <MessageSquareText size={15} /> {settings.allowMessages ? "Messages enabled" : "Messages disabled"}
                </button>
                <button type="button" onClick={() => setSettings((current) => ({ ...current, strikeCount: 0, cooldownMinutes: 0 }))} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-white/78 hover:bg-white/[0.04]">
                  <CircleSlash size={15} /> Reset strikes
                </button>
              </div>
            </div>

            {pendingRequests.length > 0 ? (
              <div className="rounded-[24px] border p-4" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050507" }}>
                <p className="text-sm font-medium text-white">Follow requests</p>
                <div className="mt-4 space-y-3">
                  {pendingRequests.map((person) => (
                    <div key={person.id} className="rounded-2xl border p-3" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0d" }}>
                      <p className="text-sm text-white">{person.name}</p>
                      <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.46)" }}>{person.handle}</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => handleAcceptRequest(person.id)} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-black">Accept</button>
                        <button type="button" onClick={() => handleMessagePerson(person)} className="rounded-full border px-3 py-1.5 text-xs font-medium text-white" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                          <UserPlus size={12} className="mr-1 inline" /> Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="fixed bottom-6 right-6 z-30 hidden flex-col gap-3 xl:flex">
        <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border bg-white text-black shadow-2xl" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
          <PenSquare size={18} />
        </button>
        <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full border bg-[#050507] text-white shadow-2xl" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
          <Sparkles size={18} />
        </button>
      </div>
    </div>
  );
}
