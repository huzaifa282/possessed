// Messages the sandboxed frame posts to the parent. The parent validates every one (spec 05 §5.1).
import { z } from "zod";

export const FrameMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), height: z.number().finite().nonnegative() }),
  z.object({ type: z.literal("resize"), height: z.number().finite().nonnegative() }),
  z.object({ type: z.literal("error"), message: z.string().max(500) }),
]);
export type FrameMessage = z.infer<typeof FrameMessage>;

export const MIN_FRAME_HEIGHT = 240;
export const MAX_FRAME_HEIGHT = 900;
export const WATCHDOG_MS = 5000;
