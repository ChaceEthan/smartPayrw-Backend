// @ts-nocheck
import jwt from 'jsonwebtoken'; // No change needed

// Utility to sign JWT tokens for session management
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;
