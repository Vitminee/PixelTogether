'use client';

import { useState } from 'react';
import { User } from '@/types/canvas';

interface UserInfoProps {
  user: User | null;
  isConnected: boolean;
  onUsernameChange: (username: string) => void;
}

export default function UserInfo({ user, isConnected, onUsernameChange }: UserInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState('');

  const handleEdit = () => {
    if (user) {
      setTempUsername(user.username);
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    if (tempUsername.trim()) {
      onUsernameChange(tempUsername.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempUsername('');
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
            Username
          </label>
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                maxLength={20}
                onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              />
              <div className="flex gap-1">
                <button
                  onClick={handleSave}
                  className="flex-1 text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 text-xs px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user.username}
              </span>
              <button
                onClick={handleEdit}
                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
            User ID
          </label>
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {user.id.slice(-8)}
          </span>
        </div>
      </div>
    </div>
  );
}