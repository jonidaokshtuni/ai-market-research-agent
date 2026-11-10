import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#6366f1",
            colorBackground: "#0f172a",
            colorForeground: "#f8fafc",
            colorInput: "#020617",
            borderRadius: "0.75rem",
          },
          elements: {
            card: "border border-slate-800 shadow-2xl",
            headerTitle: "text-white",
            headerSubtitle: "text-slate-400",
            formFieldLabel: "text-slate-300",
            formFieldInput: "border-slate-700 focus:border-indigo-500",
            footerActionText: "text-slate-400",
            footerActionLink: "text-indigo-400 hover:text-indigo-300",
            socialButtonsBlockButton:
              "border-slate-700 text-white hover:bg-slate-800",
            dividerLine: "bg-slate-700",
            dividerText: "text-slate-500",
          },
        }}
      />
    </Suspense>
  );
}
