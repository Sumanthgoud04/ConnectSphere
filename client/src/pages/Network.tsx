import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../store";

import {
  acceptConnectionRequest,
  getConnections,
  getReceivedRequests,
  getSentRequests,
  rejectConnectionRequest,
} from "../services/connection.services";

interface Person {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

interface ReceivedRequest {
  _id: string;
  requesterId: Person;
  status: string;
}

interface SentRequest {
  _id: string;
  recipientId: Person;
  status: string;
}

interface Connection {
  _id: string;
  requesterId: Person;
  recipientId: Person;
  status: string;
}

function Network() {
  const navigate = useNavigate();

  const currentUser = useSelector(
    (state: RootState) => state.auth.user,
  );

  const [connections, setConnections] = useState<Connection[]>([]);
  const [received, setReceived] = useState<ReceivedRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNetwork = async () => {
    try {
      setError("");

      const [
        connectionsResponse,
        receivedResponse,
        sentResponse,
      ] = await Promise.all([
        getConnections(),
        getReceivedRequests(),
        getSentRequests(),
      ]);

      if (connectionsResponse.success) {
        setConnections(connectionsResponse.data.connections);
      }

      if (receivedResponse.success) {
        setReceived(receivedResponse.data.requests);
      }

      if (sentResponse.success) {
        setSent(sentResponse.data.requests);
      }
    } catch {
      setError("Failed to load your network.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNetwork();
  }, []);

  const handleAccept = async (connectionId: string) => {
    try {
      await acceptConnectionRequest(connectionId);

      setReceived((current) =>
        current.filter((request) => request._id !== connectionId),
      );

      await loadNetwork();
    } catch {
      setError("Failed to accept connection request.");
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      await rejectConnectionRequest(connectionId);

      setReceived((current) =>
        current.filter((request) => request._id !== connectionId),
      );
    } catch {
      setError("Failed to reject connection request.");
    }
  };

  /*
   * For an accepted connection, the backend returns both:
   * - requesterId
   * - recipientId
   *
   * We only want to display the OTHER person.
   *
   * Example:
   * Logged in as User 1:
   *   requesterId = User 1
   *   recipientId = User 2
   *   -> show User 2
   *
   * Logged in as User 2:
   *   requesterId = User 1
   *   recipientId = User 2
   *   -> show User 1
   */
  const getPersonFromConnection = (
    connection: Connection,
  ): Person => {
    if (connection.requesterId._id === currentUser?.id) {
      return connection.recipientId;
    }

    return connection.requesterId;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-sm text-muted">
            Loading your network...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text">
            Network
          </h1>

          <p className="mt-1 text-sm text-muted">
            Manage your connections and connection requests.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Connection Requests */}
        <section className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-bold text-text">
              Connection Requests
            </h2>

            <p className="mt-1 text-sm text-muted">
              People who want to connect with you.
            </p>
          </div>

          {received.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted">
                No pending connection requests.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {received.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between gap-4 px-6 py-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-white">
                      {request.requesterId.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3 className="font-semibold text-text">
                        {request.requesterId.name}
                      </h3>

                      <p className="text-sm text-muted">
                        {request.requesterId.headline ||
                          "ConnectSphere member"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAccept(request._id)
                      }
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleReject(request._id)
                      }
                      className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-background"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sent Requests */}
        <section className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-bold text-text">
              Sent Requests
            </h2>

            <p className="mt-1 text-sm text-muted">
              Connection requests you've sent.
            </p>
          </div>

          {sent.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted">
                No pending sent requests.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sent.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between px-6 py-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-bold text-white">
                      {request.recipientId.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3 className="font-semibold text-text">
                        {request.recipientId.name}
                      </h3>

                      <p className="text-sm text-muted">
                        {request.recipientId.headline ||
                          "ConnectSphere member"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-pending-bg px-3 py-1 text-xs font-semibold text-pending-text">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Connections */}
        <section className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-bold text-text">
              My Connections
            </h2>

            <p className="mt-1 text-sm text-muted">
              People you're connected with.
            </p>
          </div>

          {connections.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-semibold text-text">
                No connections yet
              </p>

              <p className="mt-1 text-sm text-muted">
                Start connecting with people in your network.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {connections.map((connection) => {
                const person =
                  getPersonFromConnection(connection);

                return (
                  <div
                    key={connection._id}
                    onClick={() =>
                      navigate(`/app/profile/${person._id}`)
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 transition hover:bg-background"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
                      {person.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div>
                      <h3 className="font-semibold text-text">
                        {person.name}
                      </h3>

                      <p className="text-sm text-muted">
                        {person.headline ||
                          "ConnectSphere member"}
                      </p>

                      <span className="mt-1 inline-block rounded-full bg-connected-bg px-2 py-1 text-xs font-semibold text-connected-text">
                        Connected
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Network;