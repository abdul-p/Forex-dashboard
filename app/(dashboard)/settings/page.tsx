"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

interface User {
  name: string;
  email: string;
  balance: number;
  currency: string;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    currency: "USD",
  });

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/user");
      const data = await res.json();
      setUser(data.user);
      setFormData({
        name: data.user.name,
        balance: data.user.balance.toString(),
        currency: data.user.currency,
      });
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          balance: Number(formData.balance),
          currency: formData.currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }

      setSuccess("Profile updated successfully");
      setUser(data.user);
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Manage your account preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-1">Profile</h2>
        <p className="text-gray-500 text-xs mb-6">
          Update your name, balance and currency
        </p>

        {success && (
          <div className="bg-green-400/10 border border-green-400/20 text-green-400 text-sm p-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-600 mt-1">
              Email cannot be changed
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Account Balance
              </label>
              <input
                type="number"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                required
                step="0.01"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-400/50"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="NGN">NGN — Nigerian Naira</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-400 text-gray-950 py-3 rounded-xl text-sm font-bold hover:bg-green-300 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-4">Account Info</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-gray-500">Member since</span>
            <span className="text-white">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-gray-500">Account balance</span>
            <span className="text-green-400 font-bold">
              ${user?.balance?.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-500">Currency</span>
            <span className="text-white">{user?.currency || "USD"}</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-1">Danger Zone</h2>
        <p className="text-gray-500 text-xs mb-4">Sign out of your account</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm hover:bg-red-500/20 transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
