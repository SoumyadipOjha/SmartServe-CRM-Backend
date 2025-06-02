# SmartServe CRM Platform

A full-stack AI-powered CRM solution designed for the Xeno SDE Internship Assignment 2025. Built with Google OAuth, segmentation, automated messaging, and campaign analytics.

---

## 🚀 Features

### ✅ Core Modules

* **Authentication**: Google OAuth 2.0 + JWT
* **Customer Management**: CRUD operations with validations
* **Order Management**: Create, retrieve, and update orders
* **Campaigns**:

  * Segment builder with AND/OR logic
  * Audience preview + activation
  * Message delivery simulation with 90% success
* **AI Tools**:

  * Natural language to rule conversion
  * Smart message generator
  * Fallback model strategy

---

## 🛠️ Tech Stack

### 🧩 Backend

* Node.js, Express.js
* MongoDB (with Mongoose ODM)
* Passport.js (Google OAuth)
* JWT Authentication
* Gemini API (Google Generative AI)

### 🎨 Frontend

* React.js with TypeScript
* Chakra UI
* React Query Builder
* Chart.js
* Axios

### Dev Tools

* Nodemon, ESLint, Prettier
* Postman (for testing APIs)


---

## 🧭 Architecture Diagram

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Frontend  │◄────►│   Backend   │◄────►│  Database   │
│ React + TS  │      │ Node + JWT  │      │  MongoDB    │
└─────────────┘      └─────────────┘      └─────────────┘
                           ▲
                           │
                     ┌─────┴─────┐
                     │   AI API  │
                     │ Gemini AI │
                     └───────────┘
```

---

## 📁 Backend Folder Structure

```
backend/
├── config/                    # Passport and DB config
├── controllers/              # Route handlers (business logic)
│   ├── ai.controller.js
│   ├── auth.controller.js
│   ├── campaign.controller.js
│   ├── customer.controller.js
│   └── order.controller.js
├── middleware/               # JWT, validation, error handlers
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   └── validation.middleware.js
├── models/                   # Mongoose schemas
│   ├── campaign.model.js
│   ├── communication-log.model.js
│   ├── customer.model.js
│   ├── order.model.js
│   └── user.model.js
├── routes/                   # API routes
│   ├── ai.routes.js
│   ├── auth.routes.js
│   ├── campaign.routes.js
│   ├── customer.routes.js
│   └── order.routes.js
├── services/                 # AI, vendor messaging
│   ├── ai.service.js
│   └── vendor.service.js
├── .env                      # Environment config
├── index.js                  # Main entry point
└── package.json
```

---

## 🔌 API Endpoints (Postman Ready)

### 🔐 Auth (Google OAuth)

```
GET /api/auth/google
GET /api/auth/google/callback
GET /api/auth/me   (JWT Protected)
```

### 👤 Customers

```
POST   /api/customers               (JWT Protected)
GET    /api/customers               (JWT Protected)
GET    /api/customers/:id           (JWT Protected)
PUT    /api/customers/:id           (JWT Protected)
DELETE /api/customers/:id           (JWT Protected)
```

### 📦 Orders

```
POST   /api/orders                  (JWT Protected)
GET    /api/orders                  (JWT Protected)
GET    /api/orders/:id              (JWT Protected)
GET    /api/orders/customer/:id     (JWT Protected)
PATCH  /api/orders/:id/status       (JWT Protected)
```

### 📣 Campaigns

```
POST   /api/campaigns               (JWT Protected)
GET    /api/campaigns               (JWT Protected)
POST   /api/campaigns/preview       (JWT Protected)
GET    /api/campaigns/:id           (JWT Protected)
GET    /api/campaigns/:id/stats     (JWT Protected)
POST   /api/campaigns/:id/activate  (JWT Protected)
```

### 🤖 AI

```
POST /api/ai/convert-rules          (JWT Protected)
POST /api/ai/generate-message       (JWT Protected)
```


---

## 🧪 Mock Request Sample (Use Postman)

```
POST /api/customers
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "visits": 3,
  "totalSpent": 500
}
```

---

## 🔄 Google OAuth Setup (Production)

Update in backend `.env`:

```
GOOGLE_CALLBACK_URL=https://smartserve-crm-backend.onrender.com/api/auth/google/callback
CLIENT_URL=https://smart-serve-crm-frontend.vercel.app/
```

Ensure these are set in Google Cloud Console:

* Authorized redirect URI: `https://smartserve-crm-backend.onrender.com/api/auth/google/callback`
* Authorized JS Origin: `[https://smart-serve-crm.netlify.app](https://smart-serve-crm-frontend.vercel.app/)`

---

## 🧰 Local Setup Instructions

### Prerequisites

* Node.js 18+
* MongoDB (local or Atlas)

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App will be running at: `http://localhost:5000`

---

## ⚙️ AI Integration Summary

1. **Natural Language → Rules**

   * Example: "Customers who spent over \$1000 and visited less than 3 times"
   * Output: Structured query with field/operator/value logic

2. **Smart Message Generation**

   * Generates campaign messages with personalization tokens like `{{name}}`

3. **Model Fallback Strategy**

   * Tries Gemini Flash Lite → Flash → Pro

---

## 🚧 Known Limitations

* Only text-based messages (no media attachments)
* Simulated delivery (no real SMS/email integration)
* Synchronous delivery flow (non-queued)
* Single-user access (no role-based permissions yet)
* Chart representation

---

## 🔮 Future Scope

* Mobile App Integration
* Multi-user Access with Roles
* A/B Testing & Analytics
* Email Template Designer
* Support for WhatsApp, Email, SMS APIs

---

## 👤 Author

Made with 💻 by **\Soumyadip Ojha**
[LinkedIn Profile](https://www.linkedin.com/in/soumyadip-ojha)

---

## 📄 License

MIT License – feel free to use and modify!
