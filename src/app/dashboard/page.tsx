
"use client";

import JobDashboard from '@/components/job-dashboard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {

  return (
    <div className="h-screen w-screen bg-muted/40 text-foreground flex flex-col p-4 font-body">
      <header className="flex justify-between items-center pb-4 border-b mb-4">
        <h1 className="text-3xl font-headline">Job Dashboard</h1>
        <Button asChild variant="outline">
          <Link href="/aide">Back to AIDE</Link>
        </Button>
      </header>
      <main className="flex-grow overflow-y-auto">
        {/* As per docs, use a consistent user ID */}
        <JobDashboard userId="user_123" />
      </main>
    </div>
  );
}
