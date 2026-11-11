# Resume photos and project links

Basics supports uploading, replacing, and removing a photo for an individual resume. Accept JPEG, PNG, and WebP. Let the author position a square crop and store a 256 × 256 JPEG of at most 100 KiB in Cloudflare D1 Free. Store the image in a separate row linked to its resume. Only the resume owner can access it. Copies receive their own row, and deleting a resume removes its image. Preview and export use the cropped photo. Existing external picture URLs stay in the resume data without loading, and MCP resume reads exclude the image.

In Basics, the round photo control sits beside Full Name. Its empty state shows Add photo. Clicking the control opens the file picker and a separate remove button appears when a photo exists. The resume uses an 80 × 80 pt square photo. Onyx places it to the left of the identity block, vertically centered. Meowth and Scizor place it to the right, top aligned. Kakuna centers it above the identity block.

Each project can show its website link on its underlined title. The toggle defaults off and retains the label for the bottom link. When enabled with a valid HTTP or HTTPS URL, the title opens the website in a new tab and the rest of the preview entry remains editable. The downloaded PDF includes the link.

- [01 Project title link](issues/01-project-title-link.md)
- [02 Private resume photo](issues/02-private-resume-photo.md)
