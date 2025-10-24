
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, ChatMessage, HistoryItem, BoardInfo } from '@/lib/types';

const PROJECTS_STORAGE_KEY = 'aiot-projects';

const initialCode = `// Welcome to your AIDE Project!
// Use the AI Chat to start building.
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(500);
  digitalWrite(LED_BUILTIN, LOW);
  delay(500);
}`;

const initialChatHistory: ChatMessage[] = [
    { role: 'assistant', content: "Hello! I'm your AI pair programmer, AIDE. I can write code, explain it, and compile it for you. How can I help?" }
];

const initialBoardInfo: BoardInfo = {
    fqbn: 'esp32:esp32:esp32',
    libraries: [],
};


export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects) {
        // Need to reviver for Date objects
        const parsedProjects = JSON.parse(storedProjects, (key, value) => {
            if (key === 'timestamp' || key === 'createdAt') {
                return new Date(value);
            }
            return value;
        });
        setProjects(parsedProjects);
      }
    } catch (error) {
      console.error("Failed to load projects from localStorage", error);
      setProjects([]);
    }
  }, []);

  const saveProjects = useCallback((updatedProjects: Project[]) => {
    try {
      const projectsWithSortedHistory = updatedProjects.map(p => ({
        ...p,
        versionHistory: [...p.versionHistory].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }));
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projectsWithSortedHistory));
      setProjects(projectsWithSortedHistory);
    } catch (error) {
      console.error("Failed to save projects to localStorage", error);
    }
  }, []);

  const createProject = (name: string) => {
    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: new Date().toISOString(),
      code: initialCode,
      chatHistory: initialChatHistory,
      versionHistory: [],
      boardInfo: initialBoardInfo,
    };
    const updatedProjects = [...projects, newProject];
    saveProjects(updatedProjects);
    router.push(`/aide/${newProject.id}`);
  };

  const getProject = useCallback((id: string): Project | undefined => {
    return projects.find(p => p.id === id);
  }, [projects]);


  const updateProject = useCallback((id: string, updates: Partial<Project>) => {
    const updatedProjects = projects.map(p =>
      p.id === id ? { ...p, ...updates, createdAt: new Date().toISOString() } : p
    );
    saveProjects(updatedProjects);
  }, [projects, saveProjects]);

  return { projects, createProject, getProject, updateProject };
}
