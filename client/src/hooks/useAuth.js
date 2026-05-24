import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const STORAGE_KEY_TOKEN = "token";
const STORAGE_KEY_NAME = "name";

export default function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On mount, verify any stored token
    useEffect(() => {
        async function verify() {
            const token = localStorage.getItem(STORAGE_KEY_TOKEN);
            const name = localStorage.getItem(STORAGE_KEY_NAME);
            if (!token || !name) { setLoading(false); return; }

            try {
                const { data } = await axios.post("/api/auth/verify-token", { name, token });
                if (data.success) {
                    // ✨ Cleaned legacy flags & integrated global administrative checking parameters
                    setUser({
                        id: data.id,
                        name: data.name,
                        real_name: data.real_name,
                        is_admin: data.is_admin === true || data.is_admin === 1 // Handles database variations cleanly
                    });
                } else {
                    localStorage.removeItem(STORAGE_KEY_TOKEN);
                    localStorage.removeItem(STORAGE_KEY_NAME);
                }
            } catch (err) {
                console.error("Auth verification failed", err);
            } finally {
                setLoading(false);
            }
        }
        verify();
    }, []);

    const login = useCallback(async (name, password) => {
        try {
            const { data } = await axios.post("/api/auth/verify", { name, password });
            if (data.success) {
                localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
                localStorage.setItem(STORAGE_KEY_NAME, data.name);

                // ✨ Cleaned legacy flags & integrated global administrative checking parameters
                setUser({
                    id: data.id,
                    name: data.name,
                    real_name: data.real_name,
                    is_admin: data.is_admin === true || data.is_admin === 1
                });

                return { success: true };
            }
            return { success: false, error: "Invalid username or password" };
        } catch (err) {
            return { success: false, error: "Login failed — please try again" };
        }
    }, []);

    const logout = useCallback(async () => {
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        if (token) {
            try { await axios.post("/api/auth/logout", { token }); } catch { /* best effort */ }
        }
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_NAME);
        setUser(null);
    }, []);

    return { user, login, logout, loading };
}