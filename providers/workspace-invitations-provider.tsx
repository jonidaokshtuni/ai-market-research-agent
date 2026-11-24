
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: string;
  createdAt: string;
  workspaceName: string;
  inviterName: string | null;
};

type WorkspaceInvitationsContextValue = {
  invitations: WorkspaceInvitation[];
  loading: boolean;
  error: string | null;
  refreshInvitations: () => Promise<void>;
};

type ApiInvitation = {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  expiresAt: string;
  createdAt: string;
  organizationName: string;
  invitedByName: string | null;
};

const WorkspaceInvitationsContext =
  createContext<WorkspaceInvitationsContextValue | null>(null);

type WorkspaceInvitationsProviderProps = {
  children: ReactNode;
};

async function fetchInvitations(): Promise<WorkspaceInvitation[]> {
  const response = await fetch("/api/organizations/invitations", {
    method: "GET",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to load invitations.");
  }

  const invitationData: ApiInvitation[] = Array.isArray(data.invitations)
    ? data.invitations
    : [];

  return invitationData.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    workspaceName: invitation.organizationName,
    inviterName: invitation.invitedByName,
  }));
}

export function WorkspaceInvitationsProvider({
  children,
}: WorkspaceInvitationsProviderProps) {
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load: state updates happen after the request completes.
  useEffect(() => {
    let active = true;

    fetchInvitations()
      .then((data) => {
        if (active) {
          setInvitations(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load workspace invitations."
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Manual refresh: called by consumers after user actions.
  const refreshInvitations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchInvitations();
      setInvitations(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load workspace invitations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <WorkspaceInvitationsContext.Provider
      value={{
        invitations,
        loading,
        error,
        refreshInvitations,
      }}
    >
      {children}
    </WorkspaceInvitationsContext.Provider>
  );
}

export function useWorkspaceInvitations() {
  const context = useContext(WorkspaceInvitationsContext);

  if (!context) {
    throw new Error(
      "useWorkspaceInvitations must be used within WorkspaceInvitationsProvider."
    );
  }

  return context;
}
