import { createSlice } from '@reduxjs/toolkit';

const ensureChat = (state, chatId, title = 'New Chat') => {
    if (!state.chats[chatId]) {
        state.chats[chatId] = {
            id: chatId,
            title,
            messages: [],
            lastUpdated: new Date().toISOString(),
        }
    }
}


const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        chats: {},
        currentChatId: null,
        isLoading: false,
        error: null,
    },
    reducers: {
        createNewChat: (state, action) => {
            const { chatId, title } = action.payload
            ensureChat(state, chatId, title)
        },
        addNewMessage: (state, action) => {
            const { chatId, id, content, role } = action.payload
            ensureChat(state, chatId)
            state.chats[ chatId ].messages.push({ id, content, role })
            state.chats[ chatId ].lastUpdated = new Date().toISOString()
        },
        startOptimisticExchange: (state, action) => {
            const { chatId, title, optimisticUserMessage, optimisticThinkingMessage } = action.payload
            ensureChat(state, chatId, title)
            state.chats[chatId].messages.push(optimisticUserMessage)
            state.chats[chatId].messages.push(optimisticThinkingMessage)
            state.chats[chatId].lastUpdated = new Date().toISOString()
            state.currentChatId = chatId
        },
        resolveOptimisticExchange: (state, action) => {
            const {
                optimisticChatId,
                finalChatId,
                finalChatTitle,
                optimisticUserId,
                optimisticThinkingId,
                userMessage,
                aiMessage,
            } = action.payload

            const sourceChat = state.chats[optimisticChatId]
            ensureChat(state, optimisticChatId)

            if (finalChatId !== optimisticChatId) {
                state.chats[finalChatId] = {
                    ...(sourceChat || state.chats[optimisticChatId]),
                    id: finalChatId,
                    title: finalChatTitle || sourceChat?.title || 'New Chat',
                }
                delete state.chats[optimisticChatId]
                if (state.currentChatId === optimisticChatId) {
                    state.currentChatId = finalChatId
                }
            }

            ensureChat(state, finalChatId, finalChatTitle)
            const targetMessages = state.chats[finalChatId].messages

            state.chats[finalChatId].messages = targetMessages.map((message) => {
                if (message.id === optimisticUserId) {
                    return {
                        id: userMessage?.id || userMessage?._id || optimisticUserId,
                        content: userMessage?.content || message.content,
                        role: userMessage?.role || 'user',
                    }
                }

                if (message.id === optimisticThinkingId) {
                    return {
                        id: aiMessage?.id || aiMessage?._id || optimisticThinkingId,
                        content: aiMessage?.content || 'No response generated.',
                        role: aiMessage?.role || 'assistant',
                        shouldAnimate: true,
                    }
                }

                return message
            })

            state.chats[finalChatId].title = finalChatTitle || state.chats[finalChatId].title
            state.chats[finalChatId].lastUpdated = new Date().toISOString()
            state.currentChatId = finalChatId
        },
        failOptimisticExchange: (state, action) => {
            const { chatId, optimisticUserId, optimisticThinkingId, errorMessage } = action.payload
            const chat = state.chats[chatId]
            if (!chat) {
                return
            }

            chat.messages = chat.messages.filter((message) => message.id !== optimisticUserId)

            const thinkingIndex = chat.messages.findIndex((message) => message.id === optimisticThinkingId)
            if (thinkingIndex !== -1) {
                chat.messages[thinkingIndex] = {
                    ...chat.messages[thinkingIndex],
                    content: errorMessage || 'Something went wrong. Please try again.',
                    role: 'assistant',
                    shouldAnimate: false,
                }
            }
            chat.lastUpdated = new Date().toISOString()
        },
        addMessages: (state, action) => {
            const { chatId, messages } = action.payload
            ensureChat(state, chatId)
            state.chats[ chatId ].messages.push(...messages)
            state.chats[ chatId ].lastUpdated = new Date().toISOString()
        },
        setChats: (state, action) => {
            state.chats = action.payload
        },
        setCurrentChatId: (state, action) => {
            state.currentChatId = action.payload
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload
        },
        setError: (state, action) => {
            state.error = action.payload
        },
        removeChat: (state, action) => {
            const { chatId } = action.payload
            delete state.chats[chatId]

            if (state.currentChatId === chatId) {
                const remainingChatIds = Object.keys(state.chats)
                state.currentChatId = remainingChatIds.length > 0 ? remainingChatIds[0] : null
            }
        },
        removeMessage: (state, action) => {
            const { chatId, messageId } = action.payload
            const chat = state.chats[chatId]
            if (!chat) {
                return
            }

            chat.messages = chat.messages.filter((message) => message.id !== messageId)
        },
        resetChatState: (state) => {
            state.chats = {}
            state.currentChatId = null
            state.isLoading = false
            state.error = null
        },
    }
})

export const {
    setChats,
    setCurrentChatId,
    setLoading,
    setError,
    createNewChat,
    addNewMessage,
    startOptimisticExchange,
    resolveOptimisticExchange,
    failOptimisticExchange,
    addMessages,
    removeChat,
    removeMessage,
    resetChatState,
} = chatSlice.actions
export default chatSlice.reducer



