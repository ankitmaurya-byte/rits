/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as authHelpers from "../authHelpers.js";
import type * as chat from "../chat.js";
import type * as chatActions from "../chatActions.js";
import type * as chatContext from "../chatContext.js";
import type * as githubTools from "../githubTools.js";
import type * as ideas from "../ideas.js";
import type * as notes from "../notes.js";
import type * as researchOutputs from "../researchOutputs.js";
import type * as resources from "../resources.js";
import type * as social from "../social.js";
import type * as socialChats from "../socialChats.js";
import type * as todoGroups from "../todoGroups.js";
import type * as todos from "../todos.js";
import type * as users from "../users.js";
import type * as vaults from "../vaults.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  authHelpers: typeof authHelpers;
  chat: typeof chat;
  chatActions: typeof chatActions;
  chatContext: typeof chatContext;
  githubTools: typeof githubTools;
  ideas: typeof ideas;
  notes: typeof notes;
  researchOutputs: typeof researchOutputs;
  resources: typeof resources;
  social: typeof social;
  socialChats: typeof socialChats;
  todoGroups: typeof todoGroups;
  todos: typeof todos;
  users: typeof users;
  vaults: typeof vaults;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
