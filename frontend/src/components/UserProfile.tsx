import React, { useEffect, useState } from "react";
import axios from "axios";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/solid";

interface UserProfile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  date_joined: string;
  is_active: boolean;
  last_login: string;
  avatar: string | null;
}

interface UserProfileFormData {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

const fieldLabels: { [key: string]: string } = {
  username: "Логин",
  first_name: "Имя",
  last_name: "Фамилия",
  email: "Email",
};

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isEditingField, setIsEditingField] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserProfileFormData>({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access");

    if (!token) {
      setError("Пользователь не аутентифицирован");
      return;
    }

    axios
      .get("http://localhost:8000/api/profile/", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setUser(response.data);
        setFormData(response.data);
      })
      .catch(() => setError("Произошла ошибка при загрузке данных."));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("access");
    if (!token) return setError("Пользователь не аутентифицирован");

    try {
      await axios.put("http://localhost:8000/api/profile/", formData, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      setUser((prevUser) => (prevUser ? { ...prevUser, ...formData } : null));
      setIsEditingField(null);
    } catch {
      setError("Ошибка при обновлении профиля.");
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Выбран файл:", file);
      handleAvatarUpload(file);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    const token = localStorage.getItem("access");
    if (!token) return setError("Пользователь не аутентифицирован");

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await axios.put("http://localhost:8000/api/profile/avatar/", formData, {
        headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` },
      });

      console.log("Ответ сервера:", response.data);
      setUser((prevUser) => (prevUser ? { ...prevUser, avatar: response.data.avatar } : null));
    } catch {
      setError("Ошибка при загрузке аватара.");
    }
  };

  const handleAvatarDelete = async () => {
    const token = localStorage.getItem("access");
    if (!token) return setError("Пользователь не аутентифицирован");

    try {
      await axios.delete("http://localhost:8000/api/profile/avatar/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser((prevUser) => (prevUser ? { ...prevUser, avatar: "avatar-placeholder.png" } : null));
    } catch {
      setError("Ошибка при удалении аватара.");
    }
  };

  if (!user) return <div className="text-center text-xl text-white">Загрузка...</div>;

  return (
    <div className="w-full p-6 bg-gray-800 rounded-xl shadow-md">
      <h1 className="text-3xl font-bold text-center text-white mb-8 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
        Данные пользователя
      </h1>
      {error && <p className="text-red-400 text-center mb-4">{error}</p>}

      <div className="flex flex-col items-center mb-8">
        <img
          src={user.avatar ? `http://localhost:8000${user.avatar}` : "avatar-placeholder.png"}
          alt="Аватарка"
          className="rounded-full w-32 h-32 object-cover border-4 border-red-500 shadow-lg"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
          id="avatar-upload"
        />
        <div className="flex space-x-4 mt-4">
          <label htmlFor="avatar-upload" className="cursor-pointer">
            <PencilIcon className="w-8 h-8 text-white hover:text-red-500 transition-transform transform hover:scale-110" />
          </label>
          <TrashIcon
            className="w-8 h-8 text-white hover:text-red-500 cursor-pointer transition-transform transform hover:scale-110"
            onClick={handleAvatarDelete}
          />
        </div>
      </div>

      <div className="space-y-6">
        {["username", "first_name", "last_name", "email"].map((field) => (
          <div key={field} className="flex justify-between items-center">
            <p className="text-lg text-white font-semibold">
              {fieldLabels[field]}:
              {isEditingField === field ? (
                <input
                  type="text"
                  name={field}
                  value={formData[field as keyof UserProfileFormData]}
                  onChange={handleChange}
                  className="mt-1 p-3 w-72 border border-gray-600 rounded-xl bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-red-500 shadow-md"
                />
              ) : (
                <span className="ml-2 text-gray-300">{user[field as keyof UserProfile]}</span>
              )}
            </p>
            {isEditingField === field ? (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:from-red-600 hover:to-orange-600 transition duration-300"
              >
                Сохранить
              </button>
            ) : (
              <PencilIcon
                className="w-6 h-6 text-white cursor-pointer hover:text-red-500 transition-transform transform hover:scale-110"
                onClick={() => setIsEditingField(field)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserProfile;