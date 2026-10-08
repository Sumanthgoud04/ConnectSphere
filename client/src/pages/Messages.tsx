import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useSelector } from "react-redux";

import {
  useSearchParams,
} from "react-router-dom";

import type { RootState } from "../store";

import socket from "../socket";

import {
  getConversation,
  getConversationSummaries,
  markConversationAsRead,
  type Message,
  type MessageUser,
} from "../services/message.services";

interface ConversationSummaryMessage {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
}

interface ConversationSummary {
  user: MessageUser;
  lastMessage: ConversationSummaryMessage | null;
  unreadCount: number;
}

function Messages() {
  const currentUser = useSelector(
    (state: RootState) => state.auth.user,
  );

  const [searchParams, setSearchParams] =
    useSearchParams();

  const requestedUserId =
    searchParams.get("user");

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [conversations, setConversations] =
    useState<ConversationSummary[]>([]);

  const [selectedUser, setSelectedUser] =
    useState<MessageUser | null>(null);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [messageText, setMessageText] =
    useState("");

  const [isLoadingConversations, setIsLoadingConversations] =
    useState(true);

  const [isLoadingMessages, setIsLoadingMessages] =
    useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [error, setError] =
    useState("");

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  /*
  |--------------------------------------------------------------------------
  | Load conversation summaries
  |--------------------------------------------------------------------------
  */

  const loadConversations = async () => {
    try {
      setError("");

      const response =
        await getConversationSummaries();

      if (response.success) {
        setConversations(
          response.data.conversations,
        );
      }
    } catch {
      setError(
        "Failed to load your conversations.",
      );
    } finally {
      setIsLoadingConversations(false);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Open conversation
  |--------------------------------------------------------------------------
  */

  const handleSelectUser = async (
    user: MessageUser,
  ) => {
    try {
      setSelectedUser(user);

      setMessages([]);

      setMessageText("");

      setError("");

      setIsLoadingMessages(true);

      /*
      |--------------------------------------------------------------------------
      | Immediately clear the sidebar unread count.
      |--------------------------------------------------------------------------
      */

      setConversations((current) =>
        current.map((conversation) =>
          conversation.user._id === user._id
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation,
        ),
      );

      /*
      |--------------------------------------------------------------------------
      | Load conversation history
      |--------------------------------------------------------------------------
      */

      const response =
        await getConversation(user._id);

      if (response.success) {
        setMessages(
          response.data.messages,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Persist read state
      |--------------------------------------------------------------------------
      */

      await markConversationAsRead(
        user._id,
      );

      /*
      |--------------------------------------------------------------------------
      | Notify the other user in real time
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
  | Automatically open requested conversation
  |
  | Network page navigates to:
  |
  | /app/messages?user=<connectionId>
  |
  | Once conversations are loaded, find that connection
  | and automatically open it.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !requestedUserId ||
      isLoadingConversations ||
      selectedUser
    ) {
      return;
    }

    const requestedConversation =
      conversations.find(
        (conversation) =>
          conversation.user._id ===
          requestedUserId,
      );

    if (!requestedConversation) {
      return;
    }

    void handleSelectUser(
      requestedConversation.user,
    );

    /*
    |--------------------------------------------------------------------------
    | Remove ?user=... from the URL after selecting
    | the conversation.
    |--------------------------------------------------------------------------
    */

    setSearchParams(
      {},
      {
        replace: true,
      },
    );
  }, [
    requestedUserId,
    isLoadingConversations,
    conversations,
    selectedUser,
    setSearchParams,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Receive new messages
  |--------------------------------------------------------------------------
  |
  | AppLayout owns the Socket.IO connection.
  |
  | Messages.tsx only listens for events.
  |
  */

  useEffect(() => {
    const handleNewMessage = (
      message: Message,
    ) => {
      const senderId =
        message.senderId._id;

      const recipientId =
        message.recipientId._id;

      const isOwnMessage =
        senderId === currentUser?.id;

      const otherUserId = isOwnMessage
        ? recipientId
        : senderId;

      const isCurrentConversation =
        selectedUser?._id === otherUserId;

      /*
      |--------------------------------------------------------------------------
      | Update the conversation sidebar
      |--------------------------------------------------------------------------
      */

      setConversations((current) => {
        const existingConversation =
          current.find(
            (conversation) =>
              conversation.user._id ===
              otherUserId,
          );

        /*
        |--------------------------------------------------------------------------
        | This can happen if the connection was
        | established after the page loaded.
        |
        | Refreshing the summaries gives us the
        | correct sidebar data.
        |--------------------------------------------------------------------------
        */

        if (!existingConversation) {
          void loadConversations();

          return current;
        }

        const updatedConversation:
          ConversationSummary = {
            ...existingConversation,

            lastMessage: {
              _id: message._id,
              senderId,
              recipientId,
              content: message.content,
              readAt: message.readAt,
              createdAt: message.createdAt,
            },

            unreadCount:
              !isOwnMessage &&
              !isCurrentConversation
                ? existingConversation.unreadCount + 1
                : isCurrentConversation
                  ? 0
                  : existingConversation.unreadCount,
          };

        /*
        |--------------------------------------------------------------------------
        | Move active conversation to the top
        |--------------------------------------------------------------------------
        */

        return [
          updatedConversation,

          ...current.filter(
            (conversation) =>
              conversation.user._id !==
              otherUserId,
          ),
        ];
      });

      /*
      |--------------------------------------------------------------------------
      | Add message to currently open conversation
      |--------------------------------------------------------------------------
      */

      if (!isCurrentConversation) {
        return;
      }

      setMessages((current) => {
        const alreadyExists =
          current.some(
            (item) =>
              item._id === message._id,
          );

        if (alreadyExists) {
          return current;
        }

        return [...current, message];
      });

      /*
      |--------------------------------------------------------------------------
      | Incoming message while conversation is open
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
    };

    socket.on(
      "message:new",
      handleNewMessage,
    );

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
  | Receive read receipts
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
  | Send message
  |--------------------------------------------------------------------------
  */

  const handleSendMessage = () => {
    if (!selectedUser) {
      return;
    }

    const trimmedMessage =
      messageText.trim();

    if (
      !trimmedMessage ||
      isSending
    ) {
      return;
    }

    setIsSending(true);

    setError("");

    socket.emit(
      "message:send",
      {
        recipientId: selectedUser._id,
        content: trimmedMessage,
      },
      (response: {
        success: boolean;
        message?: Message;
        error?: string;
      }) => {
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
        | The saved message arrives through message:new.
        |--------------------------------------------------------------------------
        */

        setMessageText("");

        setIsSending(false);
      },
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Auto-scroll
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (isLoadingMessages) {
      return;
    }

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
  | Close current conversation
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
          <div className="grid h-[650px] overflow-hidden md:grid-cols-[280px_1fr]">

            {/* =========================================================
                CONVERSATION SIDEBAR
            ========================================================== */}

            <aside className="border-b border-border md:border-b-0 md:border-r">
              <div className="border-b border-border px-5 py-4">
                <h1 className="text-lg font-bold text-text">
                  Messages
                </h1>

                <p className="mt-1 text-xs text-muted">
                  Message your connections.
                </p>
              </div>

              {isLoadingConversations ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-muted">
                    Loading conversations...
                  </p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="font-semibold text-text">
                    No conversations yet
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    Connect with someone to
                    start messaging.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversations.map(
                    (conversation) => {
                      const person =
                        conversation.user;

                      const isSelected =
                        selectedUser?._id ===
                        person._id;

                      return (
                        <button
                          key={person._id}
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

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white">
                            {person.photo ? (
                              <img
                                src={
                                  person.photo
                                }
                                alt={
                                  person.name
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              person.name
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          {/* Conversation information */}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`truncate ${
                                  conversation.unreadCount >
                                  0
                                    ? "font-bold text-text"
                                    : "font-semibold text-text"
                                }`}
                              >
                                {
                                  person.name
                                }
                              </p>

                              {conversation.lastMessage && (
                                <span className="shrink-0 text-[10px] text-muted">
                                  {new Date(
                                    conversation
                                      .lastMessage
                                      .createdAt,
                                  ).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              )}
                            </div>

                            <div className="mt-0.5 flex items-center gap-2">
                              <p
                                className={`min-w-0 flex-1 truncate text-xs ${
                                  conversation.unreadCount >
                                  0
                                    ? "font-medium text-text"
                                    : "text-muted"
                                }`}
                              >
                                {conversation.lastMessage
                                  ? conversation
                                      .lastMessage
                                      .content
                                  : "Start a conversation"}
                              </p>

                              {conversation.unreadCount >
                                0 && (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                                  {conversation.unreadCount >
                                  9
                                    ? "9+"
                                    : conversation.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              )}
            </aside>

            {/* =========================================================
                CHAT AREA
            ========================================================== */}

            <section className="flex h-[650px] min-h-0 min-w-0 flex-col overflow-hidden">

              {!selectedUser ? (
                /* =====================================================
                   NO CONVERSATION SELECTED
                ====================================================== */

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
                      Choose someone from your
                      connections to start a
                      conversation.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* =================================================
                      CHAT HEADER
                  ================================================== */}

                  <div className="flex shrink-0 items-center gap-3 border-b border-border bg-white px-6 py-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-bold text-white">
                      {selectedUser.photo ? (
                        <img
                          src={
                            selectedUser.photo
                          }
                          alt={
                            selectedUser.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        selectedUser.name
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold text-text">
                        {
                          selectedUser.name
                        }
                      </h2>

                      <p className="truncate text-xs text-muted">
                        {selectedUser.headline ||
                          "ConnectSphere member"}
                      </p>
                    </div>

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

                  {/* =================================================
                      ERROR
                  ================================================== */}

                  {error && (
                    <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-danger">
                      {error}
                    </div>
                  )}

                  {/* =================================================
                      MESSAGE LIST
                  ================================================== */}

                  <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                    <div className="space-y-3">
                      {isLoadingMessages ? (
                        <div className="flex h-full items-center justify-center">
                          <p className="text-sm text-muted">
                            Loading conversation...
                          </p>
                        </div>
                      ) : messages.length ===
                        0 ? (
                        <div className="flex h-full items-center justify-center text-center">
                          <div>
                            <p className="font-semibold text-text">
                              No messages yet
                            </p>

                            <p className="mt-1 text-sm text-muted">
                              Start the
                              conversation
                              with{" "}
                              {
                                selectedUser.name
                              }
                              .
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map(
                            (message) => {
                              const isOwnMessage =
                                message.senderId
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
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                      isOwnMessage
                                        ? "rounded-br-md bg-primary text-white"
                                        : "rounded-bl-md bg-slate-100 text-text"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words">
                                      {
                                        message.content
                                      }
                                    </p>

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

                          <div
                            ref={
                              messagesEndRef
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* =================================================
                      MESSAGE INPUT
                  ================================================== */}

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
                      Enter to send · Shift +
                      Enter for a new line
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