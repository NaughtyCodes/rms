# Tractly Multi-Tenant Demo Guide

This guide provides step-by-step instructions on how to experience Tractly's true multi-tenant architecture using the newly generated demo data.

---

## 1. Starting the Application
Ensure that you have seeded the database via our new command:
```bash
# In the tractly/server directory run:
npm run seed:demo
```
Then start the backend and frontend:
- **Backend:** `node src/app.js` (inside `server`)
- **Frontend:** `npm start` (inside `client`)

Open your browser to the designated local port for the Angular client (typically `http://localhost:4200`).

---

## 2. Exploring Tenant 1: TechStore Inc

### Step 2.1: Login
At the login screen, enter the credentials for the TechStore administrator:
- **Username:** `tech_admin`
- **Password:** `admin123`

### Step 2.2: View Branches
1. Navigate to **Infrastructure -> Branches** from the sidebar.
2. You should see two active branches:
   - **TechStore Main**
   - **TechStore Downtown**

### Step 2.3: View Products & Inventory
1. Navigate to **Inventory -> Stock Levels**.
2. Notice the catalog is restricted solely to electronics:
   - MacBook Pro 16
   - Dell XPS 15
   - USB-C Hub
3. Check how the stock is distributed across the two branches.

### Step 2.4: Reports & Backdated Bills
1. Navigate to **Reports -> Sales Reports**.
2. Generate a report for the last 30/60 days. You will see a populated chart of daily sales. 
3. Go to **Billing -> Invoices** to see the raw receipt data.

---

## 3. Exploring Tenant 2: SuperMart (Isolated Verification)

To prove that the platform strictly enforces row-level multi-tenancy, we will now log into a completely separate shop.

### Step 3.1: Log Out
Click the top right profile icon and select **Logout**.

### Step 3.2: Login as SuperMart Admin
- **Username:** `mart_admin`
- **Password:** `admin123`

### Step 3.3: Verify Isolation
Perform the exact same checks as you did for TechStore, and observe that **none of the TechStore data exists here**.
1. **Branches:** Now reads "SuperMart Flagship" and "SuperMart Express".
2. **Products:** Only groceries appear ("Organic Apples", "Whole Milk 1L"). The electronics are completely inaccessible.
3. **Invoices:** Only grocery-based invoices will appear in the billing history.

---

## Conclusion
You have successfully verified Tractly's Multi-Tenant capabilities. Each "Tenant" functions as a completely segregated business entity, while sharing the same underlying architectural code and database infrastructure.
