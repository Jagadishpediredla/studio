
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Bot, Code, Rocket } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col items-center justify-center p-8 text-center font-body">
      <div className="flex items-center gap-4 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 256 256"
          className="h-16 w-16 text-primary"
        >
          <rect width="256" height="256" fill="none" />
          <path
            d="M88,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="16"
          />
          <path
            d="M112,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="16"
          />
          <path
            d="M168,140a7.8,7.8,0,0,1-8,8,12,12,0,0,1-12-12,8,8,0,0,1,16,0,12,12,0,0,1-12,12,7.8,7.8,0,0,1-8-8"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="16"
          />
          <path
            d="M192,116a7.8,7.8,0,0,1,8,8,12,12,0,0,1,12-12,8,8,0,0,1,0,16,12,12,0,0,1-12-12,7.8,7.8,0,0,1,8-8Z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="16"
          />
          <rect
            x="32"
            y="48"
            width="192"
            height="160"
            rx="16"
            transform="translate(256 256) rotate(180)"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"

            strokeLinejoin="round"
            strokeWidth="16"
          />
        </svg>
        <h1 className="text-5xl font-headline font-bold tracking-tighter">
          Welcome to AIoT Studio
        </h1>
      </div>
      <p className="max-w-2xl text-lg text-muted-foreground mb-12">
        An agentic development environment designed to accelerate your IoT and embedded systems workflow. Let's build something amazing together.
      </p>

      <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
          <Button asChild size="lg" className="relative text-lg h-16 px-8 rounded-lg leading-none flex items-center divide-x divide-gray-600">
            <Link href="/aide">
              <span className="flex items-center pr-6">
                  <Rocket className="mr-3" />
                  Launch the AIDE
              </span>
              <span className="pl-6 text-indigo-400 group-hover:text-white transition duration-200">
                Start Building &rarr;
              </span>
            </Link>
          </Button>
      </div>

       <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
            <div className="flex flex-col items-center gap-2 p-6 bg-muted/50 rounded-lg">
                <Bot className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-semibold text-lg">AI Co-pilot</h3>
                <p className="text-sm text-muted-foreground">
                    Chat with an AI that understands your code, remembers your project, and helps you write, debug, and deploy.
                </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-6 bg-muted/50 rounded-lg">
                <Code className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-semibold text-lg">Cloud Compilation</h3>
                <p className="text-sm text-muted-foreground">
                    Offload your Arduino and ESP32 compilations to a distributed cloud system for faster, more reliable builds.
                </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-6 bg-muted/50 rounded-lg">
                <Rocket className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-semibold text-lg">OTA Deployment</h3>
                <p className="text-sm text-muted-foreground">
                    Deploy firmware over-the-air to your devices with a simple, streamlined interface.
                </p>
            </div>
       </div>

    </div>
  );
}
