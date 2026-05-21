Write ONLY docs/ARCHITECTURE.md.

Do not write any other file.

The architecture must remain:
- modular
- operational
- scalable
- AI-native
- startup-friendly

Important constraints:

- This is NOT enterprise overengineering.
- Avoid microservices complexity.
- Avoid Kubernetes.
- Avoid CQRS.
- Avoid distributed systems complexity.
- Avoid unnecessary abstractions.

Architecture should focus on:

- Frontend layer
- Backend layer
- Layout engine core
- Asset system
- Metadata system
- Spatial object model
- Storage architecture
- Export pipeline
- Future 3D readiness
- EventOS ecosystem integration

Current stack:

Frontend:
- Vite 6 (migrated from Next.js in SESSION-0009 — do not reintroduce Next.js)
- React 19
- TypeScript 5
- Tailwind v4 (via @tailwindcss/vite — no PostCSS config)
- Konva.js / react-konva (2D canvas — NOT Three.js)

Backend:
- Node.js
- Express
- MongoDB Atlas

Storage:
- Cloudflare R2

Deployment:
- Frontend → Vercel
- Backend → Render

The document should explain:
- system boundaries
- module responsibilities
- future extensibility
- operational simplicity
- AI-readable architecture

Focus on clarity over complexity.