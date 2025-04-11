import { createNextRouteHandler } from "uploadthing/next";
import { uploadRouter } from "./core";

// Export routes for Next.js App Router
export const { GET, POST } = createNextRouteHandler({
  router: uploadRouter,
});
