import React, { useState, useEffect } from "react";
import { login, register } from "../services/auth";
import zxcvbn from "zxcvbn";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [recaptchaStatus, setRecaptchaStatus] = useState("");
  const [recaptchaScore, setRecaptchaScore] = useState<number | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<string>("");
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Загрузка reCAPTCHA v3
  useEffect(() => {
    const scriptId = "recaptcha-v3-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.google.com/recaptcha/api.js?render=6LdzEDArAAAAABffNXSSMuqo20I3VW6S3m-EQvaJ";
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error("Ошибка загрузки reCAPTCHA v3");
        setErrorMessage("Не удалось загрузить reCAPTCHA.");
      };
      document.body.appendChild(script);
      return () => {
        const scriptElement = document.getElementById(scriptId);
        if (scriptElement) {
          document.body.removeChild(scriptElement);
        }
      };
    }
  }, []);

  // Проверка силы пароля и условий
  useEffect(() => {
    const errors: string[] = [];
    if (password && !isLogin) {
      const result = zxcvbn(password);
      if (result.score < 2) {
        errors.push("Пароль слишком слабый. Используйте более сложный пароль.");
      }
      if (password.length < 8) {
        errors.push("Пароль должен содержать не менее 8 символов.");
      }
      if (password2 && password !== password2) {
        errors.push("Пароли не совпадают.");
      }

      const score = result.score;
      const feedback = result.feedback.suggestions || [];
      switch (score) {
        case 0:
        case 1:
          setPasswordStrength("Слабый");
          break;
        case 2:
          setPasswordStrength("Средний");
          break;
        case 3:
          setPasswordStrength("Хороший");
          break;
        case 4:
          setPasswordStrength("Сильный");
          break;
        default:
          setPasswordStrength("");
      }
      setPasswordFeedback(feedback);
    } else {
      setPasswordStrength("");
      setPasswordFeedback([]);
    }
    setPasswordErrors(errors);
  }, [password, password2, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setRecaptchaStatus("");
    setRecaptchaScore(null);

    // Проверка пароля на минимальную силу и длину
    if (!isLogin && password) {
      const result = zxcvbn(password);
      if (result.score < 2) {
        setErrorMessage("Пароль слишком слабый. Используйте более сложный пароль.");
        return;
      }
      if (password !== password2) {
        setErrorMessage("Пароли не совпадают.");
        return;
      }
      if (password.length < 8) {
        setErrorMessage("Пароль должен содержать не менее 8 символов.");
        return;
      }
    }

    try {
      const recaptchaToken = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute("6LdzEDArAAAAABffNXSSMuqo20I3VW6S3m-EQvaJ", { action: isLogin ? "login" : "register" })
            .then((token: string) => {
              console.log("reCAPTCHA v3 токен:", token);
              resolve(token);
            })
            .catch((error: any) => reject(error));
        });
      });

      console.log("Request payload:", { username, email, password, password2, recaptcha_token: recaptchaToken });

      let response;
      if (isLogin) {
        response = await login(username, password);
      } else {
        response = await register(username, email, password, password2);
      }
      setRecaptchaStatus("reCAPTCHA v3 пройдена!");
      if (response.recaptcha_score) {
        setRecaptchaScore(response.recaptcha_score);
      }
      onClose();
      window.location.reload();
    } catch (error: any) {
      setRecaptchaStatus("reCAPTCHA v3 не пройдена!");
      if (error.data?.recaptcha_score) {
        setRecaptchaScore(error.data.recaptcha_score);
      }
      console.log("Raw error:", error);
      const { status, data } = error || {};
      console.log("Ошибка в AuthModal:", { status, data });

      if (status === 403) {
        setErrorMessage("Слишком много попыток входа. Попробуйте снова через час.");
      } else if (status === 400 && data?.error?.includes("reCAPTCHA")) {
        setErrorMessage(data.error);
      } else if (status === 401) {
        setErrorMessage("Неверный логин или пароль.");
      } else if (data?.error) {
        setErrorMessage(data.error);
      } else if (data?.detail) {
        setErrorMessage("Неверный логин или пароль.");
      } else if (data?.non_field_errors) {
        setErrorMessage(data.non_field_errors.join(" "));
      } else if (data?.username) {
        setErrorMessage(data.username.join(" "));
      } else if (data?.password) {
        setErrorMessage(data.password.join(" "));
      } else if (data?.email) {
        setErrorMessage(data.email.join(" "));
      } else if (data) {
        setErrorMessage(
          typeof data === "string" ? data : Object.values(data).flat().join(" ")
        );
      } else {
        setErrorMessage("Произошла ошибка. Попробуйте снова.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 z-40" onClick={onClose}></div>
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="relative bg-white p-8 rounded-2xl shadow-2xl w-96 animate-fadeIn scale-95 sm:scale-100 transition-all">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-900 text-2xl"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
            {isLogin ? "Вход в аккаунт" : "Регистрация"}
          </h2>
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm text-center">
              {errorMessage}
            </div>
          )}
          {recaptchaStatus && (
            <div
              className={
                recaptchaStatus.includes("пройдена")
                  ? "bg-green-100 border border-green-400 text-green-700"
                  : "bg-red-100 border border-red-400 text-red-700"
              }
              style={{ padding: "8px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px", textAlign: "center" }}
            >
              {recaptchaStatus}
              {recaptchaScore !== null && (
                <span> (Score: {recaptchaScore.toFixed(1)})</span>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900"
              required
            />
            {!isLogin && (
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900"
                required
              />
            )}
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900"
              required
            />
            {!isLogin && (
              <>
                <input
                  type="password"
                  placeholder="Подтвердите пароль"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-red-500 focus:outline-none text-gray-900"
                  required
                />
                {passwordErrors.length > 0 && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                    <ul>
                      {passwordErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {passwordStrength && (
                  <div className="mb-3 text-sm text-center">
                    <span
                      className={
                        passwordStrength === "Слабый"
                          ? "text-red-600"
                          : passwordStrength === "Средний"
                          ? "text-yellow-600"
                          : passwordStrength === "Хороший"
                          ? "text-blue-600"
                          : "text-green-600"
                      }
                    >
                      Сила пароля: {passwordStrength}
                    </span>
                    {passwordFeedback.length > 0 && (
                      <ul className="text-gray-600 mt-1">
                        {passwordFeedback.map((tip, index) => (
                          <li key={index}>• {tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-red-600 to-orange-500 hover:from-orange-600 hover:to-red-600 shadow-md transition-transform transform hover:scale-105"
            >
              {isLogin ? "Войти" : "Зарегистрироваться"}
            </button>
          </form>
          <div className="text-center mt-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-red-600 hover:text-orange-500 font-medium transition-colors"
            >
              {isLogin ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthModal;