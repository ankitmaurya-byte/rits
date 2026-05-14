import { ConvexError } from "convex/values";
import { UserIdentity } from "convex/server";

import { Doc } from "./_generated/dataModel";
import { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

type DbCtx = QueryCtx | MutationCtx;
type AuthCtx = QueryCtx | MutationCtx | ActionCtx;

export async function requireIdentity(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

export async function findCurrentUser(
  ctx: DbCtx
): Promise<{ identity: UserIdentity; user: Doc<"users"> | null }> {
  const identity = await requireIdentity(ctx);

  const userByToken = await ctx.db
    .query("users")
    .withIndex("by_token_identifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .first();

  if (userByToken) {
    return { identity, user: userByToken };
  }

  const legacyClerkId = identity.subject;
  const userByClerkId = legacyClerkId
    ? await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", legacyClerkId))
        .first()
    : null;

  return { identity, user: userByClerkId };
}

export async function requireCurrentUser(ctx: DbCtx) {
  const result = await findCurrentUser(ctx);

  if (!result.user) {
    throw new ConvexError("User not found");
  }

  return {
    identity: result.identity,
    user: result.user,
  };
}
