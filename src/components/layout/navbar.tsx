"use client";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserRole } from "@/lib/hooks/useUserRole";

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const { role } = useUserRole();
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                GHL Project Portal
              </Link>
            </div>
            {isSignedIn && (
              <div className="ml-6 flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname === "/dashboard"
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/projects"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname.startsWith("/projects")
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Projects
                </Link>
                <Link
                  href="/onboarding"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname.startsWith("/onboarding")
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Onboarding
                </Link>
                <Link
                  href="/assets"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname.startsWith("/assets")
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Assets
                </Link>
                <Link
                  href="/messages"
                  className={`px-3 py-2 text-sm font-medium ${
                    pathname.startsWith("/messages")
                      ? "text-indigo-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Messages
                </Link>
                {role === "admin" && (
                  <Link
                    href="/admin"
                    className={`px-3 py-2 text-sm font-medium ${
                      pathname.startsWith("/admin")
                        ? "text-indigo-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center">
            {isSignedIn ? (
              <SignOutButton>
                <button className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Sign out
                </button>
              </SignOutButton>
            ) : (
              <div className="flex space-x-4">
                <Link
                  href="/sign-in"
                  className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
