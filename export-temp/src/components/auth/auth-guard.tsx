"use client";

import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  // For preview, we'll bypass authentication checks
  // and always render the children
  
  return <>{children}</>;
}
