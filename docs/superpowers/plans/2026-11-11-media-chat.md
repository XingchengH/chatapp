# Voice messages and video calls

Approved scope: record, preview, discard and send voice messages; authenticated individual and group video calls capped at eight people. Managed LiveKit handles live media. Calls are not recorded.

## Implementation

- [ ] Add bounded multipart audio uploads with server-side media validation and Cloudinary storage. Persist audio metadata alongside existing messages and preserve message retry IDs.
- [ ] Add a recording component with browser codec negotiation, timer, preview, discard, retry and microphone cleanup. Render audio controls in message history.
- [ ] Add call records, invitations and membership checks. Issue short-lived LiveKit tokens only to accepted participants and enforce eight participants at the media server.
- [ ] Add incoming call UI, active call controls, invitations, disconnect cleanup and configuration errors.
- [ ] Run regression tests, lint, production build, and targeted permission/upload/call authorization tests. Document required LiveKit configuration and remaining live-device verification.

Existing text/image messages remain compatible. Audio is limited to five minutes and 10 MB. Database-backed call membership prevents arbitrary room access; LiveKit server credentials remain on the backend. No production data is needed for automated verification.
