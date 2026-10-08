import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
//import { useSelector } from "react-redux";
//import type { RootState } from "../store";
import {
  getRelationship,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
} from "../services/connection.services";
import {
  getUserProfile,
  type UserProfile as UserProfileType,
} from "../services/user.services";

type RelationshipStatus =
  | "NONE"
  | "SENT"
  | "RECEIVED"
  | "ACCEPTED"
  | "SELF";

function UserProfile() {
  const { userId } = useParams<{ userId: string }>();

  const [user, setUser] = useState<UserProfileType | null>(null);
  const [relationship, setRelationship] =
    useState<RelationshipStatus>("NONE");
  const [connectionId, setConnectionId] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    if (!userId) return;

    try {
      setError("");

      const [profileResponse, relationshipResponse] =
        await Promise.all([
          getUserProfile(userId),
          getRelationship(userId),
        ]);

      if (profileResponse.success) {
        setUser(profileResponse.data.user);
      }

      if (relationshipResponse.success) {
        setRelationship(
          relationshipResponse.data.relationship.status,
        );

        setConnectionId(
          relationshipResponse.data.relationship.connectionId,
        );
      }
    } catch {
      setError("Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleConnect = async () => {
    if (!userId) return;

    try {
      setIsActionLoading(true);
      setError("");

      const response = await sendConnectionRequest(userId);

      if (response.success) {
        setRelationship("SENT");
        setConnectionId(response.data.connection._id);
      }
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Failed to send connection request.",
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!connectionId) return;

    try {
      setIsActionLoading(true);
      setError("");

      const response =
        await acceptConnectionRequest(connectionId);

      if (response.success) {
        setRelationship("ACCEPTED");
      }
    } catch {
      setError("Failed to accept connection request.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!connectionId) return;

    try {
      setIsActionLoading(true);
      setError("");

      const response =
        await rejectConnectionRequest(connectionId);

      if (response.success) {
        setRelationship("NONE");
        setConnectionId(null);
      }
    } catch {
      setError("Failed to reject connection request.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <p className="text-sm text-muted">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <h2 className="font-semibold text-text">
            Profile not found
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="h-32 bg-navy" />

          <div className="px-6 pb-6">
            <div className="-mt-12 flex items-end justify-between">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-primary text-3xl font-bold text-white">
                {user.photo ? (
                  <img
                    src={user.photo}
                    alt={`${user.name}'s profile`}
                    className="h-full w-full object-cover object-center"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex gap-2">
                {relationship === "NONE" && (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isActionLoading}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {isActionLoading
                      ? "Sending..."
                      : "Connect"}
                  </button>
                )}

                {relationship === "SENT" && (
                  <span className="rounded-lg bg-pending-bg px-5 py-2 text-sm font-semibold text-pending-text">
                    Pending
                  </span>
                )}

                {relationship === "RECEIVED" && (
                  <>
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={isActionLoading}
                      className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={isActionLoading}
                      className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-text hover:bg-background disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}

                {relationship === "ACCEPTED" && (
                  <span className="rounded-lg bg-connected-bg px-5 py-2 text-sm font-semibold text-connected-text">
                    Connected
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-bold text-text">
                {user.name}
              </h1>

              <p className="mt-1 text-muted">
                {user.headline || "ConnectSphere member"}
              </p>

              <p className="mt-3 text-sm text-muted">
                {user.email}
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* About */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            About
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted">
            {user.about || "No information added yet."}
          </p>
        </section>

        {/* Experience */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            Experience
          </h2>

          {user.experience.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No experience added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {user.experience.map((item, index) => (
                <div
                  key={`${item.company}-${index}`}
                  className="border-b border-border pb-5 last:border-0 last:pb-0"
                >
                  <h3 className="font-semibold text-text">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-sm text-muted">
                    {item.company}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {item.startDate} - {item.endDate || "Present"}
                  </p>

                  {item.description && (
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Education */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            Education
          </h2>

          {user.education.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No education added yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {user.education.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="rounded-lg bg-background px-4 py-3 text-sm text-text"
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-bold text-text">
            Skills
          </h2>

          {user.skills.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No skills added yet.
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {user.skills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-text"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default UserProfile;