"use client";

import { UploadButton as UTUploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = UTUploadButton<OurFileRouter>;
