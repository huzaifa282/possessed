# Backlog (not for this deadline)

- Screenshot input (Gemma vision rebuilds the component, then possesses it)
- Vue / Svelte single-file components
- Share links (needs storage)
- More presets: Retro VHS horror, Haunted Arcade, Pakistani "Purani Haveli"
- Figma plugin
- Self-hosted Gemma on a GPU Droplet as the default provider
- Sample props for the preview: components that require props (e.g. `links.map`) crash with empty props and show the error boundary. Synthesize props from the TS interface / usage, or let the user edit props JSON. (found in T1.10)
- Harden `postinstall` for deploy: `copy-vendor` runs through `tsx` (a devDependency). Check the DigitalOcean build installs devDependencies, or commit the generated vendor files. (found in T1.10)
- Stale contrast chip: if the After frame freezes, the "N texts hard to read" chip from the previous render can stay on screen. Clear it when the frame is not ready. (found in T3.6)
- Verify the mobile layout (stacked editor and preview, collapsible chat) and `prefers-reduced-motion` in a real browser; the extension could not resize the window. (T3.4)
- The browser tool's own GIF export did not land on disk; assets were built with `sharp` from saved screenshots. If the hero GIF is redone, reuse that approach. (T3.6)

