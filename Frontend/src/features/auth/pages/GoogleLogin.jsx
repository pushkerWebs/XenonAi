import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";

const GoogleLogin = () => {
  const navigate = useNavigate();
  const { handleGoogleLogin } = useAuth();
  const buttonRef = useRef(null);

  const getProfilePictureFromCredential = (credential) => {
    try {
      const payloadPart = credential?.split(".")?.[1];
      if (!payloadPart) {
        return null;
      }

      const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
      const decoded = JSON.parse(window.atob(base64));
      return decoded?.picture || null;
    } catch {
      return null;
    }
  };

  const handleCallbackResponse = useCallback(async (response) => {
    const token = response?.credential;
    if (!token) {
      return;
    }

    const avatar = getProfilePictureFromCredential(token);

    const isLoggedIn = await handleGoogleLogin({ token, avatar });
    if (isLoggedIn) {
      navigate("/");
    }
  }, [handleGoogleLogin, navigate]);

  useEffect(() => {
    const initializeGoogleButton = () => {
      const googleClient = window.google?.accounts?.id;
      if (!googleClient || !buttonRef.current) {
        return false;
      }

      googleClient.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: handleCallbackResponse,
      });

      googleClient.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 250,
      });

      return true;
    };

    if (initializeGoogleButton()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (initializeGoogleButton()) {
        window.clearInterval(intervalId);
      }
    }, 150);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [handleCallbackResponse]);

  return (
    <div
      id="googleBtn"
      ref={buttonRef}
      className="flex min-h-11 min-w-62.5 items-center justify-center"
    />
  );
};

export default GoogleLogin;