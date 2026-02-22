const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.detail || err.message || message;
    } catch {}
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string) =>
    request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  refresh: () => request<{ access_token: string }>("/auth/refresh", { method: "POST" }),
  verifyEmail: (token: string) =>
    request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: (email: string) =>
    request<{ message: string }>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),

  // Users
  getMe: () => request<any>("/users/me"),
  updateMe: (data: any) => request<any>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  // Contracts
  getContracts: () => request<any[]>("/contracts"),
  createContract: (data: any) => request<any>("/contracts", { method: "POST", body: JSON.stringify(data) }),
  updateContract: (id: number, data: any) => request<any>(`/contracts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteContract: (id: number) => request<void>(`/contracts/${id}`, { method: "DELETE" }),

  // Bills
  getBills: () => request<any[]>("/bills"),
  getBill: (id: number) => request<any>(`/bills/${id}`),
  createBill: (data: any) => request<any>("/bills", { method: "POST", body: JSON.stringify(data) }),
  updateBill: (id: number, data: any) => request<any>(`/bills/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteBill: (id: number) => request<void>(`/bills/${id}`, { method: "DELETE" }),
  recheckBill: (id: number) => request<any>(`/bills/${id}/recheck`, { method: "POST" }),
  uploadBillDocument: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/bills/${id}/upload`, {
      method: "POST",
      credentials: "include",
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(res.status, err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
  deleteBillDocument: (id: number) => request<void>(`/bills/${id}/upload`, { method: "DELETE" }),
  getBillDocumentUrl: (id: number) => `${API_BASE}/bills/${id}/document`,
  getBillReportUrl: (id: number) => `${API_BASE}/bills/${id}/report`,

  // Objections
  createObjection: (billId: number, reasons: string[]) =>
    request<any>(`/objections/bills/${billId}/objection`, {
      method: "POST",
      body: JSON.stringify({ objection_reasons: reasons }),
    }),
  getObjections: (billId: number) => request<any[]>(`/objections/bills/${billId}/objection`),

  // Feedback
  getFeedback: () => request<any[]>("/feedback"),
  createFeedback: (data: any) => request<any>("/feedback", { method: "POST", body: JSON.stringify(data) }),

  // Admin
  getAdminStats: () => request<any>("/admin/stats"),
  getAdminUsers: () => request<any[]>("/admin/users"),
  updateAdminUser: (id: number, data: any) => request<any>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getAdminFeedback: (status?: string) => request<any[]>(`/admin/feedback${status ? `?status=${status}` : ""}`),
  updateAdminFeedback: (id: number, data: any) => request<any>(`/admin/feedback/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  testSmtp: (toEmail: string) => request<any>(`/admin/smtp/test?to_email=${encodeURIComponent(toEmail)}`, { method: "POST" }),

  // Mietpreisbremse
  checkMietpreisbremse: (data: any) =>
    request<any>("/mietpreisbremse/check", { method: "POST", body: JSON.stringify(data) }),
  getMietpreisbremseStaedte: () => request<any[]>("/mietpreisbremse/cities"),

  // Betriebskosten-Assistent
  getBetriebskostenArten: () => request<any>("/betriebskosten-assistent/arten"),
  analysiereBetriebskosten: (data: any) =>
    request<any>("/betriebskosten-assistent/analyse", { method: "POST", body: JSON.stringify(data) }),

  // Mietrecht-Checks
  getMietrechtStaedte: () => request<any[]>("/mietrecht/staedte"),
  checkMietwucher: (data: any) =>
    request<any>("/mietrecht/mietwucher-check", { method: "POST", body: JSON.stringify(data) }),
  checkMieterhoehung: (data: any) =>
    request<any>("/mietrecht/mieterhoehung-check", { method: "POST", body: JSON.stringify(data) }),
  checkKaution: (data: any) =>
    request<any>("/mietrecht/kaution-check", { method: "POST", body: JSON.stringify(data) }),

  // GDPR
  exportData: () => fetch(`${API_BASE}/gdpr/export`, { credentials: "include" }),
  deleteAccount: () => request<void>("/gdpr/delete-account", { method: "DELETE" }),

  // Stripe
  createCheckoutSession: () =>
    request<{ checkout_url: string; session_id: string }>("/stripe/create-checkout-session", {
      method: "POST",
    }),
  cancelSubscription: () =>
    request<{ message: string }>("/stripe/cancel-subscription", {
      method: "POST",
    }),
  getSubscriptionStatus: () => request<any>("/stripe/subscription-status"),
};

export { ApiError };
