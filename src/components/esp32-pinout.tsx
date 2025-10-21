"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Cpu, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { ESP32Svg } from '@/components/esp32-svg';

interface Esp32PinoutProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Esp32Pinout({ className, ...props }: Esp32PinoutProps) {
  return (
    <Card className={cn("flex flex-col", className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle className="font-headline flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            ESP32 Pinout
          </CardTitle>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <Maximize className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-headline">ESP32 Pinout - Detailed View</DialogTitle>
            </DialogHeader>
            <div className="flex-grow min-h-0">
              <ScrollArea className="h-full w-full">
                  <ESP32Svg className="w-full h-auto" />
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center min-h-0 p-2">
        <ESP32Svg className="w-full h-full object-contain" />
      </CardContent>
    </Card>
  );
}
