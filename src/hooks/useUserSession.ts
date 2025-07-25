'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types/canvas';

export function useUserSession() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const generateUserId = useCallback((): string => {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }, []);

  const generateUsername = useCallback((): string => {
    const adjectives = ['Quick', 'Brave', 'Swift', 'Clever', 'Bold', 'Bright', 'Creative', 'Artistic'];
    const nouns = ['Painter', 'Artist', 'Creator', 'Designer', 'Pixel', 'Brush', 'Canvas', 'Palette'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999);
    return `${adjective}${noun}${number}`;
  }, []);

  const createUser = useCallback((): User => {
    const newUser: User = {
      id: generateUserId(),
      username: generateUsername(),
      lastPlacement: 0,
      isConnected: true
    };
    return newUser;
  }, [generateUserId, generateUsername]);

  const saveUser = useCallback((userData: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pixeltogether-user', JSON.stringify(userData));
    }
  }, []);

  const loadUser = useCallback((): User | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem('pixeltogether-user');
      if (stored) {
        const userData: User = JSON.parse(stored);
        return { ...userData, isConnected: true };
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return null;
  }, []);

  const updateUsername = useCallback(async (newUsername: string) => {
    if (user) {
      try {
        // Update in database via API
        const response = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: newUsername }),
        });

        if (response.ok) {
          const updatedUser = { ...user, username: newUsername };
          setUser(updatedUser);
          saveUser(updatedUser);
        } else {
          console.error('Failed to update username on server');
        }
      } catch (error) {
        console.error('Error updating username:', error);
      }
    }
  }, [user, saveUser]);

  const updateLastPlacement = useCallback((timestamp: number) => {
    if (user) {
      const updatedUser = { ...user, lastPlacement: timestamp };
      setUser(updatedUser);
      saveUser(updatedUser);
    }
  }, [user, saveUser]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const existingUser = loadUser();
    if (existingUser) {
      setUser(existingUser);
    } else {
      const newUser = createUser();
      setUser(newUser);
      saveUser(newUser);
    }
    setIsLoading(false);
  }, [isMounted, loadUser, createUser, saveUser]);

  return {
    user,
    isLoading,
    updateUsername,
    updateLastPlacement
  };
}