import api from "../api/axios";

export const sendConnectionRequest = async (recipientId: string) =>
  (await api.post("/connections", { recipientId })).data;

export const getConnections = async () =>
  (await api.get("/connections")).data;

export const getReceivedRequests = async () =>
  (await api.get("/connections/received")).data;

export const getSentRequests = async () =>
  (await api.get("/connections/sent")).data;

export const acceptConnectionRequest = async (connectionId: string) =>
  (await api.post(`/connections/${connectionId}/accept`)).data;

export const rejectConnectionRequest = async (connectionId: string) =>
  (await api.post(`/connections/${connectionId}/reject`)).data;

export const getRelationship = async (userId: string) =>
  (await api.get(`/connections/relationship/${userId}`)).data;

export const getConnectionCount = async () =>
  (await api.get("/connections/count")).data;

export const removeConnection = async (
  connectionId: string,
) => {
  const response = await api.delete(
    `/connections/${connectionId}`,
  );

  return response.data;
};