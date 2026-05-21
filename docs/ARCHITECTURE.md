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
- Next.js
- React
- TypeScript
- Tailwind
- Konva.js

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