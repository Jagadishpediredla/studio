# **App Name**: AIoT Studio

## Core Features:

- AI Code Generation: Generate ESP32 Arduino code snippets from natural language prompts using AI. This is the primary tool for code creation.
- Interactive ESP32 Pinout Visualization: Display an interactive SVG diagram of the ESP32, reflecting real-time pin states with color-coded indicators for digital and analog I/O. Include a "Big View" option for detailed inspection. Consider Borland colors for state indication.
- Deployment Pipeline UI: Visualize the end-to-end deployment pipeline (Code Gen -> Compile -> Upload -> Verify) with status indicators, icons, and color-coding for each step.
- AI Technical Analysis: Generate a natural language report analyzing the behavior of the code based on sensor inputs such as the water sensor. Show possible failure modes.
- Advanced Code Editor: Integrate a code editor (like Ace Editor or Monaco Editor) with syntax highlighting, autocompletion, and real-time error checking, similar to leading IDEs.
- Docker Communication: Enable communication with a Docker container on the user's computer to facilitate compilation and deployment of ESP32 firmware.
- OTA Updates: Implement Over-The-Air (OTA) update functionality to allow remote firmware updates to the ESP32 hardware.

## Style Guidelines:

- Primary color: Midnight blue (#2C3E50) to convey technical sophistication and stability.
- Background color: Dark gray (#34495E) to reduce eye strain and enhance contrast.
- Accent color: Electric blue (#3498DB) for interactive elements and highlights.
- Headline font: 'Space Grotesk' (sans-serif) for a modern, tech-focused aesthetic; body text: 'Inter' (sans-serif)
- Code font: 'Source Code Pro' (monospace) for clear and readable code display.
- Use minimalist, vector-based icons to represent actions and status within the UI.  Icons should be consistent and intuitive.
- Maintain a fixed, five-panel grid layout with dedicated areas for AI controls, code editing, ESP32 visualization, technical analysis, and a global command bar.
- Incorporate subtle animations to provide feedback during code generation, compilation, and deployment processes.