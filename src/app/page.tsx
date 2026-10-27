// The haunted studio: editor | before/after preview | ghost chat. Spec: specs/01, specs/05 §5.4 · Tasks: T2.2–T2.6
export default function HauntedStudio() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-5xl tracking-[0.25em] text-glow">POSSESSED</h1>
      <p className="max-w-md text-ink/80">
        Paste one component. A ghost designer will haunt it. (Scaffold alive: start with <code>tasks/day-1.md</code>.)
      </p>
    </main>
  );
}
