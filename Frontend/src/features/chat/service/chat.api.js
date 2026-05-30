import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 90000,
});

/**
 * Send a message, with an optional file attachment for RAG.
 * When a file is provided, uses multipart/form-data; otherwise JSON.
 */
export const sendMessage = async ({ message, chatId, model, files, signal, exchangeId }) => {
  if (files && files.length > 0) {
    const formData = new FormData();
    formData.append("message", message);
    if (chatId) formData.append("chatId", chatId);
    if (model) formData.append("model", model);
    if (exchangeId) formData.append("exchangeId", exchangeId);
    files.forEach((file) => formData.append("files", file));

    const response = await api.post("/api/chats/message", formData, {
      signal,
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await api.post("/api/chats/message", { message, chatId, model, exchangeId }, { signal });
  return response.data;
};

export const cleanupExchange = async ({ exchangeId }) => {
  const response = await api.post("/api/chats/cleanup-exchange", { exchangeId });
  return response.data;
};

export const getChats = async () => {
  const response = await api.get("/api/chats");
  return response.data;
};

export const getMessages = async (chatId) => {
  const response = await api.get(`/api/chats/${chatId}/messages`);
  return response.data;
};

export const deleteChat = async (chatId) => {
  const response = await api.delete(`/api/chats/delete/${chatId}`);
  return response.data;
};

export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/api/chats/delete-message/${messageId}`);
  return response.data;
};
