import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <Suspense>
        <SignIn />
      </Suspense>
    </main>
  );
}
