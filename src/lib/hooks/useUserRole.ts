"use client";

import { useState } from "react";
import { UserRole } from "@/lib/supabase/types";

export function useUserRole() {
  // For preview, we'll return a mock admin role
  // This allows access to all parts of the application
  const [role] = useState<UserRole>('admin');
  const [isLoading] = useState(false);

  return { role, isLoading };
}
