
"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Folder, Clock, ArrowRight, Loader2, Trash2, Wifi, Zap, Cpu, Cloud, Brain } from 'lucide-react';
import { getProjects, createProject, deleteProject } from '@/app/actions';
import { type Project } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      const result = await getProjects();
      if (result.success && result.projects) {
        const parsedProjects = result.projects.map(p => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
        }));
        setProjects(parsedProjects as unknown as Project[]);
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
    
    setIsCreating(false);
    
    if (result.success && result.project) {
        toast({ title: "Success", description: `Project "${result.project.name}" created.`});
        setIsDialogOpen(false);
        setNewProjectName('');
        router.push(`/aide/${result.project.id}`);
    } else {
        toast({
            title: "Error creating project",
            description: result.error || "An unknown error occurred.",
            variant: "destructive",
        });
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    const result = await deleteProject(projectToDelete.id);
    if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
        toast({ title: "Project Deleted", description: `Project "${projectToDelete.name}" was successfully deleted.`});
    } else {
        toast({
            title: "Error deleting project",
            description: result.error || "An unknown error occurred.",
            variant: "destructive",
        });
    }
    setProjectToDelete(null);
  }
  
  const sortedProjects = [...projects].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col items-center p-4 sm:p-8 font-body overflow-y-auto">
      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto mb-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-lg animate-pulse"></div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 256 256"
              className="h-24 w-24 text-primary relative"
            >
              <rect width="256" height="256" fill="none" />
              <path d="M88,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
              <path d="M112,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
              <path d="M168,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
              <path d="M192,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
              <rect x="32" y="48" width="192" height="160" rx="16" transform="translate(256 256) rotate(180)" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
            </svg>
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-headline font-bold tracking-tighter bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent mb-6">
          AIoT Studio
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10">
          The next-generation agentic development environment for IoT and embedded systems. <br />
          <span className="text-primary font-semibold">AI-powered</span> coding, <span className="text-primary font-semibold">cloud-compiled</span> firmware, and <span className="text-primary font-semibold">seamless</span> deployment.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="text-lg h-14 px-8 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                <Zap className="mr-2 h-5 w-5" />
                Start New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Project</DialogTitle>
                <DialogDescription>
                  Enter a name for your new IoT project. Get started with AI assistance right away.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="e.g., Smart Home Controller, Weather Station..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  autoFocus
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
          
          <Button size="lg" variant="outline" className="text-lg h-14 px-8 rounded-lg" asChild>
            <Link href="/ota">
              <Wifi className="mr-2 h-5 w-5" />
              OTA Update
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="w-full max-w-6xl mx-auto mb-16">
        <h2 className="text-3xl font-headline font-bold text-center mb-12">Powerful Features for IoT Development</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-card/50 hover:bg-card/80 transition-all duration-300 border-primary/20">
            <CardHeader>
              <Brain className="h-12 w-12 text-primary mb-4" />
              <CardTitle>AI Pair Programming</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Work alongside an AI assistant that understands embedded systems. Get code suggestions, explanations, and debugging help in real-time.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 hover:bg-card/80 transition-all duration-300 border-primary/20">
            <CardHeader>
              <Cloud className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Cloud Compilation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Compile your firmware in the cloud with zero setup. Support for ESP32, Arduino, and other popular platforms.
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 hover:bg-card/80 transition-all duration-300 border-primary/20">
            <CardHeader>
              <Cpu className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Smart Deployment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Deploy firmware over-the-air with confidence. Monitor deployment status and rollback if needed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Recent Projects Section */}
      <div className="w-full max-w-6xl mx-auto mb-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-headline font-bold">Recent Projects</h2>
            <p className="text-muted-foreground">Continue your work from where you left off</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-10">
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Project</DialogTitle>
                <DialogDescription>
                  Enter a name for your new IoT project. Get started with AI assistance right away.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="e.g., Smart Home Controller, Weather Station..."
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
        </div>
        
        <AlertDialog>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-6 border rounded-lg h-40">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-1/2 mb-6" />
                    <div className="flex justify-end">
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                ))
              ) : sortedProjects.length > 0 ? sortedProjects.map(project => (
                <div key={project.id} className="p-6 border rounded-lg hover:bg-muted/50 transition-colors group h-full flex flex-col justify-between bg-card/30 hover:bg-card/50">
                  <div className="flex justify-between items-start mb-4">
                    <Link href={`/aide/${project.id}`} className="flex-grow">
                      <div className="font-semibold flex items-center gap-2 mb-2">
                        <Folder className="text-primary"/> 
                        {project.name}
                      </div>
                    </Link>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0" onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}>
                        <Trash2 className="h-4 w-4 text-destructive/50 hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                  </div>
                  <Link href={`/aide/${project.id}`} passHref className="flex flex-col justify-end h-full">
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                      <Clock className="h-4 w-4"/> 
                      Last modified: {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                    <div className="flex justify-end items-center">
                      <span className="text-sm text-primary group-hover:underline flex items-center">
                        Open Workspace
                        <ArrowRight className="h-4 w-4 ml-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </div>
                  </Link>
                </div>
              )) : (
                <div className="col-span-full text-center py-12">
                  <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
                  <p className="text-muted-foreground mb-6">Create your first project to get started with AIoT Studio</p>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Project
                    </Button>
                  </DialogTrigger>
                </div>
              )}
            </div>
          </CardContent>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project <span className="font-bold">"{projectToDelete?.name}"</span> and all of its associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProjectToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto pt-8 border-t border-border mt-auto">
        <div className="text-center text-muted-foreground text-sm">
          <p>AIoT Studio - Empowering the next generation of IoT developers</p>
        </div>
      </div>
    </div>
  );
}

    