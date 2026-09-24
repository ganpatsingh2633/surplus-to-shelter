# 🌟 Surplus-to-Shelter: Hackathon Judging & Demo Walkthrough

Welcome to **Surplus-to-Shelter**, an intelligent, real-time food rescue routing platform built with React, Leaflet OpenStreetMap, and Firebase Cloud Functions.

---

## 🎯 3-Minute Live Judging Click-Through Script

Follow this exact sequence to demonstrate the entire autonomous rescue lifecycle to judges:

### STEP 1: Donor Intake & Expiry-Risk Scoring (0:00 - 0:45)
1. **Open the App**: Navigate to `http://localhost:3000/` (or your live URL).
2. **Switch to Donor Role**: In the top navigation bar, ensure the role is set to **"Donor"** (or sign in as `donor@surplustoshelter.org`).
3. **Inspect the Intake Form**:
   - Select **"Prepared Meals (Hot)"** from the dropdown. Notice the **Expiry-Risk Scoring** bar immediately shows **Critical Risk** due to high perishability decay rates ($0.95$).
   - Enter Quantity: `30 hot gourmet lasagna & salad trays`.
   - Click **"Use Browser Geolocation"** (or auto-filled San Francisco coordinates `37.7749, -122.4194`).
4. **Submit Donation**:
   - Click **"Post Surplus Donation"**.
   - **Judge Highlight**: Mention the Cloud Function `onCreate` trigger on `donations` collection! It autonomously evaluates nearby shelters with $(capacity - currentLoad) > 0$ and dietary match, running a spherical Haversine formula to assign the closest eligible shelter.
   - Status instantly transitions to **"Matched"** with Mission Community Food Hub.

---

### STEP 2: Driver Dispatch, Proximity Batching & Map View (0:45 - 1:30)
1. **Switch to Driver View**: Click **"Driver Route"** in the top navigation bar.
2. **Observe OpenStreetMap Telemetry**:
   - Show the live Leaflet map rendering with **$<100\text{km}$ radius filtering** active.
   - Show donation pins colored by risk score (Green $<33$, Amber $33-66$, Red $>66$) and shelter pins colored by remaining intake headroom.
3. **Accept Dispatch & Trigger 1km Batching**:
   - Look at the **Available Matched Surplus Feed** (sorted by distance from driver).
   - Click **"Accept Dispatch & Plan Trip"** on the top item.
   - **Judge Highlight**: The **Batching Modal** pops up: *"Nearby Surplus Found! Add to this trip?"*. Explain that the system detected another matched unassigned donation within 1km created in the 15-minute window!
   - Click **"Accept 2 Pickups as Batch"**.
   - Notice the **Active Route Sequence** generated: Driver Origin $\to$ Stop \#1 $\to$ Stop \#2 $\to$ Destination Shelter!

---

### STEP 3: In-Transit Courier Pickup (1:30 - 2:00)
1. **Mark Picked Up**:
   - Under **"My Assigned Active Rescue Trips"**, show the **StatusStepper** showing `Matched` highlighted.
   - Click **"Mark Picked Up from Donor"**.
   - The status updates live to **`picked_up`** across the system.
   - Notice the step advances to `In Transit` with real-time Firestore synchronization!

---

### STEP 4: Shelter Verification & Usability Trust Rating (2:00 - 2:30)
1. **Switch to Shelter View**: Click **"Shelter Hub"** in the top navigation bar.
2. **Confirm Receipt**:
   - In the surplus feed, find the arriving batch with status `picked_up`.
   - Click the green button: **"Confirm Received & Rate Donor"**.
   - The **Confirm Surplus Delivery Modal** opens:
     - Prompt: *"Was the received food usable & safe to distribute?"*
     - Select **"Yes, Usable"** (+1 Rating).
     - Add inspection note: *"Arrived warm and fresh, distributed to 30 residents."*
     - Click **"Confirm Receipt & Rate Donor"**.
   - **Judge Highlight**: The Cloud Function transaction recalculates the running average Trust Score for both the donor and shelter:
     $$\text{trustScore} = \frac{\text{previous\_score} \times \text{count} + \text{new\_rating}}{\text{count} + 1}$$
   - Status updates live to **`delivered`**!

---

### STEP 5: Shareable Social Impact Certificate & Confetti (2:30 - 2:45)
1. **Switch Back to Donor View**: Click **"Donor Hub"**.
2. **Generate Share Card**:
   - In the donation history, click **"View & Share Impact Certificate 🌍"**.
   - **Confetti bursts!** 🎉
   - The headline announces:
     > *"You just diverted 14 kg / fed ~33 people / saved 35 kg CO₂e 🌍"*
   - Show the high-res 1200x675 HD canvas image card preview.
   - Click **"Download Image Card"** to save the PNG certificate.
   - Click **"Copy Share Text"** to copy pre-formatted social media text to clipboard.

---

### STEP 6: Public Impact Ledger & Environmental Stats (2:45 - 3:00)
1. **Open Impact Ledger**: Click **"Impact Ledger"** in the top navigation bar (`/impact`).
2. **Watch Animated Counters**:
   - Watch the smooth count-up animations for:
     - **Meals Nourished**
     - **Food Waste Diverted (kg)**
     - **CO₂e Offset Avoided (kg)** ($2.5\text{ kg CO}_2\text{e/kg food}$)
     - **Active Shelter Partnerships**
   - Point out the **Live Regional Map** showing all verified rescues within a 100km perimeter.
   - Review the verified delivery records table.

---

## 🏗️ Architecture Summary for Q&A

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + Tailwind CSS | Fast, accessible, mobile-first responsive dashboards |
| **Maps** | Leaflet + OpenStreetMap | Interactive, zero-cost, no-API-key mapping with 100km radius filtering |
| **Matching Engine** | Firebase Cloud Functions v2 (`onCreate`) | Autonomous Haversine proximity & dietary preference matching |
| **Risk Rescorer** | Cloud Functions Scheduler (`onSchedule`) | 10-minute cron recalculating decay score $(base \times elapsed / totalWindow)$ |
| **Batching Logic** | Spatial clustering | Groups pickups $\le 1\text{km}$ within 15 min into optimized multi-stop routes |
| **Trust Rating** | Running average algorithm | $1.0$ star rating tracking usable vs. unusable food safety deliveries |
| **Social Card** | HTML5 `<canvas>` + `canvas-confetti` | Generates 1200x675 HD downloadable impact graphics |
