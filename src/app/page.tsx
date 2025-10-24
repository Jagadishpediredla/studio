
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Folder, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { getProjects, createProject } from '@/app/actions';
import { type Project } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      const result = await getProjects();
      if (result.success && result.projects) {
        // Parse date strings into Date objects
        const parsedProjects = result.projects.map(p => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
        }));
        setProjects(parsedProjects as Project[]);
      } else {
        toast({
            title: "Error loading projects",
            description: result.error || "Could not fetch project list from the database.",
            variant: "destructive",
        })
      }
      setIsLoading(false);
    };
    fetchProjects();
  }, [toast]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    const result = await createProject(newProjectName.trim());
    if (result.success && result.project) {
        router.push(`/aide/${result.project.id}`);
    } else {
        toast({
            title: "Error creating project",
            description: result.error || "An unknown error occurred.",
            variant: "destructive",
        });
        setIsCreating(false);
    }
    // Don't reset state if creation failed, allow user to retry
    setNewProjectName('');
    setIsDialogOpen(false);
  };
  
  const sortedProjects = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 font-body">
      <header className="w-full max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
           <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className="h-12 w-12 text-primary"
            >
            <rect width="256" height="256" fill="none" />
            <path d="M88,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <path d="M112,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
            <path d="M168,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <path d="M192,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
            <rect x="32" y="48" width="192" height="160" rx="16" transform="translate(256 256) rotate(180)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
           </svg>
           <h1 className="text-4xl sm:text-5xl font-headline font-bold tracking-tighter">
            AIoT Studio
           </h1>
        </div>
        <p className="text-lg text-muted-foreground">
          An agentic development environment for your IoT and embedded systems projects.
        </p>
      </header>
      
      <main className="w-full max-w-5xl mx-auto">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="w-full sm:w-auto text-base h-14 px-8 rounded-lg mb-8">
              <Plus className="mr-2" />
              Create New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Project</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Enter project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
            <CardDescription>Select a project to open its workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                <p className="text-muted-foreground col-span-full text-center py-8">Loading projects...</p>
              ) : sortedProjects.length > 0 ? sortedProjects.map(project => (
                <Link href={`/aide/${project.id}`} key={project.id} passHref>
                  <div className="p-4 border rounded-lg hover:bg-muted hover:border-primary transition-all cursor-pointer group h-full flex flex-col justify-between">
                    <div>
                      <div className="font-semibold flex items-center gap-2 mb-2">
                        <Folder className="text-primary"/> 
                        {project.name}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4"/> 
                        Last modified: {new Date(project.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex justify-end items-center mt-4">
                        <span className="text-sm text-primary group-hover:underline">Open Workspace</span>
                        <ArrowRight className="h-4 w-4 ml-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              )) : (
                <p className="text-muted-foreground col-span-full text-center py-8">No projects found. Create one to get started!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
