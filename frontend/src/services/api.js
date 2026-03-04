import axios from "axios";



// Create an axios instance with default config
const api = axios.create({
  baseURL: "https://cureon-backend-5j6u.onrender.com/api/auth",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const response = await axios.post(
            "https://cureon-backend-5j6u.onrender.com/api/auth/token/refresh/",
            { refresh: refreshToken }
          );

          const { access } = response.data;

          localStorage.setItem("access_token", access);

          originalRequest.headers["Authorization"] = `Bearer ${access}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);

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



export const authService = {
  login: async (username, password) => {
    const response = await api.post("/login/", { username, password });

    if (response.data.access) {
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);
    }

    return response.data;
  },
  forgotPassword: async (username, captcha_token) => {
    const response = await api.post("/forgot-password/", { username, captcha_token });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post("/register/", userData);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  getCurrentUser: async () => {
    const response = await api.get("/me/");
    return response.data;
  },

  changePassword: async (current_password, new_password) => {
    const response = await api.post("/change-password/", { current_password, new_password });
    return response.data;
  },

  changeUsername: async (new_username) => {
    const response = await api.post("/change-username/", { new_username });
    return response.data;
  },
};



export const userService = {
  list: async (role) => {
    const response = await api.get("/users/", {
      params: role ? { role } : undefined,
    });
    return response.data;
  },
  listPharmacies: async () => {
    const response = await api.get("/pharmacies/");
    return response.data;
  },

  listLabs: async () => {
    const response = await api.get("/labs/");
    return response.data;
  },

  listDoctors: async (specialization) => {
    const response = await api.get("/doctors/", {
      params: specialization ? { specialization } : undefined,
    });
    return response.data;
  },

  update: async (id, payload) => {
    const response = await api.patch(`/users/${id}/`, payload);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}/`);
    return response.status === 204;
  },
};

/* ===========================
   APPOINTMENTS API INSTANCE
=========================== */

const appointmentsApi = axios.create({
  baseURL: "https://cureon-backend-5j6u.onrender.com/api/appointments",
  headers: {
    "Content-Type": "application/json",
  },
});

appointmentsApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

appointmentsApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");

      if (refreshToken) {
        try {
          const response = await axios.post(
            "https://cureon-backend-5j6u.onrender.com/api/auth/token/refresh/",
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem("access_token", access);

          originalRequest.headers["Authorization"] = `Bearer ${access}`;
          return appointmentsApi(originalRequest);
        } catch (refreshError) {
          console.error("Token refresh failed", refreshError);

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

export const appointmentsService = {
  // General / Patient
  getAvailableSlots: async (doctorId, date) => {
    const response = await appointmentsApi.get("/available-slots/", {
      params: { doctor_id: doctorId, date },
    });
    return response.data;
  },

  book: async ({ doctor_id, date, time_slot, visit_type }) => {
    const response = await appointmentsApi.post("/book/", {
      doctor_id,
      date,
      time_slot,
      visit_type,
    });
    return response.data;
  },

  myAppointments: async (status) => {
    const response = await appointmentsApi.get("/mine/", {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  cancel: async (appointmentId) => {
    const response = await appointmentsApi.post(`/${appointmentId}/cancel/`);
    return response.data;
  },

  requestReschedule: async (
    appointmentId,
    requested_date,
    requested_time_slot
  ) => {
    const response = await appointmentsApi.post(
      `/${appointmentId}/reschedule-request/`,
      {
        requested_date,
        requested_time_slot,
      }
    );
    return response.data;
  },

  // Doctor
  doctorAvailability: {
    list: async () => {
      const response = await appointmentsApi.get("/availability/");
      return response.data;
    },

    add: async ({ weekday, start_time, end_time }) => {
      const response = await appointmentsApi.post("/availability/", {
        weekday,
        start_time,
        end_time,
      });
      return response.data;
    },

    remove: async ({ weekday, start_time, end_time }) => {
      const response = await appointmentsApi.delete("/availability/", {
        data: { weekday, start_time, end_time },
      });
      return response.status === 204;
    },
  },

  doctorAppointments: async (status) => {
    const response = await appointmentsApi.get("/doctor/", {
      params: status ? { status } : undefined,
    });
    return response.data;
  },
  doctorSetVideoLink: async (appointmentId, video_url) => {
    const response = await appointmentsApi.post(`/doctor/${appointmentId}/video-link/`, { video_url });
    return response.data;
  },

  doctorUpdateStatus: async (appointmentId, status) => {
    const response = await appointmentsApi.post(`/${appointmentId}/status/`, {
      status,
    });
    return response.data;
  },

  doctorRescheduleDecision: async (appointmentId, decision) => {
    const response = await appointmentsApi.post(
      `/doctor/${appointmentId}/reschedule-decision/`,
      { decision }
    );
    return response.data;
  },

  doctorReschedule: async (appointmentId, date, time_slot) => {
    const response = await appointmentsApi.post(
      `/doctor/${appointmentId}/reschedule/`,
      { date, time_slot }
    );
    return response.data;
  },
  createVideoPayment: async (appointmentId) => {
    const response = await appointmentsApi.post(`/${appointmentId}/pay/`);
    return response.data;
  },
  verifyStripeSuccess: async (session_id) => {
    const response = await appointmentsApi.get(`/stripe/success/`, { params: { session_id } });
    return response.data;
  },
  stripeConfig: async () => {
    const response = await appointmentsApi.get(`/stripe/config/`);
    return response.data;
  },
  createPaymentIntent: async (appointmentId) => {
    const response = await appointmentsApi.post(`/${appointmentId}/payment-intent/`);
    return response.data;
  },
  verifyPaymentIntent: async (payment_intent_id) => {
    const response = await appointmentsApi.post(`/stripe/verify-intent/`, { payment_intent_id });
    return response.data;
  },

  doctorPatients: async () => {
    const response = await appointmentsApi.get("/doctor/patients/");
    return response.data;
  },
  doctorWeeklyStats: async () => {
    const response = await appointmentsApi.get("/doctor/weekly-stats/");
    return response.data;
  },

  doctorPatientHistory: async (patientId) => {
    const response = await appointmentsApi.get(`/doctor/patients/${patientId}/history/`);
    return response.data;
  },

  // Admin
  adminAll: async () => {
    const response = await appointmentsApi.get("/admin/all/");
    return response.data;
  },

  adminRescheduleDecision: async (appointmentId, decision) => {
    const response = await appointmentsApi.post(
      `/${appointmentId}/reschedule-decision/`,
      { decision }
    );
    return response.data;
  },

  prescriptions: {
    create: async (appointmentId, { diagnosis, items, notes, pharmacy }) => {
      const response = await appointmentsApi.post(
        `/${appointmentId}/prescription/`,
        {
          diagnosis,
          notes,
          items,
          pharmacy,
        }
      );
      return response.data;
    },

    listPatient: async () => {
      const response = await appointmentsApi.get("/patient/prescriptions/");
      return response.data;
    },

    listPharmacy: async () => {
      const response = await appointmentsApi.get("/pharmacy/prescriptions/");
      return response.data;
    },

    updatePharmacyStatus: async (prescriptionId, status) => {
      const response = await appointmentsApi.post(
        `/pharmacy/prescriptions/${prescriptionId}/status/`,
        { status }
      );
      return response.data;
    },

    updatePharmacyBill: async (prescriptionId, items, attachment) => {
      if (attachment) {
        const form = new FormData();
        form.append("items", JSON.stringify(items));
        form.append("attachment", attachment);

        const response = await appointmentsApi.post(
          `/pharmacy/prescriptions/${prescriptionId}/bill/`,
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        return response.data;
      }

      const response = await appointmentsApi.post(
        `/pharmacy/prescriptions/${prescriptionId}/bill/`,
        { items }
      );
      return response.data;
    },
  },

  lab: {
    create: async (appointmentId, { tests, notes, priority, lab_id }) => {
      const response = await appointmentsApi.post(
        `/${appointmentId}/lab-request/`,
        {
          tests,
          notes,
          priority,
          lab_id,
        }
      );
      return response.data;
    },

    listRequests: async () => {
      const response = await appointmentsApi.get("/lab/requests/");
      return response.data;
    },

    updateStatus: async (requestId, status) => {
      const response = await appointmentsApi.post(
        `/lab/requests/${requestId}/status/`,
        { status }
      );
      return response.data;
    },

    patientResults: async () => {
      const response = await appointmentsApi.get("/patient/lab-results/");
      return response.data;
    },


    submitResult: async (
      requestId,
      { result_value, reference_range, clinical_notes, attachment }
    ) => {
      const form = new FormData();

      form.append("result_value", result_value || "");
      form.append("reference_range", reference_range || "");
      form.append("clinical_notes", clinical_notes || "");

      if (attachment) {
        form.append("attachment", attachment);
      }

      const response = await appointmentsApi.post(
        `/lab/requests/${requestId}/result/`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      return response.data;
    },
    doctorUploadResult: async (
      requestId,
      { result_value, reference_range, clinical_notes, attachment, report_name }
    ) => {
      const form = new FormData();
      if (result_value) form.append("result_value", result_value);
      if (reference_range) form.append("reference_range", reference_range);
      if (clinical_notes) form.append("clinical_notes", clinical_notes);
      if (report_name) form.append("report_name", report_name);
      if (attachment) form.append("attachment", attachment);
      const response = await appointmentsApi.post(
        `/doctor/lab/requests/${requestId}/result/`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
    doctorUploadAdhoc: async (
      patientId,
      { result_value, reference_range, clinical_notes, attachment, report_name }
    ) => {
      const form = new FormData();
      if (result_value) form.append("result_value", result_value);
      if (reference_range) form.append("reference_range", reference_range);
      if (clinical_notes) form.append("clinical_notes", clinical_notes);
      if (report_name) form.append("report_name", report_name);
      if (attachment) form.append("attachment", attachment);
      const response = await appointmentsApi.post(
        `/doctor/patients/${patientId}/upload-report/`,
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
    patientUploads: async () => {
      const response = await appointmentsApi.get("/patient/uploads/");
      return response.data;
    },
    patientUpload: async ({ result_value, reference_range, clinical_notes, attachment, report_name }) => {
      const form = new FormData();
      if (result_value) form.append("result_value", result_value);
      if (reference_range) form.append("reference_range", reference_range);
      if (clinical_notes) form.append("clinical_notes", clinical_notes);
      if (report_name) form.append("report_name", report_name);
      if (attachment) form.append("attachment", attachment);
      const response = await appointmentsApi.post("/patient/uploads/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    history: {
      list: async ({ q, status, start_date, end_date } = {}) => {
        const response = await appointmentsApi.get("/lab/history/", {
          params: {
            q: q || undefined,
            status: status && status.length ? status.join(",") : undefined,
            start_date: start_date || undefined,
            end_date: end_date || undefined,
          },
        });
        return response.data;
      },
      detail: async (id) => {
        const response = await appointmentsApi.get(`/lab/history/${id}/`);
        return response.data;
      },
      exportCsv: async ({ q, status, start_date, end_date } = {}) => {
        const response = await appointmentsApi.get("/lab/history/export-csv/", {
          params: {
            q: q || undefined,
            status: status && status.length ? status.join(",") : undefined,
            start_date: start_date || undefined,
            end_date: end_date || undefined,
          },
          responseType: "blob",
        });
        return response.data;
      },
      downloadPdf: async (id) => {
        const response = await appointmentsApi.get(`/lab/history/${id}/pdf/`, {
          responseType: "blob",
        });
        return response.data;
      },
      backfill: async () => {
        const response = await appointmentsApi.post(`/lab/history/backfill/`);
        return response.data;
      },
    },
  },

  adminCancel: async (appointmentId) => {
    const response = await appointmentsApi.post(
      `/${appointmentId}/admin-cancel/`
    );
    return response.data;
  },
};

/* ===========================
   EQUIPMENT API INSTANCE
=========================== */

const equipmentApi = axios.create({
  baseURL: "https://cureon-backend-5j6u.onrender.com/api/equipment",
  headers: { "Content-Type": "application/json" },
});

equipmentApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

equipmentApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const response = await axios.post(
            "https://cureon-backend-5j6u.onrender.com/api/auth/token/refresh/",
            { refresh: refreshToken }
          );
          const { access } = response.data;
          localStorage.setItem("access_token", access);
          originalRequest.headers["Authorization"] = `Bearer ${access}`;
          return equipmentApi(originalRequest);
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

export const equipmentService = {
  list: async ({ search, status, labId } = {}) => {
    const response = await equipmentApi.get("/equipment/", {
      params: {
        search: search || undefined,
        status: status ? status.toUpperCase() : undefined,
        lab_id: labId || undefined,
      },
    });
    return response.data;
  },
  detail: async (id) => {
    const response = await equipmentApi.get(`/equipment/${id}/`);
    return response.data;
  },
  create: async ({ asset_id, name, model, location }) => {
    const response = await equipmentApi.post("/equipment/", {
      asset_id,
      name,
      model,
      location,
    });
    return response.data;
  },
  update: async (id, payload) => {
    const response = await equipmentApi.patch(`/equipment/${id}/`, payload);
    return response.data;
  },
  remove: async (id) => {
    const response = await equipmentApi.delete(`/equipment/${id}/`);
    return response.status === 204;
  },
  scheduleMaintenance: async (id, { next_maintenance, status, notes }) => {
    const response = await equipmentApi.post(
      `/equipment/${id}/schedule-maintenance/`,
      { next_maintenance, status, notes }
    );
    return response.data;
  },
  reportIssue: async (id, { issue_type, description }) => {
    const response = await equipmentApi.post(
      `/equipment/${id}/report-issue/`,
      { issue_type, description }
    );
    return response.data;
  },
  resolveIssue: async (id, { status } = {}) => {
    const response = await equipmentApi.post(
      `/equipment/${id}/resolve-issue/`,
      { status }
    );
    return response.data;
  },
};

/* ===========================
   PHARMACY API INSTANCE
=========================== */
const pharmacyApi = axios.create({
  baseURL: "https://cureon-backend-5j6u.onrender.com/api/pharmacy",
  headers: { "Content-Type": "application/json" },
});

pharmacyApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

pharmacyApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(
            "https://cureon-backend-5j6u.onrender.com/api/auth/token/refresh/",
            { refresh: refreshToken }
          );
          const { access } = res.data;
          localStorage.setItem("access_token", access);
          originalRequest.headers["Authorization"] = `Bearer ${access}`;
          return pharmacyApi(originalRequest);
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

export const pharmacyService = {
  inventory: {
    list: async ({ search, category, supplier, low_stock, expired } = {}) => {
      const response = await pharmacyApi.get("/inventory/", {
        params: {
          search: search || undefined,
          category: category || undefined,
          supplier: supplier || undefined,
          low_stock: low_stock ? 1 : undefined,
          expired: expired ? 1 : undefined,
        },
      });
      return response.data;
    },
    stats: async (params = {}) => {
      const response = await pharmacyApi.get("/inventory/stats/", { params });
      return response.data;
    },
    create: async (payload) => {
      const response = await pharmacyApi.post("/inventory/", payload);
      return response.data;
    },
    update: async (id, payload) => {
      const response = await pharmacyApi.patch(`/inventory/${id}/`, payload);
      return response.data;
    },
    updateStock: async (id, { delta, set }) => {
      const response = await pharmacyApi.post(`/inventory/${id}/stock/`, { delta, set });
      return response.data;
    },
    remove: async (id) => {
      const response = await pharmacyApi.delete(`/inventory/${id}/`);
      return response.status === 204;
    },
  },
  transactions: {
    list: async ({ q, types, date_from, date_to } = {}) => {
      const response = await pharmacyApi.get("/transactions/", {
        params: {
          q: q || undefined,
          types: types && types.length ? types.join(",") : undefined,
          date_from: date_from || undefined,
          date_to: date_to || undefined,
        },
      });
      return response.data;
    },
    detail: async (id) => {
      const response = await pharmacyApi.get(`/transactions/${id}/`);
      return response.data;
    },
    exportCsv: async ({ q, types, date_from, date_to } = {}) => {
      const response = await pharmacyApi.get("/transactions/export-csv/", {
        params: {
          q: q || undefined,
          types: types && types.length ? types.join(",") : undefined,
          date_from: date_from || undefined,
          date_to: date_to || undefined,
        },
        responseType: "blob",
      });
      return response.data;
    },
    receipt: async (id) => {
      const response = await pharmacyApi.get(`/transactions/${id}/receipt/`, {
        responseType: "blob",
      });
      return response.data;
    },
    create: async (payload) => {
      const response = await pharmacyApi.post("/transactions/", payload);
      return response.data;
    },
  },
  catalog: {
    list: async ({ q, pharmacy_id, specialization } = {}) => {
      const response = await pharmacyApi.get("/catalog/", {
        params: { 
          q: q || undefined,
          pharmacy_id: pharmacy_id || undefined,
          specialization: specialization || undefined,
        },
      });
      return response.data;
    },
  },
  orders: {
    list: async ({ status } = {}) => {
      const response = await pharmacyApi.get("/orders/", {
        params: { status: status || undefined },
      });
      return response.data;
    },
    createManual: async (payload) => {
      const response = await pharmacyApi.post("/orders/manual/", payload);
      return response.data;
    },
    backfill: async () => {
      const response = await pharmacyApi.post("/orders/backfill-from-prescriptions/");
      return response.data;
    },
    recalcTotals: async () => {
      const response = await pharmacyApi.post("/orders/recalculate-totals/");
      return response.data;
    },
    fromPrescription: async (prescriptionId) => {
      const response = await pharmacyApi.post(`/orders/from-prescription/${prescriptionId}/`);
      return response.data;
    },
    accept: async (id) => {
      const response = await pharmacyApi.post(`/orders/${id}/accept/`);
      return response.data;
    },
    reject: async (id) => {
      const response = await pharmacyApi.post(`/orders/${id}/reject/`);
      return response.data;
    },
    complete: async (id) => {
      const response = await pharmacyApi.post(`/orders/${id}/complete/`);
      return response.data;
    },
    receipt: async (id) => {
      const response = await pharmacyApi.get(`/orders/${id}/receipt/`, {
        responseType: "blob",
      });
      return response.data;
    },
  },
};

export const adminService = {
  listPharmaciesAdmin: async () => {
    const response = await api.get(`/admin/pharmacies/`);
    return response.data;
  },
  getDoctorDetail: async (id) => {
    const response = await api.get(`/admin/doctors/${id}/`);
    return response.data;
  },
  getPatientDetail: async (id) => {
    const response = await api.get(`/admin/patients/${id}/`);
    return response.data;
  },
  getPharmacyDetail: async (id) => {
    const response = await api.get(`/admin/pharmacies/${id}/`);
    return response.data;
  },
  getPharmacyInventory: async (id) => {
    const response = await api.get(`/admin/pharmacies/${id}/inventory/`);
    return response.data;
  },
  getPharmacyStats: async (id) => {
    const response = await api.get(`/admin/pharmacies/${id}/stats/`);
    return response.data;
  },
  getLabDetail: async (id) => {
    const response = await api.get(`/admin/labs/${id}/`);
    return response.data;
  }
};

export const profileService = {
  patient: {
    get: async () => {
      const response = await api.get("/patient/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/patient/profile/", payload);
      return response.data;
    },
  },
  avatar: {
    upload: async (file) => {
      const form = new FormData();
      form.append("avatar", file);
      const response = await api.post("/profile/avatar/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
  },
  doctor: {
    get: async () => {
      const response = await api.get("/doctor/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/doctor/profile/", payload);
      return response.data;
    },
  },
  pharmacy: {
    get: async () => {
      const response = await api.get("/pharmacy/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/pharmacy/profile/", payload);
      return response.data;
    },
  },
  labs: {
    get: async () => {
      const response = await api.get("/labs/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/labs/profile/", payload);
      return response.data;
    },
  },
  admin: {
    get: async () => {
      const response = await api.get("/admin/profile/");
      return response.data;
    },
    update: async (payload) => {
      const response = await api.patch("/admin/profile/", payload);
      return response.data;
    },
  },
};

export const notificationsService = {
  list: async ({ unread = false, limit } = {}) => {
    const response = await api.get("/notifications/", {
      params: {
        unread: unread ? 1 : undefined,
        limit: limit || undefined,
      },
    });
    return response.data;
  },
  unreadCount: async () => {
    const response = await api.get("/notifications/unread-count/");
    return response.data.unread || 0;
  },
  markRead: async (id) => {
    const response = await api.post(`/notifications/${id}/read/`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post("/notifications/mark-all-read/");
    return response.data;
  },
};

export default api;
