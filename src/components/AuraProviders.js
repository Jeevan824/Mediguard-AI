"use client";
import { SensorProvider } from "@/context/SensorContext";
import { HealthProvider } from "@/context/HealthContext";
import { AuraProvider } from "@/context/AuraContext";
import { PersonalizationProvider } from "@/context/PersonalizationContext";
import { DatasetProvider } from "@/context/DatasetContext";
import AuraNavbar from "@/components/aura/AuraNavbar";
import DemoBar from "@/components/aura/DemoBar";
import MouseLiveHost from "@/components/aura/MouseLiveHost";
import NeuralBackground from "@/components/aura/NeuralBackground";
import HydrationReminder from "@/components/health/HydrationReminder";
import MovementPrompt from "@/components/health/MovementPrompt";
import BreathingGuide from "@/components/health/BreathingGuide";

export default function AuraProviders({ children }) {
    return (
        <SensorProvider>
            <AuraProvider>
                <HealthProvider>
                    <PersonalizationProvider>
                        <DatasetProvider>
                            <MouseLiveHost />
                            <NeuralBackground />
                            <HydrationReminder />
                            <MovementPrompt />
                            <BreathingGuide />
                            <AuraNavbar />
                            <DemoBar />
                            <main className="relative z-10 pb-14">
                                {children}
                            </main>
                        </DatasetProvider>
                    </PersonalizationProvider>
                </HealthProvider>
            </AuraProvider>
        </SensorProvider>
    );
}