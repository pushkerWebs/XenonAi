import userModel from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { getGravatarUrl } from "../utils/gravator.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { sendResetPasswordEmail } from "../services/email.service.js";


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function googleLogin(req, res) {
  try {
    const { token, avatar: avatarHint } = req.body;

    const payloadPart = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    console.log("TOKEN AUD:", payloadPart.aud);
    console.log("TOKEN AZP:", payloadPart.azp);
    console.log("EXPECTED:", process.env.GOOGLE_CLIENT_ID);

    // verify token with google (audience removed temporarily for debugging)
    console.log("CLIENT INSTANCE ID:", client._clientId);
    console.log("ENV CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
    console.log("TOKEN LENGTH:", token.length);
    console.log("TOKEN START:", token.substring(0, 50));
    console.log("AUDIENCE PARAM:", process.env.GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
    });

    const payload = ticket.getPayload();

    const { email, name, picture } = payload;
    const resolvedAvatar = picture || avatarHint || null;

    // check if user exists
    let user = await userModel.findOne({ email });

    if (!user) {
      // Auto-create account for first-time Google sign-in.
      // Build a URL-safe base username from the Google display name or email prefix.
      const baseUsername = (name || email.split("@")[0])
        .replace(/\s+/g, "_")
        .toLowerCase();

      // Retry with a random 4-digit suffix until we find a free username.
      let username = baseUsername;
      let attempts = 0;
      while (await userModel.exists({ username })) {
        const suffix = Math.floor(1000 + Math.random() * 9000); // 1000-9999
        username = `${baseUsername}_${suffix}`;
        if (++attempts > 10) { username = `${baseUsername}_${Date.now()}`; break; }
      }

      user = await userModel.create({
        email,
        username,
        avatar: resolvedAvatar,
      });
      console.log("New Google user created:", user.email, "→ username:", user.username);
    } else if (resolvedAvatar && user.avatar !== resolvedAvatar) {
      user.avatar = resolvedAvatar;
      await user.save();
    }

    // create jwt
    const jwtToken = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", jwtToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: (user.avatar && user.avatar.trim()) || resolvedAvatar || getGravatarUrl(user.email),
      },
    });

  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
}


export async function register(req, res) {
  try {
    const { password, username } = req.body;
    const email = String(req.body.email || "").toLowerCase().trim();
    const normalizedUsername = String(username || "").trim();

    const isUserAlreadyExist = await userModel.findOne({
      $or: [{ email }, { username: normalizedUsername }],
    });

    if (isUserAlreadyExist) {
      return res.status(400).json({
        message: "User with this email or username already exists",
        success: false,
      });
    }

    const user = await userModel.create({
      username: normalizedUsername,
      email,
      password,
      avatar: getGravatarUrl(email),
    });

    return res.status(201).json({
      message: "User registered successfully",
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: (user.avatar && user.avatar.trim()) || getGravatarUrl(user.email),
      },
    });

  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({
      message: "Registration failed",
      success: false,
    });
  }
}


export async function login(req, res) {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const { password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
        success: false,
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: (user.avatar && user.avatar.trim()) || getGravatarUrl(user.email), 
      },
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({
      message: "Login failed",
      success: false,
    });
  }
}


export async function getMe(req, res) {
  try {
    const userId = req.user.id;

    const user = await userModel.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "User found",
      success: true,
      user: {
        ...user._doc,
        avatar: (user.avatar && user.avatar.trim()) || getGravatarUrl(user.email), 
      },
    });

  } catch (err) {
    console.error("GetMe error:", err.message);
    return res.status(500).json({
      message: "Failed to fetch user",
      success: false,
    });
  }
}


export async function logout(req, res) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    return res.status(200).json({
      message: "Logged out successfully",
      success: true,
    });

  } catch (err) {
    console.error("Logout error:", err.message);
    return res.status(500).json({
      message: "Logout failed",
      success: false,
    });
  }
}

export async function requestPasswordReset(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();

    const user = await userModel.findOne({ email: normalizedEmail });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

      await sendResetPasswordEmail({
        to: user.email,
        username: user.username,
        resetUrl,
      });
    }

    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Request password reset error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to process reset request",
    });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await userModel.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or expired",
      });
    }

    if (user.lastPasswordResetAt) {
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const lastReset = new Date(user.lastPasswordResetAt).getTime();
      if (Date.now() - lastReset < oneWeekMs) {
        return res.status(429).json({
          success: false,
          message: "Password can only be changed once per week",
        });
      }
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.lastPasswordResetAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.error("Reset password error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
}