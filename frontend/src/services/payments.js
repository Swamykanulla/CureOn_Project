import axios from "axios";

const paymentsApi = axios.create({
  baseURL: "https://cureon-backend-5j6u.onrender.com/api/payments",
});

paymentsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

paymentsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const refresh = await axios.post(
            "https://cureon-backend-5j6u.onrender.com/api/auth/token/refresh/",
            { refresh: refreshToken }
          );
          const { access } = refresh.data;
          localStorage.setItem("access_token", access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return paymentsApi(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const paymentsService = {
  normalizeStatus: (status) => {
    if (!status) return null;
    const s = String(status).toLowerCase();
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    if (s === "pending") return "Pending";
    return status;
  },
  submit: async ({ appointment_id, transaction_id, screenshot }) => {
    const form = new FormData();
    form.append("appointment_id", appointment_id);
    form.append("transaction_id", transaction_id);
    form.append("screenshot", screenshot);
    const response = await paymentsApi.post("/submit/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  adminList: async () => {
    const response = await paymentsApi.get("/admin/list/");
    return response.data;
  },
  approve: async (paymentId) => {
    const response = await paymentsApi.patch(`/admin/${paymentId}/approve/`);
    return response.data;
  },
  reject: async (paymentId) => {
    const response = await paymentsApi.patch(`/admin/${paymentId}/reject/`);
    return response.data;
  },
};

export default paymentsApi;
