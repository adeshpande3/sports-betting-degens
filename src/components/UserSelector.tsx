"use client";

import { User } from "@/types/user";

interface UserSelectorProps {
  users: User[];
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
  className?: string;
}

export default function UserSelector({
  users,
  selectedUserId,
  onUserSelect,
  className = "",
}: UserSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => onUserSelect(user.id)}
          className={`
            relative min-w-24 px-3 py-2 rounded-lg border-2 transition-all duration-200 ease-in-out
            ${
              selectedUserId === user.id
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-105"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          type="button"
        >
          {/* Radio indicator */}
          <div className="flex items-center justify-center gap-2">
            <div
              className={`
                w-3 h-3 rounded-full border-2 transition-all duration-150
                ${
                  selectedUserId === user.id
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300 bg-white"
                }
              `}
            >
              {selectedUserId === user.id && (
                <div className="w-full h-full rounded-full bg-white scale-50"></div>
              )}
            </div>
            <span className="font-medium text-sm truncate">
              {user.displayName || user.name}
            </span>
          </div>

          {/* Selection indicator badge */}
          {selectedUserId === user.id && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg
                className="w-2.5 h-2.5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
