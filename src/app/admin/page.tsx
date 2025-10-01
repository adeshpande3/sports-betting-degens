"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  displayName: string;
  balanceCents: number;
  createdAt: string;
  _count: {
    wagers: number;
  };
}

export default function AdminPage() {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch("/api/users");
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users || []);
      } else {
        console.error("Failed to fetch users:", data.error);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    if (!displayName.trim()) {
      setMessage("Display name is required");
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`User "${data.user.displayName}" created successfully!`);
        setIsError(false);
        setDisplayName(""); // Clear the form
        fetchUsers(); // Refresh the user list
      } else {
        setMessage(data.error?.message || "Failed to create user");
        setIsError(true);
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setMessage("Network error: Failed to create user");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-gray-600">
            Manage users, system settings, and administrative tasks
          </p>
        </div>

        {/* Admin Sections */}
        <div className="space-y-6">
          {/* User Management Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                User Management
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Current Users List */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Current Users
                </h3>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading users...</div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No users found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 rounded-lg p-4 border"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {user.displayName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              Balance: ${(user.balanceCents / 100).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user._count.wagers} wager
                              {user._count.wagers !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add User Form */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New User
                </h3>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="displayName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Display Name
                    </label>
                    <input
                      type="text"
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter user display name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    onClick={handleAddUser}
                    disabled={isLoading || !displayName.trim()}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? "Adding User..." : "Add User"}
                  </button>

                  {message && (
                    <div
                      className={`p-3 rounded-md text-sm ${
                        isError
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
