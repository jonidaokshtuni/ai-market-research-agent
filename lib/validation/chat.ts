import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20_000),
});

export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1).max(30),
    mode: z.enum(["chat", "report"]).default("chat"),
    sessionId: z.string().uuid(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const lastMessage = data.messages[data.messages.length - 1];

    if (lastMessage?.role !== "user") {
      ctx.addIssue({
        code: "custom",
        path: ["messages"],
        message: "The last message must be from the user.",
      });
    }

    const totalCharacters = data.messages.reduce(
      (total, message) => total + message.content.length,
      0
    );

    if (totalCharacters > 60_000) {
      ctx.addIssue({
        code: "custom",
        path: ["messages"],
        message: "Conversation is too large.",
      });
    }
  });

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
