import { Suspense } from "react";
import RegisterForm from "@/components/register/register-form";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
          <p className="text-gray-400">Loading registration...</p>
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
