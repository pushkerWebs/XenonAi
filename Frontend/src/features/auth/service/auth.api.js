import axios from 'axios'


const api = axios.create({
    baseURL:'http://localhost:3000',
    withCredentials:true
})

export async function register({email , username , password}) {
    const response = await api.post('/api/auth/register', { email, username, password });
    return response.data;
}


export async function login({email , password}) {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
}

export async function loginWithGoogle({ token, avatar }) {
    const response = await api.post('/api/auth/google', { token, avatar });
    return response.data;
}


export async function getMe() {
    const response = await api.get('/api/auth/me');
    return response.data;
}

export async function logout() {
    const response = await api.post('/api/auth/logout');
    return response.data;
}

export async function requestPasswordReset({ email }) {
    const response = await api.post('/api/auth/forgot-password', { email });
    return response.data;
}

export async function resetPassword({ token, password, confirmPassword }) {
    const response = await api.post('/api/auth/reset-password', { token, password, confirmPassword });
    return response.data;
}