import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TenantService } from '../services/TenantService';

const PROFILE_DEFAULTS: Record<string, { showAdvanced: boolean; hiddenModules: string[] }> = {
    SMALL_OFFICE: { showAdvanced: false, hiddenModules: ['racks', 'switches', 'firewall', 'access-points'] },
    SINGLE_SITE: { showAdvanced: false, hiddenModules: ['racks'] },
    MULTI_SITE: { showAdvanced: true, hiddenModules: [] },
    MANAGED_INFRA: { showAdvanced: true, hiddenModules: [] },
    SECURITY_FOCUSED: { showAdvanced: true, hiddenModules: [] },
    CUSTOM: { showAdvanced: false, hiddenModules: [] },
};

export function useFieldLevel(tenantId?: string) {
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const tenant = tenants?.find(t => t.id === tenantId);
    const profile = tenant?.profile || 'SINGLE_SITE';
    const profileDefaults = PROFILE_DEFAULTS[profile] || PROFILE_DEFAULTS.SINGLE_SITE;

    // Local override from localStorage
    const storageKey = `fieldLevel:${tenantId || 'global'}`;
    const stored = localStorage.getItem(storageKey);
    const [localOverride, setLocalOverride] = useState<boolean | null>(
        stored !== null ? stored === 'true' : null
    );

    const showAdvanced = localOverride !== null ? localOverride : (tenant?.showAdvancedFields ?? profileDefaults.showAdvanced);

    const toggleAdvanced = useCallback(() => {
        const newValue = !showAdvanced;
        setLocalOverride(newValue);
        localStorage.setItem(storageKey, String(newValue));
    }, [showAdvanced, storageKey]);

    const hiddenModules = tenant?.hiddenModules?.length
        ? tenant.hiddenModules
        : profileDefaults.hiddenModules;

    const isModuleVisible = useCallback((module: string) => {
        return !hiddenModules.includes(module);
    }, [hiddenModules]);

    return { showAdvanced, toggleAdvanced, isModuleVisible, profile };
}
