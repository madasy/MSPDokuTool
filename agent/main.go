package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type NetworkInterface struct {
	Name  string `json:"name"`
	IP    string `json:"ip,omitempty"`
	MAC   string `json:"mac,omitempty"`
	Speed string `json:"speed,omitempty"`
}

type AgentReport struct {
	Hostname          string             `json:"hostname"`
	OSName            string             `json:"osName,omitempty"`
	OSVersion         string             `json:"osVersion,omitempty"`
	Kernel            string             `json:"kernel,omitempty"`
	CPUModel          string             `json:"cpuModel,omitempty"`
	CPUCores          int                `json:"cpuCores,omitempty"`
	RAMTotalMB        int64              `json:"ramTotalMb,omitempty"`
	RAMUsedMB         int64              `json:"ramUsedMb,omitempty"`
	DiskTotalGB       int64              `json:"diskTotalGb,omitempty"`
	DiskUsedGB        int64              `json:"diskUsedGb,omitempty"`
	UptimeSeconds     int64              `json:"uptimeSeconds,omitempty"`
	IPAddresses       []string           `json:"ipAddresses,omitempty"`
	MACAddresses      []string           `json:"macAddresses,omitempty"`
	NetworkInterfaces []NetworkInterface `json:"networkInterfaces,omitempty"`
	RunningServices   []string           `json:"runningServices,omitempty"`
	PendingUpdates    int                `json:"pendingUpdates,omitempty"`
	AVStatus          string             `json:"avStatus,omitempty"`
	DomainJoined      bool               `json:"domainJoined,omitempty"`
	DomainName        string             `json:"domainName,omitempty"`
	LastBoot          *time.Time         `json:"lastBoot,omitempty"`
	AgentVersion      string             `json:"agentVersion"`
}

const agentVersion = "0.1.0"

func main() {
	serverURL := os.Getenv("MSPDOKU_SERVER")
	apiKey := os.Getenv("MSPDOKU_API_KEY")
	interval := os.Getenv("MSPDOKU_INTERVAL")

	if serverURL == "" {
		serverURL = "http://localhost:3000"
	}
	if apiKey == "" {
		log.Fatal("MSPDOKU_API_KEY is required")
	}

	intervalDuration := 5 * time.Minute
	if interval != "" {
		if d, err := time.ParseDuration(interval); err == nil {
			intervalDuration = d
		}
	}

	log.Printf("MSP DokuTool Agent v%s", agentVersion)
	log.Printf("Server: %s", serverURL)
	log.Printf("Interval: %s", intervalDuration)

	// Run immediately, then on interval
	for {
		report := collectReport()
		if err := sendReport(serverURL, apiKey, report); err != nil {
			log.Printf("Error sending report: %v", err)
		} else {
			log.Printf("Report sent for %s", report.Hostname)
		}
		time.Sleep(intervalDuration)
	}
}

func collectReport() AgentReport {
	hostname, _ := os.Hostname()

	report := AgentReport{
		Hostname:     hostname,
		CPUCores:     runtime.NumCPU(),
		AgentVersion: agentVersion,
	}

	switch runtime.GOOS {
	case "linux":
		collectLinux(&report)
	case "darwin":
		collectDarwin(&report)
	case "windows":
		collectWindows(&report)
	}

	return report
}

func collectLinux(r *AgentReport) {
	r.OSName = "Linux"

	// OS version from /etc/os-release
	if data, err := os.ReadFile("/etc/os-release"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "PRETTY_NAME=") {
				r.OSVersion = strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
			}
		}
	}

	// Kernel
	if out, err := exec.Command("uname", "-r").Output(); err == nil {
		r.Kernel = strings.TrimSpace(string(out))
	}

	// CPU model
	if data, err := os.ReadFile("/proc/cpuinfo"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "model name") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					r.CPUModel = strings.TrimSpace(parts[1])
					break
				}
			}
		}
	}

	// Memory from /proc/meminfo
	if data, err := os.ReadFile("/proc/meminfo"); err == nil {
		var total, available int64
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "MemTotal:") {
				fmt.Sscanf(line, "MemTotal: %d kB", &total)
			}
			if strings.HasPrefix(line, "MemAvailable:") {
				fmt.Sscanf(line, "MemAvailable: %d kB", &available)
			}
		}
		r.RAMTotalMB = total / 1024
		r.RAMUsedMB = (total - available) / 1024
	}

	// Uptime
	if data, err := os.ReadFile("/proc/uptime"); err == nil {
		var uptime float64
		fmt.Sscanf(string(data), "%f", &uptime)
		r.UptimeSeconds = int64(uptime)
	}

	// IP addresses
	if out, err := exec.Command("hostname", "-I").Output(); err == nil {
		ips := strings.Fields(string(out))
		r.IPAddresses = ips
	}

	// Disk usage
	if out, err := exec.Command("df", "-BG", "--total").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.HasPrefix(line, "total") {
				fields := strings.Fields(line)
				if len(fields) >= 4 {
					fmt.Sscanf(fields[1], "%dG", &r.DiskTotalGB)
					fmt.Sscanf(fields[2], "%dG", &r.DiskUsedGB)
				}
			}
		}
	}

	// Pending updates (Debian/Ubuntu)
	if out, err := exec.Command("sh", "-c", "apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0").Output(); err == nil {
		fmt.Sscanf(strings.TrimSpace(string(out)), "%d", &r.PendingUpdates)
	}
}

func collectDarwin(r *AgentReport) {
	r.OSName = "macOS"

	if out, err := exec.Command("sw_vers", "-productVersion").Output(); err == nil {
		r.OSVersion = strings.TrimSpace(string(out))
	}

	if out, err := exec.Command("uname", "-r").Output(); err == nil {
		r.Kernel = strings.TrimSpace(string(out))
	}

	if out, err := exec.Command("sysctl", "-n", "machdep.cpu.brand_string").Output(); err == nil {
		r.CPUModel = strings.TrimSpace(string(out))
	}

	if out, err := exec.Command("sysctl", "-n", "hw.memsize").Output(); err == nil {
		var bytes int64
		fmt.Sscanf(strings.TrimSpace(string(out)), "%d", &bytes)
		r.RAMTotalMB = bytes / (1024 * 1024)
	}

	// IPs
	if out, err := exec.Command("sh", "-c", "ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}'").Output(); err == nil {
		r.IPAddresses = strings.Fields(string(out))
	}
}

func collectWindows(r *AgentReport) {
	r.OSName = "Windows"

	if out, err := exec.Command("cmd", "/c", "ver").Output(); err == nil {
		r.OSVersion = strings.TrimSpace(string(out))
	}

	if out, err := exec.Command("wmic", "cpu", "get", "Name", "/value").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if strings.HasPrefix(line, "Name=") {
				r.CPUModel = strings.TrimSpace(strings.TrimPrefix(line, "Name="))
			}
		}
	}

	// Domain
	if out, err := exec.Command("wmic", "computersystem", "get", "domain", "/value").Output(); err == nil {
		for _, line := range strings.Split(string(out), "\n") {
			if strings.HasPrefix(line, "Domain=") {
				domain := strings.TrimSpace(strings.TrimPrefix(line, "Domain="))
				if domain != "" && domain != "WORKGROUP" {
					r.DomainJoined = true
					r.DomainName = domain
				}
			}
		}
	}
}

func sendReport(serverURL, apiKey string, report AgentReport) error {
	data, err := json.Marshal(report)
	if err != nil {
		return fmt.Errorf("marshal: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/agent/report", serverURL)
	req, err := http.NewRequest("POST", url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("server returned %d", resp.StatusCode)
	}

	return nil
}
