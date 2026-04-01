import { apiFetch } from './apiClient';

export interface DocumentationOverview {
    sectionType: string;
    exists: boolean;
    updatedAt: string | null;
    completionPercent: number;
}

export interface DocumentationSection {
    id: string;
    sectionType: string;
    structuredData: Record<string, any>;
    notes: string | null;
    updatedBy: string | null;
    version: number;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface UpdateDocumentationRequest {
    structuredData?: Record<string, any>;
    notes?: string;
}

export const SECTION_LABELS: Record<string, string> = {
    access_credentials: 'Access & Credentials',
    network_architecture: 'Network Architecture',
    critical_services: 'Critical Services & Dependencies',
    backup_recovery: 'Backup & Recovery',
    monitoring_alerting: 'Monitoring & Alerting',
    sops: 'Standard Operating Procedures',
    change_update: 'Change & Update Strategy',
    security_baseline: 'Security Baseline',
    disaster_recovery: 'Disaster Recovery',
    external_integrations: 'External Integrations',
    naming_conventions: 'Naming Conventions',
};

export const FIELD_LABELS: Record<string, Record<string, string>> = {
    access_credentials: {
        mfaRequirements: 'MFA Setup Requirements',
        breakGlassAccounts: 'Break-Glass Accounts',
        privilegedAccessPaths: 'Privileged Access Paths (VPN → Jump Host → Systems)',
        adminAccessConcept: 'Admin Access Concept',
    },
    network_architecture: {
        vlanStructure: 'VLAN Structure & Purpose',
        routingDesign: 'Routing Design (Core Switch / Firewall Roles)',
        internetBreakout: 'Internet Breakout / WAN Setup',
        siteToSiteVpn: 'Site-to-Site VPN Overview',
        wanSetup: 'WAN Setup',
    },
    critical_services: {
        businessCriticalSystems: 'Business-Critical Systems',
        internalDependencies: 'Internal Dependencies (AD → DNS → DHCP → Apps)',
        externalDependencies: 'External Dependencies (Cloud, SaaS, APIs)',
    },
    backup_recovery: {
        backupTargets: 'What Is Backed Up',
        retentionPolicy: 'Retention Policies',
        rtoRpo: 'RTO / RPO Expectations',
        recoveryProcedures: 'Recovery Procedures (Step-by-Step)',
    },
    monitoring_alerting: {
        monitoredSystems: 'What Is Monitored',
        alertThresholds: 'Alert Thresholds',
        alertDestinations: 'Where Alerts Go (Mail, Teams, etc.)',
        escalationFlow: 'Escalation Flow',
    },
    sops: {
        tenantOnboarding: 'New Customer / Tenant Onboarding',
        serverDeployment: 'Server Deployment Standard',
        vmRestore: 'VM Restore Process',
        incidentHandling: 'Incident Handling Steps',
    },
    change_update: {
        patchManagement: 'Patch Management Approach',
        maintenanceWindows: 'Maintenance Windows',
        changeApproval: 'Change Approval Logic',
    },
    security_baseline: {
        hardeningStandards: 'Hardening Standards (CIS-Level Summary)',
        avEdrStrategy: 'AV/EDR Strategy',
        loggingStrategy: 'Logging (What + Where)',
        accessControlModel: 'Access Control Model (RBAC Concept)',
    },
    disaster_recovery: {
        datacenterDown: 'Scenario: Datacenter Down',
        ransomwareResponse: 'Scenario: Ransomware',
        fullTenantLoss: 'Scenario: Full Tenant Loss',
        recoveryOrder: 'Recovery Order (What Comes First)',
    },
    external_integrations: {
        isps: 'ISPs',
        cloudProviders: 'Cloud Providers',
        saasTools: 'SaaS Tools',
        licensingDependencies: 'Licensing Dependencies',
    },
    naming_conventions: {
        serverNaming: 'Server Naming',
        networkNaming: 'Network Device Naming',
        vlanNaming: 'VLAN Naming',
        generalConventions: 'General Conventions',
    },
};

export const DocumentationService = {
    getOverview: (tenantId: string) =>
        apiFetch<DocumentationOverview[]>(`/tenants/${tenantId}/docs`),
    getSection: (tenantId: string, sectionType: string) =>
        apiFetch<DocumentationSection>(`/tenants/${tenantId}/docs/${sectionType}`),
    updateSection: (tenantId: string, sectionType: string, data: UpdateDocumentationRequest) =>
        apiFetch<DocumentationSection>(`/tenants/${tenantId}/docs/${sectionType}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};
