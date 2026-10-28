# Backlog (not for this deadline)

- Screenshot input (Gemma vision rebuilds the component, then possesses it)
- Vue / Svelte single-file components
- Share links (needs storage)
- More presets: Retro VHS horror, Haunted Arcade, Pakistani "Purani Haveli"
- Figma plugin
- Self-hosted Gemma on a GPU Droplet as the default provider
- Sample props for the preview: components that require props (e.g. `links.map`) crash with empty props and show the error boundary. Synthesize props from the TS interface / usage, or let the user edit props JSON. (found in T1.10)
- Harden `postinstall` for deploy: `copy-vendor` runs through `tsx` (a devDependency). Check the DigitalOcean build installs devDependencies, or commit the generated vendor files. (found in T1.10)
