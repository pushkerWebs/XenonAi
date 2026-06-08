import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { register, login, getMe, loginWithGoogle, logout } from "../service/auth.api";
import { setUser, setLoading, setIsLoggingOut, setError } from "../auth.slice";


const persistUser = (user) => {
    if (typeof window === "undefined") {
        return;
    }

    if (user) {
        window.localStorage.setItem("xenonAuthUser", JSON.stringify(user));
        return;
    }

    window.localStorage.removeItem("xenonAuthUser");
};

const getAuthErrorMessage = (error, fallbackMessage) => {
    const validationErrors = error.response?.data?.errors;
    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        return validationErrors[0]?.msg || fallbackMessage;
    }

    return error.response?.data?.message || fallbackMessage;
};


export function useAuth() {


    const dispatch = useDispatch()

    const handleRegister = useCallback(async ({ email, username, password }) => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await register({ email, username, password })
            dispatch(setUser(null))
            persistUser(null)
            return true
        } catch (error) {
            dispatch(setError(getAuthErrorMessage(error, "Registration failed")))
            return false
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleLogin = useCallback(async ({ email, password }) => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await login({ email, password })
            dispatch(setUser(data.user))
            persistUser(data.user)
            return true
        } catch (err) {
            dispatch(setError(getAuthErrorMessage(err, "Login failed")))
            return false
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleGoogleLogin = useCallback(async ({ token, avatar }) => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await loginWithGoogle({ token, avatar })
            dispatch(setUser(data.user))
            persistUser(data.user)
            return true
        } catch (err) {
            dispatch(setError(getAuthErrorMessage(err, "Google login failed")))
            return false
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleGetMe = useCallback(async () => {
        try {
            dispatch(setLoading(true))
            dispatch(setError(null))
            const data = await getMe()
            dispatch(setUser(data.user))
            persistUser(data.user)
            return true
        } catch {
            const storedUser = typeof window === "undefined" ? null : window.localStorage.getItem("xenonAuthUser")
            if (!storedUser) {
                dispatch(setUser(null))
                persistUser(null)
            }
            return false
        } finally {
            dispatch(setLoading(false))
        }
    }, [dispatch])

    const handleLogout = useCallback(async () => {
        try {
            dispatch(setIsLoggingOut(true))
            dispatch(setLoading(true))
            dispatch(setError(null))
            await logout()
            dispatch(setUser(null))
            persistUser(null)
            return true
        } catch (err) {
            dispatch(setError(getAuthErrorMessage(err, "Logout failed")))
            return false
        } finally {
            dispatch(setLoading(false))
            dispatch(setIsLoggingOut(false))
        }
    }, [dispatch])

    return {
        handleRegister,
        handleLogin,
        handleGoogleLogin,
        handleGetMe,
        handleLogout,
    }

}