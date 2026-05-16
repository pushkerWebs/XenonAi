import { initializeSocketConnection } from "../service/chat.socket";
import { sendMessage, getChats, getMessages, deleteChat as deleteChatRequest, deleteMessage as deleteMessageRequest, cleanupExchange } from "../service/chat.api";
import { setChats, setCurrentChatId, setError, setLoading, startOptimisticExchange, resolveOptimisticExchange, failOptimisticExchange, addMessages, removeChat, removeMessage } from "../chat.slice";
import { useDispatch } from "react-redux";
import { useCallback, useRef, useState } from "react";

const isTempId = (value, prefix) => typeof value === "string" && value.startsWith(prefix);


export const useChat = () => {

    const dispatch = useDispatch()
    const [isGenerating, setIsGenerating] = useState(false)
    const [lastAlert, setLastAlert] = useState(null)
    const abortControllerRef = useRef(null)

    const dismissAlert = useCallback(() => setLastAlert(null), [])

    const stopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setIsGenerating(false)
    }, [])

    const handleSendMessage = useCallback(async ({ message, chatId, model, files }) => {
        const requestStamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const tempChatId = `temp-chat-${requestStamp}`
        const isTempChatId = isTempId(chatId, "temp-chat-")
        const optimisticChatId = chatId || tempChatId
        const apiChatId = isTempChatId ? null : chatId
        const optimisticUserId = `temp-user-${requestStamp}`
        const optimisticThinkingId = `temp-ai-${requestStamp}`

        const controller = new AbortController()
        abortControllerRef.current = controller

        // Optimistic user message — show all filenames immediately
        const optimisticUserContent = files?.length > 0
            ? `${message}\n\n${files.map((f) => `📎 *${f.name}*`).join('  ')}`
            : message

        try {
            setIsGenerating(true)
            dispatch(setLoading(true))
            dispatch(setError(null))

            dispatch(startOptimisticExchange({
                chatId: optimisticChatId,
                title: 'New Chat',
                optimisticUserMessage: {
                    id: optimisticUserId,
                    content: optimisticUserContent,
                    role: 'user',
                },
                optimisticThinkingMessage: {
                    id: optimisticThinkingId,
                    content: 'Thinking...',
                    role: 'assistant',
                },
            }))

            const data = await sendMessage({ message, chatId: apiChatId, model, files, signal: controller.signal, exchangeId: requestStamp })

            const { chat, userMessage, aiMessage, modelUsed, wasFallback, rateLimited } = data
            const activeChatId = (!isTempChatId && chatId) ? chatId : (chat?._id || optimisticChatId)

            if (!activeChatId) {
                throw new Error("Unable to resolve chat id")
            }

            // Append model info badge to AI message if fallback occurred
            let aiContent = aiMessage?.content || 'No response generated.'
            if (wasFallback && rateLimited) {
                aiContent += '\n\n---\n*⚠️ Gemini quota exhausted — responded using Mistral*'
            }

            dispatch(resolveOptimisticExchange({
                optimisticChatId,
                finalChatId: activeChatId,
                finalChatTitle: chat?.title,
                optimisticUserId,
                optimisticThinkingId,
                userMessage: {
                    id: userMessage?._id,
                    content: userMessage?.content || optimisticUserContent,
                    role: userMessage?.role || 'user',
                },
                aiMessage: {
                    id: aiMessage?._id,
                    content: aiContent,
                    role: aiMessage?.role || 'assistant',
                },
            }))

            if (wasFallback && rateLimited) {
                setLastAlert({
                    type: 'warning',
                    message: '⚠️ Gemini quota exhausted — switched to Mistral as fallback.',
                    timestamp: Date.now(),
                })
            } else if (wasFallback) {
                setLastAlert({
                    type: 'info',
                    message: `ℹ️ Used ${modelUsed === 'mistral-small-latest' ? 'Mistral' : modelUsed} as fallback model.`,
                    timestamp: Date.now(),
                })
            }
        } catch (err) {
            const wasAborted = err?.name === 'CanceledError' || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED' || controller.signal.aborted

            if (wasAborted) {
                dispatch(failOptimisticExchange({
                    chatId: optimisticChatId,
                    optimisticUserId,
                    optimisticThinkingId,
                    errorMessage: '⚠️ Error occurred. Generation was stopped.',
                }))
                try {
                    await cleanupExchange({ exchangeId: requestStamp })
                } catch {
                }
                return
            }

            const isTimeout = err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')
            const isRateLimit = /429|quota|rate.?limit/i.test(err?.response?.data?.message || err?.message || '')

            dispatch(failOptimisticExchange({
                chatId: optimisticChatId,
                optimisticUserId,
                optimisticThinkingId,
                errorMessage: isRateLimit
                    ? '⚠️ API quota exhausted. Please try again later or switch to Mistral model.'
                    : isTimeout
                        ? '⏱️ Request timed out. Please try again.'
                        : `⚠️ ${err.response?.data?.message || err.message || 'Something went wrong. Please try again.'}`,
            }))
            dispatch(setError(
                isTimeout
                    ? 'Request timed out. Please try again.'
                    : (err.response?.data?.message || err.message || 'Failed to send message')
            ))

            try {
                await cleanupExchange({ exchangeId: requestStamp })
            } catch {
            }

            if (isRateLimit) {
                setLastAlert({
                    type: 'warning',
                    message: '⚠️ API quota exhausted. Switch to Mistral or try again later.',
                    timestamp: Date.now(),
                })
            } else if (isTimeout) {
                setLastAlert({
                    type: 'warning',
                    message: '⏱️ Request timed out. The AI took too long to respond.',
                    timestamp: Date.now(),
                })
            }
        } finally {
            setIsGenerating(false)
            abortControllerRef.current = null
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleGetChats = useCallback(async () => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))

            const data = await getChats()
            const { chats } = data
            dispatch(setChats(chats.reduce((acc, chat) => {
                acc[chat._id] = {
                    id: chat._id,
                    title: chat.title,
                    messages: [],
                    lastUpdated: chat.updatedAt,
                }
                return acc
            }, {})))
        } catch (err) {
            dispatch(setError(err.response?.data?.message || "Failed to load chats"))
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleOpenChat = useCallback(async (chatId, chats) => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))

            if (isTempId(chatId, "temp-chat-")) {
                dispatch(setCurrentChatId(chatId))
                return
            }

            if (chats[chatId]?.messages.length === 0) {
                const data = await getMessages(chatId)
                const { messages, chatDeleted } = data

                if (chatDeleted) {
                    dispatch(removeChat({ chatId }))
                    return
                }

                const formattedMessages = messages.map(msg => ({
                    id: msg._id,
                    content: msg.content,
                    role: msg.role,
                }))

                dispatch(addMessages({
                    chatId,
                    messages: formattedMessages,
                }))
            }

            dispatch(setCurrentChatId(chatId))
        } catch (err) {
            dispatch(setError(err.response?.data?.message || "Failed to open chat"))
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleDeleteChat = useCallback(async (chatId) => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))

            if (isTempId(chatId, "temp-chat-")) {
                dispatch(removeChat({ chatId }))
                return true
            }

            await deleteChatRequest(chatId)
            dispatch(removeChat({ chatId }))
            return true
        } catch (err) {
            dispatch(setError(err.response?.data?.message || "Failed to delete chat"))
            return false
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleDeleteMessage = useCallback(async ({ chatId, messageId }) => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))

            if (isTempId(messageId, "temp-")) {
                dispatch(removeMessage({ chatId, messageId }))
                return true
            }

            const data = await deleteMessageRequest(messageId)
            const { chatDeleted } = data

            if (chatDeleted) {
                dispatch(removeChat({ chatId }))
            } else {
                dispatch(removeMessage({ chatId, messageId }))
            }
            return true
        } catch (err) {
            dispatch(setError(err.response?.data?.message || "Failed to delete message"))
            return false
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleCreateNewChat = useCallback(() => {
        dispatch(setError(null))
        dispatch(setCurrentChatId(null))
    }, [dispatch])

    return {
        initializeSocketConnection,
        handleSendMessage,
        handleGetChats,
        handleOpenChat,
        handleDeleteChat,
        handleDeleteMessage,
        handleCreateNewChat,
        isGenerating,
        stopGeneration,
        lastAlert,
        dismissAlert,
    }

}
