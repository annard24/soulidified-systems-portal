"use client";

import { UploadButton as UTButton } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing"; // adjust path if needed

export const UploadButton = () => {
  return (
    <div className="p-4 border rounded-md">
      <UTButton<OurFileRouter>
        endpoint="imageUploader" // or "documentUploader"
        onClientUploadComplete={(res) => {
          console.log("Upload complete", res);
          alert("Upload complete!");
        }}
        onUploadError={(error) => {
          alert(`ERROR! ${error.message}`);
        }}
      />
    </div>
  );
};
