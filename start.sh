#!/bin/bash

# start.sh
# This script manages backend/frontend services based on the provided parameter (start, stop, restart).

ACTION=${1:-start}
ACTION=$(echo "$ACTION" | tr '[:upper:]' '[:lower:]')

echo -e "\e[36mTracly Service Manager\e[0m"
echo -e "\e[36mAction: $ACTION\e[0m"

# Get absolute path to the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Utility to find the PID using a specific port
get_pid_by_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -t -i:$port -sTCP:LISTEN 2>/dev/null
    else
        # Windows (Git Bash/MSYS2/WSL) fallback using netstat
        netstat -ano 2>/dev/null | awk '/:'"$port"'.*LISTENING/ {print $5}' | head -n 1
    fi
}

backend_pid=$(get_pid_by_port 3001)
frontend_pid=$(get_pid_by_port 4200)

stop_services() {
    echo -e "\e[33mStopping existing services...\e[0m"
    
    if [ -n "$backend_pid" ]; then
        if command -v taskkill >/dev/null 2>&1; then
            taskkill //PID "$backend_pid" //F 2>/dev/null || taskkill /PID "$backend_pid" /F 2>/dev/null
        else
            kill -9 "$backend_pid" 2>/dev/null
        fi
        echo -e "\e[32m✅ Backend stopped.\e[0m"
    else
        echo -e "\e[90mℹ️ Backend is not running.\e[0m"
    fi

    if [ -n "$frontend_pid" ]; then
        if command -v taskkill >/dev/null 2>&1; then
            taskkill //PID "$frontend_pid" //F 2>/dev/null || taskkill /PID "$frontend_pid" /F 2>/dev/null
        else
            kill -9 "$frontend_pid" 2>/dev/null
        fi
        echo -e "\e[32m✅ Frontend stopped.\e[0m"
    else
        echo -e "\e[90mℹ️ Frontend is not running.\e[0m"
    fi
}

start_services() {
    if [ -n "$backend_pid" ] || [ -n "$frontend_pid" ]; then
        echo -e "\e[33mWARNING: One or more services are already running! Use 'restart' to restart them.\e[0m"
        exit 1
    fi

    echo -e "\e[32mStarting Backend Service...\e[0m"
    
    # Try terminal-based launchers
    if command -v mintty >/dev/null 2>&1; then
        # Git Bash on Windows has mintty
        mintty -t "Backend Server" -h always -e sh -c "cd \"$SCRIPT_DIR/server\" && node src/app.js; exec bash" &
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]] && command -v start >/dev/null 2>&1; then
        # Windows 'start' command from MINGW / Cygwin
        start bash -c "cd \"$SCRIPT_DIR/server\" && node src/app.js; exec bash"
    elif command -v gnome-terminal >/dev/null 2>&1; then
        # Linux with GNOME
        gnome-terminal --title="Backend Server" -- bash -c "cd \"$SCRIPT_DIR/server\" && node src/app.js; exec bash" &
    elif command -v xterm >/dev/null 2>&1; then
        # Linux with XTerm
        xterm -T "Backend Server" -e "cd \"$SCRIPT_DIR/server\" && node src/app.js; exec bash" &
    else
        # Fallback to standard backgrounding
        (cd "$SCRIPT_DIR/server" && node src/app.js > backend.log 2>&1 &)
        echo -e "\e[90mBackend started in background (logs in server/backend.log)\e[0m"
    fi

    echo -e "\e[32mStarting Frontend Service...\e[0m"
    if command -v mintty >/dev/null 2>&1; then
        mintty -t "Frontend Server" -h always -e sh -c "cd \"$SCRIPT_DIR/client\" && npm start; exec bash" &
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]] && command -v start >/dev/null 2>&1; then
        start bash -c "cd \"$SCRIPT_DIR/client\" && npm start; exec bash"
    elif command -v gnome-terminal >/dev/null 2>&1; then
        gnome-terminal --title="Frontend Server" -- bash -c "cd \"$SCRIPT_DIR/client\" && npm start; exec bash" &
    elif command -v xterm >/dev/null 2>&1; then
        xterm -T "Frontend Server" -e "cd \"$SCRIPT_DIR/client\" && npm start; exec bash" &
    else
        (cd "$SCRIPT_DIR/client" && npm start > frontend.log 2>&1 &)
        echo -e "\e[90mFrontend started in background (logs in client/frontend.log)\e[0m"
    fi

    echo -e "\e[36mBoth services have been launched!\e[0m"
    echo -e "\e[36mThe application will be available at http://localhost:4200\e[0m"
}

case "$ACTION" in
    stop)
        stop_services
        ;;
    start)
        start_services
        ;;
    restart)
        stop_services
        # Wait a brief moment to ensure ports are freed before restarting
        sleep 2
        
        # Re-eval variables since we stopped processes
        backend_pid=$(get_pid_by_port 3001)
        frontend_pid=$(get_pid_by_port 4200)
        
        start_services
        ;;
    *)
        echo -e "\e[31mInvalid action specified. Please use 'start', 'stop', or 'restart'.\e[0m"
        echo -e "\e[33mExample: ./start.sh restart\e[0m"
        exit 1
        ;;
esac
