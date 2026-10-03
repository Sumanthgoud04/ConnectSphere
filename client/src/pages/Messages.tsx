import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useSelector } from "react-redux";

import type { RootState } from "../store";

import socket from "../socket";

import { getConnections } from "../services/connection.services";

import {
  getConversation,
  markConversationAsRead,
  type Message,
  type MessageUser,
} from "../services/message.services";

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

interface Connection {
  _id: string;
  requesterId: MessageUser;
  recipientId: MessageUser;
  status: string;
}

/*
|--------------------------------------------------------------------------
| Messages Page
|--------------------------------------------------------------------------
|
| Responsibilities:
|
| 1. Display accepted connections
| 2. Load conversation history using REST
| 3. Send new messages using Socket.IO
| 4. Receive new messages using Socket.IO
| 5. Show unread message counts
| 6. Handle Seen/read receipts
| 7. Keep the chat header and input fixed
| 8. Allow only the message list to scroll
|
|--------------------------------------------------------------------------
*/

function Messages() {
  /*
  |--------------------------------------------------------------------------
  | Current authenticated user
  |--------------------------------------------------------------------------
  */

  const currentUser = useSelector(
    (state: RootState) => state.auth.user,
  );

  /*
  |--------------------------------------------------------------------------
  | Component state
  |--------------------------------------------------------------------------
  */

  // Accepted connections displayed in the sidebar.
  const [connections, setConnections] = useState<
    Connection[]
  >([]);

  // Currently opened conversation.
  const [selectedUser, setSelectedUser] =
    useState<MessageUser | null>(null);

  // Messages for the currently selected conversation.
  const [messages, setMessages] = useState<Message[]>([]);

  // Text currently typed into the message box.
  const [messageText, setMessageText] = useState("");

  // Loading state for connections.
  const [isLoadingConnections, setIsLoadingConnections] =
    useState(true);

  // Loading state for conversation history.
  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);

  // Prevent multiple messages being sent at the same time.
  const [isSending, setIsSending] = useState(false);

  // Page-level error message.
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Unread message counts
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | {
  |   "user123": 2,
  |   "user456": 5
  | }
  |
  | This allows the sidebar to display:
  |
  | John Doe    2
  |
  |--------------------------------------------------------------------------
  */

  const [unreadCounts, setUnreadCounts] = useState<
    Record<string, number>
  >({});

  /*
  |--------------------------------------------------------------------------
  | Reference used for automatic scrolling
  |--------------------------------------------------------------------------
  |
  | This element is placed immediately after the last message.
  |
  | When we scroll this element into view, the conversation
  | automatically moves to the newest message.
  |
  |--------------------------------------------------------------------------
  */

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  /*
  |--------------------------------------------------------------------------
  | Find the other person in a connection
  |--------------------------------------------------------------------------
  |
  | A connection contains:
  |
  | requesterId
  | recipientId
  |
  | Depending on who is logged in, we need to return the
  | OTHER person.
  |
  |--------------------------------------------------------------------------
  */

  const getPersonFromConnection = (
    connection: Connection,
  ): MessageUser => {
    if (
      connection.requesterId._id ===
      currentUser?.id
    ) {
      return connection.recipientId;
    }

    return connection.requesterId;
  };

  /*
  |--------------------------------------------------------------------------
  | Load accepted connections
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadConnections = async () => {
      try {
        setError("");

        const response = await getConnections();

        if (response.success) {
          setConnections(
            response.data.connections,
          );
        }
      } catch {
        setError(
          "Failed to load your connections.",
        );
      } finally {
        setIsLoadingConnections(false);
      }
    };

    loadConnections();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Connect to Socket.IO
  |--------------------------------------------------------------------------
  |
  | The socket remains connected while the Messages page is open.
  |
  | Closing an individual chat does NOT disconnect the socket.
  |
  | This is important because the user can close a conversation
  | and still receive unread-message notifications.
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    socket.connect();

    const handleConnect = () => {
      console.log(
        "Socket connected:",
        socket.id,
      );
    };

    const handleConnectError = (
      socketError: Error,
    ) => {
      console.error(
        "Socket connection error:",
        socketError.message,
      );
    };

    socket.on(
      "connect",
      handleConnect,
    );

    socket.on(
      "connect_error",
      handleConnectError,
    );

    /*
    |--------------------------------------------------------------------------
    | Cleanup
    |--------------------------------------------------------------------------
    |
    | The socket is disconnected only when the Messages page
    | itself is unmounted.
    |
    |--------------------------------------------------------------------------
    */

    return () => {
      socket.off(
        "connect",
        handleConnect,
      );

      socket.off(
        "connect_error",
        handleConnectError,
      );

      socket.disconnect();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Receive new messages
  |--------------------------------------------------------------------------
  |
  | Socket event:
  |
  | "message:new"
  |
  | The backend emits this event to both:
  |
  | 1. Sender
  | 2. Receiver
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleNewMessage = (
      message: Message,
    ) => {
      const senderId =
        message.senderId._id;

      const recipientId =
        message.recipientId._id;

      /*
      |--------------------------------------------------------------------------
      | Determine whether this message belongs to the
      | currently logged-in user.
      |--------------------------------------------------------------------------
      */

      const isOwnMessage =
        senderId === currentUser?.id;

      /*
      |--------------------------------------------------------------------------
      | Find the other participant in the conversation.
      |--------------------------------------------------------------------------
      */

      const otherUserId = isOwnMessage
        ? recipientId
        : senderId;

      /*
      |--------------------------------------------------------------------------
      | If this conversation is currently open,
      | add the message immediately.
      |--------------------------------------------------------------------------
      */

      if (
        selectedUser?._id ===
        otherUserId
      ) {
        setMessages((current) => {
          /*
          |--------------------------------------------------------------------------
          | Prevent duplicate messages.
          |--------------------------------------------------------------------------
          |
          | The server sends the message to both sender and receiver.
          | This check ensures that the same message isn't inserted twice.
          |
          |--------------------------------------------------------------------------
          */

          const alreadyExists =
            current.some(
              (item) =>
                item._id ===
                message._id,
            );

          if (alreadyExists) {
            return current;
          }

          return [
            ...current,
            message,
          ];
        });

        /*
        |--------------------------------------------------------------------------
        | If this is an incoming message and the conversation
        | is already open, immediately mark it as read.
        |--------------------------------------------------------------------------
        */

        if (!isOwnMessage) {
          socket.emit(
            "conversation:read",
            {
              otherUserId: senderId,
            },
          );
        }

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Conversation is NOT open.
      |--------------------------------------------------------------------------
      |
      | Only incoming messages increase the unread count.
      |
      |--------------------------------------------------------------------------
      */

      if (!isOwnMessage) {
        setUnreadCounts(
          (current) => ({
            ...current,
            [senderId]:
              (current[senderId] ?? 0) +
              1,
          }),
        );
      }
    };

    socket.on(
      "message:new",
      handleNewMessage,
    );

    /*
    |--------------------------------------------------------------------------
    | Cleanup event listener
    |--------------------------------------------------------------------------
    */

    return () => {
      socket.off(
        "message:new",
        handleNewMessage,
      );
    };
  }, [
    currentUser?.id,
    selectedUser?._id,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Receive Seen/read updates
  |--------------------------------------------------------------------------
  |
  | The other user opens the conversation.
  |
  | Backend emits:
  |
  | "conversation:read"
  |
  | We update the sender's messages with readAt.
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleConversationRead = (
      data: {
        readerId: string;
        readAt: string;
      },
    ) => {
      setMessages((current) =>
        current.map((message) => {
          const isOwnMessage =
            message.senderId._id ===
            currentUser?.id;

          const wasReadByRecipient =
            message.recipientId._id ===
            data.readerId;

          /*
          |--------------------------------------------------------------------------
          | Only update messages sent by us and read by the
          | user who opened the conversation.
          |--------------------------------------------------------------------------
          */

          if (
            isOwnMessage &&
            wasReadByRecipient
          ) {
            return {
              ...message,
              readAt: data.readAt,
            };
          }

          return message;
        }),
      );
    };

    socket.on(
      "conversation:read",
      handleConversationRead,
    );

    return () => {
      socket.off(
        "conversation:read",
        handleConversationRead,
      );
    };
  }, [currentUser?.id]);

  /*
  |--------------------------------------------------------------------------
  | Open a conversation
  |--------------------------------------------------------------------------
  |
  | Conversation history is loaded through REST.
  |
  | Real-time messages are handled through Socket.IO.
  |
  |--------------------------------------------------------------------------
  */

  const handleSelectUser = async (
    user: MessageUser,
  ) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | Select the conversation
      |--------------------------------------------------------------------------
      */

      setSelectedUser(user);

      /*
      |--------------------------------------------------------------------------
      | Clear unread badge for this person
      |--------------------------------------------------------------------------
      */

      setUnreadCounts((current) => {
        const updated = {
          ...current,
        };

        delete updated[user._id];

        return updated;
      });

      /*
      |--------------------------------------------------------------------------
      | Clear previous conversation while loading
      |--------------------------------------------------------------------------
      */

      setMessages([]);

      setMessageText("");

      setError("");

      setIsLoadingMessages(true);

      /*
      |--------------------------------------------------------------------------
      | Load conversation history
      |--------------------------------------------------------------------------
      */

      const response =
        await getConversation(
          user._id,
        );

      if (response.success) {
        setMessages(
          response.data.messages,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Mark incoming messages as read
      |--------------------------------------------------------------------------
      */

      await markConversationAsRead(
        user._id,
      );

      /*
      |--------------------------------------------------------------------------
      | Tell the other user in real time that
      | their messages have been seen.
      |--------------------------------------------------------------------------
      */

      socket.emit(
        "conversation:read",
        {
          otherUserId: user._id,
        },
      );
    } catch {
      setError(
        "Failed to load this conversation.",
      );
    } finally {
      setIsLoadingMessages(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Send a message
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | We no longer use the REST POST /messages endpoint
  | from the frontend.
  |
  | Message sending now happens through Socket.IO.
  |
  |--------------------------------------------------------------------------
  */

  const handleSendMessage = () => {
    if (!selectedUser) {
      return;
    }

    const trimmedMessage =
      messageText.trim();

    /*
    |--------------------------------------------------------------------------
    | Do not send empty messages.
    |--------------------------------------------------------------------------
    */

    if (
      !trimmedMessage ||
      isSending
    ) {
      return;
    }

    setIsSending(true);

    setError("");

    /*
    |--------------------------------------------------------------------------
    | Send through Socket.IO
    |--------------------------------------------------------------------------
    */

    socket.emit(
      "message:send",
      {
        recipientId:
          selectedUser._id,

        content:
          trimmedMessage,
      },
      (
        response: {
          success: boolean;
          message?: Message;
          error?: string;
        },
      ) => {
        /*
        |--------------------------------------------------------------------------
        | Backend rejected the message
        |--------------------------------------------------------------------------
        */

        if (!response.success) {
          setError(
            response.error ||
              "Failed to send message.",
          );

          setIsSending(false);

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Message was successfully saved.
        |
        | The actual saved message will arrive through
        | the "message:new" socket event.
        |--------------------------------------------------------------------------
        */

        setMessageText("");

        setIsSending(false);
      },
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Automatically scroll to newest message
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | Only the message list scrolls.
  |
  | The header and input remain fixed.
  |
  | "behavior: auto" is used when opening a conversation so
  | the user immediately lands on the newest message.
  |
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    /*
    |--------------------------------------------------------------------------
    | Do not scroll while conversation is loading.
    |--------------------------------------------------------------------------
    */

    if (isLoadingMessages) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Small delay allows React to finish rendering the messages
    | before we calculate the scroll position.
    |--------------------------------------------------------------------------
    */

    const timer =
      window.setTimeout(() => {
        messagesEndRef.current?.scrollIntoView(
          {
            behavior: "auto",
          },
        );
      }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    messages,
    isLoadingMessages,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Close conversation
  |--------------------------------------------------------------------------
  |
  | IMPORTANT:
  |
  | This does NOT disconnect Socket.IO.
  |
  | The user simply closes the current conversation.
  |
  | They can still receive unread messages.
  |
  |--------------------------------------------------------------------------
  */

  const handleCloseChat = () => {
    setSelectedUser(null);

    setMessages([]);

    setMessageText("");

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Keyboard handling
  |--------------------------------------------------------------------------
  |
  | Enter:
  |   Send message
  |
  | Shift + Enter:
  |   New line
  |
  |--------------------------------------------------------------------------
  */

  const handleMessageKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSendMessage();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl">

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">

          {/*
          |--------------------------------------------------------------------------
          | Main messaging layout
          |--------------------------------------------------------------------------
          */}

          <div className="grid h-[650px] overflow-hidden md:grid-cols-[280px_1fr]">

            {/* ==========================================================
                CONNECTION SIDEBAR
            =========================================================== */}

            <aside className="border-b border-border md:border-b-0 md:border-r">

              {/* Sidebar Header */}

              <div className="border-b border-border px-5 py-4">

                <h1 className="text-lg font-bold text-text">
                  Messages
                </h1>

                <p className="mt-1 text-xs text-muted">
                  Message your connections.
                </p>

              </div>

              {/* Loading */}

              {isLoadingConnections ? (
                <div className="px-5 py-6 text-center">

                  <p className="text-sm text-muted">
                    Loading connections...
                  </p>

                </div>
              ) : connections.length === 0 ? (

                /* Empty state */

                <div className="px-5 py-8 text-center">

                  <p className="font-semibold text-text">
                    No connections yet
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    Connect with someone to start messaging.
                  </p>

                </div>
              ) : (

                /* Connections */

                <div className="divide-y divide-border">

                  {connections.map(
                    (connection) => {
                      const person =
                        getPersonFromConnection(
                          connection,
                        );

                      const isSelected =
                        selectedUser?._id ===
                        person._id;

                      return (
                        <button
                          key={
                            connection._id
                          }
                          type="button"
                          onClick={() =>
                            handleSelectUser(
                              person,
                            )
                          }
                          className={`flex w-full items-center gap-3 px-5 py-4 text-left transition ${
                            isSelected
                              ? "bg-blue-50"
                              : "hover:bg-background"
                          }`}
                        >

                          {/* Avatar */}

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
                            {person.name
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          {/* Person information */}

                          <div className="min-w-0 flex-1">

                            <p className="truncate font-semibold text-text">
                              {person.name}
                            </p>

                            <p className="truncate text-xs text-muted">
                              {person.headline ||
                                "ConnectSphere member"}
                            </p>

                          </div>

                          {/* Unread badge */}

                          {unreadCounts[
                            person._id
                          ] > 0 && (
                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                              {unreadCounts[
                                person._id
                              ] > 9
                                ? "9+"
                                : unreadCounts[
                                    person._id
                                  ]}
                            </span>
                          )}

                        </button>
                      );
                    },
                  )}

                </div>
              )}

            </aside>

            {/* ==========================================================
                CHAT AREA
            =========================================================== */}

            <section className="flex h-[650px] min-w-0 min-h-0 flex-col overflow-hidden">

              {/* ========================================================
                  NO CHAT SELECTED
              ========================================================= */}

              {!selectedUser ? (

                <div className="flex flex-1 items-center justify-center px-6 text-center">

                  <div>

                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-primary">

                      <svg
                        className="h-8 w-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h8M8 14h5m-8 6l-3 1 1-3a8 8 0 1114.5-4.5A8 8 0 0111 20H8z"
                        />
                      </svg>

                    </div>

                    <h2 className="mt-4 text-lg font-bold text-text">
                      Select a connection
                    </h2>

                    <p className="mt-1 text-sm text-muted">
                      Choose someone from your connections
                      to start a conversation.
                    </p>

                  </div>

                </div>

              ) : (

                <>
                  {/* ====================================================
                      CHAT HEADER
                      Fixed while messages scroll
                  ===================================================== */}

                  <div className="flex shrink-0 items-center gap-3 border-b border-border bg-white px-6 py-4">

                    {/* Avatar */}

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
                      {selectedUser.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* User information */}

                    <div className="min-w-0 flex-1">

                      <h2 className="truncate font-bold text-text">
                        {selectedUser.name}
                      </h2>

                      <p className="truncate text-xs text-muted">
                        {selectedUser.headline ||
                          "ConnectSphere member"}
                      </p>

                    </div>

                    {/* ==================================================
                        CLOSE CHAT BUTTON
                    =================================================== */}

                    <button
                      type="button"
                      onClick={
                        handleCloseChat
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-white text-text transition hover:bg-background"
                      aria-label="Close conversation"
                      title="Close conversation"
                    >

                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>

                    </button>

                  </div>

                  {/* ====================================================
                      ERROR MESSAGE
                  ===================================================== */}

                  {error && (
                    <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-danger">
                      {error}
                    </div>
                  )}

                  {/* ====================================================
                      MESSAGE LIST
                      
                      IMPORTANT:
                      This is the ONLY scrollable section.
                      
                      Header stays visible.
                      Input stays visible.
                  ===================================================== */}

                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                      <div className="space-y-3">
                    {isLoadingMessages ? (

                      /* Loading */

                      <div className="flex h-full items-center justify-center">

                        <p className="text-sm text-muted">
                          Loading conversation...
                        </p>

                      </div>

                    ) : messages.length === 0 ? (

                      /* Empty conversation */

                      <div className="flex h-full items-center justify-center text-center">

                        <div>

                          <p className="font-semibold text-text">
                            No messages yet
                          </p>

                          <p className="mt-1 text-sm text-muted">
                            Start the conversation with{" "}
                            {selectedUser.name}.
                          </p>

                        </div>

                      </div>

                    ) : (

                      <>
                        {messages.map(
                          (message) => {

                            const isOwnMessage =
                              message
                                .senderId
                                ._id ===
                              currentUser?.id;

                            return (
                              <div
                                key={
                                  message._id
                                }
                                className={`flex ${
                                  isOwnMessage
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >

                                {/* Message bubble */}

                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                    isOwnMessage
                                      ? "rounded-br-md bg-primary text-white"
                                      : "rounded-bl-md bg-slate-100 text-text"
                                  }`}
                                >

                                  {/* Message content */}

                                  <p className="whitespace-pre-wrap break-words">
                                    {
                                      message.content
                                    }
                                  </p>

                                  {/* Timestamp + Seen */}

                                  <p
                                    className={`mt-1 text-[10px] ${
                                      isOwnMessage
                                        ? "text-blue-100"
                                        : "text-muted"
                                    }`}
                                  >

                                    {new Date(
                                      message.createdAt,
                                    ).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}

                                    {/* Seen indicator */}

                                    {isOwnMessage &&
                                      message.readAt && (
                                        <span className="ml-2 font-medium">
                                          Seen
                                        </span>
                                      )}

                                  </p>

                                </div>

                              </div>
                            );
                          },
                        )}

                        {/* ==================================================
                            Scroll anchor
                            
                            The chat automatically scrolls to this element.
                        =================================================== */}

                        <div
                          ref={
                            messagesEndRef
                          }
                        />

                      </>
                    )}

                  </div>

                  </div>

                  {/* ====================================================
                      MESSAGE INPUT
                      
                      This remains visible while the message list scrolls.
                  ===================================================== */}

                  <div className="shrink-0 border-t border-border bg-white p-4">

                    <div className="flex items-end gap-3">

                      <textarea
                        value={messageText}
                        onChange={(event) =>
                          setMessageText(
                            event.target.value,
                          )
                        }
                        onKeyDown={
                          handleMessageKeyDown
                        }
                        rows={2}
                        maxLength={2000}
                        placeholder="Write a message..."
                        className="min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />

                      <button
                        type="button"
                        onClick={
                          handleSendMessage
                        }
                        disabled={
                          isSending ||
                          !messageText.trim()
                        }
                        className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending
                          ? "Sending..."
                          : "Send"}
                      </button>

                    </div>

                    <p className="mt-1 text-right text-xs text-muted">
                      Enter to send · Shift + Enter for a new line
                    </p>

                  </div>

                </>
              )}

            </section>

          </div>

        </div>

      </div>
    </div>
  );
}

export default Messages;