
"use client";

import { useState, useEffect } from 'react';
import { getJobs, getJobDetails } from '@/app/actions';
import type { JobSummary, JobStatistics, JobDetails, TimelineEvent } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FileText, Clock, BarChart, Server, Cpu, Briefcase } from 'lucide-react';

interface JobDashboardProps {
  userId: string;
}

export default function JobDashboard({ userId }: JobDashboardProps) {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadJobs();
  }, [userId]);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getJobs(50, undefined, userId);
      if (response.success) {
        setJobs(response.jobs || []);
        setStatistics(response.statistics || null);
        if ((response.jobs || []).length > 0) {
            loadJobDetails(response.jobs![0].jobId);
        }
      } else {
        throw new Error(response.error || 'Failed to load jobs');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobDetails = async (jobId: string) => {
    if (selectedJob?.logId === jobId && !isDetailsLoading) return;
    setIsDetailsLoading(true);
    try {
      const response = await getJobDetails(jobId);
      if (response.success && response.job) {
        setSelectedJob(response.job);
      } else {
        throw new Error(response.error || 'Failed to load job details');
      }
    } catch (err: any) {
       setError(err.message);
    } finally {
      setIsDetailsLoading(false);
    }
  };
  
  const getStatusClass = (status: string) => {
    const lowerStatus = status.toLowerCase();
    switch (lowerStatus) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const TimelineEntry = ({ event }: { event: TimelineEvent }) => {
    const isClient = event.source === 'client';
    return (
        <div className="flex items-start gap-4">
            <div className={cn("mt-1 flex h-4 w-4 items-center justify-center rounded-full", isClient ? "bg-blue-500" : "bg-purple-500")}>
                {isClient ? <Server className="h-2.5 w-2.5 text-white" /> : <Cpu className="h-2.5 w-2.5 text-white" />}
            </div>
            <div className="flex-1 pb-4 border-l-2 border-border pl-4">
                 <p className="text-sm font-medium">{event.message || event.event}</p>
                 <p className="text-xs text-muted-foreground">Source: {event.source}</p>
                 <time className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleString()}</time>
            </div>
        </div>
    );
  };


  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
        {statistics && (
             <Card className="xl:col-span-3">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> Job Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="text-2xl font-bold text-primary">{statistics.totalJobs}</div>
                            <div className="text-sm text-muted-foreground">Total Jobs</div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-500">{statistics.completedJobs}</div>
                            <div className="text-sm text-muted-foreground">Completed</div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="text-2xl font-bold text-red-500">{statistics.failedJobs}</div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-500">
                                {statistics.averageDuration > 0 ? `${(statistics.averageDuration / 1000).toFixed(2)}s` : 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">Avg. Duration</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

      <Card className="xl:col-span-1 flex flex-col h-[calc(100vh-220px)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Briefcase /> Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow min-h-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : error && jobs.length === 0 ? (
             <div className="text-red-500 p-4 bg-destructive/10 rounded-md">{error}</div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-2">
                {jobs.map(job => (
                  <div 
                    key={job.jobId}
                    onClick={() => loadJobDetails(job.jobId)}
                    className={cn(
                        `p-3 border rounded-lg cursor-pointer hover:bg-muted/80 transition-colors`,
                        selectedJob?.logId === job.jobId ? 'border-primary bg-muted' : 'bg-card'
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-semibold font-mono">{job.jobId}</div>
                      <Badge className={cn('text-xs', getStatusClass(job.status))}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {job.requestId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <Card className="xl:col-span-2 flex flex-col h-[calc(100vh-220px)]">
         <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText /> Job Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow min-h-0">
         <ScrollArea className="h-full pr-4">
          {isDetailsLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
             </div>
          ) : selectedJob ? (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><label className="font-medium text-muted-foreground">Job ID</label><div className="font-mono">{selectedJob.logId}</div></div>
                    <div><label className="font-medium text-muted-foreground">Request ID</label><div className="font-mono">{selectedJob.requestId}</div></div>
                    <div><label className="font-medium text-muted-foreground">Build ID</label><div className="font-mono">{selectedJob.buildId}</div></div>
                    
                    <div><label className="font-medium text-muted-foreground">Status</label>
                        <Badge className={cn('text-xs', getStatusClass(selectedJob.status))}>
                            {selectedJob.status}
                        </Badge>
                    </div>
                    <div><label className="font-medium text-muted-foreground">Created</label><div>{new Date(selectedJob.createdAt).toLocaleString()}</div></div>
                    <div><label className="font-medium text-muted-foreground">Updated</label><div>{new Date(selectedJob.updatedAt).toLocaleString()}</div></div>
                    
                    <div><label className="font-medium text-muted-foreground">Phase</label><div className="capitalize">{selectedJob.phase}</div></div>
                    <div><label className="font-medium text-muted-foreground">Client ID</label><div className="font-mono">{selectedJob.serverSide?.clientId}</div></div>
                    <div><label className="font-medium text-muted-foreground">User ID</label><div>{selectedJob.clientSide?.userId}</div></div>
                </div>
                
                {/* Timeline - Convert object to array if needed */}
                {selectedJob.timeline && (
                    <div>
                        <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock /> Merged Timeline</h3>
                        <div className="relative">
                            <div className="absolute left-[7px] h-full w-0.5 bg-border -z-10"></div>
                             {Object.values(selectedJob.timeline).sort((a,b) => a.timestamp - b.timestamp).map((event, i) => (
                                <TimelineEntry key={i} event={event} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center">
                <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Select a Job</h3>
                <p>Select a job from the list to view its detailed logs and timeline.</p>
            </div>
          )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
