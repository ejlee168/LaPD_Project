import { SettingsForm } from "@/components/settings-form";
import { FadeIn } from "@/components/fade-in";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <FadeIn className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Settings</h1>
      </FadeIn>
      <SettingsForm />
    </div>
  );
}
