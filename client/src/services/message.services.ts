import api from "../api/axios";

export interface MessageUser {
  _id: string;
  name: string;
  photo?: string;
  headline?: string;
}

export interface Message {
  _id: string;
  senderId: MessageUser;
  recipientId: MessageUser;
  content: string;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const sendMessage = async (
  recipientId: string,
  content: string,
) => {
  const response = await api.post("/messages", {
    recipientId,
    content,
  });

  return response.data;
};

export const getConversation = async (
  userId: string,
) => {
  const response = await api.get(`/messages/${userId}`);

  return response.data;
};

export const markConversationAsRead = async (
  userId: string,
) => {
  const response = await api.patch(
    `/messages/${userId}/read`,
  );

  return response.data;
};