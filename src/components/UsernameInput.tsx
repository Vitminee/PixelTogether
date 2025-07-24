'use client';

import { useState, useRef, useEffect } from 'react';

interface UsernameInputProps {
  username: string;
  onUsernameChange: (newUsername: string) => void;
  size: string;
}

export default function UsernameInput({ username, onUsernameChange, size }: UsernameInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUsername, setTempUsername] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempUsername(username);
  }, [username]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    const trimmed = tempUsername.trim();
    if (trimmed && trimmed !== username) {
      onUsernameChange(trimmed);
    } else {
      setTempUsername(username);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setTempUsername(username);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSubmit();
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempUsername}
        onChange={(e) => setTempUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`${size} px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
        placeholder="Enter username"
        maxLength={20}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`${size} px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      title="Click to edit username"
    >
      {username}
    </button>
  );
}