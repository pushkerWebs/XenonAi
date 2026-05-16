import { createBrowserRouter } from "react-router";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import ResetPassword from "../features/auth/pages/ResetPassword";
import Dashboard from "../features/chat/pages/Dashboard";
import Protected from "../features/auth/components/Protected";
import { Navigate } from "react-router";
import AppError from "./AppError";

export const router = createBrowserRouter([
    {
        path:"/",
        element:<Protected><Dashboard/></Protected>,
        errorElement:<AppError />,
    },
    {
        path:'/dashboard',
        element:<Navigate to='/' replace />,
        errorElement:<AppError />,
    },
    {
        path:"/login",
        element:<Login />,
        errorElement:<AppError />,
    },{
        path:"/register",
        element:<Register />,
        errorElement:<AppError />,
    },{
        path:"/forgot-password",
        element:<ForgotPassword />,
        errorElement:<AppError />,
    },{
        path:"/reset-password",
        element:<ResetPassword />,
        errorElement:<AppError />,
    }
])