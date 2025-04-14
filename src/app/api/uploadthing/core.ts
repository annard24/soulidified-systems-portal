import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  imageUploader: f({ image: { maxFileSize: "4MB" } })
    .middleware(async ({ req }) => {
      return { userId: "user_id" }; // Replace with real user ID logic later
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId };
    }),

  documentUploader: f({ pdf: { maxFileSize: "16MB" }, text: { maxFileSize: "8MB" } })
    .middleware(async ({ req }) => {
      return { userId: "user_id" }; // Replace with real user ID logic later
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
