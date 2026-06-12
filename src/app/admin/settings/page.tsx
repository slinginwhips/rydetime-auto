import SupabaseNotice from "../_components/SupabaseNotice";
import SettingsEditor from "../_components/SettingsEditor";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary">Site Settings</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Key/value settings for business hours, contact info, and AI behavior.
        Values are stored in the site_settings table.
      </p>

      <div className="mt-6">
        <SupabaseNotice />
      </div>

      <div className="rounded-lg border border-border-subtle bg-background-card p-6">
        <SettingsEditor />
      </div>
    </div>
  );
}
