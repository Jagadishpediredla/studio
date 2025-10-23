
"use client";

import { useState, useEffect } from 'react';
import { getJobs, getJobDetails } from '@/app/actions';
import type { JobSummary, JobStatistics, JobDetails } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FileText, Clock, BarChart, Server, Cpu, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';

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
    if (selectedJob?.jobId === jobId) return;
    setIsDetailsLoading(true);
    setSelectedJob(null);
    try {
      const response = await getJobDetails(jobId);
      if ('success' in response && response.success) {
        setSelectedJob(response as JobDetails);
      } else {
         const errorResponse = response as { success: false; error: string };
        throw new Error(errorResponse.error || 'Failed to load job details');
      }
    } catch (err: any) {
      console.error('Failed to load job details:', err);
    } finally {
      setIsDetailsLoading(false);
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };


  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
      {/* Jobs List */}
      <Card className="xl:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow min-h-0">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : error ? (
             <div className="text-red-500">{error}</div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-2">
                {jobs.map(job => (
                  <div 
                    key={job.jobId}
                    onClick={() => loadJobDetails(job.jobId)}
                    className={cn(
                        `p-3 border rounded-lg cursor-pointer hover:bg-muted/80`,
                        selectedJob?.jobId === job.jobId ? 'border-primary bg-muted' : 'bg-card'
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-semibold font-mono">{job.jobId.slice(-12)}</div>
                      <Badge className={cn('text-xs', getStatusClass(job.status))}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {job.board} &bull; {job.codeLength} chars
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
      
      {/* Job Details */}
      <Card className="xl:col-span-2 flex flex-col">
         <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow min-h-0">
         <ScrollArea className="h-full pr-4">
          {isDetailsLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
             </div>
          ) : selectedJob ? (
            <div className="space-y-6">
                {/* Statistics Panel */}
                {statistics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-muted p-4 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{statistics.totalJobs}</div>
                        <div className="text-sm text-muted-foreground">Total</div>
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
                        <div className="text-sm text-muted-foreground">Avg Time</div>
                    </div>
                </div>
                )}
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div><label className="text-sm font-medium text-muted-foreground">Job ID</label><div className="font-mono text-sm">{selectedJob.jobId}</div></div>
                    <div><label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className={`inline-block px-2 py-1 rounded text-sm ${getStatusClass(selectedJob.status)}`}>
                            {selectedJob.status} ({selectedJob.progress}%)
                        </div>
                    </div>
                    <div><label className="text-sm font-medium text-muted-foreground">Board</label><div>{selectedJob.hardware?.board}</div></div>
                    <div><label className="text-sm font-medium text-muted-foreground">Duration</label><div>{selectedJob.build?.duration ? `${(selectedJob.build.duration / 1000).toFixed(2)}s` : 'N/A'}</div></div>
                    <div><label className="text-sm font-medium text-muted-foreground">Submitted</label><div>{new Date(selectedJob.createdAt).toLocaleString()}</div></div>
                    <div><label className="text-sm font-medium text-muted-foreground">Sender IP</label><div>{selectedJob.sender?.ip}</div></div>
                </div>
                
                {/* Timeline */}
                {selectedJob.timeline && selectedJob.timeline.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Clock /> Timeline</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto bg-muted p-3 rounded-lg">
                        {selectedJob.timeline.map((event, i) => (
                            <div key={i} className="flex justify-between items-start text-sm border-l-2 border-primary/50 pl-3">
                            <div>
                                <div className="font-medium">{event.message}</div>
                                <div className="text-muted-foreground text-xs">{event.phase} &bull; {event.progress}%</div>
                            </div>
                            <div className="text-muted-foreground text-xs min-w-max ml-4">
                                {new Date(event.timestamp).toLocaleTimeString()}
                            </div>
                            </div>
                        ))}
                        </div>
                    </div>
                )}

                {/* Build Details */}
                {selectedJob.build && (
                    <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><HardDrive /> Build Details</h3>
                        <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                            <p><strong>Build ID:</strong> <span className="font-mono">{selectedJob.build.buildId}</span></p>
                            {selectedJob.build.success ? <p className="text-green-500 flex items-center gap-1"><CheckCircle size={16}/> Build Succeeded</p> : <p className="text-red-500 flex items-center gap-1"><AlertTriangle size={16}/>Build Failed</p>}
                            <p><strong>Binaries:</strong></p>
                            <ul className="list-disc pl-5">
                                {selectedJob.build.binaryFiles.map(file => (
                                    <li key={file.filename}>{file.filename} ({(file.size / 1024).toFixed(2)} KB)</li>
                                ))}
                            </ul>
                            {selectedJob.downloads && (
                                <div className="pt-2">
                                <h4 className="font-medium mb-1">Downloads</h4>
                                {Object.entries(selectedJob.downloads).map(([type, url]) => (
                                    <a key={type} href={url} className="inline-block px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 mr-2">
                                    Download {type.toUpperCase()}
                                    </a>
                                ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* System Info */}
                {selectedJob.system && (
                     <div>
                        <h3 className="font-semibold mb-2 flex items-center gap-2"><Server /> System Info</h3>
                        <div className="bg-muted p-3 rounded-lg grid grid-cols-2 gap-2 text-sm">
                           <p><strong>Hostname:</strong> {selectedJob.system.hostname}</p>
                           <p><strong>Platform:</strong> {selectedJob.system.platform}</p>
                           <p><strong>Node.js:</strong> {selectedJob.system.nodeVersion}</p>
                        </div>
                    </div>
                )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground h-full flex items-center justify-center">
              <p>Select a job from the list to view its details.</p>
            </div>
          )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
