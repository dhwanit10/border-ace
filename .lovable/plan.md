# Officer case image previews

## Changes
- Add a reusable image preview panel with loading and unavailable states.
- After OCR, fetch the document image using the returned document ID and show it above OCR confidence.
- On the verification assessment, fetch and show both the document image and captured person image.
- Move the officer decision area below the verification signals and optional reasons, with actions arranged horizontally.
- Keep the blockchain record in the right-side evidence column and preserve all existing workflow behavior.

## Technical details
- Reuse the existing authenticated image fetch helper and existing document image endpoints.
- Reset and refresh image state as cases move between OCR and verification steps.
- Preserve the current responsive two-column assessment layout, collapsing cleanly on smaller screens.
