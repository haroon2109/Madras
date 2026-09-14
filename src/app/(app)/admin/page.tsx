import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import ZoneForm from "@/components/admin/ZoneForm";
import UserForm from "@/components/admin/UserForm";
import { AlertDispatch } from "@/components/admin/AlertDispatch";
import IngestHealthPanel from "@/components/admin/IngestHealthPanel";
import { updateZone, updateUserRole, deleteUser } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  const zones = await prisma.zone.findMany({ orderBy: { number: "asc" } });
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  const activeAlerts = await prisma.alert.findMany({
    where: { resolvedAt: null },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { zone: true },
  });

  const numInputCls =
    "w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none";
  const textInputCls =
    "w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure zones, risk thresholds, and platform users. Changes apply immediately.
        </p>
      </div>

      <AlertDispatch
        alerts={activeAlerts.map((a) => ({ id: a.id, level: a.level, title: a.title, zoneName: a.zone.name }))}
      />

      <IngestHealthPanel />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Zones ({zones.length})</h2>
        </div>
        <ZoneForm />

        {/* One hidden form per row, outside the table. A <form> as a child of
            <tr> is invalid HTML — the browser parser hoists it out of the
            table and React hydration then fails (React error #418). Row inputs
            associate with their form via the form= attribute instead. */}
        {zones.map((zone) => (
          <form key={zone.id} id={`zone-edit-${zone.id}`} action={updateZone} hidden>
            <input type="hidden" name="id" value={zone.id} />
          </form>
        ))}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Active</th>
                <th className="px-4 py-3 font-semibold">No.</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Latitude</th>
                <th className="px-4 py-3 font-semibold">Longitude</th>
                <th className="px-4 py-3 font-semibold">Watch ≥</th>
                <th className="px-4 py-3 font-semibold">Warning ≥</th>
                <th className="px-4 py-3 font-semibold">Alert ≥</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zones.map((zone) => (
                <tr key={zone.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      form={`zone-edit-${zone.id}`}
                      defaultChecked={zone.isActive}
                      className="h-4 w-4 rounded border-slate-300 accent-sky-600"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input name="number" type="number" form={`zone-edit-${zone.id}`} defaultValue={zone.number} className={numInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <input name="name" form={`zone-edit-${zone.id}`} defaultValue={zone.name} className={textInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <input name="latitude" type="number" step="any" form={`zone-edit-${zone.id}`} defaultValue={zone.latitude} className={numInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <input name="longitude" type="number" step="any" form={`zone-edit-${zone.id}`} defaultValue={zone.longitude} className={numInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <input name="watchThreshold" type="number" step="any" form={`zone-edit-${zone.id}`} defaultValue={zone.watchThreshold} className={numInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <input name="warningThreshold" type="number" step="any" form={`zone-edit-${zone.id}`} defaultValue={zone.warningThreshold} className={numInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <input name="alertThreshold" type="number" step="any" form={`zone-edit-${zone.id}`} defaultValue={zone.alertThreshold} className={numInputCls} />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="submit"
                      form={`zone-edit-${zone.id}`}
                      className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {zones.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No zones yet — add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Users ({users.length})</h2>
        <UserForm />

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2 font-medium text-slate-800">{user.name ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-600">{user.email}</td>
                  <td className="px-4 py-2">
                    <form action={updateUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="ANALYST">Analyst</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-400">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    }).format(user.createdAt)}
                  </td>
                  <td className="px-4 py-2">
                    {user.id !== session?.user?.id && (
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={user.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
