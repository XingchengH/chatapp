import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
    const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: "1d",
    });

    // Set the token in a cookie
    res.cookie("jwt", token, {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true, // prevents cross-site scripting attacks
        sameSite: "strict", // CSRF protection for cross-site requests
        secure: process.env.NODE_ENV === "production",
    });
    return token;
}