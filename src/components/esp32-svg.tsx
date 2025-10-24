
"use client"

import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const Pin = ({ name, children }: { name: string, children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent><p>{name}</p></TooltipContent>
  </Tooltip>
)

export function ESP32Svg({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlSpace="preserve"
        viewBox="0 0 530 1150"
        className={cn("font-code", className)}
        data-ai-hint="ESP32 diagram"
      >
        <style>
          {`
            .pin-rect { fill: #333; stroke: #888; stroke-width: 0.5; transition: fill 0.2s; }
            .pin-rect:hover { fill: hsl(var(--primary)); }
            .pin-text { fill: #ddd; font-size: 20px; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
            .pin-label-left { fill: #888; font-size: 20px; text-anchor: end; dominant-baseline: central; pointer-events: none; }
            .pin-label-right { fill: #888; font-size: 20px; text-anchor: start; dominant-baseline: central; pointer-events: none; }
            .board-body { fill: #1a1a1a; stroke: #444; stroke-width: 2; }
            .esp-module { fill: #2a2a2a; stroke: #555; stroke-width: 1; }
            .esp-chip { fill: #444; }
            .board-text { fill: #aaa; font-size: 22px; font-weight: bold; }
          `}
        </style>
        <rect width={530} height={1150} fill="transparent" />
        <rect
          x={125}
          y={25}
          width={280}
          height={1100}
          rx={15}
          className="board-body"
        />
        <rect
          x={165}
          y={350}
          width={200}
          height={280}
          rx={5}
          className="esp-module"
        />
        <rect
          x={210}
          y={420}
          width={110}
          height={110}
          className="esp-chip"
        />
        <text x={265} y={390} className="board-text" textAnchor="middle">ESP-WROOM-32</text>
        <text x={265} y={100} className="board-text text-primary" textAnchor="middle">AIoT Studio</text>
        
        {/* Left Pins */}
        <text x={110} y={150} className="pin-label-left">3V3</text>
        <Pin name="3V3"><rect x={140} y={135} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={150} className="pin-text">1</text>
        
        <text x={110} y={190} className="pin-label-left">EN</text>
        <Pin name="EN"><rect x={140} y={175} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={190} className="pin-text">2</text>
        
        <text x={110} y={230} className="pin-label-left">VP</text>
        <Pin name="SENSOR_VP (ADC1_CH0, GPIO36)"><rect x={140} y={215} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={230} className="pin-text">3</text>
        
        <text x={110} y={270} className="pin-label-left">VN</text>
        <Pin name="SENSOR_VN (ADC1_CH3, GPIO39)"><rect x={140} y={255} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={270} className="pin-text">4</text>
        
        <text x={110} y={310} className="pin-label-left">IO34</text>
        <Pin name="IO34 (ADC1_CH6)"><rect x={140} y={295} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={310} className="pin-text">5</text>
        
        <text x={110} y={350} className="pin-label-left">IO35</text>
        <Pin name="IO35 (ADC1_CH7)"><rect x={140} y={335} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={350} className="pin-text">6</text>
        
        <text x={110} y={390} className="pin-label-left">IO32</text>
        <Pin name="IO32 (ADC1_CH4, TOUCH9)"><rect x={140} y={375} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={390} className="pin-text">7</text>
        
        <text x={110} y={430} className="pin-label-left">IO33</text>
        <Pin name="IO33 (ADC1_CH5, TOUCH8)"><rect x={140} y={415} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={430} className="pin-text">8</text>
        
        <text x={110} y={470} className="pin-label-left">IO27</text>
        <Pin name="IO27 (ADC2_CH7, TOUCH7)"><rect x={140} y={455} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={470} className="pin-text">9</text>
        
        <text x={110} y={510} className="pin-label-left">IO26</text>
        <Pin name="IO26 (ADC2_CH9, DAC_2)"><rect x={140} y={495} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={510} className="pin-text">10</text>
        
        <text x={110} y={550} className="pin-label-left">IO25</text>
        <Pin name="IO25 (ADC2_CH8, DAC_1)"><rect x={140} y={535} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={550} className="pin-text">11</text>
        
        <text x={110} y={590} className="pin-label-left">IO14</text>
        <Pin name="IO14 (ADC2_CH6, TOUCH6)"><rect x={140} y={575} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={590} className="pin-text">12</text>
        
        <text x={110} y={630} className="pin-label-left">IO12</text>
        <Pin name="IO12 (ADC2_CH5, TOUCH5)"><rect x={140} y={615} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={630} className="pin-text">13</text>
        
        <text x={110} y={670} className="pin-label-left">IO13</text>
        <Pin name="IO13 (ADC2_CH4, TOUCH4)"><rect x={140} y={655} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={670} className="pin-text">14</text>

        <text x={110} y={710} className="pin-label-left">GND</text>
        <Pin name="GND"><rect x={140} y={695} width={40} height={30} className="pin-rect" /></Pin>
        <text x={185} y={710} className="pin-text">15</text>
        
        {/* Right Pins */}
        <text x={420} y={150} className="pin-label-right">GND</text>
        <Pin name="GND"><rect x={350} y={135} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={150} className="pin-text">30</text>
        
        <text x={420} y={190} className="pin-label-right">VIN</text>
        <Pin name="VIN"><rect x={350} y={175} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={190} className="pin-text">29</text>
        
        <text x={420} y={230} className="pin-label-right">IO23</text>
        <Pin name="IO23"><rect x={350} y={215} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={230} className="pin-text">28</text>
        
        <text x={420} y={270} className="pin-label-right">IO22</text>
        <Pin name="IO22 (SCL)"><rect x={350} y={255} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={270} className="pin-text">27</text>
        
        <text x={420} y={310} className="pin-label-right">IO1 (TX0)</text>
        <Pin name="IO1 (TXD0)"><rect x={350} y={295} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={310} className="pin-text">26</text>
        
        <text x={420} y={350} className="pin-label-right">IO3 (RX0)</text>
        <Pin name="IO3 (RXD0)"><rect x={350} y={335} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={350} className="pin-text">25</text>
        
        <text x={420} y={390} className="pin-label-right">IO21</text>
        <Pin name="IO21 (SDA)"><rect x={350} y={375} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={390} className="pin-text">24</text>
        
        <text x={420} y={430} className="pin-label-right">IO19</text>
        <Pin name="IO19 (MISO)"><rect x={350} y={415} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={430} className="pin-text">23</text>
        
        <text x={420} y={470} className="pin-label-right">IO18</text>
        <Pin name="IO18 (SCK)"><rect x={350} y={455} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={470} className="pin-text">22</text>

        <text x={420} y={510} className="pin-label-right">IO5</text>
        <Pin name="IO5 (CS)"><rect x={350} y={495} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={510} className="pin-text">21</text>
        
        <text x={420} y={550} className="pin-label-right">IO17</text>
        <Pin name="IO17 (TXD2)"><rect x={350} y={535} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={550} className="pin-text">20</text>
        
        <text x={420} y={590} className="pin-label-right">IO16</text>
        <Pin name="IO16 (RXD2)"><rect x={350} y={575} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={590} className="pin-text">19</text>
        
        <text x={420} y={630} className="pin-label-right">IO4</text>
        <Pin name="IO4 (ADC2_CH0, TOUCH0)"><rect x={350} y={615} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={630} className="pin-text">18</text>
        
        <text x={420} y={670} className="pin-label-right">IO2</text>
        <Pin name="IO2 (ADC2_CH2, TOUCH2)"><rect x={350} y={655} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={670} className="pin-text">17</text>
        
        <text x={420} y={710} className="pin-label-right">IO15</text>
        <Pin name="IO15 (ADC2_CH3, TOUCH3)"><rect x={350} y={695} width={40} height={30} className="pin-rect" /></Pin>
        <text x={310} y={710} className="pin-text">16</text>
        
      </svg>
    </TooltipProvider>
  )
}
