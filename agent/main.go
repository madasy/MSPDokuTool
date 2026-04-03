package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"
)

type NetworkInterface struct {
	Name  string `json:"name"`
	IP    string `json:"ip,omitempty"`
	MAC   string `json:"mac,omitempty"`
	Speed string `json:"speed,omitempty"`
}

type ScanResult struct {
	IP        string `json:"ip"`
	Hostname  string `json:"hostname,omitempty"`
	MAC       string `json:"mac,omitempty"`
	OpenPorts []int  `json:"openPorts,omitempty"`
	Status    string `json:"status"` // "up" or "down"
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

	// Security — updates & reboot
	WindowsUpdatesPending int  `json:"windowsUpdatesPending,omitempty"`
	LinuxUpdatesPending   int  `json:"linuxUpdatesPending,omitempty"`
	RebootRequired        bool `json:"rebootRequired,omitempty"`

	// Security — AV
	AVProduct string `json:"avProduct,omitempty"`
	AVVersion string `json:"avVersion,omitempty"`

	// Security — firewall
	FirewallEnabled bool   `json:"firewallEnabled,omitempty"`
	FirewallProduct string `json:"firewallProduct,omitempty"`

	// Network details
	IsStaticIP     bool     `json:"isStaticIP,omitempty"`
	DefaultGateway string   `json:"defaultGateway,omitempty"`
	DNSServers     []string `json:"dnsServers,omitempty"`

	// Optional network scan
	NetworkScanResults []ScanResult `json:"networkScanResults,omitempty"`
}

const agentVersion = "0.2.0"

func main() {
	serverURL := os.Getenv("MSPDOKU_SERVER")
	apiKey := os.Getenv("MSPDOKU_API_KEY")
	interval := os.Getenv("MSPDOKU_INTERVAL")
	scanSubnet := os.Getenv("MSPDOKU_SCAN_SUBNET")

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
	if scanSubnet != "" {
		log.Printf("Network scan enabled for: %s", scanSubnet)
	}

	// Run immediately, then on interval
	for {
		report := collectReport()

		if scanSubnet != "" {
			report.NetworkScanResults = scanNetwork(scanSubnet)
		}

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

	// Pending updates (Debian/Ubuntu) — tail skips the header line
	if out, err := exec.Command("sh", "-c", "apt list --upgradable 2>/dev/null | tail -n +2 | wc -l").Output(); err == nil {
		fmt.Sscanf(strings.TrimSpace(string(out)), "%d", &r.LinuxUpdatesPending)
		r.PendingUpdates = r.LinuxUpdatesPending
	}

	// Reboot required
	if _, err := os.Stat("/var/run/reboot-required"); err == nil {
		r.RebootRequired = true
	}

	// Firewall (ufw preferred, fall back to iptables)
	if out, err := exec.Command("sh", "-c", "ufw status 2>/dev/null | head -1").Output(); err == nil {
		status := strings.TrimSpace(string(out))
		r.FirewallEnabled = strings.Contains(status, "active")
		r.FirewallProduct = "ufw"
	} else if out, err := exec.Command("sh", "-c", "iptables -L -n 2>/dev/null | wc -l").Output(); err == nil {
		var lines int
		fmt.Sscanf(strings.TrimSpace(string(out)), "%d", &lines)
		r.FirewallEnabled = lines > 8 // more than just default empty chains
		r.FirewallProduct = "iptables"
	}

	// Bitdefender check
	if _, err := exec.Command("sh", "-c", "which bdscan 2>/dev/null || ls /opt/bitdefender* 2>/dev/null").Output(); err == nil {
		r.AVProduct = "Bitdefender"
		if out, err := exec.Command("sh", "-c", "bdscan --info 2>/dev/null | head -3").Output(); err == nil {
			r.AVVersion = strings.TrimSpace(string(out))
		}
		r.AVStatus = "installed"
	}

	// Static IP detection
	if out, err := exec.Command("sh", "-c", "ip route get 1.1.1.1 2>/dev/null | head -1").Output(); err == nil {
		line := string(out)
		if strings.Contains(line, "src") {
			// Check if DHCP is used for the primary interface
			if dhcpOut, err := exec.Command("sh", "-c", "grep -r 'dhcp' /etc/netplan/ /etc/network/interfaces 2>/dev/null | head -1").Output(); err == nil && len(dhcpOut) > 0 {
				r.IsStaticIP = false
			} else {
				r.IsStaticIP = true
			}
		}
	}

	// Default gateway
	if out, err := exec.Command("sh", "-c", "ip route | grep default | awk '{print $3}' | head -1").Output(); err == nil {
		r.DefaultGateway = strings.TrimSpace(string(out))
	}

	// DNS servers
	if data, err := os.ReadFile("/etc/resolv.conf"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "nameserver") {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					r.DNSServers = append(r.DNSServers, parts[1])
				}
			}
		}
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
		var b int64
		fmt.Sscanf(strings.TrimSpace(string(out)), "%d", &b)
		r.RAMTotalMB = b / (1024 * 1024)
	}

	// IPs
	if out, err := exec.Command("sh", "-c", "ifconfig | grep 'inet ' | grep -v 127.0.0.1 | awk '{print $2}'").Output(); err == nil {
		r.IPAddresses = strings.Fields(string(out))
	}

	// Pending software updates (--no-scan uses cached list, avoids long network wait)
	if out, err := exec.Command("softwareupdate", "-l", "--no-scan").Output(); err == nil {
		lines := strings.Split(string(out), "\n")
		count := 0
		for _, l := range lines {
			if strings.Contains(l, "recommended") {
				count++
			}
		}
		r.PendingUpdates = count
	}

	// Firewall
	if out, err := exec.Command("sh", "-c", "/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null").Output(); err == nil {
		r.FirewallEnabled = strings.Contains(string(out), "enabled")
		r.FirewallProduct = "macOS Application Firewall"
	}

	// Default gateway
	if out, err := exec.Command("sh", "-c", "netstat -rn | grep default | head -1 | awk '{print $2}'").Output(); err == nil {
		r.DefaultGateway = strings.TrimSpace(string(out))
	}

	// DNS servers
	if out, err := exec.Command("sh", "-c", "scutil --dns | grep nameserver | awk '{print $3}' | sort -u").Output(); err == nil {
		for _, dns := range strings.Fields(string(out)) {
			r.DNSServers = append(r.DNSServers, dns)
		}
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

	// Windows Update — count pending updates
	if out, err := exec.Command("powershell", "-Command",
		"((New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher().Search('IsInstalled=0').Updates).Count",
	).Output(); err == nil {
		fmt.Sscanf(strings.TrimSpace(string(out)), "%d", &r.WindowsUpdatesPending)
		r.PendingUpdates = r.WindowsUpdatesPending
	}

	// Reboot required
	if out, err := exec.Command("powershell", "-Command",
		"Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired'",
	).Output(); err == nil {
		r.RebootRequired = strings.TrimSpace(string(out)) == "True"
	}

	// Windows Firewall
	if out, err := exec.Command("netsh", "advfirewall", "show", "allprofiles", "state").Output(); err == nil {
		r.FirewallEnabled = strings.Contains(string(out), "ON")
		r.FirewallProduct = "Windows Firewall"
	}

	// AV product via SecurityCenter2 WMI
	if out, err := exec.Command("powershell", "-Command",
		"Get-WmiObject -Namespace 'root\\SecurityCenter2' -Class AntiVirusProduct | Select-Object displayName,productState",
	).Output(); err == nil {
		output := string(out)
		if strings.Contains(output, "Bitdefender") {
			r.AVProduct = "Bitdefender"
			r.AVStatus = "installed"
		} else if strings.Contains(output, "Windows Defender") {
			r.AVProduct = "Windows Defender"
			r.AVStatus = "installed"
		}
	}

	// Static IP detection
	if out, err := exec.Command("powershell", "-Command",
		"(Get-NetIPConfiguration | Where-Object {$_.IPv4DefaultGateway}).NetIPv4Interface.Dhcp",
	).Output(); err == nil {
		r.IsStaticIP = !strings.Contains(strings.TrimSpace(string(out)), "Enabled")
	}

	// Default gateway
	if out, err := exec.Command("powershell", "-Command",
		"(Get-NetIPConfiguration).IPv4DefaultGateway.NextHop",
	).Output(); err == nil {
		r.DefaultGateway = strings.TrimSpace(string(out))
	}

	// DNS servers
	if out, err := exec.Command("powershell", "-Command",
		"(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses -join ','",
	).Output(); err == nil {
		for _, dns := range strings.Split(strings.TrimSpace(string(out)), ",") {
			if dns != "" {
				r.DNSServers = append(r.DNSServers, dns)
			}
		}
	}
}

// scanNetwork performs a lightweight ping+port sweep of the given CIDR subnet.
// It uses goroutines (capped at 50 concurrent) with a 500 ms per-port timeout.
// Only triggered when MSPDOKU_SCAN_SUBNET is set.
func scanNetwork(subnet string) []ScanResult {
	_, ipNet, err := net.ParseCIDR(subnet)
	if err != nil {
		log.Printf("scanNetwork: invalid subnet %q: %v", subnet, err)
		return nil
	}

	// Enumerate all host IPs in the network
	var hosts []string
	for ip := cloneIP(ipNet.IP); ipNet.Contains(ip); incrementIP(ip) {
		hosts = append(hosts, ip.String())
	}

	commonPorts := []int{22, 80, 443, 445, 3389, 5985, 8080, 8443}

	sem := make(chan struct{}, 50) // max 50 concurrent goroutines
	var mu sync.Mutex
	var wg sync.WaitGroup
	var results []ScanResult

	for _, host := range hosts {
		wg.Add(1)
		go func(ip string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			result := ScanResult{IP: ip, Status: "down"}

			var openPorts []int
			for _, port := range commonPorts {
				addr := fmt.Sprintf("%s:%d", ip, port)
				conn, err := net.DialTimeout("tcp", addr, 500*time.Millisecond)
				if err == nil {
					conn.Close()
					openPorts = append(openPorts, port)
				}
			}

			if len(openPorts) > 0 {
				result.Status = "up"
				result.OpenPorts = openPorts

				// Attempt reverse DNS lookup
				if names, err := net.LookupAddr(ip); err == nil && len(names) > 0 {
					result.Hostname = strings.TrimSuffix(names[0], ".")
				}
			}

			mu.Lock()
			results = append(results, result)
			mu.Unlock()
		}(host)
	}

	wg.Wait()
	return results
}

// cloneIP returns a copy of a net.IP (avoids mutation of the original slice).
func cloneIP(ip net.IP) net.IP {
	dup := make(net.IP, len(ip))
	copy(dup, ip)
	return dup
}

// incrementIP increments an IP address in-place by 1.
func incrementIP(ip net.IP) {
	// Work on the 4-byte IPv4 form if possible
	if v4 := ip.To4(); v4 != nil {
		n := binary.BigEndian.Uint32(v4)
		n++
		binary.BigEndian.PutUint32(v4, n)
		// Copy back into the original slice (handles both 4-byte and 16-byte forms)
		copy(ip[len(ip)-4:], v4)
		return
	}
	// IPv6 fallback
	for i := len(ip) - 1; i >= 0; i-- {
		ip[i]++
		if ip[i] != 0 {
			break
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
