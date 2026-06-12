import { adminDbReady } from "../_lib/adminData";

/** Visible banner shown on admin pages when Supabase isn't configured. */
export default function SupabaseNotice() {
  if (adminDbReady()) return null;
  return (
    <div className="mb-6 rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
      <p className="text-sm font-semibold text-text-primary">
        Supabase is not configured
      </p>
      <p className="mt-1 text-xs text-text-secondary">
        Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your
        environment to enable live admin data. Showing empty data until then.
      </p>
    </div>
  );
}
