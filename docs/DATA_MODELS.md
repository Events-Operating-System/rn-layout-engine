Write ONLY docs/DATA_MODELS.md.

Do not write any other file.

This document defines the conceptual data architecture of RN Layout Engine.

Important:

This is NOT final database implementation.
Do NOT generate:
- Mongoose schemas
- SQL schemas
- TypeScript interfaces
- production code

Focus on conceptual entities and relationships.

The document must define the following entities:

- Event Object
- Layout Object
- Scene Object
- Asset Object
- Placed Object
- Layer Object
- Measurement Model
- Metadata Model
- Version Model

Important principles:

- Real-world measurements are mandatory.
- Assets are reusable definitions.
- Placed objects are instances.
- Layouts are operational documents.
- Metadata must remain structured and extensible.
- Objects must support future 3D evolution.
- AI readability is mandatory.

The document should explain:

- entity responsibilities
- relationships between entities
- layout lifecycle
- object lifecycle
- layout versioning
- reusable asset philosophy
- measurement handling
- metadata extensibility
- future renderer abstraction

Avoid:
- CAD complexity
- BIM terminology
- enterprise jargon
- unnecessary abstractions
- overengineering

Focus on:
- operational clarity
- modularity
- future scalability
- AI-native structure
- simplicity

RN Layout Engine is an operational layout system for live event production workflows.