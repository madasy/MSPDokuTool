# MSP DokuTool Agent

Lightweight system inventory agent that reports to MSP DokuTool.

## Install

Download the binary for your platform from releases, or build from source:

```bash
cd agent
go build -o mspdoku-agent .
```

## Run

```bash
export MSPDOKU_SERVER=http://your-server:3000
export MSPDOKU_API_KEY=msp_your_api_key_here
export MSPDOKU_INTERVAL=5m

./mspdoku-agent
```

## What it collects

- Hostname, OS name/version, kernel
- CPU model, core count
- RAM total/used
- Disk total/used
- IP addresses, MAC addresses
- Uptime
- Pending updates (Linux)
- Domain join status (Windows)
- Running services

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MSPDOKU_SERVER` | `http://localhost:3000` | MSP DokuTool server URL |
| `MSPDOKU_API_KEY` | (required) | API key from MSP DokuTool |
| `MSPDOKU_INTERVAL` | `5m` | Report interval |

## Docker

```bash
docker run -e MSPDOKU_SERVER=http://host:3000 -e MSPDOKU_API_KEY=msp_xxx mspdoku-agent
```
