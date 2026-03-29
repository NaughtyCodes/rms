<div align="center">
  <img src="assets/logo.png" alt="Tracly Logo" width="150">
  <h1>Tractly</h1>
  <p><strong>A powerful, minimalist Shop Inventory & Billing System for modern businesses.</strong></p>
  <p><a href="https://naughtycodes.github.io/tractly/"><strong>Visit Product Page →</strong></a></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Angular](https://img.shields.io/badge/Angular-17+-DD0031?logo=angular&logoColor=white)](https://angular.io/)
  [![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![SQLite](https://img.shields.io/badge/SQLite-Fast-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
</div>

---

## 🚀 Overview

Tracly is a comprehensive solution designed to streamline inventory management and billing for retail shops and multi-branch businesses. Built with a focus on speed, scalability, and ease of use, it provides everything you need to manage your inventory, process sales, and track business performance in one place.

<div align="center">
  <img src="assets/dashboard_desktop.png" alt="Tracly Dashboard" width="800">
</div>

### 📱 UI Reference

| Login Page | Dashboard (Desktop) | Mobile View |
|:---:|:---:|:---:|
| <img src="assets/login_page.png" width="250"> | <img src="assets/dashboard_desktop.png" width="250"> | <img src="assets/mobile_view.png" width="250"> |

---

## 🛠️ Tech Stack

- **Frontend**: [Angular 17+](https://angular.io/) - Modern, component-based framework for a dynamic and responsive UI.
- **Backend**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) - High-performance server for handling APIs and business logic.
- **Database**: [SQLite](https://www.sqlite.org/), [MySQL](https://www.mysql.com/), & [PostgreSQL](https://www.postgresql.org/) - Flexible, multi-engine database support for any scale.
- **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/) - Blazing fast image transformations for product and bill logos.
- **File Uploads**: [Multer](https://github.com/expressjs/multer) - Handling multipart/form-data for image and file storage.
- **Backup & Recovery**: Built-in automated database backup and restore management.

---

## 📐 Architecture Diagram

Tracly follows a client-server architecture with a local database, optimized for high availability and low latency.

```mermaid
graph TD
    A[Angular Client] -->|HTTP/REST| B[Node.js / Express Server]
    B -->|Query / Storage| C[(SQLite DB)]
    B -->|FS / Processing| D[Local Storage / Sharp]
    
    subgraph "Core Business Logic"
        B1[Auth Middleware / JWT]
        B2[Inventory Controllers]
        B3[Billing / Invoice Generator]
    end
```

---

## 🔄 Core Business Workflow

Tracly simplifies the entire lifecycle from stocking to billing.

```mermaid
sequenceDiagram
    participant A as Admin / Staff
    participant B as Inventory Management
    participant C as Stock Transfer / Sales
    participant D as Customer Billing
    participant E as Invoicing & Receipts

    A->>B: Set up Products & Categories
    B->>C: Allocate Stock (Branches / Warehouse)
    C->>D: Process Sale / Checkout
    D->>E: Generate Dynamic Invoice (PDF/Thermal)
    E->>A: Business Insights / Sales Reports
```

---

## ✨ Features

- 🏢 **Multi-Branch Support**: Scalable architecture for managing multiple business locations within a single tenant.
- 📦 **Granular Inventory**: Manage products, categories, stock levels, and historical data with ease.
- 🧾 **Dynamic Billing**: Professional invoice generation with support for taxes, discounts, and custom logos.
- 🚛 **Stock Transfers**: Effortlessly move inventory between branches with full traceabilty.
- 🔒 **Extensive User Management**: Granular role-based access control (RBAC) with secure bcrypt hashing and JWT.
- 💾 **Backup & Restore**: Effortless database management with automated backup and point-in-time recovery.
- 📊 **Business Insights**: Detailed reports on sales, inventory levels, and branch performance.

---

## 🏗️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/NaughtyCodes/tractly.git
   cd tractly
   ```

2. **Setup the Backend**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Setup the Frontend**:
   ```bash
   cd ../client
   npm install
   npm start
   ```

The application will be available at: **http://localhost:4200**

---

## 📖 Resources & Documentation

- 🌐 **[Official Product Page](https://naughtycodes.github.io/tractly/)**
- 📘 **[Web User Guide](https://naughtycodes.github.io/tractly/user_guide.html)**
- 📝 **[Markdown User Guide](USER_GUIDE.md)**
- 📐 **[Architecture Overview](https://naughtycodes.github.io/tractly/#architecture)**

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<div align="center">
  <p>Built with ❤️ by NaughtyCodes</p>
</div>
