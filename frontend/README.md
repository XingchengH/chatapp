# Frontend

See the [repository setup and deployment guide](../README.md).

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

The frontend uses React, TypeScript, Vite, Zustand, Tailwind/DaisyUI and Socket.IO. Route pages and the emoji picker load on demand. The mobile layout switches between the contact list and selected conversation; the header's back button returns to contacts.

Copy `.env.example` to `.env` for optional Google sign-in or a custom API origin. All `VITE_*` variables are browser-visible.
