// Messages the sandboxed frame posts to the parent. The parent validates every one (spec 05 §5.1).
import { z } from "zod";

export const FrameMessage = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready"), height: z.number().finite().nonnegative() }),
  z.object({ type: z.literal("resize"), height: z.number().finite().nonnegative() }),
  z.object({ type: z.literal("error"), message: z.string().max(500) }),
  z.object({
    type: z.literal("contrast"),
    failures: z
      .array(z.object({ text: z.string().max(80), ratio: z.number().finite().nonnegative(), required: z.union([z.literal(3), z.literal(4.5)]) }))
      .max(20),
    unmeasured: z.number().int().nonnegative(),
  }),
]);
export type FrameMessage = z.infer<typeof FrameMessage>;

export const MIN_FRAME_HEIGHT = 240;
export const MAX_FRAME_HEIGHT = 900;
export const WATCHDOG_MS = 5000;
