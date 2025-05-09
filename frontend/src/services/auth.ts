import axios, { AxiosError } from "axios";

const API_URL = "http://localhost:8000/api/";
const SITE_KEY = "6LdzEDArAAAAABffNXSSMuqo20I3VW6S3m-EQvaJ"; 

// Подключаем reCAPTCHAа
declare global {
    interface Window {
        grecaptcha: any;
    }
}

export const login = async (username: string, password: string) => {
    try {
        // Проверяем, доступен ли grecaptcha
        if (!window.grecaptcha) {
            throw new Error("reCAPTCHA не загружен. Проверьте подключение или Site Key.");
        }

        // Получаем reCAPTCHA токен
        const recaptchaToken = await new Promise<string>((resolve, reject) => {
            window.grecaptcha.ready(() => {
                console.log("grecaptcha.ready вызван для login");
                window.grecaptcha
                    .execute(SITE_KEY, { action: "login" })
                    .then((token: string) => {
                        console.log("reCAPTCHA токен получен:", token);
                        resolve(token);
                    })
                    .catch((error: any) => {
                        console.error("Ошибка reCAPTCHA в login:", error);
                        reject(new Error("Ошибка reCAPTCHA: " + (error?.message || error || "Неизвестная ошибка")));
                    });
            });
        });

        console.log("Отправка запроса на логин:", `${API_URL}token/`);
        const response = await axios.post(`${API_URL}token/`, {
            username,
            password,
            recaptcha_token: recaptchaToken,
        });
        localStorage.setItem("access", response.data.access);
        localStorage.setItem("refresh", response.data.refresh);
        localStorage.setItem("username", username);
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Ошибка авторизации:", error.response?.status, error.response?.data);
            throw { status: error.response?.status, data: error.response?.data };
        } else {
            console.error("Ошибка при отправке запроса:", error);
            throw { status: null, data: { error: (error as Error).message || "Ошибка сети. Попробуйте снова." } };
        }
    }
};

export const register = async (username: string, email: string, password: string, password2: string) => {
    try {
        // Проверяем, доступен ли grecaptcha
        if (!window.grecaptcha) {
            throw new Error("reCAPTCHA не загружен. Проверьте подключение или Site Key.");
        }

        // Получаем reCAPTCHA токен
        const recaptchaToken = await new Promise<string>((resolve, reject) => {
            window.grecaptcha.ready(() => {
                console.log("grecaptcha.ready вызван для register");
                window.grecaptcha
                    .execute(SITE_KEY, { action: "register" })
                    .then((token: string) => {
                        console.log("reCAPTCHA токен получен:", token);
                        resolve(token);
                    })
                    .catch((error: any) => {
                        console.error("Ошибка reCAPTCHA в register:", error);
                        reject(new Error("Ошибка reCAPTCHA: " + (error?.message || error || "Неизвестная ошибка")));
                    });
            });
        });

        console.log("Отправка запроса на регистрацию:", `${API_URL}register/`);
        const response = await axios.post(`${API_URL}register/`, {
            username,
            email,
            password,
            password2,
            recaptcha_token: recaptchaToken,
        });
        localStorage.setItem("access", response.data.access);
        localStorage.setItem("refresh", response.data.refresh);
        localStorage.setItem("username", username);
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
            console.error("Ошибка регистрации:", error.response?.status, error.response?.data);
            throw { status: error.response?.status, data: error.response?.data };
        } else {
            console.error("Ошибка при отправке запроса:", error);
            throw { status: null, data: { error: (error as Error).message || "Ошибка сети. Попробуйте снова." } };
        }
    }
};

export const refreshToken = async () => {
    const refresh = localStorage.getItem("refresh");
    if (!refresh) return null;
    try {
        const response = await axios.post(`${API_URL}token/refresh/`, { refresh });
        localStorage.setItem("access", response.data.access);
        return response.data.access;
    } catch (error: unknown) {
        console.error("Ошибка обновления токена:", error);
        throw error;
    }
};