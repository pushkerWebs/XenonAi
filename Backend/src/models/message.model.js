import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
    {
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat',
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        exchangeId: {
            type: String,
            default: null,
            index: true,
        },
        role: {
            type: String,
            enum: [ 'user', 'ai', 'assistant' ],
            required: true,
        },
    },
    { timestamps: true }
);

const messageModel = mongoose.model('Message', messageSchema);

export default messageModel;