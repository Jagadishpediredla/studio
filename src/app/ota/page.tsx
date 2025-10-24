
"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, Wifi, HardDrive, Cpu, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { performOtaUpdate } from '@/app/actions';
import Link from 'next/link';

type Device = {
  id: string;
  name: string;
  ip: string;
  board: string;
};

type UploadStatus = 'idle' | 'discovering' | 'uploading' | 'success' | 'failed';

export default function OtaUpdatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && (selectedFile.name.endsWith('.bin') || selectedFile.name.endsWith('.hex'))) {
      setFile(selectedFile);
      addLog(`Selected firmware: ${selectedFile.name}`);
    } else {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a valid .bin or .hex firmware file.',
        variant: 'destructive',
      });
    }
  };
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleDiscoverDevices = () => {
    setStatus('discovering');
    addLog('Scanning network for compatible devices...');
    setProgress(0);
    const discoveryProgress = setInterval(() => {
        setProgress(p => p + 10);
    }, 200);

    setTimeout(() => {
      clearInterval(discoveryProgress);
      setProgress(100);
      const foundDevices = [
        { id: 'esp32-living-room', name: 'ESP32 Living Room', ip: '192.168.1.101', board: 'esp32' },
        { id: 'esp8266-garage', name: 'ESP8266 Garage', ip: '192.168.1.105', board: 'esp8266' },
      ];
      setDevices(foundDevices);
      addLog(`Discovery complete. Found ${foundDevices.length} devices.`);
      setStatus('idle');
    }, 2000);
  };
  
  const handleUpload = async () => {
    if (!file || !selectedDevice) {
      toast({
        title: 'Missing Information',
        description: 'Please select a firmware file and a target device.',
        variant: 'destructive',
      });
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setLogs([]);
    addLog(`Starting OTA update for ${selectedDevice} with ${file.name}`);
    
    performOtaUpdate(file.name, selectedDevice, (progressUpdate) => {
        addLog(progressUpdate.message);
        setProgress(progressUpdate.progress);
        
        if (progressUpdate.status === 'success') {
            setStatus('success');
            toast({ title: 'OTA Update Successful', description: `Firmware uploaded to ${selectedDevice}.`});
        } else if (progressUpdate.status === 'failed') {
            setStatus('failed');
            toast({ title: 'OTA Update Failed', description: progressUpdate.message, variant: 'destructive'});
        }
    });

  };

  const isUploading = status === 'uploading' || status === 'discovering';

  const StatusIcon = () => {
    switch (status) {
        case 'uploading': return <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />;
        case 'success': return <CheckCircle className="h-6 w-6 text-green-500" />;
        case 'failed': return <XCircle className="h-6 w-6 text-red-500" />;
        default: return <Wifi className="h-6 w-6 text-primary" />;
    }
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-body">
       <div className="absolute top-4 left-4">
        <Button asChild variant="outline">
          <Link href="/aide">Back to AIDE</Link>
        </Button>
      </div>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-3 text-3xl">
            <StatusIcon />
            Firmware OTA Update
          </CardTitle>
          <CardDescription>Upload compiled firmware to a device over the network.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Controls */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><HardDrive /> 1. Select Firmware</h3>
                <label htmlFor="file-upload" 
                  className={cn(
                    "w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-accent",
                    isUploading && "cursor-not-allowed opacity-50"
                  )}>
                  <UploadCloud className="h-10 w-10 text-muted-foreground" />
                  <span className="mt-2 text-sm font-medium">
                    {file ? file.name : 'Click to upload .bin or .hex file'}
                  </span>
                </label>
                <Input id="file-upload" type="file" accept=".bin,.hex" className="hidden" onChange={handleFileChange} disabled={isUploading} />
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2"><Cpu /> 2. Choose Device</h3>
                 <div className="flex gap-2">
                    <Select onValueChange={setSelectedDevice} value={selectedDevice || ''} disabled={isUploading || devices.length === 0}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a target device" />
                        </SelectTrigger>
                        <SelectContent>
                            {devices.map(device => (
                                <SelectItem key={device.id} value={device.id}>
                                    {device.name} ({device.ip})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleDiscoverDevices} disabled={isUploading}>
                        {status === 'discovering' ? <Loader2 className="mr-2 animate-spin" /> : <Wifi className="mr-2"/>}
                        Discover
                    </Button>
                 </div>
              </div>

               <div className="space-y-2">
                 <h3 className="font-semibold flex items-center gap-2"><UploadCloud /> 3. Start Update</h3>
                 <Button className="w-full" onClick={handleUpload} disabled={isUploading || !file || !selectedDevice}>
                    {isUploading ? <Loader2 className="mr-2 animate-spin" /> : <UploadCloud className="mr-2"/>}
                    {status === 'uploading' ? 'Update in Progress...' : 'Upload Firmware'}
                 </Button>
               </div>
            </div>

            {/* Right Column: Status and Logs */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h3 className="font-semibold">Update Progress</h3>
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">{Math.round(progress)}%</p>
                </div>
                 <div className="space-y-2">
                    <h3 className="font-semibold">Logs</h3>
                    <div className="h-64 bg-black rounded-md p-3 font-code text-sm overflow-y-auto">
                        {logs.map((log, index) => (
                           <p key={index} className="whitespace-pre-wrap leading-relaxed text-green-400">
                             &gt; {log}
                           </p> 
                        ))}
                    </div>
                 </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
