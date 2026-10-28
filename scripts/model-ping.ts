// Streams a short Gemma reply to check the key and provider (T1.7). Run: npm run model:ping
import { createProvider } from "../src/lib/model/provider";

async function main() {
  const provider = createProvider();
  console.log(`provider: ${provider.id}`);
  console.log("health:", await provider.health());

  const started = Date.now();
  let first = 0;
  process.stdout.write("reply: ");
  for await (const text of provider.stream(
    {
      system: "You are a friendly ghost designer. Answer in one short sentence.",
      user: "Say hello and tell me one thing you love about candlelight.",
      temperature: 0.7,
      maxOutputTokens: 120,
    },
    new AbortController().signal,
  )) {
    if (!first) first = Date.now() - started;
    process.stdout.write(text);
  }
  console.log(`\n\nfirst chunk: ${first} ms, total: ${Date.now() - started} ms, model: ${provider.id}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
