import crypto from "crypto";

export function getGravatarUrl(email) {
  const hash = crypto
    .createHash("md5")
    .update(email.trim().toLowerCase())
    .digest("hex");

  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
}