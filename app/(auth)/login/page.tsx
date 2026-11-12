import { Suspense } from "react";

import LoginForm from "@/components/login/login-form";

type LoginPageProps = {
  searchParams: Promise<{
    invite?: string | string[];
  }>;
};

async function LoginPageContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  const invitationToken =
    typeof params.invite === "string" ? params.invite : undefined;

  return <LoginForm invitationToken={invitationToken} />;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      }
    >
      <LoginPageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
