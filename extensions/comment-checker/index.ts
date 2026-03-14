import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { type CommentCheckerConfig, createCommentCheckerHook } from "./hook";

export default function commentChecker(api: ExtensionAPI, config?: CommentCheckerConfig): void {
  createCommentCheckerHook(api, config);
}

export type { CommentCheckerConfig } from "./hook";
export type { CommentInfo, CommentType, PendingCall } from "./types";
