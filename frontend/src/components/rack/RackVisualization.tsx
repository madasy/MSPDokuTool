import { type Rack, type Device } from '../../services/RackService';
import { cn } from '../../lib/utils';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { createPortal } from 'react-dom';

interface RackVisualizationProps {
    rack: Rack;
    onDeviceClick?: (device: Device) => void;
}

export default function RackVisualization({ rack, onDeviceClick }: RackVisualizationProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [localDevices, setLocalDevices] = useState<Device[]>(rack.devices);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const newU = parseInt(over.id.toString().replace('u-', ''));
            const deviceId = active.id;

            setLocalDevices((devices) =>
                devices.map(d => {
                    if (d.id === deviceId) {
                        return { ...d, positionU: newU };
                    }
                    return d;
                })
            );
        }
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor)
    );

    const units = Array.from({ length: rack.heightUnits }, (_, i) => rack.heightUnits - i);

    const occupationMap = new Map<number, Device>();
    localDevices.forEach(device => {
        if (device.positionU) {
            for (let i = 0; i < device.heightU; i++) {
                occupationMap.set(device.positionU + i, device);
            }
        }
    });

    const activeDevice = activeId ? localDevices.find(d => d.id === activeId) : null;

    return (
        <DndContext
            sensors={sensors}
            onDragStart={(e) => setActiveId(e.active.id as string)}
            onDragEnd={handleDragEnd}
        >
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full max-w-sm select-none shadow-2xl relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-white font-semibold text-sm">{rack.name}</span>
                    <span className="text-slate-400 text-xs bg-slate-700/50 px-2 py-0.5 rounded-full">{rack.heightUnits}U</span>
                </div>

                {/* Rack Body */}
                <div className="flex flex-col border-x-[3px] border-slate-600 bg-slate-900/50 relative">
                    {units.map((u) => (
                        <RackUnit
                            key={u}
                            u={u}
                            occupyingDevice={occupationMap.get(u)}
                            onDeviceClick={onDeviceClick}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-2 text-center text-[10px] text-slate-500">Front View</div>
            </div>

            {createPortal(
                <DragOverlay>
                    {activeDevice ? (
                        <div className={cn(
                            "opacity-90 shadow-2xl cursor-grabbing ring-2 ring-primary-400",
                            getDeviceColor(activeDevice)
                        )} style={{
                            height: `${activeDevice.heightU * 28}px`,
                            width: '300px'
                        }}>
                            <div className="h-full flex items-center justify-center px-4">
                                <span className="font-bold text-gray-800 text-xs">{activeDevice.name}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    );
}

function RackUnit({ u, occupyingDevice, onDeviceClick }: { u: number; occupyingDevice?: Device; onDeviceClick?: (d: Device) => void }) {
    const { isOver, setNodeRef } = useDroppable({ id: `u-${u}` });
    const isDeviceStart = occupyingDevice?.positionU === u;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex h-7 border-b border-slate-700/40 last:border-b-0 relative transition-colors",
                isOver && "bg-primary-400/20"
            )}
        >
            {/* Unit Number */}
            <div className="w-6 flex items-center justify-center text-[9px] font-mono text-slate-500 border-r border-slate-700 bg-slate-800/80">
                {u}
            </div>

            {/* Content */}
            <div className="flex-1 relative">
                {occupyingDevice ? (
                    isDeviceStart ? (
                        <DraggableDevice device={occupyingDevice} onClick={onDeviceClick} />
                    ) : null
                ) : (
                    <div className="h-full w-full" />
                )}
            </div>

            {/* Right Rail */}
            <div className="w-6 border-l border-slate-700 bg-slate-800/80 flex items-center justify-center text-[9px] font-mono text-slate-500">
                {u}
            </div>
        </div>
    );
}

function DraggableDevice({ device, onClick }: { device: Device; onClick?: (d: Device) => void }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: device.id });
    const heightPx = device.heightU * 28;

    if (isDragging) {
        return <div className="absolute bottom-0 left-0 w-full bg-slate-700/30 border border-dashed border-slate-500" style={{ height: `${heightPx}px` }} />;
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={(e) => { e.stopPropagation(); onClick?.(device); }}
            className={cn(
                "absolute bottom-0 left-0 w-full flex items-center justify-between px-2 cursor-grab active:cursor-grabbing z-20 hover:brightness-110 transition-all",
                getDeviceColor(device)
            )}
            style={{ height: `${heightPx}px` }}
            title={`${device.name} (${device.deviceType})`}
        >
            {/* Status LED */}
            <div className={cn(
                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                device.status === 'ACTIVE' && "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]",
                device.status === 'PLANNED' && "bg-gray-400",
                device.status === 'RETIRED' && "bg-red-400",
            )} />

            {/* Name */}
            <span className="flex-1 text-[10px] font-semibold text-gray-800 truncate mx-1.5">{device.name}</span>

            {/* Right LED */}
            <div className="w-1 h-1 rounded-full bg-gray-400/50 flex-shrink-0" />
        </div>
    );
}

function getDeviceColor(device: Device): string {
    // Status-based coloring per ux_design.md: Grün=OK, Grau=Planned, Rot=Error
    if (device.status === 'PLANNED') return 'bg-gray-300 border-y border-gray-400';
    if (device.status === 'RETIRED') return 'bg-red-200 border-y border-red-400';

    switch (device.deviceType) {
        case 'SWITCH': return 'bg-gradient-to-b from-gray-100 to-gray-200 border-y border-gray-300';
        case 'SERVER': return 'bg-gradient-to-b from-blue-50 to-blue-100 border-y border-blue-300';
        case 'FIREWALL': return 'bg-gradient-to-b from-red-50 to-red-100 border-y border-red-300';
        case 'PATCHPANEL': return 'bg-gradient-to-b from-slate-200 to-slate-300 border-y border-slate-400';
        case 'ROUTER': return 'bg-gradient-to-b from-indigo-50 to-indigo-100 border-y border-indigo-300';
        default: return 'bg-gradient-to-b from-gray-200 to-gray-300 border-y border-gray-300';
    }
}
