import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import type { RootState } from "../store";

import {
  acceptConnectionRequest,
  getConnections,
  getReceivedRequests,
  getSentRequests,
  rejectConnectionRequest,
  removeConnection,
} from "../services/connection.services";

interface Person {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

interface ReceivedRequest {
  _id: string;
  requesterId: Person | null;
  status: string;
}

interface SentRequest {
  _id: string;
  recipientId: Person | null;
  status: string;
}

interface Connection {
  _id: string;
  requesterId: Person | null;
  recipientId: Person | null;
  status: string;
  connectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

type ConnectionSort = "recent" | "name";

function Network() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useSelector(
    (state: RootState) => state.auth.user,
  );

  const [connections, setConnections] = useState<Connection[]>([]);
  const [received, setReceived] = useState<ReceivedRequest[]>([]);
  const [sent, setSent] = useState<SentRequest[]>([]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] =
    useState<ConnectionSort>("recent");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [openMenuId, setOpenMenuId] = useState<string | null>(
    null,
  );

  const [removingId, setRemovingId] = useState<string | null>(
    null,
  );

  const loadNetwork = async () => {
    try {
      setIsLoading(true);
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
        const validConnections =
          connectionsResponse.data.connections.filter(
            (connection: Connection) =>
              connection.requesterId &&
              connection.recipientId,
          );

        setConnections(validConnections);
      }

      if (receivedResponse.success) {
        const validReceivedRequests =
          receivedResponse.data.requests.filter(
            (request: ReceivedRequest) =>
              request.requesterId,
          );

        setReceived(validReceivedRequests);
      }

      if (sentResponse.success) {
        const validSentRequests =
          sentResponse.data.requests.filter(
            (request: SentRequest) =>
              request.recipientId,
          );

        setSent(validSentRequests);
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

  const getPersonFromConnection = (
    connection: Connection,
  ): Person | null => {
    if (
      !connection.requesterId ||
      !connection.recipientId
    ) {
      return null;
    }

    if (connection.requesterId._id === currentUser?.id) {
      return connection.recipientId;
    }

    return connection.requesterId;
  };

  const filteredConnections = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = connections.filter((connection) => {
      const person = getPersonFromConnection(connection);

      if (!person) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        person.name
          .toLowerCase()
          .includes(normalizedSearch) ||
        person.headline
          ?.toLowerCase()
          .includes(normalizedSearch)
      );
    });

    return [...filtered].sort((a, b) => {
      const personA = getPersonFromConnection(a);
      const personB = getPersonFromConnection(b);

      if (!personA || !personB) {
        return 0;
      }

      if (sortBy === "name") {
        return personA.name.localeCompare(personB.name);
      }

      const dateA = new Date(
        a.connectedAt ?? a.updatedAt,
      ).getTime();

      const dateB = new Date(
        b.connectedAt ?? b.updatedAt,
      ).getTime();

      return dateB - dateA;
    });
  }, [connections, search, sortBy, currentUser?.id]);

  const scrollToConnections = () => {
    document
      .getElementById("your-connections")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");

    if (section === "connections" && !isLoading) {
      setTimeout(() => {
        scrollToConnections();
      }, 100);
    }
  }, [location.search, isLoading]);

  const handleAccept = async (connectionId: string) => {
    try {
      setError("");

      await acceptConnectionRequest(connectionId);

      await loadNetwork();
    } catch {
      setError("Failed to accept connection request.");
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      setError("");

      await rejectConnectionRequest(connectionId);

      setReceived((current) =>
        current.filter(
          (request) => request._id !== connectionId,
        ),
      );
    } catch {
      setError("Failed to reject connection request.");
    }
  };

  const handleRemoveConnection = async (
    connectionId: string,
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this connection?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setRemovingId(connectionId);
      setOpenMenuId(null);

      await removeConnection(connectionId);

      setConnections((current) =>
        current.filter(
          (connection) => connection._id !== connectionId,
        ),
      );
    } catch {
      setError("Failed to remove connection.");
    } finally {
      setRemovingId(null);
    }
  };

  const formatConnectedDate = (
    connection: Connection,
  ) => {
    const date = connection.connectedAt
      ? new Date(connection.connectedAt)
      : new Date(connection.updatedAt);

    return date.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
            <p className="text-sm text-muted">
              Loading your network...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text">
            Network
          </h1>

          <p className="mt-1 text-sm text-muted">
            Manage your professional network and
            connections.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Network overview */}
        <section className="grid gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("pending-invitations")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
            className="rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">
              Pending invitations
            </p>

            <p className="mt-2 text-3xl font-bold text-text">
              {received.length}
            </p>

            <p className="mt-1 text-xs text-muted">
              Requests waiting for your response
            </p>
          </button>

          <button
            type="button"
            onClick={scrollToConnections}
            className="rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">
              Connections
            </p>

            <p className="mt-2 text-3xl font-bold text-text">
              {connections.length}
            </p>

            <p className="mt-1 text-xs text-muted">
              People you're connected with
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              document
                .getElementById("sent-requests")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
            className="rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-sm font-medium text-muted">
              Sent requests
            </p>

            <p className="mt-2 text-3xl font-bold text-text">
              {sent.length}
            </p>

            <p className="mt-1 text-xs text-muted">
              Requests waiting for a response
            </p>
          </button>
        </section>

        {/* Pending invitations */}
        <section
          id="pending-invitations"
          className="scroll-mt-24 rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text">
                  Invitations
                </h2>

                <p className="mt-1 text-sm text-muted">
                  People who want to connect with you.
                </p>
              </div>

              {received.length > 0 && (
                <span className="rounded-full bg-pending-bg px-3 py-1 text-xs font-semibold text-pending-text">
                  {received.length} pending
                </span>
              )}
            </div>
          </div>

          {received.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background text-xl">
                ✓
              </div>

              <p className="mt-3 font-semibold text-text">
                No pending invitations
              </p>

              <p className="mt-1 text-sm text-muted">
                New connection requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {received.map((request) => {
                if (!request.requesterId) {
                  return null;
                }

                return (
                  <div
                    key={request._id}
                    className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/app/profile/${request.requesterId?._id}`,
                        )
                      }
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white">
                        {request.requesterId.photo ? (
                          <img
                            src={request.requesterId.photo}
                            alt={request.requesterId.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          request.requesterId.name
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-text">
                          {request.requesterId.name}
                        </h3>

                        <p className="truncate text-sm text-muted">
                          {request.requesterId.headline ||
                            "ConnectSphere member"}
                        </p>
                      </div>
                    </button>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleAccept(request._id)
                        }
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        Accept
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleReject(request._id)
                        }
                        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-background"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sent requests */}
        <section
          id="sent-requests"
          className="scroll-mt-24 rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div className="border-b border-border px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-text">
                Sent Requests
              </h2>

              <p className="mt-1 text-sm text-muted">
                Connection requests you've sent.
              </p>
            </div>
          </div>

          {sent.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="font-semibold text-text">
                No pending sent requests
              </p>

              <p className="mt-1 text-sm text-muted">
                Connection requests you send will appear
                here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sent.map((request) => {
                if (!request.recipientId) {
                  return null;
                }

                return (
                  <div
                    key={request._id}
                    className="flex items-center justify-between gap-4 px-6 py-5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/app/profile/${request.recipientId?._id}`,
                        )
                      }
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white">
                        {request.recipientId.photo ? (
                          <img
                            src={request.recipientId.photo}
                            alt={request.recipientId.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          request.recipientId.name
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-text">
                          {request.recipientId.name}
                        </h3>

                        <p className="truncate text-sm text-muted">
                          {request.recipientId.headline ||
                            "ConnectSphere member"}
                        </p>
                      </div>
                    </button>

                    <span className="shrink-0 rounded-full bg-pending-bg px-3 py-1 text-xs font-semibold text-pending-text">
                      Pending
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Connections */}
        <section
          id="your-connections"
          className="scroll-mt-24 rounded-2xl border border-border bg-surface shadow-sm"
        >
          <div className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-text">
                  Your Connections
                </h2>

                <p className="mt-1 text-sm text-muted">
                  {connections.length}{" "}
                  {connections.length === 1
                    ? "person"
                    : "people"}{" "}
                  in your professional network.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    🔍
                  </span>

                  <input
                    type="text"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search connections"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-blue-100 sm:w-64"
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value as ConnectionSort,
                    )
                  }
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-blue-100"
                >
                  <option value="recent">
                    Recently added
                  </option>

                  <option value="name">
                    Name A–Z
                  </option>
                </select>
              </div>
            </div>
          </div>

          {connections.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-background text-2xl">
                👥
              </div>

              <h3 className="mt-4 font-semibold text-text">
                No connections yet
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                Start connecting with people in
                ConnectSphere to build your professional
                network.
              </p>
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-semibold text-text">
                No connections found
              </p>

              <p className="mt-1 text-sm text-muted">
                Try searching with a different name or
                headline.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConnections.map((connection) => {
                const person =
                  getPersonFromConnection(connection);

                if (!person) {
                  return null;
                }

                const isRemoving =
                  removingId === connection._id;

                return (
                  <div
                    key={connection._id}
                    className="relative flex flex-col gap-4 px-6 py-5 transition hover:bg-background sm:flex-row sm:items-center sm:justify-between"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/app/profile/${person._id}`,
                        )
                      }
                      className="flex min-w-0 items-center gap-4 text-left"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-lg text-white">
                        {person.photo ? (
                          <img
                            src={person.photo}
                            alt={person.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          person.name
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-text">
                          {person.name}
                        </h3>

                        <p className="truncate text-sm text-muted">
                          {person.headline ||
                            "ConnectSphere member"}
                        </p>

                        <p className="mt-1 text-xs text-muted">
                          Connected on{" "}
                          {formatConnectedDate(
                            connection,
                          )}
                        </p>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/app/messages?user=${person._id}`,
                          )
                        }
                        className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-blue-50"
                      >
                        Message
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          aria-label={`More options for ${person.name}`}
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === connection._id
                                ? null
                                : connection._id,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-muted transition hover:bg-background hover:text-text"
                        >
                          ⋯
                        </button>

                        {openMenuId === connection._id && (
                          <div className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/app/profile/${person._id}`,
                                )
                              }
                              className="w-full px-4 py-2.5 text-left text-sm text-text transition hover:bg-background"
                            >
                              View profile
                            </button>

                            <button
                              type="button"
                              disabled={isRemoving}
                              onClick={() =>
                                handleRemoveConnection(
                                  connection._id,
                                )
                              }
                              className="w-full px-4 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isRemoving
                                ? "Removing..."
                                : "Remove connection"}
                            </button>
                          </div>
                        )}
                      </div>
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