import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(20_000),
});

export const ChatRequestSchema = z
  .object({
    message: z.string().trim().min(1).max(20_000),
    mode: z.enum(["chat", "report"]).default("chat"),
    sessionId: z.string().uuid(),
  })
  .strict();

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
