// This page is obsolete and will be replaced by the dynamic route at /aide/[projectId]/page.tsx
// To prevent routing errors, we can redirect to the main page.
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AideRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return null; 
}
